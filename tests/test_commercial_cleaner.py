"""
Pruebas unitarias para el pipeline de limpieza y validación de datos (Pandas).
"""

import pandas as pd
from services.data_cleaner import clean_commercial_dataframe


def test_clean_commercial_dataframe_success():
    """Valida la correcta normalización y cálculo de impuestos en datos válidos."""
    raw_data = {
        "Codigo Factura": ["FAC-001", "FAC-002"],
        "Cliente": ["Empresa Alfa", "Corporación Beta"],
        "Region": ["Norte", "Sur"],
        "Categoria Producto": ["Hardware", "Cloud"],
        "Cantidad": [10, 5],
        "Precio Unitario": [100.0, 200.0],
        "Fecha Transaccion": ["2026-01-15", "2026-01-20"],
        "Estado": ["Pagada", "Pendiente"],
    }
    df_raw = pd.DataFrame(raw_data)
    result = clean_commercial_dataframe(df_raw)

    assert result.is_valid is True
    assert len(result.errors) == 0
    df = result.dataframe

    # Verificar cálculo de totales e impuestos (IVA 19%)
    assert df.loc[0, "total_amount"] == 1000.0
    assert df.loc[0, "tax_amount"] == 190.0
    assert df.loc[1, "total_amount"] == 1000.0
    assert df.loc[1, "tax_amount"] == 190.0

    # Verificar mapeo de estados
    assert df.loc[0, "status"] == "PAID"
    assert df.loc[1, "status"] == "PENDING"


def test_clean_commercial_dataframe_missing_columns():
    """Verifica que se detecten y listen columnas obligatorias faltantes."""
    invalid_data = {
        "Codigo Factura": ["FAC-001"],
        "Cliente": ["Empresa Alfa"],
        # Faltan region, categoria, cantidad, precio, fecha, estado
    }
    df_raw = pd.DataFrame(invalid_data)
    result = clean_commercial_dataframe(df_raw)

    assert result.is_valid is False
    assert len(result.errors) > 0
    assert "carece de columnas obligatorias" in result.errors[0]
