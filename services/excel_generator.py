import io
from pathlib import Path
from typing import Dict, Any, Optional
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.chart import BarChart, PieChart, Reference
import pandas as pd


class ExcelReportService:
    """
    Generador corporativo de reportes oficiales en Excel (.xlsx) de 4 hojas con estilos
    profesionales y gráficos nativos vectoriales incrustados (OpenPyXL) sin dependencias externas.
    """

    # Paleta de colores corporativos
    HEADER_FILL = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")  # Azul Marino
    HEADER_FONT = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    TITLE_FONT = Font(name="Calibri", size=14, bold=True, color="1E3A8A")
    SUBTITLE_FONT = Font(name="Calibri", size=10, italic=True, color="555555")

    # Estados
    STATUS_FILLS = {
        'APROBADO': PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid"),         # Verde suave
        'EN OBSERVACIÓN': PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid"),   # Amarillo suave
        'REQUIERE REVISIÓN': PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")# Rojo suave
    }
    STATUS_FONTS = {
        'APROBADO': Font(color="065F46", bold=True),
        'EN OBSERVACIÓN': Font(color="92400E", bold=True),
        'REQUIERE REVISIÓN': Font(color="991B1B", bold=True)
    }

    THIN_BORDER = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    @classmethod
    def generate_report(
        cls,
        df_valid: pd.DataFrame,
        df_agents: pd.DataFrame,
        kpis: Dict[str, Any],
        output_path: Optional[str] = None
    ) -> bytes:
        """
        Construye el libro oficial de 4 hojas y retorna los bytes generados
        o escribe directamente en disco si se suministra `output_path`.
        """
        wb = openpyxl.Workbook()

        # -------------------------------------------------------------
        # HOJA 1: Datos Crudos
        # -------------------------------------------------------------
        ws_raw = wb.active
        ws_raw.title = "Datos_Originales"
        ws_raw.views.sheetView[0].showGridLines = True

        raw_headers = [
            "ID Llamada", "Código Asesor", "Nombre Asesor", "Fecha/Hora",
            "Tipo", "Estado", "Duración (s)", "Conversación (s)",
            "Espera (s)", "Wrap-Up (s)", "Silencio (s)", "Válido"
        ]
        ws_raw.append(raw_headers)

        for col_idx in range(1, len(raw_headers) + 1):
            cell = ws_raw.cell(row=1, column=col_idx)
            cell.fill = cls.HEADER_FILL
            cell.font = cls.HEADER_FONT
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for _, row in df_valid.iterrows():
            ws_raw.append([
                str(row.get('call_id', '')),
                str(row.get('agent_code', '')),
                str(row.get('agent_name', '')),
                str(row.get('call_datetime', '')),
                str(row.get('call_type', '')),
                str(row.get('call_status', '')),
                float(row.get('total_duration', 0.0)),
                float(row.get('talk_time', 0.0)),
                float(row.get('wait_time', 0.0)),
                float(row.get('wrap_up_time', 0.0)),
                float(row.get('silence_time', 0.0)),
                "SÍ" if row.get('is_valid', True) else "NO"
            ])

        cls._auto_adjust_column_widths(ws_raw)

        # -------------------------------------------------------------
        # HOJA 2: Resumen de Asesores + Gráfico de Barras Nativo
        # -------------------------------------------------------------
        ws_summary = wb.create_sheet(title="Resumen_Asesores")
        ws_summary.views.sheetView[0].showGridLines = True

        summary_headers = [
            "Código", "Nombre del Asesor", "Total Llamadas", "Llamadas Contestadas",
            "TMO (s)", "% Silencio", "% Wrap-Up", "Exceso (s)", "Estado Operativo", "Z-Score"
        ]
        ws_summary.append(summary_headers)

        for col_idx in range(1, len(summary_headers) + 1):
            cell = ws_summary.cell(row=1, column=col_idx)
            cell.fill = cls.HEADER_FILL
            cell.font = cls.HEADER_FONT
            cell.alignment = Alignment(horizontal="center", vertical="center")

        start_row = 2
        for _, row in df_agents.iterrows():
            status_val = str(row['status'])
            ws_summary.append([
                str(row['agent_code']),
                str(row['agent_name']),
                int(row['total_calls']),
                int(row['answered_calls']),
                float(row['tmo']),
                float(row['silence_percentage']),
                float(row['wrap_up_percentage']),
                float(row['excess_seconds']),
                status_val,
                float(row.get('z_score', 0.0))
            ])
            # Aplicar colores al estado
            status_cell = ws_summary.cell(row=ws_summary.max_row, column=9)
            if status_val in cls.STATUS_FILLS:
                status_cell.fill = cls.STATUS_FILLS[status_val]
                status_cell.font = cls.STATUS_FONTS[status_val]
                status_cell.alignment = Alignment(horizontal="center")

        cls._auto_adjust_column_widths(ws_summary)

        # Incrustar Gráfico de Barras Nativo OpenPyXL (TMO por Agente)
        if len(df_agents) > 0:
            chart = BarChart()
            chart.type = "col"
            chart.style = 10
            chart.title = f"TMO por Asesor vs. Umbral Objetivo ({kpis.get('threshold', 20.0)}s)"
            chart.y_axis.title = "Segundos"
            chart.x_axis.title = "Asesores"
            chart.width = 18
            chart.height = 11

            data_ref = Reference(ws_summary, min_col=5, min_row=1, max_row=ws_summary.max_row)
            cats_ref = Reference(ws_summary, min_col=2, min_row=2, max_row=ws_summary.max_row)
            chart.add_data(data_ref, titles_from_data=True)
            chart.set_categories(cats_ref)
            chart.legend = None

            ws_summary.add_chart(chart, "L2")

        # -------------------------------------------------------------
        # HOJA 3: KPIs Globales + Gráfico de Dona / Torta Nativo
        # -------------------------------------------------------------
        ws_kpis = wb.create_sheet(title="KPIs_Globales")
        ws_kpis.views.sheetView[0].showGridLines = True

        ws_kpis["A1"] = "PANEL CONSOLIDADO DE INDICADORES OPERATIVOS (KPIs)"
        ws_kpis["A1"].font = cls.TITLE_FONT
        ws_kpis["A2"] = "Métricas globales calculadas con rigor estadístico ponderado por volumen"
        ws_kpis["A2"].font = cls.SUBTITLE_FONT

        kpi_rows = [
            ("Métrica", "Valor"),
            ("Total de Llamadas Procesadas", kpis.get('total_calls', 0)),
            ("Llamadas Contestadas", kpis.get('answered_calls', 0)),
            ("Llamadas Perdidas / Abandonadas", kpis.get('lost_calls', 0)),
            ("Total de Asesores Auditados", kpis.get('total_agents', 0)),
            ("Asesores Aprobados (En Meta)", kpis.get('approved_agents', 0)),
            ("Asesores en Observación", kpis.get('observation_agents', 0)),
            ("Asesores que Requieren Revisión", kpis.get('review_agents', 0)),
            ("Tasa Global de Cumplimiento", f"{kpis.get('compliance_rate', 0.0)}%"),
            ("TMO Global Ponderado", f"{kpis.get('weighted_tmo_global', 0.0)} seg"),
            ("Porcentaje Promedio de Silencio", f"{kpis.get('average_silence_pct', 0.0)}%"),
            ("Umbral Objetivo Configurado", f"{kpis.get('threshold', 20.0)} seg"),
            ("Casos Atípicos Detectados (Z > 2.0)", kpis.get('outliers_count', 0)),
        ]

        for r_idx, (label, val) in enumerate(kpi_rows, start=4):
            c1 = ws_kpis.cell(row=r_idx, column=1, value=label)
            c2 = ws_kpis.cell(row=r_idx, column=2, value=val)
            if r_idx == 4:
                c1.fill = cls.HEADER_FILL
                c1.font = cls.HEADER_FONT
                c2.fill = cls.HEADER_FILL
                c2.font = cls.HEADER_FONT
            else:
                c1.border = cls.THIN_BORDER
                c2.border = cls.THIN_BORDER
                c2.alignment = Alignment(horizontal="right")

        # Tabla auxiliar para el gráfico de torta
        ws_kpis["D4"] = "Estado Llamada"
        ws_kpis["E4"] = "Cantidad"
        ws_kpis["D4"].fill = cls.HEADER_FILL
        ws_kpis["D4"].font = cls.HEADER_FONT
        ws_kpis["E4"].fill = cls.HEADER_FILL
        ws_kpis["E4"].font = cls.HEADER_FONT

        ws_kpis["D5"] = "Contestadas"
        ws_kpis["E5"] = kpis.get('answered_calls', 0)
        ws_kpis["D6"] = "Perdidas"
        ws_kpis["E6"] = kpis.get('lost_calls', 0)

        # Incrustar Gráfico de Dona / Torta Nativo OpenPyXL
        pie = PieChart()
        pie.title = "Distribución de Llamadas (Contestadas vs. Perdidas)"
        pie_data = Reference(ws_kpis, min_col=5, min_row=4, max_row=6)
        pie_labels = Reference(ws_kpis, min_col=4, min_row=5, max_row=6)
        pie.add_data(pie_data, titles_from_data=True)
        pie.set_categories(pie_labels)
        pie.width = 14
        pie.height = 9
        ws_kpis.add_chart(pie, "D9")

        cls._auto_adjust_column_widths(ws_kpis)

        # -------------------------------------------------------------
        # HOJA 4: Auditoría y Outliers
        # -------------------------------------------------------------
        ws_audit = wb.create_sheet(title="Auditoria_Outliers")
        ws_audit.views.sheetView[0].showGridLines = True

        audit_headers = ["Código", "Asesor", "TMO (s)", "% Silencio", "Z-Score", "Diagnóstico Operativo", "Acción Recomendada"]
        ws_audit.append(audit_headers)

        for col_idx in range(1, len(audit_headers) + 1):
            cell = ws_audit.cell(row=1, column=col_idx)
            cell.fill = cls.HEADER_FILL
            cell.font = cls.HEADER_FONT
            cell.alignment = Alignment(horizontal="center", vertical="center")

        # Filtrar asesores que requieren atención
        risk_agents = df_agents[df_agents['status'] != 'APROBADO']
        if risk_agents.empty:
            ws_audit.append(["N/A", "Todos los asesores se encuentran en cumplimiento", 0, 0, 0, "Operación Saludable", "Mantener monitoreo"])
        else:
            for _, row in risk_agents.iterrows():
                z = float(row.get('z_score', 0.0))
                silence = float(row.get('silence_percentage', 0.0))
                if abs(z) > 2.0:
                    diag = f"Desvío estadístico extremo (Z={z}). Tiempo atípico."
                    action = "Auditoría obligatoria de grabaciones de llamadas."
                elif silence > 20.0:
                    diag = f"Exceso de pausas y silencios en línea ({silence}%)."
                    action = "Capacitación en uso de herramientas y consulta rápida al CRM."
                else:
                    diag = f"Supera umbral con TMO de {row['tmo']}s."
                    action = "Coaching operativo de reducción de tiempos de conversación."

                ws_audit.append([
                    str(row['agent_code']),
                    str(row['agent_name']),
                    float(row['tmo']),
                    silence,
                    z,
                    diag,
                    action
                ])

        cls._auto_adjust_column_widths(ws_audit)

        # Guardar en memoria o archivo
        if output_path:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            wb.save(output_path)
            with open(output_path, 'rb') as f:
                return f.read()

        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    @staticmethod
    def _auto_adjust_column_widths(worksheet) -> None:
        """Ajusta automáticamente el ancho de las columnas según su contenido."""
        for col in worksheet.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val = str(cell.value or '')
                max_len = max(max_len, len(val))
            worksheet.column_dimensions[col_letter].width = max(max_len + 3, 12)
