"""Pruebas automatizadas con Pytest para el módulo de automatizaciones, APScheduler y despacho de correo."""

import os
from unittest.mock import patch
from datetime import datetime
import pytest
from django.core import mail
from django.test import Client
from django.urls import reverse
from django.utils import timezone

from apps.automation.models import AutomationAlertRecipient, AutomationJob, ExecutionLog
from apps.operations.models import Agent, CallRecord, IngestedFile, ThresholdConfig
from services.email_service import EmailNotificationService
from services.scheduler_service import AutomationSchedulerService, scheduler_service


@pytest.mark.django_db
def test_automation_job_model_creation_and_metrics():
    """Valida la creación y cálculo del porcentaje de éxito de AutomationJob."""
    job = AutomationJob.objects.create(
        name="Auditoría Horaria de TMO",
        job_type="HOURLY_AUDIT",
        interval_minutes=60,
        is_active=True,
        total_runs=10,
        successful_runs=9,
        failed_runs=1
    )
    assert job.id is not None
    assert job.success_rate == 90.0
    assert "ACTIVA" in str(job)


@pytest.mark.django_db
def test_execution_log_model():
    """Valida el registro y persistencia de un ExecutionLog inmutable."""
    log = ExecutionLog.objects.create(
        job_name="Corte Horario de Prueba",
        trigger_type="MANUAL",
        status="SUCCESS",
        started_at=timezone.now(),
        finished_at=timezone.now(),
        duration_seconds=1.25,
        records_processed=150,
        agents_evaluated=10,
        compliant_agents=8,
        critical_agents=2,
        global_weighted_tmo=18.5,
        email_sent=True,
        summary="Corte completado satisfactoriamente."
    )
    assert log.id is not None
    assert "[Completado con Éxito]" in str(log)
    assert log.records_processed == 150
    assert log.critical_agents == 2


@pytest.mark.django_db
def test_email_service_dispatch_with_locmem(settings, tmp_path):
    """Valida que el servicio de correo genere contenido HTML, asunto y adjuntos correctamente."""
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    settings.DEFAULT_FROM_EMAIL = 'notificaciones@empresa.com'

    # Crear destinatario activo en BD
    AutomationAlertRecipient.objects.create(
        name="Coordinador de Calidad",
        email="calidad@empresa.com",
        is_active=True
    )

    # Crear archivo ficticio simulando reporte Excel
    dummy_report = tmp_path / "reporte_test.xlsx"
    dummy_report.write_text("Contenido simulado de Excel")

    kpis = {
        'threshold': 20.0,
        'total_calls': 100,
        'total_agents': 2,
        'approved_agents': 1,
        'observation_agents': 0,
        'review_agents': 1,
        'weighted_tmo_global': 22.4,
    }
    df_agents = [
        {
            'agent_code': 'AG-101',
            'agent_name': 'Asesor Desviado',
            'total_calls': 50,
            'total_duration': 75000,
            'tmo': 25.0,
            'excess_seconds': 5.0,
            'status': 'REQUIERE REVISIÓN'
        },
        {
            'agent_code': 'AG-102',
            'agent_name': 'Asesor Cumplido',
            'total_calls': 50,
            'total_duration': 54000,
            'tmo': 18.0,
            'excess_seconds': 0.0,
            'status': 'APROBADO'
        }
    ]

    success, message = EmailNotificationService.send_hourly_audit_alert(
        kpis=kpis,
        df_agents=df_agents,
        report_path=str(dummy_report)
    )

    assert success is True
    assert len(mail.outbox) == 1
    sent_mail = mail.outbox[0]
    assert "[ALERTA CRÍTICA]" in sent_mail.subject
    assert "calidad@empresa.com" in sent_mail.to
    assert len(sent_mail.attachments) == 1
    assert sent_mail.attachments[0][0] == "reporte_test.xlsx"


