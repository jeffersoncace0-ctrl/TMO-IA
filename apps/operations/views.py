import logging
from typing import Optional
from django.shortcuts import render, redirect, get_object_or_404
from django.views import View
from django.http import HttpResponse, HttpRequest
from django.contrib import messages
from django.core.paginator import Paginator
from django.db import transaction
from django.utils import timezone
import pandas as pd

from .models import IngestedFile, CallRecord, Agent, ThresholdConfig
from .forms import ExcelUploadForm
from services.data_processor import DataProcessorService
from services.tmo_calculator import TMOCalculatorService
from services.excel_generator import ExcelReportService

logger = logging.getLogger('apps.operations')


class UploadExcelView(View):
    """
    Controlador para la carga, previsualización, saneamiento y persistencia
    de libros de Excel de telefonía.
    """
    template_name = 'operations/upload.html'

    def get(self, request: HttpRequest) -> HttpResponse:
        form = ExcelUploadForm()
        recent_files = IngestedFile.objects.all().order_by('-created_at')[:5]
        active_threshold = ThresholdConfig.objects.filter(is_active=True).first()

        return render(request, self.template_name, {
            'form': form,
            'recent_files': recent_files,
            'active_threshold': active_threshold.threshold_seconds if active_threshold else 20.0,
        })

    def post(self, request: HttpRequest) -> HttpResponse:
        form = ExcelUploadForm(request.POST, request.FILES)
        if not form.is_valid():
            recent_files = IngestedFile.objects.all().order_by('-created_at')[:5]
            return render(request, self.template_name, {
                'form': form,
                'recent_files': recent_files
            })

        uploaded_file = form.cleaned_data['file']
        file_bytes = uploaded_file.read()
        file_hash = DataProcessorService.calculate_sha256(file_bytes)

        # Validación de Idempotencia (¿Ya fue cargado exactamente este archivo?)
        existing = IngestedFile.objects.filter(sha256_hash=file_hash).first()
        if existing and existing.status == 'PROCESSED':
            messages.warning(
                request,
                f"El archivo '{uploaded_file.name}' ya fue procesado con anterioridad el {existing.created_at.strftime('%d/%m/%Y %H:%M')} (Idempotencia verificada: SHA-256 idéntico)."
            )
            return redirect('operations:file_detail', file_id=existing.id)

        try:
            # Procesar y sanear datos mediante Pandas
            df_valid, df_invalid, stats = DataProcessorService.process_excel(file_bytes)

            with transaction.atomic():
                # 1. Registrar archivo
                ingested = IngestedFile.objects.create(
                    filename=uploaded_file.name,
                    sha256_hash=file_hash,
                    file_size_bytes=stats['file_size'],
                    total_rows=stats['total_rows'],
                    valid_rows=stats['valid_rows'],
                    invalid_rows=stats['invalid_rows'],
                    duplicate_rows=stats['duplicate_rows'],
                    status='PROCESSED',
                    file=uploaded_file
                )

                # 2. Registrar o actualizar asesores
                agents_dict = {}
                # Obtener códigos únicos de asesores
                unique_agents = df_valid[['agent_code', 'agent_name']].drop_duplicates(subset=['agent_code'])
                for _, a_row in unique_agents.iterrows():
                    code = str(a_row['agent_code']).strip()
                    name = str(a_row['agent_name']).strip()
                    agent_obj, _ = Agent.objects.update_or_create(
                        code=code,
                        defaults={'name': name}
                    )
                    agents_dict[code] = agent_obj

                # 3. Crear registros de llamadas válidas en lote (Bulk Create)
                call_objects = []
                for _, row in df_valid.iterrows():
                    code = str(row['agent_code']).strip()
                    call_dt = None
                    if pd.notna(row['call_datetime']):
                        dt_candidate = row['call_datetime'].to_pydatetime() if hasattr(row['call_datetime'], 'to_pydatetime') else row['call_datetime']
                        call_dt = timezone.make_aware(dt_candidate, timezone.get_current_timezone()) if timezone.is_naive(dt_candidate) else dt_candidate

                    call_objects.append(CallRecord(
                        call_id=str(row['call_id']),
                        ingested_file=ingested,
                        agent=agents_dict.get(code),
                        call_datetime=call_dt,
                        call_type=str(row['call_type']),
                        call_status=str(row['call_status']),
                        total_duration_seconds=float(row['total_duration']),
                        talk_time_seconds=float(row['talk_time']),
                        wait_time_seconds=float(row['wait_time']),
                        wrap_up_time_seconds=float(row['wrap_up_time']),
                        silence_time_seconds=float(row['silence_time']),
                        is_valid=True,
                        is_duplicate=False
                    ))

                # 4. Crear registros de llamadas inválidas
                for _, row in df_invalid.iterrows():
                    code = str(row.get('agent_code', '')).strip()
                    call_objects.append(CallRecord(
                        call_id=str(row.get('call_id', 'N/A')),
                        ingested_file=ingested,
                        agent=agents_dict.get(code),
                        call_type=str(row.get('call_type', 'ENTRANTE')),
                        call_status=str(row.get('call_status', 'CONTESTADA')),
                        total_duration_seconds=float(row['total_duration']) if pd.notna(row.get('total_duration')) else 0.0,
                        is_valid=False,
                        is_duplicate=bool(row.get('is_duplicate', False)),
                        validation_error=str(row.get('validation_error', 'Datos corruptos'))
                    ))

                CallRecord.objects.bulk_create(call_objects, batch_size=1000)

            logger.info("Archivo '%s' ingestó %d llamadas válidas y %d inválidas.", uploaded_file.name, stats['valid_rows'], stats['invalid_rows'])
            messages.success(
                request,
                f"✅ Archivo '{uploaded_file.name}' procesado con éxito: {stats['valid_rows']} llamadas válidas saneadas, {stats['invalid_rows']} inválidas y {stats['duplicate_rows']} duplicados detectados."
            )
            return redirect('operations:file_detail', file_id=ingested.id)

        except Exception as exc:
            logger.exception("Error al procesar archivo Excel: %s", exc)
            messages.error(request, f"Error crítico durante el procesamiento de '{uploaded_file.name}': {exc}")
            recent_files = IngestedFile.objects.all().order_by('-created_at')[:5]
            return render(request, self.template_name, {'form': form, 'recent_files': recent_files})


