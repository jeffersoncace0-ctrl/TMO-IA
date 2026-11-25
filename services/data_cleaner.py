"""
Pipeline de validación y limpieza de datos tabulares mediante Pandas.
"""

from typing import Tuple, List, Dict, Any
import pandas as pd
import logging

logger = logging.getLogger("documents")

REQUIRED_COLUMNS = [
    "codigo_factura",
    "cliente",
    "region",
    "categoria_producto",
    "cantidad",
    "precio_unitario",
    "fecha_transaccion",
    "estado",
]

COLUMN_MAPPING = {
    "codigo_factura": "invoice_code",
    "cliente": "client_name",
    "region": "region",
    "categoria_producto": "product_category",
    "cantidad": "quantity",
    "precio_unitario": "unit_price",
    "fecha_transaccion": "transaction_date",
    "estado": "status",
}


class DataCleaningResult:
    """Contenedor de resultado del proceso de validación y limpieza."""

    def __init__(self, is_valid: bool, dataframe: pd.DataFrame, errors: List[str]):
        self.is_valid = is_valid
        self.dataframe = dataframe
        self.errors = errors


def clean_commercial_dataframe(df_raw: pd.DataFrame) -> DataCleaningResult:
    """
    Normaliza los nombres de columnas, valida tipos de datos y calcula montos.

    :param df_raw: DataFrame original leído de Excel o CSV.
    :return: DataCleaningResult con el DataFrame limpio o la lista de errores encontrados.
    """
    errors: List[str] = []

    # 1. Normalizar nombres de columnas a minúsculas y sin espacios laterales
    df = df_raw.copy()
    df.columns = [str(col).strip().lower().replace(" ", "_") for col in df.columns]

    # 2. Verificar presencia de columnas requeridas
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        msg = f"El archivo carece de columnas obligatorias: {', '.join(missing)}"
        logger.error(msg)
        return DataCleaningResult(is_valid=False, dataframe=pd.DataFrame(), errors=[msg])

    # 3. Eliminar filas completamente vacías
    initial_rows = len(df)
    df = df.dropna(how="all").copy()

    # 4. Validar y convertir tipos de datos
    try:
        # Limpieza de textos
        for text_col in ["codigo_factura", "cliente", "region", "categoria_producto", "estado"]:
            df[text_col] = df[text_col].astype(str).str.strip()

        # Validación numérica de cantidad
        df["cantidad"] = pd.to_numeric(df["cantidad"], errors="coerce").fillna(0).astype(int)

        # Validación numérica de precio unitario
        df["precio_unitario"] = pd.to_numeric(df["precio_unitario"], errors="coerce").fillna(0.0)

        # Filtro de registros con cantidades o precios no positivos
        invalid_numbers = df[(df["cantidad"] <= 0) | (df["precio_unitario"] <= 0)]
        if not invalid_numbers.empty:
            errors.append(f"Se encontraron {len(invalid_numbers)} registros con cantidad o precio menor o igual a 0.")

        # Conversión de fechas
        df["fecha_transaccion"] = pd.to_datetime(df["fecha_transaccion"], errors="coerce").dt.date
        invalid_dates = df[df["fecha_transaccion"].isna()]
        if not invalid_dates.empty:
            errors.append(f"Se encontraron {len(invalid_dates)} filas con formatos de fecha inválidos.")

        # 5. Cálculo vectorial de métricas derivadas (total e impuesto)
        df["total_amount"] = (df["cantidad"] * df["precio_unitario"]).round(2)
        df["tax_amount"] = (df["total_amount"] * 0.19).round(2)  # IVA 19%

        # 6. Mapeo a nombres de campos del modelo Django
        df = df.rename(columns=COLUMN_MAPPING)

        # 7. Normalización del estado
        estado_map = {
            "pagada": "PAID",
            "pagado": "PAID",
            "paid": "PAID",
            "pendiente": "PENDING",
            "pending": "PENDING",
            "anulada": "CANCELLED",
            "anulado": "CANCELLED",
            "cancelled": "CANCELLED",
        }
        df["status"] = df["status"].str.lower().map(lambda s: estado_map.get(s, "PENDING"))

        logger.info(
            "Limpieza de datos exitosa. Filas procesadas: %d (iniciales: %d)",
            len(df),
            initial_rows,
        )
        return DataCleaningResult(is_valid=True, dataframe=df, errors=errors)

    except Exception as exc:
        err_msg = f"Fallo inesperado durante la limpieza de datos: {str(exc)}"
        logger.exception(err_msg)
        return DataCleaningResult(is_valid=False, dataframe=pd.DataFrame(), errors=[err_msg])