def test_scheduler_singleton_pattern():
    """Verifica que AutomationSchedulerService cumpla con el patrón Singleton."""
    service1 = AutomationSchedulerService()
    service2 = AutomationSchedulerService()
    assert service1 is service2
    assert service1 is scheduler_service


@pytest.mark.django_db
def test_scheduler_audit_pipeline_empty_db():
    """Valida que si no existen registros, el pipeline genere un log con estado WARNING sin fallar."""
    log = scheduler_service.run_audit_pipeline(trigger_type='MANUAL')
    assert log is not None
    assert log.status == 'WARNING'
    assert "No se encontraron registros" in log.summary


@pytest.mark.django_db
def test_scheduler_audit_pipeline_with_records(settings):
    """Valida el ciclo completo de ejecución del pipeline con registros reales."""
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

    # 1. Configurar umbral operativo
    ThresholdConfig.objects.create(
        name="Meta Operativa 20s",
        threshold_seconds=20.0,
        warning_multiplier=1.15,
        z_score_threshold=2.0,
        is_active=True
    )

    # 2. Ingestar asesor y archivo
    file_record = IngestedFile.objects.create(
        filename="test_corte.xlsx",
        sha256_hash="hash123456",
        file_size_bytes=1024,
        total_rows=2,
        valid_rows=2
    )
    agent1 = Agent.objects.create(name="Carlos Asesor", code="AG-101")
    agent2 = Agent.objects.create(name="Maria Asesora", code="AG-102")

    # 3. Crear registros de llamadas
    now = timezone.now()
    CallRecord.objects.create(
        call_id="CALL-001",
        ingested_file=file_record,
        agent=agent1,
        call_datetime=now,
        call_status="CONTESTADA",
        total_duration_seconds=15.0,  # <= 20.0 (Aprobado)
        talk_time_seconds=12.0,
        wait_time_seconds=2.0,
        wrap_up_time_seconds=1.0,
        is_valid=True
    )
    CallRecord.objects.create(
        call_id="CALL-002",
        ingested_file=file_record,
        agent=agent2,
        call_datetime=now,
        call_status="CONTESTADA",
        total_duration_seconds=35.0,  # > 23.0 (Crítico: Requiere Revisión)
        talk_time_seconds=30.0,
        wait_time_seconds=3.0,
        wrap_up_time_seconds=2.0,
        is_valid=True
    )

    # 4. Ejecutar el pipeline
    log = scheduler_service.run_audit_pipeline(trigger_type='MANUAL')

    assert log is not None
    assert log.status == 'SUCCESS'
    assert log.records_processed == 2
    assert log.agents_evaluated == 2
    assert log.critical_agents == 1
    assert log.compliant_agents == 1
    assert log.global_weighted_tmo == 25.0  # (15 + 35) / 2 = 25.0s
    assert os.path.exists(log.report_file_path)


@pytest.mark.django_db
def test_automation_views_endpoints(client: Client):
    """Valida que los endpoints web del panel respondan adecuadamente."""
    # 1. Panel principal
    response_panel = client.get(reverse('automation:panel'))
    assert response_panel.status_code == 200
    assert b"Motor de Automatizaci" in response_panel.content

    # 2. Disparo manual
    with patch.object(scheduler_service, 'trigger_now') as mock_trigger:
        response_trigger = client.post(reverse('automation:trigger'))
        assert response_trigger.status_code == 302
        assert response_trigger.url == reverse('automation:panel')
        mock_trigger.assert_called_once_with(background=True)

    # 3. Alternar estado del scheduler (toggle)
    response_toggle = client.post(reverse('automation:toggle'))
    assert response_toggle.status_code == 302
    assert response_toggle.url == reverse('automation:panel')

    # 4. Detalle de log
    log = ExecutionLog.objects.create(
        job_name="Auditoría Web Test",
        status="SUCCESS",
        summary="Resumen de prueba"
    )
    response_detail = client.get(reverse('automation:log_detail', kwargs={'pk': log.id}))
    assert response_detail.status_code == 200
    assert b"Auditor" in response_detail.content
