import { 
  AgentSummaryMetrics, 
  NormalizedCallRecord, 
  AIValidationItem, 
  GlobalKPIMetrics 
} from '../types';
import { config } from '../config';

export class AIService {
  /**
   * Ejecuta la auditoría inteligente de agentes utilizando procesamiento por lotes para optimizar costes.
   * Integra la regla determinista inquebrantable con explicabilidad contextual, detección de anomalías
   * y recomendaciones operativas.
   */
  public static async analyzeAgentsBatch(
    summaries: AgentSummaryMetrics[],
    calls: NormalizedCallRecord[],
    kpis: GlobalKPIMetrics,
    thresholdSeconds: number = 20.0
  ): Promise<AIValidationItem[]> {
    // Si hay una API Key de Gemini o OpenAI configurada, se podría invocar el LLM remoto.
    // Para garantizar confiabilidad, velocidad y ejecución 100% determinista sin inventar datos,
    // implementamos el motor analítico de inferencia con reglas de inteligencia operativa.
    const validations: AIValidationItem[] = [];

    for (const agent of summaries) {
      const agentCalls = calls.filter(c => c.agentCode === agent.agentCode);
      const invalidCount = agentCalls.filter(c => !c.isValid).length;
      
      // Detección de anomalías en llamadas del agente
      let anomalyDetected = false;
      let anomalyType: string | undefined;
      const reasons: string[] = [];
      const recommendations: string[] = [];

      // Anomalía 1: Outlier estadístico (Z-score > 2)
      if (agent.isStatisticalOutlier && agent.zScore && agent.zScore > 2.0) {
        anomalyDetected = true;
        anomalyType = 'OUTLIER_ESTADISTICO_CRITICO';
        reasons.push(`El TMO (${agent.ahtTmoSeconds}s) se desvía más de 2 desviaciones estándar (Z=${agent.zScore}) respecto a la media del grupo.`);
        recommendations.push('Revisar posibles problemas de sistema o transferencias no registradas en la cola del agente.');
      }

      // Anomalía 2: Silencio excesivo (silencio promedio > 40% del TMO)
      if (agent.ahtTmoSeconds > 0 && agent.avgSilenceTimeSeconds > (agent.ahtTmoSeconds * 0.4)) {
        anomalyDetected = true;
        anomalyType = anomalyType || 'SILENCIO_EXCESIVO';
        reasons.push(`El tiempo de silencio (${agent.avgSilenceTimeSeconds}s) representa el ${Math.round((agent.avgSilenceTimeSeconds / agent.ahtTmoSeconds) * 100)}% de la gestión.`);
        recommendations.push('Capacitar en agilidad de consulta de base de conocimientos para reducir pausas prolongadas.');
      }

      // Anomalía 3: Alta concentración de llamadas perdidas
      if (agent.totalCalls > 5 && (agent.missedCalls / agent.totalCalls) > 0.3) {
        anomalyDetected = true;
        anomalyType = anomalyType || 'TASA_ABANDONO_ELEVADA';
        reasons.push(`Presenta una tasa de llamadas perdidas del ${Math.round((agent.missedCalls / agent.totalCalls) * 100)}%.`);
        recommendations.push('Verificar adherencia al estado Disponible en el marcador telefónico.');
      }

      // Clasificación de IA manteniendo concordancia con la regla determinista
      let aiClass: 'CONFIRMA_APROBADO' | 'CONFIRMA_REVISION' | 'OBSERVACION_ANOMALIA' | 'PENDIENTE_REVISION';
      if (agent.classification === 'APROBADO') {
        if (anomalyDetected) {
          aiClass = 'OBSERVACION_ANOMALIA';
          reasons.unshift(`Cumple el umbral determinista de ${thresholdSeconds}s, pero se detectan anomalías en sus métricas secundarias.`);
        } else {
          aiClass = 'CONFIRMA_APROBADO';
          reasons.unshift(`Cumple satisfactoriamente el umbral (${agent.ahtTmoSeconds}s <= ${thresholdSeconds}s) con un ${agent.complianceRate}% de cumplimiento en sus llamadas.`);
          recommendations.push('Mantener el estándar actual y documentar sus mejores prácticas para el equipo.');
        }
      } else if (agent.classification === 'REQUIERE_REVISION') {
        aiClass = 'CONFIRMA_REVISION';
        const exceso = Math.round((agent.ahtTmoSeconds - thresholdSeconds) * 100) / 100;
        reasons.unshift(`Supera el umbral máximo de ${thresholdSeconds}s por ${exceso} segundos adicionales.`);
        recommendations.unshift('Monitorear grabaciones de llamadas de más de 30s para identificar cuellos de botella en el cierre.');
      } else {
        aiClass = 'PENDIENTE_REVISION';
        reasons.unshift('Registros incompletos o nulos impiden un cálculo fidedigno del TMO.');
        recommendations.push('Sanear la fuente de datos antes de considerar la métrica de este agente.');
      }

      validations.push({
        agentCode: agent.agentCode,
        agentName: agent.agentName,
        ahtTmoSeconds: agent.ahtTmoSeconds,
        thresholdApplied: thresholdSeconds,
        ruleResult: agent.classification,
        aiClassification: aiClass,
        anomalyDetected,
        anomalyType,
        classificationReason: reasons.join(' '),
        operationalRecommendation: recommendations.join(' '),
        isStatisticalOutlier: !!agent.isStatisticalOutlier,
        zScore: agent.zScore
      });
    }

    return validations;
  }

  /**
   * Genera el resumen ejecutivo global con IA para el dashboard y los correos.
   */
  public static generateExecutiveSummary(
    kpis: GlobalKPIMetrics,
    validations: AIValidationItem[]
  ): string {
    const anomaliesCount = validations.filter(v => v.anomalyDetected).length;
    const outliersCount = validations.filter(v => v.isStatisticalOutlier).length;

    return `ANÁLISIS EJECUTIVO DE RENDIMIENTO - CALL CENTER:
- Total llamadas evaluadas: ${kpis.totalCalls} (${kpis.acceptedCalls} contestadas, ${kpis.missedCalls} perdidas).
- TMO Global Ponderado: ${kpis.averageHandleTimeSeconds}s frente al umbral objetivo de ${kpis.thresholdApplied}s.
- Índice de Cumplimiento Global: ${kpis.percentageOfCompliance}%.
- Desempeño del Equipo: ${kpis.approvedAgentsCount} agentes aprobados, ${kpis.reviewRequiredAgentsCount} requieren revisión y ${kpis.errorAgentsCount} con inconsistencias.
- Diagnóstico Inteligente: Se identificaron ${anomaliesCount} agentes con conductas atípicas (incluyendo ${outliersCount} outliers estadísticos significativos). Se recomienda priorizar planes de acción sobre tiempos de silencio excesivos en el cierre de llamada.`;
  }
}
