import { Request, Response, NextFunction } from 'express';
import { getLocalDb, saveLocalDb, supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const errorMessage = err.message || 'Ocurrió un error inesperado en el servidor';
  const stackTrace = process.env.NODE_ENV === 'development' ? err.stack : undefined;

  console.error(`[ERROR API] [${errorCode}]`, err);

  // Registrar auditoría de error en base de datos
  const auditRecord = {
    id: uuidv4(),
    codigo_error: errorCode,
    origen: req.path,
    gravedad: 'ALTA',
    mensaje: errorMessage,
    detalles_tecnicos: stackTrace || JSON.stringify(err),
    reintentos_realizados: 0,
    resuelto: false,
    creado_en: new Date().toISOString()
  };

  try {
    if (supabase) {
      await supabase.from('auditoria_errores').insert(auditRecord);
    } else {
      const db = getLocalDb();
      db.erroresAuditoria.unshift(auditRecord);
      saveLocalDb();
    }
  } catch (logErr) {
    console.error('Fallo al registrar error en auditoría:', logErr);
  }

  res.status(err.status || 500).json({
    success: false,
    errorCode,
    message: errorMessage,
    errorId: auditRecord.id,
    timestamp: new Date().toISOString()
  });
}
