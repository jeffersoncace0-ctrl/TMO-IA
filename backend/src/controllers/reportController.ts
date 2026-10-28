import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { getLocalDb, supabase } from '../config/supabase';
import { config } from '../config';

export class ReportController {
  /**
   * Lista todos los reportes generados
   */
  public static async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('reportes_generados')
          .select('*, archivos_cargados(nombre_archivo)')
          .order('creado_en', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ success: true, reports: data });
      } else {
        const db = getLocalDb();
        return res.status(200).json({ success: true, reports: db.reportes });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Descarga física del reporte Excel (.xlsx) con sus 4 hojas y gráficos
   */
  public static async downloadReport(req: Request, res: Response, next: NextFunction) {
    try {
      const reportId = String(req.params.reportId);

      let reportRecord: any;
      if (supabase) {
        const { data } = await supabase.from('reportes_generados').select('*').eq('id', reportId).single();
        reportRecord = data;
      } else {
        const db = getLocalDb();
        reportRecord = db.reportes.find((r: any) => r.id === reportId || r.nombre_reporte === reportId);
      }

      if (!reportRecord && !fs.existsSync(path.resolve(config.reportsDir, reportId))) {
        return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
      }

      const filePath = reportRecord ? reportRecord.ruta_almacenamiento : path.resolve(config.reportsDir, reportId);
      const downloadName = reportRecord ? reportRecord.nombre_reporte : reportId;

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'El archivo del reporte no existe en el disco' });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      return res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }
}
