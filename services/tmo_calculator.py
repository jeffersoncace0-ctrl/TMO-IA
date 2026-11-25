from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np


class TMOCalculatorService:
    """
    Motor estadístico determinista para el cálculo del Tiempo Medio de Operación (TMO / AHT),
    auditoría de tiempos de silencio, clasificación de asesores y detección de anomalías (Z-Score).
    """

    @classmethod
    def calculate_agent_summaries(
        cls,
        df_valid: pd.DataFrame,
        threshold: float = 20.0,
        warning_multiplier: float = 1.15
    ) -> pd.DataFrame:
        """
        Agrupa llamadas válidas por asesor y calcula métricas ponderadas individuales:
        - TMO individual estricto (Duración Total / Llamadas del Asesor).
        - Porcentaje de silencio y tiempos muertos.
        - Clasificación determinista (APROBADO, EN OBSERVACIÓN, REQUIERE REVISIÓN).
        """
        if df_valid.empty:
            return pd.DataFrame(columns=[
                'agent_code', 'agent_name', 'total_calls', 'answered_calls', 'lost_calls',
                'total_duration', 'tmo', 'silence_percentage', 'wrap_up_percentage',
                'answer_rate', 'excess_seconds', 'status', 'z_score', 'is_outlier'
            ])

        records: List[Dict[str, Any]] = []

        for agent_code, group in df_valid.groupby('agent_code'):
            total_calls = len(group)
            answered = len(group[group['call_status'] == 'CONTESTADA'])
            lost = total_calls - answered
            total_duration = float(group['total_duration'].sum())
            silence_time = float(group['silence_time'].sum())
            wrap_up_time = float(group['wrap_up_time'].sum())
            talk_time = float(group['talk_time'].sum())
            wait_time = float(group['wait_time'].sum())

            # Cálculo estricto de TMO individual (Promedio ponderado del agente)
            tmo = round(total_duration / total_calls, 2) if total_calls > 0 else 0.0

            # Porcentaje de Silencio sobre el tiempo total hablado
            silence_pct = round((silence_time / total_duration) * 100, 2) if total_duration > 0 else 0.0
            wrap_up_pct = round((wrap_up_time / total_duration) * 100, 2) if total_duration > 0 else 0.0
            answer_rate = round((answered / total_calls) * 100, 2) if total_calls > 0 else 0.0

            # Exceso de tiempo respecto a la meta
            excess = round(max(0.0, tmo - threshold), 2)

            # Clasificación determinista según política operativa
            warning_limit = threshold * warning_multiplier
            if tmo <= threshold:
                status = 'APROBADO'
            elif tmo <= warning_limit:
                status = 'EN OBSERVACIÓN'
            else:
                status = 'REQUIERE REVISIÓN'

            agent_name = str(group['agent_name'].iloc[0]) if 'agent_name' in group.columns else str(agent_code)

            records.append({
                'agent_code': str(agent_code),
                'agent_name': agent_name,
                'total_calls': total_calls,
                'answered_calls': answered,
                'lost_calls': lost,
                'total_duration': total_duration,
                'talk_time': talk_time,
                'silence_time': silence_time,
                'wait_time': wait_time,
                'wrap_up_time': wrap_up_time,
                'tmo': tmo,
                'silence_percentage': silence_pct,
                'wrap_up_percentage': wrap_up_pct,
                'answer_rate': answer_rate,
                'excess_seconds': excess,
                'status': status,
            })

        df_summary = pd.DataFrame(records)

        # Detección estadística de Outliers mediante Z-Score
        if len(df_summary) >= 2:
            mean_tmo = df_summary['tmo'].mean()
            std_tmo = df_summary['tmo'].std(ddof=1)
            if std_tmo > 0:
                df_summary['z_score'] = ((df_summary['tmo'] - mean_tmo) / std_tmo).round(2)
            else:
                df_summary['z_score'] = 0.0
        else:
            df_summary['z_score'] = 0.0

        df_summary['is_outlier'] = df_summary['z_score'].abs() > 2.0

        # Ordenar por TMO descendente para priorizar agentes en riesgo
        return df_summary.sort_values(by='tmo', ascending=False).reset_index(drop=True)

    @classmethod
    def calculate_global_kpis(
        cls,
        df_valid: pd.DataFrame,
        df_agents: pd.DataFrame,
        threshold: float = 20.0
    ) -> Dict[str, Any]:
        """
        Calcula los Indicadores Clave de Desempeño (KPIs) globales de la operación:
        - TMO Ponderado Global (Suma de Duraciones de Todas las Llamadas / Total de Llamadas Válidas).
        - Tasa de Cumplimiento de Asesores (% de Asesores Aprobados).
        - Distribución de estados.
        """
        if df_valid.empty or df_agents.empty:
            return {
                'total_calls': 0,
                'answered_calls': 0,
                'lost_calls': 0,
                'total_agents': 0,
                'approved_agents': 0,
                'observation_agents': 0,
                'review_agents': 0,
                'compliance_rate': 0.0,
                'weighted_tmo_global': 0.0,
                'average_silence_pct': 0.0,
                'threshold': threshold,
                'outliers_count': 0
            }

        total_calls = int(len(df_valid))
        answered_calls = int((df_valid['call_status'] == 'CONTESTADA').sum())
        lost_calls = total_calls - answered_calls

        total_agents = int(len(df_agents))
        approved = int((df_agents['status'] == 'APROBADO').sum())
        observation = int((df_agents['status'] == 'EN OBSERVACIÓN').sum())
        review = int((df_agents['status'] == 'REQUIERE REVISIÓN').sum())

        compliance_rate = round((approved / total_agents) * 100, 2) if total_agents > 0 else 0.0

        # TMO GLOBAL PONDERADO MATEMÁTICO (Evita la falacia de promediar promedios)
        total_duration_sum = float(df_valid['total_duration'].sum())
        weighted_tmo_global = round(total_duration_sum / total_calls, 2) if total_calls > 0 else 0.0

        # Promedio ponderado de silencio global
        total_silence_sum = float(df_valid['silence_time'].sum())
        avg_silence_pct = round((total_silence_sum / total_duration_sum) * 100, 2) if total_duration_sum > 0 else 0.0

        outliers_count = int(df_agents['is_outlier'].sum())

        return {
            'total_calls': total_calls,
            'answered_calls': answered_calls,
            'lost_calls': lost_calls,
            'total_agents': total_agents,
            'approved_agents': approved,
            'observation_agents': observation,
            'review_agents': review,
            'compliance_rate': compliance_rate,
            'weighted_tmo_global': weighted_tmo_global,
            'average_silence_pct': avg_silence_pct,
            'threshold': threshold,
            'outliers_count': outliers_count,
        }
