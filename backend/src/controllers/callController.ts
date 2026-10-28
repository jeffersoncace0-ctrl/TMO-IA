import { Request, Response, NextFunction } from 'express';
import { getLocalDb, supabase } from '../config/supabase';

export class CallController {
  /**
   * Obtiene la lista paginada de llamadas con búsqueda, ordenamiento y filtros
   */
  public static async getCalls(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const offset = (page - 1) * limit;

      const search = (req.query.search as string || '').toLowerCase().trim();
      const sortBy = (req.query.sortBy as string) || 'fecha_llamada';
      const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

      const fileId = req.query.fileId as string;
      const agentCode = req.query.agentCode as string;
      const callType = req.query.callType as string;
      const callStatus = req.query.callStatus as string;
      const onlyInvalid = req.query.onlyInvalid === 'true';

      let allCalls: any[] = [];

      if (supabase) {
        let query = supabase.from('registros_llamadas').select('*', { count: 'exact' });
        if (fileId) query = query.eq('archivo_id', fileId);
        if (agentCode) query = query.eq('codigo_agente_origen', agentCode);
        if (callType) query = query.eq('tipo_llamada', callType);
        if (callStatus) query = query.eq('estado_llamada', callStatus);
        if (onlyInvalid) query = query.eq('es_valido', false);

        if (search) {
          query = query.or(`codigo_agente_origen.ilike.%${search}%,nombre_agente_origen.ilike.%${search}%,identificador_llamada.ilike.%${search}%`);
        }

        query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(offset, offset + limit - 1);
        const { data, count, error } = await query;
        if (error) throw error;

        return res.status(200).json({
          success: true,
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          calls: data || []
        });
      } else {
        const db = getLocalDb();
        allCalls = [...db.llamadas];

        if (fileId) allCalls = allCalls.filter(c => c.archivo_id === fileId);
        if (agentCode) allCalls = allCalls.filter(c => c.codigo_agente_origen === agentCode);
        if (callType) allCalls = allCalls.filter(c => c.tipo_llamada === callType);
        if (callStatus) allCalls = allCalls.filter(c => c.estado_llamada === callStatus);
        if (onlyInvalid) allCalls = allCalls.filter(c => !c.es_valido);

        if (search) {
          allCalls = allCalls.filter(c => 
            (c.codigo_agente_origen && c.codigo_agente_origen.toLowerCase().includes(search)) ||
            (c.nombre_agente_origen && c.nombre_agente_origen.toLowerCase().includes(search)) ||
            (c.identificador_llamada && c.identificador_llamada.toLowerCase().includes(search))
          );
        }

        // Ordenamiento
        allCalls.sort((a, b) => {
          let valA = a[sortBy];
          let valB = b[sortBy];
          if (valA === undefined) valA = '';
          if (valB === undefined) valB = '';
          if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
          if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });

        const total = allCalls.length;
        const paginated = allCalls.slice(offset, offset + limit);

        return res.status(200).json({
          success: true,
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          calls: paginated
        });
      }
    } catch (err) {
      next(err);
    }
  }
}
