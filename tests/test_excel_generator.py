from pathlib import Path
import io
import pytest
import openpyxl
from services.data_processor import DataProcessorService
from services.tmo_calculator import TMOCalculatorService
from services.excel_generator import ExcelReportService

BASE_DIR = Path(__file__).resolve().parent.parent


def test_generate_4sheet_report_with_charts():
    """Valida la generación del libro de 4 hojas y la existencia de gráficos nativos."""
    demo_path = BASE_DIR / 'sample_data' / 'call_center_dataset_demo.xlsx'
    df_valid, _, _ = DataProcessorService.process_excel(str(demo_path))

    df_agents = TMOCalculatorService.calculate_agent_summaries(df_valid, threshold=20.0)
    kpis = TMOCalculatorService.calculate_global_kpis(df_valid, df_agents, threshold=20.0)

    # Generar bytes del Excel
    excel_bytes = ExcelReportService.generate_report(df_valid, df_agents, kpis)
    assert len(excel_bytes) > 5000, "El libro Excel generado debe tener un tamaño válido mayor a 5 KB"

    # Inspeccionar con OpenPyXL
    wb = openpyxl.load_workbook(io.BytesIO(excel_bytes))
    sheet_names = wb.sheetnames

    # Validar las 4 hojas requeridas
    assert "Datos_Originales" in sheet_names
    assert "Resumen_Asesores" in sheet_names
    assert "KPIs_Globales" in sheet_names
    assert "Auditoria_Outliers" in sheet_names

    # Validar presencia de gráficos nativos
    ws_summary = wb["Resumen_Asesores"]
    assert len(ws_summary._charts) >= 1, "Debe existir al menos 1 gráfico de barras en Resumen_Asesores"

    ws_kpis = wb["KPIs_Globales"]
    assert len(ws_kpis._charts) >= 1, "Debe existir al menos 1 gráfico de torta en KPIs_Globales"
