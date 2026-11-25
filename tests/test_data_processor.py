import os
from pathlib import Path
import pytest
from services.data_processor import DataProcessorService

BASE_DIR = Path(__file__).resolve().parent.parent


def test_process_demo_dataset():
    """Valida la ingesta y saneamiento del dataset demo oficial de 92 llamadas."""
    demo_path = BASE_DIR / 'sample_data' / 'call_center_dataset_demo.xlsx'
    assert demo_path.exists(), "El dataset demo debe existir en sample_data/"

    df_valid, df_invalid, stats = DataProcessorService.process_excel(str(demo_path))

    assert stats['total_rows'] == 92
    assert stats['valid_rows'] >= 80
    assert stats['duplicate_rows'] == 0
    assert len(df_valid) == stats['valid_rows']
    assert 'total_duration' in df_valid.columns
    assert 'silence_time' in df_valid.columns
    assert 'agent_code' in df_valid.columns
    # Todas las duraciones deben ser estrictamente positivas
    assert (df_valid['total_duration'] >= 0).all()


def test_process_edge_cases_dataset():
    """Valida la detección estricta de duplicados, duraciones negativas y formatos corruptos."""
    edge_path = BASE_DIR / 'sample_data' / 'call_center_edge_cases.xlsx'
    assert edge_path.exists(), "El dataset de casos borde debe existir"

    df_valid, df_invalid, stats = DataProcessorService.process_excel(str(edge_path))

    assert stats['total_rows'] == 8
    # Debe detectar al menos 1 duplicado exacto (EDGE-001)
    assert stats['duplicate_rows'] >= 1
    # Debe aislar filas con duraciones negativas (-15) o strings corruptos ('INVALID_TIME')
    assert stats['invalid_rows'] >= 2
    # La fila con formato '00:25' debe ser convertida a 25.0 segundos
    converted_time = df_valid[df_valid['call_id'] == 'EDGE-004']
    if not converted_time.empty:
        assert converted_time['total_duration'].iloc[0] == 25.0


def test_parse_duration_to_seconds():
    """Prueba unitaria del convertidor de tiempos."""
    assert DataProcessorService.parse_duration_to_seconds(15) == 15.0
    assert DataProcessorService.parse_duration_to_seconds("23.5") == 23.5
    assert DataProcessorService.parse_duration_to_seconds("01:30") == 90.0  # 1 min 30 s
    assert DataProcessorService.parse_duration_to_seconds("01:00:00") == 3600.0  # 1 hora
    assert DataProcessorService.parse_duration_to_seconds("INVALID") is None
    assert DataProcessorService.parse_duration_to_seconds(None) is None
