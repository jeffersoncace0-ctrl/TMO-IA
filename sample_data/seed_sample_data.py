#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de datasets de prueba de Call Center para validación y testing:
1. Dataset Principal (>75 registros reales con diversos agentes y métricas)
2. Dataset de Casos Borde (filas vacías, duplicados, duraciones negativas, errores)
"""

import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

def generate_demo_dataset(file_path):
    wb = Workbook()
    ws = wb.active
    ws.title = "Registro_Llamadas"

    headers = [
        "ID_Llamada", "Codigo_Agente", "Nombre_Agente", "Fecha_Hora", 
        "Tipo_Llamada", "Estado_Llamada", "Duracion_Total_Seg", 
        "Tiempo_Conversacion_Seg", "Tiempo_Espera_Seg", "Tiempo_Post_Llamada_Seg", "Tiempo_Silencio_Seg"
    ]
    ws.append(headers)

    # Estilo de encabezado
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        cell.alignment = Alignment(horizontal="center")

    # Datos estructurados con agentes diseñados para probar las reglas deterministas:
    # Agente 1 (AG-101 Carlos Ramirez): TMO ~14s (Aprobado)
    # Agente 2 (AG-102 Maria Fernandez): TMO ~18s (Aprobado)
    # Agente 3 (AG-103 Juan Delgado): TMO ~27s (Requiere Revisión - supera 20s)
    # Agente 4 (AG-104 Laura Gomez): TMO ~38s (Outlier crítico / Silencio alto)
    # Agente 5 (AG-105 Andres Torres): TMO ~19s (Aprobado al límite)
    # Agente 6 (AG-106 Sofia Castro): Alta tasa de llamadas perdidas
    # Agente 7 (AG-107 Pedro Morales): TMO ~22s (Requiere Revisión leve)
    # Agente 8 (AG-108 Elena Vargas): TMO ~12s (Excelente desempeño)

    agents = [
        ("AG-100", "Jefferson Cacerez", 16, 13, 1, 2, 2, "ENTRANTE", "CONTESTADA", 12), # Cumplimiento óptimo
        ("AG-101", "Carlos Ramirez", 14, 11, 1, 2, 2, "ENTRANTE", "CONTESTADA", 12),
        ("AG-102", "Maria Fernandez", 18, 14, 2, 2, 3, "ENTRANTE", "CONTESTADA", 10),
        ("AG-103", "Juan Delgado", 27, 21, 3, 3, 5, "ENTRANTE", "CONTESTADA", 11),
        ("AG-104", "Laura Gomez", 39, 22, 5, 12, 16, "ENTRANTE", "CONTESTADA", 9), # Silencio y wrap-up alto
        ("AG-105", "Andres Torres", 19, 15, 2, 2, 3, "SALIENTE", "CONTESTADA", 10),
        ("AG-106", "Sofia Castro", 15, 12, 1, 2, 2, "ENTRANTE", "PERDIDA", 8),    # Perdidas
        ("AG-107", "Pedro Morales", 23, 17, 3, 3, 4, "ENTRANTE", "CONTESTADA", 9),
        ("AG-108", "Elena Vargas", 12, 9, 1, 2, 1, "SALIENTE", "CONTESTADA", 11)
    ]

    call_counter = 1
    for ag_code, ag_name, base_dur, base_talk, base_wait, base_wrap, base_silence, call_type, default_status, num_calls in agents:
        for i in range(num_calls):
            # Variaciones leves para realismo
            dur_var = (i % 5) - 2
            dur = max(3, base_dur + dur_var)
            talk = max(2, base_talk + dur_var)
            wait = base_wait
            wrap = base_wrap
            silence = max(1, base_silence + (i % 2))
            
            # En Sofia Castro, alternar entre contestadas y perdidas
            status = default_status
            if ag_code == "AG-106" and i % 2 == 0:
                status = "CONTESTADA"
            elif ag_code != "AG-106" and i == 0:
                status = "PERDIDA"

            date_str = f"2026-10-14 08:{10 + (call_counter % 50):02d}:{call_counter % 60:02d}"

            ws.append([
                f"CALL-{call_counter:04d}",
                ag_code,
                ag_name,
                date_str,
                call_type,
                status,
                dur,
                talk,
                wait,
                wrap,
                silence
            ])
            call_counter += 1

    wb.save(file_path)
    print(f"Dataset de demostración generado con {call_counter - 1} llamadas en: {file_path}")

def generate_edge_cases_dataset(file_path):
    wb = Workbook()
    ws = wb.active
    ws.title = "Casos_Borde"

    headers = [
        "ID_Llamada", "Codigo_Agente", "Nombre_Agente", "Fecha_Hora", 
        "Tipo_Llamada", "Estado_Llamada", "Duracion_Total_Seg", "Tiempo_Silencio_Seg"
    ]
    ws.append(headers)

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="991B1B", end_color="991B1B", fill_type="solid")
        cell.alignment = Alignment(horizontal="center")

    edge_cases = [
        # Normal
        ["EDGE-001", "AG-201", "Valeria Rios", "2026-10-14 09:00:00", "ENTRANTE", "CONTESTADA", 16, 2],
        # Duplicado exacto
        ["EDGE-001", "AG-201", "Valeria Rios", "2026-10-14 09:00:00", "ENTRANTE", "CONTESTADA", 16, 2],
        # Código de agente vacío
        ["EDGE-002", "", "Sin Identificar", "2026-10-14 09:05:00", "ENTRANTE", "CONTESTADA", 18, 3],
        # Duración negativa
        ["EDGE-003", "AG-202", "Martin Silva", "2026-10-14 09:10:00", "ENTRANTE", "CONTESTADA", -15, 0],
        # Duración en texto con formato MM:SS
        ["EDGE-004", "AG-203", "Camila Ortiz", "2026-10-14 09:15:00", "SALIENTE", "CONTESTADA", "00:25", 4],
        # Duración no numérica
        ["EDGE-005", "AG-204", "Daniel Castro", "2026-10-14 09:20:00", "ENTRANTE", "CONTESTADA", "INVALID_TIME", 0],
        # Registro con llamada perdida
        ["EDGE-006", "AG-205", "Lucia Morales", "2026-10-14 09:25:00", "ENTRANTE", "PERDIDA", 0, 0],
        # Registro completo válido
        ["EDGE-007", "AG-201", "Valeria Rios", "2026-10-14 09:30:00", "ENTRANTE", "CONTESTADA", 14, 1]
    ]

    for row in edge_cases:
        ws.append(row)

    wb.save(file_path)
    print(f"Dataset de casos borde generado en: {file_path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    demo_file = os.path.join(base_dir, "call_center_dataset_demo.xlsx")
    edge_file = os.path.join(base_dir, "call_center_edge_cases.xlsx")
    generate_demo_dataset(demo_file)
    generate_edge_cases_dataset(edge_file)
