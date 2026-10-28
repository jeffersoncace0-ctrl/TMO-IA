import { Request, Response, NextFunction } from 'express';
import { getLocalDb, supabase } from '../config/supabase';

export class AgentController {
  /**
   * Obtiene la lista completa de agentes con sus métricas consolidadas
   */
  public static async getAgents(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.query.fileId as string;
      const classification = req.query.classification as string;

      if (supabase) {
        let query = supabase.from('resumen_agentes').select('*');
        if (fileId) query = query.eq('archivo_id', fileId);
        if (classification) query = query.eq('clasificacion_determinista', classification);
        
        query = query.order('total_llamadas', { ascending: false });
        const { data, error } = await query;
        if (error) throw error;

        return res.status(200).json({ success: true, agents: data || [] });
      } else {
        const db = getLocalDb();
        let agents = [...db.resumenAgentes];

        if (fileId) agents = agents.filter(a => a.archivo_id === fileId);
        if (classification) agents = agents.filter(a => a.clasificacion_determinista === classification);

        agents.sort((a, b) => b.total_llamadas - a.total_llamadas);
        return res.status(200).json({ success: true, agents });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Obtiene el detalle individual de un agente específico, sus métricas y llamadas asociadas
   */
  public static async getAgentDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentCode } = req.params;
      const fileId = req.query.fileId as string;

      if (supabase) {
        let sumQuery = supabase.from('resumen_agentes').select('*').eq('codigo_agente', agentCode);
        if (fileId) sumQuery = sumQuery.eq('archivo_id', fileId);
        const { data: summary } = await sumQuery.single();

        let callsQuery = supabase.from('registros_llamadas').select('*').eq('codigo_agente_origen', agentCode);
        if (fileId) callsQuery = callsQuery.eq('archivo_id', fileId);
        const { data: calls } = await callsQuery.order('fecha_llamada', { ascending: false }).limit(50);

        let aiQuery = supabase.from('validaciones_ia').select('*').eq('agente_id', agentCode);
        if (fileId) aiQuery = aiQuery.eq('archivo_id', fileId);
        const { data: aiValidation } = await aiQuery.single();

        return res.status(200).json({
          success: true,
          agent: summary,
          calls: calls || [],
          aiValidation
        });
      } else {
        const db = getLocalDb();
        const summary = db.resumenAgentes.find(a => 
          a.codigo_agente === agentCode && (!fileId || a.archivo_id === fileId)
        );

        const calls = db.llamadas
          .filter(c => c.codigo_agente_origen === agentCode && (!fileId || c.archivo_id === fileId))
          .slice(0, 50);

        const aiValidation = db.validacionesIA.find(v => 
          v.agentCode === agentCode && (!fileId || v.archivo_id === fileId)
        );

        return res.status(200).json({
          success: true,
          agent: summary,
          calls,
          aiValidation
        });
      }
    } catch (err) {
      next(err);
    }
  }
}
