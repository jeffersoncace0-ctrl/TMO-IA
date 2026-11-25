import pandas as pd
import pytest
from services.tmo_calculator import TMOCalculatorService


def test_tmo_weighted_vs_simple_average():
    """
    Comprueba que el TMO ponderado evite la falacia del promedio de promedios.
    Caso:
    - Agente 1: 100 llamadas de 10s (Total = 1000s, TMO1 = 10s)
    - Agente 2: 2 llamadas de 50s (Total = 100s, TMO2 = 50s)
    Promedio simple: (10 + 50) / 2 = 30.0s (ERRÓNEO)
    Promedio ponderado: 1100s / 102 llamadas = 10.78s (CORRECTO)
    """
    data = []
    # 100 llamadas para AG-1
    for i in range(100):
        data.append({
            'call_id': f'C1-{i}', 'agent_code': 'AG-1', 'agent_name': 'Agente Alto Volumen',
            'call_status': 'CONTESTADA', 'total_duration': 10.0, 'silence_time': 1.0,
            'talk_time': 9.0, 'wait_time': 0.0, 'wrap_up_time': 0.0
        })
    # 2 llamadas para AG-2
    for j in range(2):
        data.append({
            'call_id': f'C2-{j}', 'agent_code': 'AG-2', 'agent_name': 'Agente Bajo Volumen',
            'call_status': 'CONTESTADA', 'total_duration': 50.0, 'silence_time': 5.0,
            'talk_time': 45.0, 'wait_time': 0.0, 'wrap_up_time': 0.0
        })

    df = pd.DataFrame(data)
    df_agents = TMOCalculatorService.calculate_agent_summaries(df, threshold=20.0)
    kpis = TMOCalculatorService.calculate_global_kpis(df, df_agents, threshold=20.0)

    # El promedio simple daría 30.0s. El ponderado debe ser 10.78s
    assert kpis['weighted_tmo_global'] == 10.78
    assert kpis['weighted_tmo_global'] != 30.0


def test_deterministic_classification_thresholds():
    """Valida los límites deterministas de clasificación según umbral (20.0s)."""
    data = [
        # AG-10: TMO = 18.0s <= 20.0s => APROBADO
        {'call_id': '1', 'agent_code': 'AG-10', 'agent_name': 'Cumplidor', 'call_status': 'CONTESTADA',
         'total_duration': 18.0, 'silence_time': 0.0, 'talk_time': 18.0, 'wait_time': 0.0, 'wrap_up_time': 0.0},
        # AG-20: TMO = 22.0s <= 20*1.15=23.0s => EN OBSERVACIÓN
        {'call_id': '2', 'agent_code': 'AG-20', 'agent_name': 'En Observacion', 'call_status': 'CONTESTADA',
         'total_duration': 22.0, 'silence_time': 0.0, 'talk_time': 22.0, 'wait_time': 0.0, 'wrap_up_time': 0.0},
        # AG-30: TMO = 35.0s > 23.0s => REQUIERE REVISIÓN
        {'call_id': '3', 'agent_code': 'AG-30', 'agent_name': 'En Riesgo', 'call_status': 'CONTESTADA',
         'total_duration': 35.0, 'silence_time': 0.0, 'talk_time': 35.0, 'wait_time': 0.0, 'wrap_up_time': 0.0},
    ]
    df = pd.DataFrame(data)
    df_agents = TMOCalculatorService.calculate_agent_summaries(df, threshold=20.0, warning_multiplier=1.15)

    status_map = dict(zip(df_agents['agent_code'], df_agents['status']))
    assert status_map['AG-10'] == 'APROBADO'
    assert status_map['AG-20'] == 'EN OBSERVACIÓN'
    assert status_map['AG-30'] == 'REQUIERE REVISIÓN'
