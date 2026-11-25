"""
Servicio de manipulación, lectura y generación de reportes Excel estilizados con OpenPyXL.
"""

from typing import Optional
from pathlib import Path
import pandas as pd
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import logging

logger = logging.getLogger("documents")


def read_file_to_dataframe(file_path: Path) -> pd.DataFrame:
    """
    Lee un archivo Excel (.xlsx, .xls) o CSV y lo convierte en DataFrame de Pandas.
    """
    ext = file_path.suffix.lower()
    logger.info("Leyendo archivo: %s con extensión: %s", file_path.name, ext)

    if ext in [".xlsx", ".xlsm", ".xltx"]:
        return pd.read_excel(file_path, engine="openpyxl")
    elif ext == ".xls":
        return pd.read_excel(file_path)
    elif ext == ".csv":
        # Intentar con codificación UTF-8, y fallback a latin-1 si falla
        try:
            return pd.read_csv(file_path, encoding="utf-8")
        except UnicodeDecodeError:
            return pd.read_csv(file_path, encoding="latin-1")
    else:
        raise ValueError(f"Formato no soportado: {ext}")


def generate_styled_excel_report(df: pd.DataFrame, output_path: Path, title: str = "Reporte de Auditoría Comercial") -> Path:
    """
    Genera un informe Excel altamente profesional con encabezados coloreados,
    formato de moneda, bordes y fila de totales con fórmulas nativas de Excel.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    wb = Workbook()
    ws = wb.active
    ws.title = "Auditoría Consolidada"

    # Paleta de estilos corporativos
    navy_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    title_font = Font(name="Calibri", size=16, bold=True, color="1F4E79")
    bold_font = Font(name="Calibri", size=11, bold=True)
    regular_font = Font(name="Calibri", size=11)
    
    thin_border = Border(
        left=Side(style="thin", color="D9D9D9"),
        right=Side(style="thin", color="D9D9D9"),
        top=Side(style="thin", color="D9D9D9"),
        bottom=Side(style="thin", color="D9D9D9"),
    )
    total_border = Border(
        top=Side(style="thin", color="000000"),
        bottom=Side(style="double", color="000000"),
    )

    # 1. Título del Reporte
    ws.merge_cells("A1:H1")
    title_cell = ws["A1"]
    title_cell.value = title
    title_cell.font = title_font
    title_cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 30

    # 2. Encabezados de Columnas
    columns = list(df.columns)
    ws.row_dimensions[3].height = 24

    for col_idx, col_name in enumerate(columns, start=1):
        cell = ws.cell(row=3, column=col_idx, value=col_name.replace("_", " ").upper())
        cell.fill = navy_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    # 3. Filas de Datos
    start_row = 4
    for r_idx, row_data in enumerate(df.itertuples(index=False), start=start_row):
        ws.row_dimensions[r_idx].height = 20
        for c_idx, val in enumerate(row_data, start=1):
            cell = ws.cell(row=r_idx, column=c_idx, value=val)
            cell.font = regular_font
            cell.border = thin_border

            # Aplicar formato según tipo de dato
            col_header = columns[c_idx - 1].lower()
            if "price" in col_header or "amount" in col_header or "monto" in col_header:
                cell.number_format = "$#,##0.00"
                cell.alignment = Alignment(horizontal="right")
            elif "quantity" in col_header or "cantidad" in col_header:
                cell.number_format = "#,##0"
                cell.alignment = Alignment(horizontal="right")
            elif "date" in col_header or "fecha" in col_header:
                cell.alignment = Alignment(horizontal="center")
            else:
                cell.alignment = Alignment(horizontal="left")

    end_row = start_row + len(df) - 1

    # 4. Fila de Totales con Fórmulas de Excel
    if len(df) > 0:
        total_row = end_row + 2
        ws.row_dimensions[total_row].height = 22
        label_cell = ws.cell(row=total_row, column=1, value="TOTAL GENERAL")
        label_cell.font = bold_font

        for c_idx, col_name in enumerate(columns, start=1):
            col_letter = get_column_letter(c_idx)
            cell = ws.cell(row=total_row, column=c_idx)
            cell.border = total_border
            cell.font = bold_font

            col_header = col_name.lower()
            if "amount" in col_header or "total" in col_header or "tax" in col_header:
                cell.value = f"=SUM({col_letter}{start_row}:{col_letter}{end_row})"
                cell.number_format = "$#,##0.00"
                cell.alignment = Alignment(horizontal="right")
            elif "quantity" in col_header:
                cell.value = f"=SUM({col_letter}{start_row}:{col_letter}{end_row})"
                cell.number_format = "#,##0"
                cell.alignment = Alignment(horizontal="right")

    # 5. Autoajuste de Ancho de Columnas
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or "")
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    wb.save(output_path)
    logger.info("Reporte Excel estilizado generado en: %s", output_path)
    return output_path
