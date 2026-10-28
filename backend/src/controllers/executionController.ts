import { Request, Response, NextFunction } from 'express';
import { getLocalDb, saveLocalDb, supabase } from '../config/supabase';

export class ExecutionController {
  /**
   * Obtiene el historial de ejecuciones de workflows y procesos
   */
  public static async getExecutions(req: Request, res: Response, next: NextFunction) {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('n8n_ejecuciones')
          .select('*')
          .order('iniciado_en', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ success: true, executions: data });
      } else {
        const db = getLocalDb();
        return res.status(200).json({ success: true, executions: db.ejecucionesN8N });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Obtiene la lista de errores auditados
   */
  public static async getAuditErrors(req: Request, res: Response, next: NextFunction) {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('auditoria_errores')
          .select('*')
          .order('creado_en', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ success: true, errors: data });
      } else {
        const db = getLocalDb();
        return res.status(200).json({ success: true, errors: db.erroresAuditoria });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reintenta o resuelve un error registrado
   */
  public static async resolveError(req: Request, res: Response, next: NextFunction) {
    try {
      const { errorId } = req.params;
      const { action } = req.body; // 'resolve' o 'retry'

      if (supabase) {
        if (action === 'retry') {
          await supabase
            .from('auditoria_errores')
            .update({ reintentos_realizados: 1 })
            .eq('id', errorId);
        } else {
          await supabase
            .from('auditoria_errores')
            .update({ resuelto: true, resuelto_en: new Date().toISOString() })
            .eq('id', errorId);
        }
      } else {
        const db = getLocalDb();
        const item = db.erroresAuditoria.find((e: any) => e.id === errorId);
        if (item) {
          if (action === 'retry') {
            item.reintentos_realizados = (item.reintentos_realizados || 0) + 1;
          } else {
            item.resuelto = true;
            item.resuelto_en = new Date().toISOString();
          }
          saveLocalDb();
        }
      }

      return res.status(200).json({
        success: true,
        message: action === 'retry' ? 'Reintento iniciado exitosamente' : 'Error marcado como resuelto'
      });
    } catch (err) {
      next(err);
    }
  }
}