class FileDetailView(View):
    """
    Vista detallada del resultado de un lote ingestó específico con tabla de asesores.
    """
    def get(self, request: HttpRequest, file_id: int) -> HttpResponse:
        ingested = get_object_or_404(IngestedFile, id=file_id)
        active_threshold = ThresholdConfig.objects.filter(is_active=True).first()
        threshold_val = active_threshold.threshold_seconds if active_threshold else 20.0

        # Construir DataFrame a partir de los registros de este archivo
        calls_qs = CallRecord.objects.filter(ingested_file=ingested, is_valid=True)
        if calls_qs.exists():
            data = list(calls_qs.values(
                'call_id', 'agent__code', 'agent__name', 'call_status', 'total_duration_seconds',
                'talk_time_seconds', 'wait_time_seconds', 'wrap_up_time_seconds', 'silence_time_seconds'
            ))
            df = pd.DataFrame(data).rename(columns={
                'agent__code': 'agent_code',
                'agent__name': 'agent_name',
                'total_duration_seconds': 'total_duration',
                'talk_time_seconds': 'talk_time',
                'wait_time_seconds': 'wait_time',
                'wrap_up_time_seconds': 'wrap_up_time',
                'silence_time_seconds': 'silence_time',
            })
            df_agents = TMOCalculatorService.calculate_agent_summaries(df, threshold=threshold_val)
            kpis = TMOCalculatorService.calculate_global_kpis(df, df_agents, threshold=threshold_val)
            agents_list = df_agents.to_dict('records')
        else:
            kpis = {}
            agents_list = []

        return render(request, 'operations/file_detail.html', {
            'file': ingested,
            'kpis': kpis,
            'agents': agents_list,
            'threshold': threshold_val,
        })


class CallRecordsListView(View):
    """
    Visualizador tabular paginado de todas las llamadas con filtros operativos.
    """
    def get(self, request: HttpRequest) -> HttpResponse:
        queryset = CallRecord.objects.select_related('agent', 'ingested_file').all()

        # Filtros
        agent_query = request.GET.get('agent', '').strip()
        if agent_query:
            queryset = queryset.filter(agent__name__icontains=agent_query) | queryset.filter(agent__code__icontains=agent_query)

        status_filter = request.GET.get('status', '').strip()
        if status_filter:
            queryset = queryset.filter(call_status=status_filter)

        valid_filter = request.GET.get('valid', '').strip()
        if valid_filter in ('true', '1'):
            queryset = queryset.filter(is_valid=True)
        elif valid_filter in ('false', '0'):
            queryset = queryset.filter(is_valid=False)

        paginator = Paginator(queryset, 50)
        page_number = request.GET.get('page', 1)
        page_obj = paginator.get_page(page_number)

        return render(request, 'operations/calls_table.html', {
            'page_obj': page_obj,
            'agent_query': agent_query,
            'status_filter': status_filter,
            'valid_filter': valid_filter,
            'total_count': paginator.count,
        })


class DownloadReportView(View):
    """
    Endpoint para generar y descargar dinámicamente el libro oficial de 4 hojas en Excel.
    """
    def get(self, request: HttpRequest, file_id: Optional[int] = None) -> HttpResponse:
        if file_id:
            calls_qs = CallRecord.objects.filter(ingested_file_id=file_id, is_valid=True)
            report_name = f"Reporte_TMO_Lote_{file_id}.xlsx"
        else:
            calls_qs = CallRecord.objects.filter(is_valid=True)
            report_name = "Reporte_TMO_Consolidado_Oficial.xlsx"

        active_threshold = ThresholdConfig.objects.filter(is_active=True).first()
        threshold_val = active_threshold.threshold_seconds if active_threshold else 20.0

        if not calls_qs.exists():
            messages.warning(request, "No hay llamadas válidas registradas para generar el reporte.")
            return redirect('operations:upload_excel')

        data = list(calls_qs.values(
            'call_id', 'agent__code', 'agent__name', 'call_datetime', 'call_type', 'call_status',
            'total_duration_seconds', 'talk_time_seconds', 'wait_time_seconds', 'wrap_up_time_seconds',
            'silence_time_seconds', 'is_valid'
        ))
        df = pd.DataFrame(data).rename(columns={
            'agent__code': 'agent_code',
            'agent__name': 'agent_name',
            'total_duration_seconds': 'total_duration',
            'talk_time_seconds': 'talk_time',
            'wait_time_seconds': 'wait_time',
            'wrap_up_time_seconds': 'wrap_up_time',
            'silence_time_seconds': 'silence_time',
        })

        df_agents = TMOCalculatorService.calculate_agent_summaries(df, threshold=threshold_val)
        kpis = TMOCalculatorService.calculate_global_kpis(df, df_agents, threshold=threshold_val)

        # Generar libro Excel con OpenPyXL en memoria
        excel_bytes = ExcelReportService.generate_report(df, df_agents, kpis)

        response = HttpResponse(
            excel_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{report_name}"'
        return response
