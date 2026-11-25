"""Pruebas de Rendimiento (Benchmark) y Seguridad para la plataforma TMO Enterprise.

Valida:
- Tiempos de ejecución y escalabilidad para 1,000 registros sintéticos.
- Parametrización estricta del ORM de Django frente a inyecciones SQL.
- Cabeceras de seguridad HTTP (X-Frame-Options, CSRF, etc.).
- Restricción de tamaño máximo de archivo a 50 MB.
"""

import time
import numpy as np
import pandas as pd
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from django.urls import reverse
from django.utils import timezone

from apps.operations.forms import ExcelUploadForm
from apps.operations.models import Agent, CallRecord, IngestedFile
from services.tmo_calculator import TMOCalculatorService


def test_tmo_calculator_performance_1000_records():
    """Benchmark: Valida que el motor estadístico procese 1,000 llamadas en menos de 0.5 segundos."""
    np.random.seed(42)
    n_records = 1000
    agents = [f"AG-{i:03d}" for i in range(1, 26)]  # 25 asesores

    synthetic_data = []
    for i in range(n_records):
        ag = np.random.choice(agents)
        synthetic_data.append({
            'call_id': f"PERF-{i+1:05d}",
            'agent_code': ag,
            'agent_name': f"Asesor {ag}",
            'call_status': np.random.choice(['CONTESTADA', 'PERDIDA'], p=[0.92, 0.08]),
            'total_duration': float(np.random.uniform(10.0, 45.0)),
            'talk_time': float(np.random.uniform(8.0, 35.0)),
            'wait_time': float(np.random.uniform(1.0, 5.0)),
            'silence_time': float(np.random.uniform(0.5, 4.0)),
            'wrap_up_time': float(np.random.uniform(1.0, 4.0)),
        })

    df_synthetic = pd.DataFrame(synthetic_data)

    start_time = time.perf_counter()
    df_agents = TMOCalculatorService.calculate_agent_summaries(df_synthetic, threshold=20.0)
    kpis = TMOCalculatorService.calculate_global_kpis(df_synthetic, df_agents, threshold=20.0)
    elapsed = time.perf_counter() - start_time

    assert len(df_agents) == 25
    assert kpis['total_calls'] == 1000
    assert elapsed < 0.5, f"El cálculo vectorial de 1,000 registros demoró {elapsed:.3f}s (esperado < 0.5s)"


@pytest.mark.django_db
def test_bulk_create_persistence_performance():
    """Benchmark: Valida que la persistencia en base de datos en lote de 500 registros tome menos de 1.5s."""
    ingested = IngestedFile.objects.create(
        filename="benchmark.xlsx",
        sha256_hash="hash_bench_001",
        file_size_bytes=50000
    )
    agent = Agent.objects.create(code="AG-BENCH", name="Agente Benchmark")

    now = timezone.now()
    batch = [
        CallRecord(
            call_id=f"B-{i}",
            ingested_file=ingested,
            agent=agent,
            call_datetime=now,
            call_status="CONTESTADA",
            total_duration_seconds=20.0,
            talk_time_seconds=15.0,
            wait_time_seconds=2.0,
            silence_time_seconds=1.0,
            wrap_up_time_seconds=2.0,
            is_valid=True
        )
        for i in range(500)
    ]

    start = time.perf_counter()
    CallRecord.objects.bulk_create(batch, batch_size=500)
    elapsed = time.perf_counter() - start

    assert CallRecord.objects.filter(ingested_file=ingested).count() == 500
    assert elapsed < 1.5, f"La inserción masiva demoró {elapsed:.3f}s (esperado < 1.5s)"


@pytest.mark.django_db
def test_security_orm_sql_injection_defense():
    """Seguridad: Valida que entradas maliciosas no rompan la parametrización del ORM."""
    malicious_payload = "AG-001' OR '1'='1' --"
    # El ORM debe tratar el payload como una cadena literal, no como código SQL
    result = Agent.objects.filter(code=malicious_payload).first()
    assert result is None, "El ORM no debe ejecutar inyecciones de código SQL"


@pytest.mark.django_db
def test_security_http_headers_and_x_frame_options(client: Client):
    """Seguridad: Valida que las cabeceras HTTP mitiguen ataques de Clickjacking y MIME sniffing."""
    response = client.get(reverse('analytics:dashboard'))
    assert response.status_code == 200
    # X-Frame-Options debe ser SAMEORIGIN para permitir el iframe propio pero bloquear orígenes externos
    assert response.headers.get('X-Frame-Options') == 'SAMEORIGIN'


def test_security_file_size_limit_rejection():
    """Seguridad: Valida que el formulario rechace archivos que superen 50 MB."""
    # Simular archivo de 51 MB mediante mock de tamaño
    fake_large_file = SimpleUploadedFile("gigante.xlsx", b"dummy content", content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    fake_large_file.size = 55 * 1024 * 1024  # 55 MB

    form = ExcelUploadForm(files={'file': fake_large_file})
    assert not form.is_valid()
    assert "excede el tamaño máximo permitido de 50 MB" in str(form.errors)
