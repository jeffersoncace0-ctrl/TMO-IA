"""
Vista principal ejecutiva y tablero 360° de la plataforma unificada.
Consolida métricas de auditoría comercial (ETL) y control operativo de Call Center (TMO).
"""

from typing import Any, Dict
from django.shortcuts import render
from django.views import View
from django.db.models import Sum

from apps.documents.models import UploadedDocument, CommercialRecord
from apps.operations.models import CallRecord, Agent
from apps.automation.models import AutomationJob, ExecutionLog
from services.scheduler_service import scheduler_service


class HomeView(View):
    """Vista principal de bienvenida y consolidado gerencial 360°."""

    def get(self, request):
        # 1. Métricas de Auditoría Comercial (Ventas & Facturación)
        total_documents = UploadedDocument.objects.count()
        completed_documents = UploadedDocument.objects.filter(status='COMPLETED').count()
        total_commercial_records = CommercialRecord.objects.count()
        total_revenue = CommercialRecord.objects.aggregate(total=Sum('total_amount'))['total'] or 0.0

        # 2. Métricas de Operaciones Call Center (TMO)
        total_calls = CallRecord.objects.filter(is_valid=True).count()
        total_agents = Agent.objects.count()
        total_duration = CallRecord.objects.filter(is_valid=True).aggregate(total=Sum('total_duration_seconds'))['total'] or 0.0
        global_tmo = round(total_duration / total_calls, 2) if total_calls > 0 else 0.0

        # 3. Estado del Scheduler y Tareas
        recent_logs = ExecutionLog.objects.order_by('-started_at')[:8]
        scheduler_status = scheduler_service.get_status()

        context: Dict[str, Any] = {
            'title': 'Portal Corporativo 360° | Enterprise Core & Call Center TMO',
            # Comercial
            'total_documents': total_documents,
            'completed_documents': completed_documents,
            'total_commercial_records': total_commercial_records,
            'total_revenue': total_revenue,
            # Call Center
            'total_calls': total_calls,
            'total_agents': total_agents,
            'global_tmo': global_tmo,
            # Sistema & Automatización
            'recent_logs': recent_logs,
            'scheduler_status': scheduler_status,
        }
        return render(request, 'core/home.html', context)
