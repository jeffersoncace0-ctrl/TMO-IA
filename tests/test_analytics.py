"""Pruebas unitarias y de integración para la aplicación de Analítica, Dash y componentes Plotly."""

import pytest
from django.test import Client
from django.urls import reverse
from django.utils import timezone
import plotly.graph_objects as go

from apps.analytics.dash_app import (
    dash_app,
    fetch_call_center_data,
    update_agent_dropdown,
    update_dashboard
)
from apps.operations.models import Agent, CallRecord, IngestedFile, ThresholdConfig


@pytest.mark.django_db
def test_analytics_dashboard_view_renders_correctly(client: Client):
    """Valida que la vista contenedora del Dashboard responda 200 y cargue el contexto operativo."""
    ThresholdConfig.objects.create(
        name="Política 20s",
        threshold_seconds=20.0,
        is_active=True
    )
    response = client.get(reverse('analytics:dashboard'))
    assert response.status_code == 200
    assert "Centro de Anal" in response.content.decode('utf-8')
    assert "/analitica/dash/" in response.content.decode('utf-8')


@pytest.mark.django_db
def test_dash_index_and_static_routes(client: Client):
    """Valida que el adaptador WSGI de Dash despache el index HTML correctamente."""
    response = client.get('/analitica/dash/')
    assert response.status_code == 200
    content = response.content.decode('utf-8')
    assert "<!DOCTYPE html>" in content
    assert "dash-renderer" in content or "_dash-component-suites" in content


@pytest.mark.django_db
def test_dash_layout_and_dependencies_endpoints(client: Client):
    """Valida los endpoints internos de Dash requeridos por el frontend interactivo."""
    # 1. Layout JSON
    res_layout = client.get('/analitica/dash/_dash-layout')
    assert res_layout.status_code == 200
    assert 'slider-threshold' in res_layout.content.decode('utf-8')
    assert 'dropdown-agent' in res_layout.content.decode('utf-8')

    # 2. Dependencies JSON (callbacks)
    res_dep = client.get('/analitica/dash/_dash-dependencies')
    assert res_dep.status_code == 200
    assert 'kpi-cards-container' in res_dep.content.decode('utf-8')
    assert 'graph-bar-tmo' in res_dep.content.decode('utf-8')


@pytest.mark.django_db
def test_dash_fetch_call_center_data():
    """Valida la extracción de datos desde el ORM de Django hacia Pandas."""
    # Base de datos vacía
    df_empty, threshold, _ = fetch_call_center_data()
    assert df_empty.empty
    assert threshold == 20.0

    # Ingestar llamadas
    ingested = IngestedFile.objects.create(
        filename="prueba.xlsx",
        sha256_hash="hash_analitica_01",
        file_size_bytes=1000
    )
    agent = Agent.objects.create(name="Laura Martinez", code="AG-301")
    CallRecord.objects.create(
        call_id="CALL-301",
        ingested_file=ingested,
        agent=agent,
        call_datetime=timezone.now(),
        call_status="CONTESTADA",
        total_duration_seconds=18.5,
        talk_time_seconds=15.0,
        wait_time_seconds=2.0,
        silence_time_seconds=1.0,
        wrap_up_time_seconds=0.5,
        is_valid=True
    )

    df_populated, _, _ = fetch_call_center_data()
    assert len(df_populated) == 1
    assert df_populated['agent_code'].iloc[0] == 'AG-301'
    assert df_populated['total_duration'].iloc[0] == 18.5


@pytest.mark.django_db
def test_update_agent_dropdown_callback():
    """Valida que el callback del selector de asesores devuelva la opción global y los agentes."""
    agent = Agent.objects.create(name="Pedro Gomez", code="AG-404")
    ingested = IngestedFile.objects.create(filename="f.xlsx", sha256_hash="h1", file_size_bytes=10)
    CallRecord.objects.create(
        call_id="C404",
        ingested_file=ingested,
        agent=agent,
        total_duration_seconds=22.0,
        is_valid=True
    )

    options, default_val = update_agent_dropdown(n_clicks=1, n_intervals=0)
    assert default_val == 'ALL'
    assert len(options) >= 2
    assert any(opt['value'] == 'AG-404' for opt in options)


@pytest.mark.django_db
def test_update_dashboard_callback_with_records():
    """Valida el cálculo reactivo completo de métricas y gráficos de Plotly."""
    ThresholdConfig.objects.create(
        name="Meta 20s",
        threshold_seconds=20.0,
        warning_multiplier=1.15,
        is_active=True
    )
    ingested = IngestedFile.objects.create(filename="f2.xlsx", sha256_hash="h2", file_size_bytes=20)
    ag1 = Agent.objects.create(name="Asesor A", code="AG-A")
    ag2 = Agent.objects.create(name="Asesor B", code="AG-B")

    now = timezone.now()
    # Asesor A: 2 llamadas, TMO = 15s (Aprobado)
    CallRecord.objects.create(call_id="C1", ingested_file=ingested, agent=ag1, total_duration_seconds=15.0, talk_time_seconds=10.0, wait_time_seconds=2.0, wrap_up_time_seconds=3.0, call_status="CONTESTADA", is_valid=True, call_datetime=now)
    CallRecord.objects.create(call_id="C2", ingested_file=ingested, agent=ag1, total_duration_seconds=15.0, talk_time_seconds=10.0, wait_time_seconds=2.0, wrap_up_time_seconds=3.0, call_status="CONTESTADA", is_valid=True, call_datetime=now)
    # Asesor B: 1 llamada, TMO = 35s (Requiere Revisión)
    CallRecord.objects.create(call_id="C3", ingested_file=ingested, agent=ag2, total_duration_seconds=35.0, talk_time_seconds=30.0, wait_time_seconds=3.0, wrap_up_time_seconds=2.0, call_status="CONTESTADA", is_valid=True, call_datetime=now)

    # Invocar el callback de Dash directamente con Python
    lbl_thresh, kpi_cards, fig_bar, fig_pie, fig_scatter, fig_stacked, table = update_dashboard(
        selected_threshold=20.0,
        selected_agent='ALL',
        n_clicks=1,
        n_intervals=0
    )

    # 1. Texto de umbral
    assert "20.0 segundos" in lbl_thresh

    # 2. Tarjetas KPI
    assert len(kpi_cards) == 4

    # 3. Gráficos Plotly son instancias válidas de go.Figure
    assert isinstance(fig_bar, go.Figure)
    assert isinstance(fig_pie, go.Figure)
    assert isinstance(fig_scatter, go.Figure)
    assert isinstance(fig_stacked, go.Figure)

    # Verificar que el gráfico de barras contiene las trazas de Aprobado y Requiere Revisión
    trace_names = [trace.name for trace in fig_bar.data]
    assert 'APROBADO' in trace_names
    assert 'REQUIERE REVISIÓN' in trace_names

    # 4. Tabla de asesores contiene filas
    assert table is not None
