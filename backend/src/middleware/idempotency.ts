import { Request, Response, NextFunction } from 'express';
import { getLocalDb, saveLocalDb, supabase } from '../config/supabase';

export function idempotencyMiddleware(workflowName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = (req.headers['x-idempotency-key'] as string) || req.body?.idempotencyKey;

    if (!key) {
      // Si no se envía clave de idempotencia explícita, se permite la ejecución directa
      return next();
    }

    try {
      if (supabase) {
        const { data: existing } = await supabase
          .from('n8n_ejecuciones')
          .select('*')
          .eq('clave_idempotencia', key)
          .single();

        if (existing && (existing.estado === 'EN_PROCESO' || existing.estado === 'COMPLETADO')) {
          return res.status(200).json({
            success: true,
            isDuplicate: true,
            message: 'Operación previa completada o en proceso detectada. Idempotencia asegurada.',
            execution: existing
          });
        }
      } else {
        const db = getLocalDb();
        const existing = db.ejecucionesN8N.find((e: any) => e.clave_idempotencia === key);

        if (existing && (existing.estado === 'EN_PROCESO' || existing.estado === 'COMPLETADO')) {
          return res.status(200).json({
            success: true,
            isDuplicate: true,
            message: 'Operación previa completada o en proceso detectada. Idempotencia asegurada.',
            execution: existing
          });
        }
      }

      next();
    } catch (err) {
      console.error('Error en middleware de idempotencia:', err);
      next();
    }
  };
}
