import { Request, Response, NextFunction } from 'express';
import { getLocalDb, saveLocalDb, supabase } from '../config/supabase';
import { config } from '../config';
import { EmailService } from '../services/emailService';
import path from 'path';

export class SettingsController {
  /**
   * Obtiene la configuración del umbral de TMO actual
   */
  public static async getThreshold(req: Request, res: Response, next: NextFunction) {
    try {
      if (supabase) {
        const { data } = await supabase
          .from('configuracion_umbral')
          .select('*')
          .eq('activo', true)
          .order('creado_en', { ascending: false })
          .limit(1)
          .single();

        return res.status(200).json({
          success: true,
          thresholdSeconds: data ? parseFloat(data.umbral_segundos) : config.defaultTmoThreshold,
          updatedAt: data ? data.actualizado_en : new Date().toISOString()
        });
      } else {
        const db = getLocalDb();
        return res.status(200).json({
          success: true,
          thresholdSeconds: db.configuracionUmbral.umbral_segundos,
          updatedAt: db.configuracionUmbral.actualizado_en
        });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Actualiza el umbral de TMO configurable
   */
  public static async updateThreshold(req: Request, res: Response, next: NextFunction) {
    try {
      const { thresholdSeconds } = req.body;
      const num = parseFloat(thresholdSeconds);

      if (isNaN(num) || num <= 0) {
        return res.status(400).json({ success: false, message: 'El umbral debe ser un número positivo en segundos.' });
      }

      if (supabase) {
        await supabase
          .from('configuracion_umbral')
          .insert({
            umbral_segundos: num,
            descripcion: `Umbral configurado dinámicamente: ${num}s`,
            activo: true
          });
      } else {
        const db = getLocalDb();
        db.configuracionUmbral = {
          umbral_segundos: num,
          actualizado_en: new Date().toISOString()
        };
        saveLocalDb();
      }

      return res.status(200).json({
        success: true,
        message: `Umbral de TMO actualizado exitosamente a ${num} segundos.`,
        thresholdSeconds: num
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Obtiene la configuración de correo y el historial de envíos
   */
  public static async getEmailSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const db = getLocalDb();
      const currentConfig = {
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        fromName: config.smtp.fromName,
        fromEmail: config.smtp.fromEmail
      };

      const logs = supabase
        ? (await supabase.from('historial_notificaciones_correo').select('*').order('fecha_envio', { ascending: false })).data || []
        : db.historialCorreos;

      return res.status(200).json({
        success: true,
        config: currentConfig,
        logs
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Envía un reporte por correo electrónico a los destinatarios indicados
   */
  public static async sendReportEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { recipient, ccRecipients, subject, customMessage, reportId, fileId } = req.body;

      if (!recipient) {
        return res.status(400).json({ success: false, message: 'El correo destinatario es obligatorio.' });
      }

      // Buscar reporte
      const db = getLocalDb();
      const report = db.reportes.find((r: any) => r.id === reportId || r.nombre_reporte === reportId) || db.reportes[0];

      if (!report) {
        return res.status(404).json({ success: false, message: 'No hay reportes disponibles para enviar. Primero procese un archivo.' });
      }

      const emailResult = await EmailService.sendReportEmail({
        recipient,
        ccRecipients: Array.isArray(ccRecipients) ? ccRecipients : (ccRecipients ? [ccRecipients] : []),
        subject,
        customMessage,
        attachmentPath: report.ruta_almacenamiento,
        attachmentName: report.nombre_reporte,
        fileId: fileId || report.archivo_id
      });

      // Guardar en historial
      if (supabase) {
        await supabase.from('historial_notificaciones_correo').insert({
          id: emailResult.id,
          archivo_id: fileId || report.archivo_id,
          destinatario: emailResult.recipient,
          destinatarios_cc: emailResult.ccRecipients,
          asunto: emailResult.subject,
          cuerpo_mensaje: customMessage,
          adjunto_nombre: report.nombre_reporte,
          estado_envio: emailResult.status,
          id_mensaje_proveedor: emailResult.providerMessageId,
          respuesta_servidor: emailResult.providerResponse,
          mensaje_error: emailResult.errorMessage
        });
      } else {
        db.historialCorreos.unshift(emailResult);
        saveLocalDb();
      }

      return res.status(200).json({
        success: true,
        message: 'Reporte enviado al proveedor de correo exitosamente.',
        emailLog: emailResult
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Obtiene el estado y configuración de la automatización de envío horario
   */
  public static async getSchedulerStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { SchedulerService } = require('../services/schedulerService');
      const status = SchedulerService.getStatus();
      return res.status(200).json({
        success: true,
        scheduler: status
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Actualiza la configuración de la automatización horaria
   */
  public static async updateSchedulerConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { SchedulerService } = require('../services/schedulerService');
      const { enabled, intervalMinutes, recipientEmail, ccRecipients } = req.body;

      const updated = SchedulerService.updateConfig({
        enabled: enabled !== undefined ? Boolean(enabled) : undefined,
        intervalMinutes: intervalMinutes ? parseInt(intervalMinutes, 10) : undefined,
        recipientEmail,
        ccRecipients: Array.isArray(ccRecipients) ? ccRecipients : (ccRecipients ? [ccRecipients] : undefined)
      });

      return res.status(200).json({
        success: true,
        message: 'Configuración de envío horario actualizada exitosamente.',
        scheduler: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Dispara inmediatamente el reporte horario de prueba / manual
   */
  public static async triggerSchedulerNow(req: Request, res: Response, next: NextFunction) {
    try {
      const { SchedulerService } = require('../services/schedulerService');
      const { recipientEmail } = req.body;

      const result = await SchedulerService.executeDispatch(false, recipientEmail);
      return res.status(result.success ? 200 : 500).json(result);
    } catch (err) {
      next(err);
    }
  }
}
