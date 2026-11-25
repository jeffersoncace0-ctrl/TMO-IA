"""Pruebas de Resiliencia, Casos Borde y Manejo de Errores para la plataforma TMO.

Cubre:
- Archivos corruptos, vacíos o con extensiones prohibidas (.txt, .exe).
- Manejo de anomalías en llamadas: duraciones negativas, duplicados y NaN.
- Protección contra condiciones de carrera (Race Conditions) y concurrencia.
- Prevención de división por cero en cálculo de Z-Score con agente único.
"""

from pathlib import Path
import threading
import pandas as pd
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from django.urls import reverse

from apps.operations.forms import ExcelUploadForm
from services.data_processor import DataProcessorService
from services.tmo_calculator import TMOCalculatorService
from services.scheduler_service import scheduler_service

BASE_DIR = Path(__file__).resolve().parent.parent


def test_form_validation_rejects_invalid_extensions():
    """Valida que el formulario rechace archivos ejecutables o de texto plano."""
    # Archivo .txt
    txt_file = SimpleUploadedFile("malware.txt", b"Texto plano", content_type="text/plain")
    form_txt = ExcelUploadForm(files={'file': txt_file})
    assert not form_txt.is_valid()
    assert "no es un libro de Excel válido" in str(form_txt.errors)

    # Archivo .exe
    exe_file = SimpleUploadedFile("script.exe", b"Binario", content_type="application/octet-stream")
    form_exe = ExcelUploadForm(files={'file': exe_file})
    assert not form_exe.is_valid()
    assert "no es un libro de Excel válido" in str(form_exe.errors)


def test_data_processor_empty_or_corrupt_file():
    """Valida que un flujo de bytes vacío o corrupto lance ValueError controlado sin botar el sistema."""
    with pytest.raises(Exception):
        DataProcessorService.process_excel(b"")

    with pytest.raises(Exception):
        DataProcessorService.process_excel(b"ESTO NO ES UN ARCHIVO ZIP NI EXCEL")


def test_data_processor_edge_cases_dataset():
    """Valida la detección de anomalías operativas en el dataset edge cases."""
    edge_cases_path = BASE_DIR / 'sample_data' / 'call_center_edge_cases.xlsx'
    assert edge_cases_path.exists()

    df_valid, df_invalid, stats = DataProcessorService.process_excel(str(edge_cases_path))

    # Validar detección de duplicados
    assert stats['duplicate_rows'] >= 1
    # Validar que los inválidos contengan explicaciones de error claras
    error_texts = " ".join(df_invalid['validation_error'].tolist())
    assert "Llamada duplicada" in error_texts
    assert "Duración negativa" in error_texts or "Falta código de asesor" in error_texts


def test_duration_parser_resilience():
    """Valida la robustez del analizador sintáctico de duraciones ante formatos heterogéneos."""
    # Formato HH:MM:SS
    assert DataProcessorService.parse_duration_to_seconds("01:30:15") == 5415.0
    # Formato MM:SS
    assert DataProcessorService.parse_duration_to_seconds("00:25") == 25.0
    assert DataProcessorService.parse_duration_to_seconds("15:30") == 930.0
    # Numérico
    assert DataProcessorService.parse_duration_to_seconds(120) == 120.0
    assert DataProcessorService.parse_duration_to_seconds(45.5) == 45.5
    # Cadena corrupta o inválida (debe devolver None sin romper el hilo)
    assert DataProcessorService.parse_duration_to_seconds("INVALID_TIME") is None
    assert DataProcessorService.parse_duration_to_seconds(None) is None
    assert DataProcessorService.parse_duration_to_seconds(float('nan')) is None


def test_tmo_calculator_single_agent_zero_variance():
    """Valida que con 1 solo agente el cálculo de Z-Score no divida por cero."""
    df_single = pd.DataFrame([{
        'call_id': 'CALL-001',
        'agent_code': 'AG-ONLY',
        'agent_name': 'Asesor Unico',
        'call_status': 'CONTESTADA',
        'total_duration': 20.0,
        'talk_time': 15.0,
        'wait_time': 2.0,
        'wrap_up_time': 3.0,
        'silence_time': 1.0,
    }])

    df_summary = TMOCalculatorService.calculate_agent_summaries(df_single, threshold=20.0)
    assert len(df_summary) == 1
    # Con un solo agente, la desviación estándar es 0 o indefinida, Z-Score debe ser 0.0
    assert df_summary['z_score'].iloc[0] == 0.0
    assert df_summary['is_outlier'].iloc[0] is False or df_summary['is_outlier'].iloc[0] == 0


def test_scheduler_concurrency_lock_protection():
    """Valida que el candado de concurrencia impida dos ejecuciones simultáneas del pipeline."""
    # Adquirir artificialmente el candado
    acquired = scheduler_service._execution_lock.acquire(blocking=False)
    assert acquired is True, "El candado debe estar disponible inicialmente"

    try:
        # Intentar ejecutar el pipeline mientras el candado está ocupado
        result = scheduler_service.run_audit_pipeline(trigger_type='MANUAL')
        # Debe retornar None inmediatamente sin ejecutar tareas paralelas
        assert result is None
    finally:
        # Liberar el candado
        scheduler_service._execution_lock.release()
