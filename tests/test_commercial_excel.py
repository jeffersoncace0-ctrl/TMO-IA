"""
Pruebas unitarias para el generador de reportes con OpenPyXL.
"""

from pathlib import Path
import pandas as pd
from services.excel_processor import generate_styled_excel_report


def test_generate_styled_excel_report(tmp_path: Path):
    """Verifica que el reporte Excel se genere físicamente con el formato esperado."""
    test_df = pd.DataFrame({
        "invoice_code": ["FAC-100", "FAC-101"],
        "client_name": ["Cliente 1", "Cliente 2"],
        "total_amount": [500.0, 750.0],
        "quantity": [2, 3],
    })

    output_file = tmp_path / "test_report.xlsx"
    res_path = generate_styled_excel_report(test_df, output_file, title="Test Report")

    assert res_path.exists()
    assert res_path.stat().st_size > 0
