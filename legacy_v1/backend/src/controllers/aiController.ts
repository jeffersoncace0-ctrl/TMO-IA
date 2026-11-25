import { Request, Response, NextFunction } from 'express';
import { getLocalDb, supabase } from '../config/supabase';
import { config } from '../config';

// Normaliza texto eliminando acentos, caracteres especiales y espacios múltiples
function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // elimina tildes: á->a, é->e
    .replace(/[^a-z0-9\s]/g, ' ')   // remueve puntuación
    .replace(/\s+/g, ' ')
    .trim();
}

export class AIController {
  /**
   * Obtiene la lista de validaciones de IA generadas para un archivo
   */
  public static async getValidations(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.query.fileId as string;

      if (supabase) {
        let query = supabase.from('validaciones_ia').select('*');
        if (fileId) query = query.eq('archivo_id', fileId);
        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json({ success: true, validations: data || [] });
      } else {
        const db = getLocalDb();
        const validations = fileId 
          ? db.validacionesIA.filter(v => v.archivo_id === fileId)
          : db.validacionesIA;
        return res.status(200).json({ success: true, validations });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Chat interactivo con el Asistente de IA sobre los datos del Call Center.
   * Responde de inmediato consultas sobre cualquier agente, listas de pasados vs van bien,
   * rankings, métricas de silencio, outliers y planes de acción en lenguaje natural.
   */
  public static async askAssistant(req: Request, res: Response, next: NextFunction) {
    try {
      const { question, fileId } = req.body;

      if (!question || typeof question !== 'string') {
        return res.status(400).json({ success: false, message: 'La pregunta es requerida' });
      }

      // Obtener contexto de datos de la base de datos
      const db = getLocalDb();
      const currentThreshold = db.configuracionUmbral?.umbral_segundos || config.defaultTmoThreshold || 20.0;

      // Obtener resúmenes de agentes (deduplicar por código de agente para tomar el registro más relevante)
      const rawSummaries = fileId 
        ? db.resumenAgentes.filter(a => a.archivo_id === fileId)
        : db.resumenAgentes;

      const agentMap = new Map<string, any>();
      for (const a of rawSummaries) {
        const code = a.codigo_agente || a.agentCode;
        if (!agentMap.has(code)) {
          agentMap.set(code, a);
        }
      }
      const summaries = Array.from(agentMap.values());

      const rawValidations = fileId 
        ? db.validacionesIA.filter(v => v.archivo_id === fileId)
        : db.validacionesIA;
      
      const validationMap = new Map<string, any>();
      for (const v of rawValidations) {
        const code = v.codigo_agente || v.agentCode || v.agente_id;
        if (!validationMap.has(code)) {
          validationMap.set(code, v);
        }
      }

      const calls = db.llamadas || [];

      const qRaw = question.trim();
      const qNorm = normalizeText(qRaw);

      let answer = '';

      // -----------------------------------------------------------------------
      // 1. BÚSQUEDA DIRECTA DE UN AGENTE ESPECÍFICO (Por nombre, apellido o código)
      // Ejemplo: "dame los reportes del TMO del agente jefferson cacerez"
      // -----------------------------------------------------------------------
      let matchedAgent: any = null;

      for (const agent of summaries) {
        const code = (agent.codigo_agente || agent.agentCode || '').toLowerCase();
        const codeClean = code.replace(/[^a-z0-9]/g, ''); // "ag100"
        const numOnly = code.replace(/\D/g, '');          // "100"
        const name = normalizeText(agent.nombre_agente || agent.agentName || '');
        const nameParts = name.split(' ').filter(p => p.length >= 3);

        // Comprobar coincidencia exacta de nombre completo o código
        const matchesFullName = name.length > 0 && qNorm.includes(name);
        const matchesCode = (code.length > 0 && qNorm.includes(code)) || 
                            (codeClean.length > 0 && qNorm.includes(codeClean)) ||
                            (numOnly.length > 1 && qNorm.split(' ').includes(numOnly));
        
        // Coincidencia por partes de nombre (nombre y apellido o apellido distintivo)
        const matchesParts = nameParts.length >= 2 && nameParts.every(part => qNorm.includes(part));
        const words = qNorm.split(' ');
        const matchedParts = nameParts.filter(part => words.includes(part));
        const hasForeignName = words.some(w => 
          ['roberto', 'fernando', 'david', 'luis', 'ana', 'patricia', 'camilo', 'javier', 'jorge'].includes(w)
        );
        const matchesSingleDistinctPart = matchedParts.length === 1 && !hasForeignName;

        if (matchesFullName || matchesCode || matchesParts || (matchesSingleDistinctPart && (qNorm.includes('agente') || qNorm.includes('asesor') || qNorm.includes('tmo') || qNorm.includes('reporte') || qNorm.includes('como va')))) {
          matchedAgent = agent;
          break;
        }
      }

      // Si encontramos al agente específico solicitado
      if (matchedAgent) {
        const agCode = matchedAgent.codigo_agente || matchedAgent.agentCode;
        const agName = matchedAgent.nombre_agente || matchedAgent.agentName;
        const tmo = matchedAgent.tmo_promedio_seg || matchedAgent.ahtTmoSeconds || 0;
        const val = validationMap.get(agCode);
        const callsCount = matchedAgent.total_llamadas || matchedAgent.totalCalls || 0;
        const contestadas = matchedAgent.llamadas_contestadas || matchedAgent.acceptedCalls || 0;
        const perdidas = matchedAgent.llamadas_perdidas || matchedAgent.missedCalls || 0;
        const compliance = matchedAgent.porcentaje_cumplimiento || matchedAgent.complianceRate || 100;
        const talkTime = matchedAgent.tiempo_promedio_conversacion_seg || matchedAgent.avgTalkTimeSeconds || 0;
        const silenceTime = matchedAgent.tiempo_promedio_silencio_seg || matchedAgent.avgSilenceTimeSeconds || 0;
        const silencePct = tmo > 0 ? Math.round((silencioPctCalculation(silenceTime, tmo))) : 0;
        const status = matchedAgent.clasificacion_determinista || matchedAgent.classification || (tmo <= currentThreshold ? 'APROBADO' : 'REQUIERE_REVISION');
        const isApproved = status === 'APROBADO';
        const isOutlier = matchedAgent.isStatisticalOutlier || (matchedAgent.zScore && matchedAgent.zScore > 2);
        const zScore = matchedAgent.zScore !== undefined ? matchedAgent.zScore : 'N/A';

        // Obtener últimas llamadas de este agente
        const agentCalls = calls.filter((c: any) => 
          (c.codigo_agente_origen === agCode || c.nombre_agente_origen === agName)
        ).slice(0, 3);

        const diffUmbral = (tmo - currentThreshold).toFixed(1);
        const diffText = isApproved 
          ? `(${Math.abs(parseFloat(diffUmbral))}s por debajo del umbral objetivo de ${currentThreshold}s)` 
          : `(+${diffUmbral}s por encima del umbral objetivo de ${currentThreshold}s)`;

        answer = `### 👤 Reporte Oficial de TMO: **${agName}** (\`${agCode}\`)\n\n` +
          `📌 **Estado Determinista:** **${isApproved ? 'APROBADO ✅' : 'REQUIERE REVISIÓN 🚨'}** ${diffText}\n\n` +
          `📊 **Métricas Clave de Gestión:**\n` +
          `• **Tiempo Medio de Operación (TMO):** **${tmo}s** (Umbral estándar: **${currentThreshold}s**)\n` +
          `• **Llamadas Gestionadas:** **${callsCount}** (${contestadas} contestadas, ${perdidas} perdidas)\n` +
          `• **Tasa de Adherencia y Cumplimiento:** **${compliance}%**\n` +
          `• **Tiempo Promedio de Conversación:** **${talkTime}s**\n` +
          `• **Tiempo Promedio de Silencio:** **${silenceTime}s** (representa el **${silencePct}%** de la llamada)\n` +
          `• **Comportamiento Estadístico:** ${isOutlier ? `⚠️ Outlier Crítico (Z-score: ${zScore})` : `Adherido a la media del equipo (Z-score: ${zScore})`}\n\n` +
          `🧠 **Diagnóstico Asistido por IA:**\n` +
          `${val?.classificationReason || val?.motivo_clasificacion || (isApproved ? 'El asesor mantiene un ritmo de resolución adecuado con tiempos de pausa dentro de los estándares fijados.' : `El agente excede el tiempo medio esperado. La desviación se debe principalmente a silencios no productivos y tiempos de cierre extendidos.`)}\n\n` +
          `💡 **Plan de Acción y Recomendaciones:**\n` +
          `${val?.operationalRecommendation || val?.recomendacion_operativa || (isApproved ? 'Mantener el esquema de atención actual y utilizar sus grabaciones como ejemplo de buenas prácticas.' : 'Agendar sesión de coaching 1 a 1 para optimizar el uso de atajos en el CRM y reducir el tiempo en espera.')}\n\n`;

        if (agentCalls.length > 0) {
          answer += `📞 **Muestra de Llamadas Registradas:**\n` +
            agentCalls.map((c: any) => `• \`${c.identificador_llamada || c.id}\`: ${c.duracion_total_seg || c.totalDurationSeconds}s de duración (Conversación: ${c.tiempo_conversacion_seg || c.talkTimeSeconds}s, Silencio: ${c.tiempo_silencio_seg || c.silenceTimeSeconds}s) — **${c.estado_llamada || c.callStatus}**`).join('\n');
        }

        return res.status(200).json({ success: true, question, answer, timestamp: new Date().toISOString() });
      }

      // Si la consulta pregunta explícitamente por un agente o reporte individual pero no coincidió
      const isTeamOrRankingQuery = qNorm.includes('quien') || qNorm.includes('quienes') || 
                                   qNorm.includes('cuales') || qNorm.includes('todos') || 
                                   qNorm.includes('mejor') || qNorm.includes('peor') || 
                                   qNorm.includes('top') || qNorm.includes('pasado') || 
                                   qNorm.includes('van bien') || qNorm.includes('silencio') || 
                                   qNorm.includes('outlier');

      const isAgentQueryIntent = !isTeamOrRankingQuery && (
        qNorm.includes('agente') || qNorm.includes('asesor') || 
        qNorm.includes('reporte de') || qNorm.includes('tmo de') || 
        qNorm.includes('como va') || qNorm.includes('informacion de')
      );

      if (isAgentQueryIntent) {
        answer = `🔍 **No encontré un agente con ese nombre o código en los registros actuales.**\n\n` +
          `Actualmente en la plataforma están registrados los siguientes **${summaries.length} agentes**:\n` +
          summaries.map(a => `• **${a.nombre_agente || a.agentName}** (\`${a.codigo_agente || a.agentCode}\`): TMO de **${a.tmo_promedio_seg || a.ahtTmoSeconds}s** — ${((a.clasificacion_determinista || a.classification) === 'APROBADO') ? 'APROBADO ✅' : 'REQUIERE REVISIÓN 🚨'}`).join('\n') +
          `\n\n👉 *Puedes preguntar por ejemplo:* **"Dame los reportes del TMO del agente Jefferson Cacerez"** o **"Cómo va Laura Gomez"**.`;

        return res.status(200).json({ success: true, question, answer, timestamp: new Date().toISOString() });
      }

      // -----------------------------------------------------------------------
      // 2. AGENTES PASADOS CON EL TMO / QUE VAN MAL / REQUIEREN REVISIÓN
      // -----------------------------------------------------------------------
      if (qNorm.includes('pasado') || qNorm.includes('mal') || qNorm.includes('revision') || 
          qNorm.includes('superan') || qNorm.includes('exceden') || qNorm.includes('no cumplen') || 
          qNorm.includes('reprobado') || qNorm.includes('alto')) {
        const pasados = summaries.filter(s => {
          const t = s.tmo_promedio_seg || s.ahtTmoSeconds || 0;
          return t > currentThreshold;
        }).sort((a, b) => (b.tmo_promedio_seg || b.ahtTmoSeconds || 0) - (a.tmo_promedio_seg || a.ahtTmoSeconds || 0));

        if (pasados.length === 0) {
          answer = `🎉 **¡Ningún agente está pasado con el TMO!**\nTodos los ${summaries.length} agentes evaluados cumplen satisfactoriamente el umbral configurado de **${currentThreshold}s**.`;
        } else {
          answer = `🚨 **Agentes que Están Pasados con el TMO (Superan el Umbral de ${currentThreshold}s):**\n` +
            `Se identificaron **${pasados.length} agentes** que requieren intervención:\n\n` +
            pasados.map((a, i) => {
              const tmo = a.tmo_promedio_seg || a.ahtTmoSeconds || 0;
              const exceso = (tmo - currentThreshold).toFixed(1);
              const silencio = a.tiempo_promedio_silencio_seg || a.avgSilenceTimeSeconds || 0;
              const val = validationMap.get(a.codigo_agente || a.agentCode);
              return `${i + 1}. **${a.nombre_agente || a.agentName}** (\`${a.codigo_agente || a.agentCode}\`):\n` +
                     `   • TMO: **${tmo}s** (+${exceso}s de exceso frente a la meta)\n` +
                     `   • Silencio Promedio: **${silencio}s**\n` +
                     `   • Diagnóstico: ${val?.operationalRecommendation || 'Priorizar coaching en agilidad de cierre.'}\n`;
            }).join('\n') +
            `\n💡 **Recomendación General:** El sistema puede enviar este reporte automáticamente **cada 1 hora** por correo electrónico a cualquier dirección configurada en la sección *Configuración de Correo*.`;
        }

        return res.status(200).json({ success: true, question, answer, timestamp: new Date().toISOString() });
      }

      // -----------------------------------------------------------------------
      // 3. AGENTES QUE VAN BIEN / APROBADOS / CUMPLEN EL TMO
      // -----------------------------------------------------------------------
      if (qNorm.includes('van bien') || qNorm.includes('bueno') || qNorm.includes('aprobado') || 
          qNorm.includes('cumplen') || qNorm.includes('cumplimiento') || qNorm.includes('adheridos')) {
        const aprobados = summaries.filter(s => {
          const t = s.tmo_promedio_seg || s.ahtTmoSeconds || 0;
          return t <= currentThreshold;
        }).sort((a, b) => (a.tmo_promedio_seg || a.ahtTmoSeconds || 0) - (b.tmo_promedio_seg || b.ahtTmoSeconds || 0));

        const rate = summaries.length > 0 ? Math.round((aprobados.length / summaries.length) * 100) : 0;

        answer = `✅ **Agentes que Van Bien (Cumpliendo el Umbral &le; ${currentThreshold}s):**\n` +
          `Un total de **${aprobados.length} de ${summaries.length} agentes (${rate}%)** están dentro de la meta operativa:\n\n` +
          aprobados.map((a, i) => {
            const tmo = a.tmo_promedio_seg || a.ahtTmoSeconds || 0;
            const llamadas = a.total_llamadas || a.totalCalls || 0;
            const silencio = a.tiempo_promedio_silencio_seg || a.avgSilenceTimeSeconds || 0;
            return `${i + 1}. **${a.nombre_agente || a.agentName}** (\`${a.codigo_agente || a.agentCode}\`): ` +
                   `TMO **${tmo}s** | ${llamadas} llamadas | Silencio: ${silencio}s — **APROBADO ✅**`;
          }).join('\n') +
          `\n\n👏 **Destacados:** Asesores con excelente ritmo de llamada. Sus pautas de atención deben preservarse como modelo de calidad para el resto de la operación.`;

        return res.status(200).json({ success: true, question, answer, timestamp: new Date().toISOString() });
      }

      // -----------------------------------------------------------------------
      // 4. MEJOR AGENTE / TOP PERFORMER
      // -----------------------------------------------------------------------
      if (qNorm.includes('mejor') || qNorm.includes('top') || qNorm.includes('primer lugar') || qNorm.includes('mas rapido')) {
        const sorted = [...summaries].sort((a, b) => (a.tmo_promedio_seg || a.ahtTmoSeconds || 0) - (b.tmo_promedio_seg || b.ahtTmoSeconds || 0));
        const top = sorted[0];

        if (top) {
          answer = `🏆 **Mejor Asesor de la Operación:**\n` +
            `El agente con el TMO más óptimo es **${top.nombre_agente || top.agentName}** (\`${top.codigo_agente || top.agentCode}\`) con un TMO promedio de **${top.tmo_promedio_seg || top.ahtTmoSeconds}s**.\n\n` +
            `• **Llamadas Gestionadas:** ${top.total_llamadas || top.totalCalls || 0}\n` +
            `• **Tasa de Cumplimiento:** ${top.porcentaje_cumplimiento || top.complianceRate || 100}%\n` +
            `• **Tiempo de Silencio:** ${top.tiempo_promedio_silencio_seg || top.avgSilenceTimeSeconds}s\n` +
            `• **Estado:** APROBADO ✅\n\n` +
            `Recomendación: Reconocer su desempeño y solicitarle que lidere breves cápsulas de capacitación para sus compañeros.`;
        } else {
          answer = 'No hay suficientes datos de agentes procesados para calcular el ranking.';
        }

        return res.status(200).json({ success: true, question, answer, timestamp: new Date().toISOString() });
      }

      // -----------------------------------------------------------------------
      // 5. PEOR AGENTE / MAYOR TMO / MÁS DEMORADO
      // -----------------------------------------------------------------------
      if (qNorm.includes('peor') || qNorm.includes('mayor tmo') || qNorm.includes('mas demorado') || qNorm.includes('critico')) {
        const sorted = [...summaries].sort((a, b) => (b.tmo_promedio_seg || b.ahtTmoSeconds || 0) - (a.tmo_promedio_seg || a.ahtTmoSeconds || 0));
        const worst = sorted[0];

        if (worst) {
          const tmo = worst.tmo_promedio_seg || worst.ahtTmoSeconds || 0;
          const exceso = (tmo - currentThreshold).toFixed(1);
          answer = `⚠️ **Asesor con Mayor Desviación de TMO:**\n` +
            `El asesor con mayor tiempo de gestión es **${worst.nombre_agente || worst.agentName}** (\`${worst.codigo_agente || worst.agentCode}\`) con un TMO promedio de **${tmo}s** (+${exceso}s por encima del umbral de ${currentThreshold}s).\n\n` +
            `• **Causa Principal:** Tiempos de silencio (${worst.tiempo_promedio_silencio_seg || worst.avgSilenceTimeSeconds}s) y demoras en el cierre de la llamada.\n` +
            `• **Acción Inmediata:** Escucha de grabaciones de llamadas > 30s e instrucción en uso de atajos de teclado para reducir pausas.`;
        } else {
          answer = 'No hay datos de agentes registrados.';
        }

        return res.status(200).json({ success: true, question, answer, timestamp: new Date().toISOString() });
      }

      // -----------------------------------------------------------------------
      // 6. TIEMPOS DE SILENCIO Y PAUSAS
      // -----------------------------------------------------------------------
      if (qNorm.includes('silencio') || qNorm.includes('pausa') || qNorm.includes('espera') || qNorm.includes('hold')) {
        const highSilence = [...summaries].sort((a, b) => (b.tiempo_promedio_silencio_seg || b.avgSilenceTimeSeconds) - (a.tiempo_promedio_silencio_seg || a.avgSilenceTimeSeconds));

        answer = `🔇 **Análisis de Tiempos de Silencio en Llamadas:**\n` +
          `El silencio excesivo (>40% de la llamada) suele delatar dificultades en la búsqueda de información en el CRM o demoras de respuesta.\n\n` +
          `**Ranking de Tiempos de Silencio:**\n` +
          highSilence.map((a, i) => {
            const sil = a.tiempo_promedio_silencio_seg || a.avgSilenceTimeSeconds || 0;
            const tmo = a.tmo_promedio_seg || a.ahtTmoSeconds || 0;
            const pct = tmo > 0 ? Math.round((sil / tmo) * 100) : 0;
            const isCritical = pct > 40;
            return `${i + 1}. **${a.nombre_agente || a.agentName}**: **${sil}s** (${pct}% de la gestión) ${isCritical ? '⚠️ Silencio Excesivo' : '✓ Normal'}`;
          }).join('\n') +
          `\n\n💡 **Acción recomendada:** Capacitar a los asesores con mayor silencio en la base de conocimientos y configurar marcadores directos a las páginas más consultadas.`;

        return res.status(200).json({ success: true, question, answer, timestamp: new Date().toISOString() });
      }

      // -----------------------------------------------------------------------
      // 7. OUTLIERS ESTADÍSTICOS (Z-Score > 2.0)
      // -----------------------------------------------------------------------
      if (qNorm.includes('outlier') || qNorm.includes('atipico') || qNorm.includes('desviacion')) {
        const outliers = summaries.filter(s => s.isStatisticalOutlier || (s.zScore && s.zScore > 2));
        if (outliers.length > 0) {
          answer = `📈 **Detección de Outliers Estadísticos Críticos (Z-Score > 2.0):**\n` +
            `Se identificaron **${outliers.length} asesores** cuyo TMO se desvía más de 2 desviaciones estándar de la media del equipo:\n\n` +
            outliers.map(o => `• **${o.nombre_agente || o.agentName}** (\`${o.codigo_agente || o.agentCode}\`): TMO de **${o.tmo_promedio_seg || o.ahtTmoSeconds}s** (Puntuación Z: **${o.zScore}**)`).join('\n') +
            `\n\n🔍 **Impacto Operativo:** Un Z-score superior a 2.0 indica que este comportamiento no es aleatorio; se debe auditar individualmente sus grabaciones para descartar llamadas que quedaron abiertas en el marcador o fallas de red.`;
        } else {
          answer = '📊 **No se detectaron outliers estadísticos.** Todo el equipo se encuentra dentro de las 2 desviaciones estándar de la media.';
        }

        return res.status(200).json({ success: true, question, answer, timestamp: new Date().toISOString() });
      }

      // -----------------------------------------------------------------------
      // 8. RESUMEN GENERAL / KPIS GLOBALES
      // -----------------------------------------------------------------------
      if (qNorm.includes('resumen') || qNorm.includes('kpi') || qNorm.includes('general') || qNorm.includes('total') || qNorm.includes('llamadas')) {
        const totalCalls = summaries.reduce((acc, a) => acc + (a.total_llamadas || a.totalCalls || 0), 0);
        const totalContestadas = summaries.reduce((acc, a) => acc + (a.llamadas_contestadas || a.acceptedCalls || 0), 0);
        const totalPerdidas = summaries.reduce((acc, a) => acc + (a.llamadas_perdidas || a.missedCalls || 0), 0);
        const approvedCount = summaries.filter(s => (s.tmo_promedio_seg || s.ahtTmoSeconds || 0) <= currentThreshold).length;
        const reviewCount = summaries.length - approvedCount;
        const globalSumTime = summaries.reduce((acc, a) => acc + (a.suma_tiempo_gestion_seg || 0), 0);
        const globalWeightedTMO = totalCalls > 0 ? (globalSumTime / totalCalls).toFixed(2) : '0';

        answer = `📊 **Resumen Ejecutivo Global del Call Center:**\n\n` +
          `• **Total Llamadas Procesadas:** **${totalCalls}** (${totalContestadas} contestadas, ${totalPerdidas} perdidas)\n` +
          `• **Total Agentes Evaluados:** **${summaries.length} asesores**\n` +
          `• **TMO Global Ponderado:** **${globalWeightedTMO}s** (Umbral objetivo: **${currentThreshold}s**)\n` +
          `• **Distribución de Estado:** **${approvedCount} Aprobados ✅** | **${reviewCount} Requieren Revisión 🚨**\n` +
          `• **Tasa de Cumplimiento Global:** **${summaries.length > 0 ? Math.round((approvedCount / summaries.length) * 100) : 0}%**\n\n` +
          `💡 *Puedes solicitar el detalle de cualquier asesor escribiendo su nombre o activar el envío horario automatizado por correo.*`;

        return res.status(200).json({ success: true, question, answer, timestamp: new Date().toISOString() });
      }

      // -----------------------------------------------------------------------
      // 9. SALUDO O CONSULTA ABIERTA
      // -----------------------------------------------------------------------
      answer = `¡Hola! Soy tu **Asistente de IA Especialista en Call Centers y TMO** 🎧.\n\n` +
        `Puedo analizar en tiempo real los registros de la operación y responderte de inmediato. Aquí tienes algunos ejemplos de lo que puedes preguntarme:\n\n` +
        `👤 **Consultar cualquier agente:**\n` +
        `• *"Dame los reportes del TMO del agente Jefferson Cacerez"*\n` +
        `• *"Cómo va el agente Carlos Ramirez"*\n` +
        `• *"Muestrame las métricas de Laura Gomez"*\n\n` +
        `🚨 **Control de Desempeño y Cumplimiento:**\n` +
        `• *"¿Quiénes están pasados con el TMO?"*\n` +
        `• *"¿Quiénes van bien y cumplen el umbral?"*\n` +
        `• *"¿Quién es el mejor agente del equipo?"*\n` +
        `• *"¿Cuáles son los agentes con mayor tiempo de silencio?"*\n` +
        `• *"¿Hay outliers estadísticos detectados?"*\n\n` +
        `¿Sobre qué agente o métrica deseas consultar ahora?`;

      return res.status(200).json({
        success: true,
        question,
        answer,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }
}

function silencioPctCalculation(silence: number, tmo: number): number {
  if (tmo <= 0) return 0;
  return (silence / tmo) * 100;
}
