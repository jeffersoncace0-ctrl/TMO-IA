"""Vistas de control, monitoreo y auditoría de tareas programadas (APScheduler).

Proporciona la interfaz interactiva para supervisar el estado del motor
de automatizaciones, disparar cortes manuales en segundo plano, alternar
el estado activo/pausado del programador y auditar el historial de ejecuciones.
"""

import logging
import os
from pathlib import Path
from typing import Any, Dict

from django.contrib import messages
from django.http import FileResponse, Http404, HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views import View

from apps.automation.models import AutomationAlertRecipient, AutomationJob, ExecutionLog
from services.scheduler_service import scheduler_service

logger = logging.getLogger('apps.automation.views')


class AutomationDashboardView(View):
    """Panel principal de control del motor de automatizaciones y tareas periódicas."""

    def get(self, request: HttpRequest) -> HttpResponse:
        scheduler_status = scheduler_service.get_status()

        # Obtener o sincronizar el registro de la tarea de corte horario
        job = AutomationJob.objects.filter(job_type='HOURLY_AUDIT').first()

        # Obtener las últimas 25 ejecuciones registradas
        recent_logs = ExecutionLog.objects.select_related('job').order_by('-started_at')[:25]

        # Obtener lista de destinatarios configurados
        recipients = AutomationAlertRecipient.objects.all().order_by('name')

        # Calcular métricas globales para tarjetas de cabecera
        total_runs = ExecutionLog.objects.count()
        successful_runs = ExecutionLog.objects.filter(status='SUCCESS').count()
        failed_runs = ExecutionLog.objects.filter(status='FAILED').count()
        warning_runs = ExecutionLog.objects.filter(status='WARNING').count()
        success_rate = round((successful_runs / total_runs) * 100.0, 1) if total_runs > 0 else 100.0

        context: Dict[str, Any] = {
            'title': 'Panel de Control de Automatizaciones',
            'scheduler_status': scheduler_status,
            'job': job,
            'recent_logs': recent_logs,
            'recipients': recipients,
            'metrics': {
                'total_runs': total_runs,
                'successful_runs': successful_runs,
                'failed_runs': failed_runs,
                'warning_runs': warning_runs,
                'success_rate': success_rate,
            }
        }
        return render(request, 'automation/panel.html', context)


class TriggerJobView(View):
    """Dispara de manera inmediata la ejecución del pipeline de auditoría de TMO."""

    def post(self, request: HttpRequest) -> HttpResponse:
        try:
            # Se ejecuta en segundo plano mediante un hilo para no bloquear la solicitud HTTP
            scheduler_service.trigger_now(background=True)
            messages.success(
                request,
                "🚀 Disparo manual iniciado en segundo plano. El pipeline procesará los registros, "
                "generará el libro Excel y despachará la alerta. El resultado aparecerá en el historial en unos instantes."
            )
        except Exception as exc:
            logger.error("Error al disparar tarea manual: %s", exc, exc_info=True)
            messages.error(request, f"No se pudo iniciar la tarea: {str(exc)}")

        return redirect('automation:panel')


class ToggleSchedulerView(View):
    """Permite pausar, reanudar o inicializar el programador automático APScheduler."""

    def post(self, request: HttpRequest) -> HttpResponse:
        try:
            if not scheduler_service.is_running:
                scheduler_service.start()
                messages.success(request, "✅ Motor APScheduler iniciado exitosamente.")
            elif scheduler_service.is_paused:
                scheduler_service.resume()
                messages.success(request, "▶ Automatización periódica reanudada. El corte horario continuará normalmente.")
            else:
                scheduler_service.pause()
                messages.warning(request, "⏸ Automatización periódica pausada. No se ejecutarán cortes automáticos hasta su reactivación.")
        except Exception as exc:
            logger.error("Error al alternar estado del scheduler: %s", exc, exc_info=True)
            messages.error(request, f"Error al modificar estado del programador: {str(exc)}")

        return redirect('automation:panel')


class ExecutionLogDetailView(View):
    """Muestra la traza técnica completa y el desglose de una ejecución de auditoría."""

    def get(self, request: HttpRequest, pk: int) -> HttpResponse:
        log_entry = get_object_or_404(ExecutionLog, pk=pk)
        return render(
            request,
            'automation/log_detail.html',
            {
                'title': f'Detalle de Auditoría #{log_entry.id}',
                'log': log_entry,
            }
        )


class DownloadExecutionReportView(View):
    """Permite la descarga directa del reporte Excel generado en una corrida histórica."""

    def get(self, request: HttpRequest, pk: int) -> HttpResponse:
        log_entry = get_object_or_404(ExecutionLog, pk=pk)
        file_path = log_entry.report_file_path

        if not file_path or not os.path.exists(file_path):
            messages.error(request, "El archivo de reporte Excel asociado a esta corrida no se encuentra disponible en disco.")
            return redirect('automation:panel')

        response = FileResponse(
            open(file_path, 'rb'),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{Path(file_path).name}"'
        return response
