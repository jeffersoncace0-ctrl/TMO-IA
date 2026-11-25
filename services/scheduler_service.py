"""Servicio de orquestación de tareas en segundo plano mediante APScheduler.

Implementa un programador persistente bajo el patrón Singleton para garantizar
una única instancia de BackgroundScheduler. Ejecuta de forma periódica o
bajo demanda el pipeline de auditoría de TMO, cálculo de métricas, generación
del reporte ejecutivo en Excel y despacho de alertas SMTP.
"""

import logging
import os
import threading
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger('services.scheduler')


class AutomationSchedulerService:
    """Orquestador Singleton para la gestión de tareas programadas con APScheduler."""

    _instance: Optional['AutomationSchedulerService'] = None
    _init_lock = threading.Lock()

    def __new__(cls, *args, **kwargs) -> 'AutomationSchedulerService':
        """Garantiza la existencia de una única instancia del servicio (Patrón Singleton)."""
        with cls._init_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self) -> None:
        if getattr(self, '_initialized', False):
            return

        self._scheduler = BackgroundScheduler(
            timezone=str(getattr(settings, 'TIME_ZONE', 'America/Bogota')),
            daemon=True
        )
        self._execution_lock = threading.Lock()
        self._job_id = "hourly_tmo_audit_job"
        self._is_paused = False
        self._initialized = True
        logger.info("AutomationSchedulerService inicializado exitosamente.")

    @property
    def is_running(self) -> bool:
        """Indica si el scheduler de fondo se encuentra activo."""
        return self._scheduler.running

    @property
    def is_paused(self) -> bool:
        """Indica si las tareas del scheduler están en estado pausado."""
        return self._is_paused

    def start(self, interval_minutes: Optional[int] = None) -> bool:
        """Inicia el programador y registra el corte periódico de TMO."""
        interval = interval_minutes or getattr(settings, 'SCHEDULER_INTERVAL_MINUTES', 60)

        with self._init_lock:
            if not self._scheduler.running:
                # Tarea 1: Auditoría de Llamadas y TMO
                self._scheduler.add_job(
                    func=self.run_audit_pipeline,
                    trigger=IntervalTrigger(minutes=interval),
                    id=self._job_id,
                    name="Corte Periódico y Auditoría de TMO",
                    replace_existing=True,
                    kwargs={'trigger_type': 'SCHEDULED'}
                )
                # Tarea 2: Auditoría Continua de Documentos Comerciales ETL
                self._scheduler.add_job(
                    func=self.run_commercial_audit_pipeline,
                    trigger=IntervalTrigger(minutes=5),
                    id="commercial_etl_audit_job",
                    name="Auditoría Continua de Documentos Comerciales",
                    replace_existing=True,
                    kwargs={'trigger_type': 'SCHEDULED'}
                )
                self._scheduler.start()
                self._is_paused = False
                logger.info("Scheduler APScheduler iniciado. Frecuencia: cada %d minutos.", interval)
                self._sync_job_model(is_active=True, interval_minutes=interval)
                return True
            else:
                logger.warning("El scheduler ya se encontraba en ejecución.")
                return False

    def pause(self) -> bool:
        """Pausa temporalmente la ejecución automática de tareas."""
        if self._scheduler.running and not self._is_paused:
            self._scheduler.pause_job(self._job_id)
            self._is_paused = True
            logger.info("Tarea de auditoría periódica pausada.")
            self._sync_job_model(is_active=False)
            return True
        return False

    def resume(self) -> bool:
        """Reanuda la ejecución automática de tareas previamente pausadas."""
        if self._scheduler.running and self._is_paused:
            self._scheduler.resume_job(self._job_id)
            self._is_paused = False
            logger.info("Tarea de auditoría periódica reanudada.")
            self._sync_job_model(is_active=True)
            return True
        return False

    def shutdown(self) -> None:
        """Detiene de forma segura el planificador en segundo plano."""
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            self._is_paused = False
            logger.info("Scheduler APScheduler detenido de forma segura.")

    def trigger_now(self, background: bool = True) -> Any:
        """Ejecuta el pipeline inmediatamente.

        Si background=True, se ejecuta en un hilo separado para no bloquear peticiones HTTP.
        Asegura el manejo limpio de conexiones de base de datos por hilo en Django.
        Si background=False, se ejecuta de manera sincrónica (útil para pruebas unitarias).
        """
        if background:
            def _thread_target():
                from django.db import connection
                connection.close()
                try:
                    self.run_audit_pipeline(trigger_type='MANUAL')
                finally:
                    connection.close()

            worker_thread = threading.Thread(
                target=_thread_target,
                daemon=True,
                name="Manual-TMO-Audit-Worker"
            )
            worker_thread.start()
            logger.info("Disparo manual lanzado en hilo en segundo plano.")
            return worker_thread
        else:
            return self.run_audit_pipeline(trigger_type='MANUAL')

    def run_audit_pipeline(self, trigger_type: str = 'SCHEDULED') -> Any:
        """Pipeline central de auditoría de TMO."""
        from apps.automation.models import AutomationJob, ExecutionLog
        from apps.operations.models import CallRecord, ThresholdConfig
        from services.tmo_calculator import TMOCalculatorService
        from services.excel_generator import ExcelReportService
        from services.email_service import EmailNotificationService

        # Control de concurrencia: evitar dos ejecuciones simultáneas del pipeline
        if not self._execution_lock.acquire(blocking=False):
            logger.warning("Pipeline de auditoría omitido: ya existe una ejecución en curso.")
            return None

        started_at = timezone.now()
        job_instance = self._get_or_create_job_instance()

        log_entry = ExecutionLog.objects.create(
            job=job_instance,
            job_name="Auditoría Horaria de TMO",
            trigger_type=trigger_type,
            status='RUNNING',
            started_at=started_at
        )

        try:
            logger.info("Iniciando pipeline de corte de TMO [ID Log: %d | Disparo: %s]...", log_entry.id, trigger_type)

            # Paso 1: Consultar registros disponibles en la base de datos
            records_qs = CallRecord.objects.select_related('agent', 'ingested_file').filter(is_valid=True)
            total_records = records_qs.count()

            if total_records == 0:
                finished_at = timezone.now()
                duration = (finished_at - started_at).total_seconds()
                summary_msg = "No se encontraron registros de llamadas válidos en el sistema para analizar."
                log_entry.status = 'WARNING'
                log_entry.finished_at = finished_at
                log_entry.duration_seconds = round(duration, 3)
                log_entry.summary = summary_msg
                log_entry.save(update_fields=['status', 'finished_at', 'duration_seconds', 'summary'])
                logger.warning(summary_msg)
                return log_entry

            # Construir DataFrame de llamadas válidas
            records_data = []
            for r in records_qs:
                agent_code = r.agent.code if r.agent else 'AG-000'
                agent_name = r.agent.name if r.agent else 'Asesor Desconocido'
                records_data.append({
                    'call_id': r.call_id,
                    'agent_code': agent_code,
                    'agent_name': agent_name,
                    'call_datetime': r.call_datetime,
                    'call_type': r.call_type,
                    'call_status': r.call_status,
                    'total_duration': r.total_duration_seconds,
                    'talk_time': r.talk_time_seconds,
                    'wait_time': r.wait_time_seconds,
                    'silence_time': r.silence_time_seconds,
                    'wrap_up_time': r.wrap_up_time_seconds,
                })
            df_valid = pd.DataFrame(records_data)

            # Paso 2: Obtener umbral de calidad configurado
            threshold_config = ThresholdConfig.objects.filter(is_active=True).first()
            target_tmo = threshold_config.threshold_seconds if threshold_config else getattr(settings, 'DEFAULT_TMO_THRESHOLD', 20.0)
            warning_multiplier = threshold_config.warning_multiplier if threshold_config else 1.15

            # Paso 3: Calcular resúmenes y KPIs mediante TMOCalculatorService
            df_agents = TMOCalculatorService.calculate_agent_summaries(
                df_valid=df_valid,
                threshold=target_tmo,
                warning_multiplier=warning_multiplier
            )
            kpis = TMOCalculatorService.calculate_global_kpis(
                df_valid=df_valid,
                df_agents=df_agents,
                threshold=target_tmo
            )

            # Paso 4: Generar reporte consolidado en Excel (4 hojas con gráficos nativos)
            timestamp_tag = started_at.strftime('%Y%m%d_%H%M%S')
            report_dir = Path(settings.MEDIA_ROOT) / 'reports'
            report_dir.mkdir(parents=True, exist_ok=True)
            report_filename = f"corte_tmo_automatico_{timestamp_tag}.xlsx"
            report_path = str(report_dir / report_filename)

            ExcelReportService.generate_report(
                df_valid=df_valid,
                df_agents=df_agents,
                kpis=kpis,
                output_path=report_path
            )

            # Paso 5: Despacho de alerta por correo corporativo
            email_success, email_msg = EmailNotificationService.send_hourly_audit_alert(
                kpis=kpis,
                df_agents=df_agents,
                report_path=report_path
            )

            # Paso 6: Persistir métricas en ExecutionLog
            finished_at = timezone.now()
            duration = (finished_at - started_at).total_seconds()

            log_entry.status = 'SUCCESS'
            log_entry.finished_at = finished_at
            log_entry.duration_seconds = round(duration, 3)
            log_entry.records_processed = kpis.get('total_calls', total_records)
            log_entry.agents_evaluated = kpis.get('total_agents', 0)
            log_entry.compliant_agents = kpis.get('approved_agents', 0)
            log_entry.observation_agents = kpis.get('observation_agents', 0)
            log_entry.critical_agents = kpis.get('review_agents', 0)
            log_entry.global_weighted_tmo = kpis.get('weighted_tmo_global', 0.0)
            log_entry.email_sent = email_success
            log_entry.email_recipient = email_msg
            log_entry.report_file_path = report_path
            log_entry.summary = (
                f"Auditoría ejecutada con éxito en {duration:.2f}s. "
                f"Procesadas {log_entry.records_processed} llamadas de {log_entry.agents_evaluated} asesores. "
                f"TMO Ponderado Global: {log_entry.global_weighted_tmo:.2f}s (Meta: {target_tmo:.2f}s). "
                f"Asesores Críticos: {log_entry.critical_agents}."
            )
            log_entry.save()

            # Actualizar contadores del AutomationJob
            if job_instance:
                job_instance.total_runs += 1
                job_instance.successful_runs += 1
                job_instance.last_run_at = finished_at
                job_instance.next_run_at = self.get_next_run_time()
                job_instance.save(update_fields=['total_runs', 'successful_runs', 'last_run_at', 'next_run_at'])

            logger.info("Pipeline completado exitosamente. Log ID: %d", log_entry.id)
            return log_entry

        except Exception as exc:
            finished_at = timezone.now()
            duration = (finished_at - started_at).total_seconds()
            trace = traceback.format_exc()
            logger.error("Error crítico durante la ejecución del pipeline de auditoría: %s", exc, exc_info=True)

            log_entry.status = 'FAILED'
            log_entry.finished_at = finished_at
            log_entry.duration_seconds = round(duration, 3)
            log_entry.error_trace = trace
            log_entry.summary = f"Fallo en la ejecución: {str(exc)}"
            log_entry.save()

            if job_instance:
                job_instance.total_runs += 1
                job_instance.failed_runs += 1
                job_instance.last_run_at = finished_at
                job_instance.save(update_fields=['total_runs', 'failed_runs', 'last_run_at'])

            return log_entry

        finally:
            self._execution_lock.release()

    def run_commercial_audit_pipeline(self, trigger_type: str = 'SCHEDULED') -> Optional[Any]:
        """Ejecuta la auditoría y validación automática de documentos comerciales pendientes."""
        from apps.documents.models import UploadedDocument
        from apps.documents.services import process_document_etl

        pending_docs = UploadedDocument.objects.filter(status='PENDING')
        if not pending_docs.exists():
            return None

        started_at = timezone.now()
        log_entry = ExecutionLog.objects.create(
            job_name="Auditoría Continua de Documentos Comerciales",
            trigger_type=trigger_type,
            status='RUNNING',
            started_at=started_at
        )
        total_records = 0
        try:
            for doc in pending_docs:
                success, msg = process_document_etl(doc)
                if success:
                    total_records += doc.row_count

            finished_at = timezone.now()
            log_entry.status = 'SUCCESS'
            log_entry.finished_at = finished_at
            log_entry.duration_seconds = round((finished_at - started_at).total_seconds(), 3)
            log_entry.records_processed = total_records
            log_entry.summary = f"Procesados {pending_docs.count()} documento(s) con {total_records} registros comerciales."
            log_entry.save()
            return log_entry
        except Exception as exc:
            finished_at = timezone.now()
            log_entry.status = 'FAILED'
            log_entry.finished_at = finished_at
            log_entry.duration_seconds = round((finished_at - started_at).total_seconds(), 3)
            log_entry.error_trace = traceback.format_exc()
            log_entry.summary = f"Fallo en auditoría comercial: {str(exc)}"
            log_entry.save()
            return log_entry


    def get_next_run_time(self) -> Optional[datetime]:
        """Obtiene la fecha y hora calculada para el próximo disparo programado."""
        if not self._scheduler.running:
            return None
        job = self._scheduler.get_job(self._job_id)
        if job and job.next_run_time:
            return job.next_run_time
        return None

    def get_status(self) -> Dict[str, Any]:
        """Retorna un resumen del estado en tiempo real del programador."""
        from apps.automation.models import ExecutionLog

        next_run = self.get_next_run_time()
        next_run_str = next_run.strftime('%Y-%m-%d %H:%M:%S') if next_run else 'No programada'

        last_log = ExecutionLog.objects.order_by('-started_at').first()

        return {
            'is_running': self.is_running,
            'is_paused': self.is_paused,
            'job_id': self._job_id,
            'next_run_time': next_run_str,
            'interval_minutes': getattr(settings, 'SCHEDULER_INTERVAL_MINUTES', 60),
            'last_execution': {
                'id': last_log.id if last_log else None,
                'status': last_log.status if last_log else 'SIN_EJECUCIONES',
                'started_at': last_log.started_at.strftime('%Y-%m-%d %H:%M:%S') if last_log else 'N/A',
                'duration_seconds': last_log.duration_seconds if last_log else 0.0,
                'records_processed': last_log.records_processed if last_log else 0,
                'critical_agents': last_log.critical_agents if last_log else 0,
                'email_sent': last_log.email_sent if last_log else False,
            } if last_log else None
        }

    def _get_or_create_job_instance(self) -> Optional[Any]:
        """Recupera o crea la entidad AutomationJob en la base de datos."""
        try:
            from apps.automation.models import AutomationJob
            job, _ = AutomationJob.objects.get_or_create(
                job_type='HOURLY_AUDIT',
                defaults={
                    'name': 'Auditoría Horaria de TMO',
                    'interval_minutes': getattr(settings, 'SCHEDULER_INTERVAL_MINUTES', 60),
                    'is_active': True
                }
            )
            return job
        except Exception as e:
            logger.debug("Error al recuperar AutomationJob: %s", e)
            return None

    def _sync_job_model(self, is_active: bool, interval_minutes: Optional[int] = None) -> None:
        """Sincroniza el estado del job en la base de datos."""
        try:
            job = self._get_or_create_job_instance()
            if job:
                job.is_active = is_active
                if interval_minutes:
                    job.interval_minutes = interval_minutes
                job.next_run_at = self.get_next_run_time()
                job.save(update_fields=['is_active', 'interval_minutes', 'next_run_at'])
        except Exception as err:
            logger.debug("No se pudo sincronizar AutomationJob: %s", err)


# Instancia accesible globalmente
scheduler_service = AutomationSchedulerService()
