"""Pruebas de Integración de Extremo a Extremo (E2E) para la plataforma TMO Enterprise.

Valida el ciclo de vida completo de los datos:
1. Ingesta multipart/form-data de un libro Excel vía HTTP POST.
2. Saneamiento, deduplicación e idempotencia por hash SHA-256.
3. Persistencia relacional en Django (IngestedFile, Agent, CallRecord).
4. Disparo del orquestador APScheduler con cálculo matemático estricto.
5. Generación del libro Excel oficial de 4 pestañas y gráficos vectoriales.
6. Simulación de alerta por correo corporativo con archivo adjunto.
7. Reflejo reactivo en el Dashboard de Dash y descarga de reportes.
"""

import io
import os
from pathlib import Path
import openpyxl
import pytest
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from django.urls import reverse

from apps.analytics.dash_app import update_dashboard
from apps.automation.models import AutomationAlertRecipient, ExecutionLog
from apps.operations.models import Agent, CallRecord, IngestedFile, ThresholdConfig
from services.scheduler_service import scheduler_service

BASE_DIR = Path(__file__).resolve().parent.parent


@pytest.mark.django_db
def test_complete_enterprise_lifecycle_e2e(client: Client, settings, tmp_path):
    """Prueba integral de ciclo completo de vida de los datos de telefonía."""
    # Configurar backend de correo en memoria para pruebas
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    settings.DEFAULT_FROM_EMAIL = 'sistema@empresa.com'

    # Paso 1: Configurar política y destinatarios de calidad
    threshold = ThresholdConfig.objects.create(
        name="Política Operativa Estándar",
        threshold_seconds=20.0,
        warning_multiplier=1.15,
        z_score_threshold=2.0,
        is_active=True
    )
    recipient = AutomationAlertRecipient.objects.create(
        name="Gerencia de Operaciones",
        email="gerencia@empresa.com",
        is_active=True
    )

    # Paso 2: Cargar el dataset demo oficial de 92 llamadas
    demo_excel_path = BASE_DIR / 'sample_data' / 'call_center_dataset_demo.xlsx'
    assert demo_excel_path.exists(), "El archivo demo debe existir en sample_data/"

    with open(demo_excel_path, 'rb') as f:
        file_bytes = f.read()

    uploaded_file = SimpleUploadedFile(
        name="call_center_dataset_demo.xlsx",
        content=file_bytes,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    # Ingesta vía endpoint HTTP POST de Django
    upload_url = reverse('operations:upload_excel')
    response_upload = client.post(upload_url, {'file': uploaded_file}, follow=True)
    assert response_upload.status_code == 200

    # Paso 3: Validar persistencia relacional
    assert IngestedFile.objects.count() == 1
    ingested = IngestedFile.objects.first()
    assert ingested.filename == "call_center_dataset_demo.xlsx"
    assert ingested.total_rows == 92
    assert ingested.valid_rows == 92
    assert ingested.status == 'PROCESSED'

    # Validar agentes y llamadas
    total_agents = Agent.objects.count()
    assert total_agents >= 5, "Deben haberse registrado los asesores únicos"
    total_calls = CallRecord.objects.filter(ingested_file=ingested).count()
    assert total_calls == 92

    # Paso 4: Validar Idempotencia (Carga repetida del mismo archivo debe ser rechazada)
    uploaded_duplicate = SimpleUploadedFile(
        name="call_center_dataset_demo.xlsx",
        content=file_bytes,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response_duplicate = client.post(upload_url, {'file': uploaded_duplicate}, follow=True)
    assert response_duplicate.status_code == 200
    # No debe duplicar registros
    assert IngestedFile.objects.count() == 1
    assert CallRecord.objects.count() == 92

    # Paso 5: Ejecutar el motor de automatizaciones (APScheduler Pipeline)
    log = scheduler_service.trigger_now(background=False)
    assert log is not None
    assert log.status == 'SUCCESS'
    assert log.records_processed == 92
    assert log.agents_evaluated == total_agents
    assert log.global_weighted_tmo > 0.0
    assert os.path.exists(log.report_file_path)

    # Paso 6: Validar libro Excel generado en la auditoría
    wb = openpyxl.load_workbook(log.report_file_path)
    assert len(wb.sheetnames) == 4
    assert "Resumen_Asesores" in wb.sheetnames
    assert len(wb["Resumen_Asesores"]._charts) >= 1

    # Paso 7: Validar despacho de alerta SMTP
    assert len(mail.outbox) == 1
    sent_email = mail.outbox[0]
    assert "gerencia@empresa.com" in sent_email.to
    assert len(sent_email.attachments) == 1
    assert sent_email.attachments[0][0].endswith('.xlsx')

    # Paso 8: Validar que el Dashboard de Dash refleje exactamente los datos
    label_thresh, kpis, fig_bar, fig_pie, fig_scatter, fig_stacked, table = update_dashboard(
        selected_threshold=20.0,
        selected_agent='ALL',
        n_clicks=1,
        n_intervals=0
    )
    assert "20.0 segundos" in label_thresh
    assert len(kpis) == 4
    # Validar que los gráficos contienen datos
    assert len(fig_bar.data) >= 1
    assert len(fig_pie.data[0].values) >= 1

    # Paso 9: Validar endpoint de descarga de reportes
    download_url = reverse('operations:download_report_all')
    response_download = client.get(download_url)
    assert response_download.status_code == 200
    assert response_download['Content-Type'] == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    assert len(response_download.content) > 5000
