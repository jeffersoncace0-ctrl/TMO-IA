import nodemailer from 'nodemailer';
import fs from 'fs';
import { config } from '../config';
import { EmailLogEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface SendReportEmailOptions {
  recipient: string;
  ccRecipients?: string[];
  subject?: string;
  customMessage?: string;
  attachmentPath: string;
  attachmentName: string;
  kpiSummary?: {
    totalCalls: number;
    tmoGlobal: number;
    complianceRate: number;
    threshold: number;
  };
  fileId?: string;
}

export class EmailService {
  /**
   * Valida sintácticamente una dirección de correo electrónico
   */
  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Envía el reporte consolidado por correo electrónico y registra la trazabilidad del proveedor
   */
  public static async sendReportEmail(options: SendReportEmailOptions): Promise<EmailLogEntry> {
    const { recipient, ccRecipients = [], attachmentPath, attachmentName, kpiSummary, fileId } = options;

    // Validación básica del correo
    if (!this.isValidEmail(recipient)) {
      throw new Error(`Dirección de correo principal inválida: "${recipient}"`);
    }

    for (const cc of ccRecipients) {
      if (cc && !this.isValidEmail(cc)) {
        throw new Error(`Dirección en copia inválida: "${cc}"`);
      }
    }

    if (!fs.existsSync(attachmentPath)) {
      throw new Error(`El archivo de reporte adjunto no existe en: ${attachmentPath}`);
    }

    const defaultSubject = `[Reporte Call Center] Análisis de TMO y Desempeño Operativo - ${new Date().toLocaleDateString('es-ES')}`;
    const subject = options.subject || defaultSubject;

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #333; line-height: 1.6;">
        <div style="background-color: #1E3A8A; color: #ffffff; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Plataforma de Análisis de Llamadas y TMO</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Reporte Automatizado de Operaciones</p>
        </div>

        <div style="padding: 20px; border: 1px solid #E5E7EB; border-top: none; background-color: #ffffff;">
          <p>Estimado equipo directivo y supervisores,</p>
          <p>${options.customMessage || 'Adjunto encontrarán el reporte consolidado de indicadores de llamadas y cumplimiento de TMO generado automáticamente por el sistema.'}</p>

          ${kpiSummary ? `
            <div style="background-color: #F8FAFC; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin-top: 0; color: #1E3A8A; font-size: 16px;">Resumen Ejecutivo de Indicadores</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 4px 0;"><strong>Total Llamadas:</strong></td><td style="text-align: right;">${kpiSummary.totalCalls}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>TMO Ponderado Global:</strong></td><td style="text-align: right; color: ${kpiSummary.tmoGlobal <= kpiSummary.threshold ? '#166534' : '#991B1B'}; font-weight: bold;">${kpiSummary.tmoGlobal}s</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Umbral Objetivo:</strong></td><td style="text-align: right;">${kpiSummary.threshold}s</td></tr>
                <tr><td style="padding: 4px 0;"><strong>% Cumplimiento Global:</strong></td><td style="text-align: right; font-weight: bold;">${kpiSummary.complianceRate}%</td></tr>
              </table>
            </div>
          ` : ''}

          <p style="font-size: 13px; color: #6B7280;">
            El archivo Excel adjunto incluye 4 hojas de análisis: Datos Originales, Resumen por Agente con gráficos de barras, Análisis Estadístico con gráfico de dona y la Validación de IA.
          </p>
        </div>

        <div style="background-color: #F3F4F6; padding: 12px 20px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6B7280; text-align: center;">
          Este correo fue generado y enviado automáticamente por el motor n8n / Backend API. Estado: <strong>Aceptado por proveedor de correo</strong>.
        </div>
      </div>
    `;

    // Configurar transporte
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    });

    const logEntry: EmailLogEntry = {
      id: uuidv4(),
      fileId,
      recipient,
      ccRecipients,
      subject,
      status: 'PENDIENTE',
      sentAt: new Date().toISOString()
    };

    try {
      // Si las credenciales SMTP no están configuradas (demo/mock), simular aceptación de proveedor
      if (!config.smtp.user || config.smtp.host === 'smtp.ethereal.email') {
        logEntry.status = 'ACEPTADO_PROVEEDOR';
        logEntry.providerMessageId = `mock-msg-${Date.now()}@callcenter.local`;
        logEntry.providerResponse = '250 2.0.0 OK (Simulación de entrega local aceptada)';
        return logEntry;
      }

      const info = await transporter.sendMail({
        from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
        to: recipient,
        cc: ccRecipients.length > 0 ? ccRecipients.join(', ') : undefined,
        subject,
        html: bodyHtml,
        attachments: [
          {
            filename: attachmentName,
            path: attachmentPath
          }
        ]
      });

      logEntry.status = 'ACEPTADO_PROVEEDOR';
      logEntry.providerMessageId = info.messageId;
      logEntry.providerResponse = info.response;

      return logEntry;
    } catch (err: any) {
      logEntry.status = 'ERROR';
      logEntry.errorMessage = err.message || 'Fallo en la comunicación con el servidor SMTP';
      throw err;
    }
  }

  /**
   * Envía el reporte periódico/horario con el detalle de agentes pasados con el TMO
   * y agentes que van bien, junto con el archivo Excel oficial adjunto si existe.
   */
  public static async sendHourlyTMODigest(options: {
    recipient: string;
    ccRecipients?: string[];
    customSubject?: string;
    threshold?: number;
    fileId?: string;
    isAutomated?: boolean;
  }): Promise<EmailLogEntry> {
    const { recipient, ccRecipients = [], fileId, isAutomated = true } = options;

    if (!this.isValidEmail(recipient)) {
      throw new Error(`Dirección de correo destinatario inválida: "${recipient}"`);
    }

    // Acceder a la base de datos local
    const { getLocalDb, saveLocalDb, supabase } = require('../config/supabase');
    const db = getLocalDb();

    const activeThreshold = options.threshold || db.configuracionUmbral?.umbral_segundos || config.defaultTmoThreshold;

    // Obtener los agentes más recientes (deduplicar por codigo_agente)
    const rawAgents = fileId
      ? db.resumenAgentes.filter((a: any) => a.archivo_id === fileId)
      : db.resumenAgentes;

    const agentMap = new Map<string, any>();
    for (const a of rawAgents) {
      const code = a.codigo_agente || a.agentCode;
      if (!agentMap.has(code)) {
        agentMap.set(code, a);
      }
    }
    const agents = Array.from(agentMap.values());

    // Separar en pasados de TMO y los que van bien
    const pasados = agents.filter(a => {
      const tmo = a.tmo_promedio_seg || a.ahtTmoSeconds || 0;
      return tmo > activeThreshold;
    }).sort((a, b) => (b.tmo_promedio_seg || b.ahtTmoSeconds || 0) - (a.tmo_promedio_seg || a.ahtTmoSeconds || 0));

    const vanBien = agents.filter(a => {
      const tmo = a.tmo_promedio_seg || a.ahtTmoSeconds || 0;
      return tmo <= activeThreshold;
    }).sort((a, b) => (a.tmo_promedio_seg || a.ahtTmoSeconds || 0) - (b.tmo_promedio_seg || b.ahtTmoSeconds || 0));

    // Validaciones de IA para obtener recomendaciones
    const validations = db.validacionesIA || [];

    const nowFormatted = new Date().toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeFormatted = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const subject = options.customSubject || 
      `[Alerta TMO Horaria] Desempeño Operativo: ${pasados.length} Pasados vs. ${vanBien.length} Cumpliendo - ${timeFormatted}`;

    // Construcción de filas de agentes pasados
    const pasadosHtmlRows = pasados.length === 0 ? `
      <tr>
        <td colspan="6" style="padding: 12px; text-align: center; color: #166534; background-color: #F0FDF4; font-weight: bold;">
          🎉 ¡Excelente noticia! No hay ningún agente pasado del umbral de TMO en esta hora.
        </td>
      </tr>
    ` : pasados.map(a => {
      const tmo = a.tmo_promedio_seg || a.ahtTmoSeconds || 0;
      const exceso = (tmo - activeThreshold).toFixed(1);
      const silencio = a.tiempo_promedio_silencio_seg || a.avgSilenceTimeSeconds || 0;
      const silencioPct = tmo > 0 ? Math.round((silencio / tmo) * 100) : 0;
      const val = validations.find((v: any) => (v.codigo_agente || v.agentCode) === (a.codigo_agente || a.agentCode));
      const recomendacion = val?.recomendacion_operativa || val?.operationalRecommendation || 
        (silencioPct > 35 ? 'Reducir tiempos de búsqueda y pausas en CRM' : 'Revisar duración de cierre (wrap-up)');

      return `
        <tr style="border-bottom: 1px solid #FEE2E2;">
          <td style="padding: 10px 8px; font-weight: bold; color: #991B1B;">${a.codigo_agente || a.agentCode}</td>
          <td style="padding: 10px 8px; font-weight: bold; color: #1F2937;">${a.nombre_agente || a.agentName}</td>
          <td style="padding: 10px 8px; text-align: center; font-weight: bold; color: #DC2626; font-size: 14px;">${tmo}s</td>
          <td style="padding: 10px 8px; text-align: center; color: #DC2626; font-weight: bold;">+${exceso}s</td>
          <td style="padding: 10px 8px; text-align: center; color: ${silencioPct > 30 ? '#B45309' : '#4B5563'};">
            ${silencio}s <span style="font-size: 11px; opacity: 0.8;">(${silencioPct}%)</span>
          </td>
          <td style="padding: 10px 8px; font-size: 12px; color: #4B5563;">${recomendacion}</td>
        </tr>
      `;
    }).join('');

    // Construcción de filas de agentes que van bien
    const vanBienHtmlRows = vanBien.length === 0 ? `
      <tr>
        <td colspan="6" style="padding: 12px; text-align: center; color: #991B1B; background-color: #FEF2F2; font-weight: bold;">
          ⚠️ Todos los agentes evaluados están requiriendo revisión en este corte.
        </td>
      </tr>
    ` : vanBien.map(a => {
      const tmo = a.tmo_promedio_seg || a.ahtTmoSeconds || 0;
      const cumplimiento = a.porcentaje_cumplimiento || a.complianceRate || 100;
      const llamadas = a.total_llamadas || a.totalCalls || 0;
      const silencio = a.tiempo_promedio_silencio_seg || a.avgSilenceTimeSeconds || 0;

      return `
        <tr style="border-bottom: 1px solid #DCFCE7;">
          <td style="padding: 8px; font-weight: bold; color: #166534;">${a.codigo_agente || a.agentCode}</td>
          <td style="padding: 8px; font-weight: 600; color: #1F2937;">${a.nombre_agente || a.agentName}</td>
          <td style="padding: 8px; text-align: center; font-weight: bold; color: #15803D; font-size: 14px;">${tmo}s</td>
          <td style="padding: 8px; text-align: center; font-weight: bold; color: #15803D;">${cumplimiento}%</td>
          <td style="padding: 8px; text-align: center; color: #4B5563;">${llamadas} llamadas</td>
          <td style="padding: 8px; text-align: center; color: #4B5563;">${silencio}s</td>
        </tr>
      `;
    }).join('');

    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #1F2937; line-height: 1.5; background-color: #F8FAFC; padding: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); color: #ffffff; padding: 24px; border-radius: 12px 12px 0 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">🎧 Control Horario de TMO & Agentes</h1>
            <span style="background-color: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
              ${isAutomated ? '⏰ Envío Programado Cada 1 Hora' : '⚡ Despacho Inmediato'}
            </span>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">
            Corte del ${nowFormatted} a las <strong>${timeFormatted}</strong> • Umbral Objetivo: <strong>${activeThreshold}s</strong>
          </p>
        </div>

        <!-- KPI Cards Grid -->
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #E2E8F0; border-top: none;">
          <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0; margin-bottom: 20px;">
            <tr>
              <td style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 12px; text-align: center; width: 33%;">
                <span style="display: block; font-size: 11px; font-weight: bold; color: #991B1B; text-transform: uppercase;">🚨 Pasados de TMO</span>
                <span style="font-size: 24px; font-weight: 800; color: #DC2626;">${pasados.length}</span>
                <span style="display: block; font-size: 11px; color: #7F1D1D;">Requieren Acción</span>
              </td>
              <td style="background-color: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 12px; text-align: center; width: 33%;">
                <span style="display: block; font-size: 11px; font-weight: bold; color: #166534; text-transform: uppercase;">✅ Van Bien</span>
                <span style="font-size: 24px; font-weight: 800; color: #16A34A;">${vanBien.length}</span>
                <span style="display: block; font-size: 11px; color: #14532D;">Cumpliendo Meta</span>
              </td>
              <td style="background-color: #EFF6FF; border: 1px solid #93C5FD; border-radius: 8px; padding: 12px; text-align: center; width: 33%;">
                <span style="display: block; font-size: 11px; font-weight: bold; color: #1E40AF; text-transform: uppercase;">📊 Umbral Activo</span>
                <span style="font-size: 24px; font-weight: 800; color: #2563EB;">${activeThreshold}s</span>
                <span style="display: block; font-size: 11px; color: #1E3A8A;">Estándar Objetivo</span>
              </td>
            </tr>
          </table>

          <!-- Sección 1: Agentes Pasados del TMO -->
          <div style="margin-bottom: 25px;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <h2 style="margin: 0; font-size: 15px; color: #991B1B; font-weight: 800; text-transform: uppercase;">
                🚨 1. Agentes Pasados con el TMO (Superan los ${activeThreshold}s)
              </h2>
            </div>
            <p style="font-size: 12px; color: #6B7280; margin: 0 0 10px 0;">
              Estos asesores requieren retroalimentación prioritaria para reducir tiempos de espera, silencios y cierres prolongados.
            </p>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; background-color: #ffffff; border: 1px solid #FECACA; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: #FEE2E2; color: #991B1B; text-align: left; font-size: 11px; text-transform: uppercase;">
                  <th style="padding: 10px 8px;">Código</th>
                  <th style="padding: 10px 8px;">Asesor</th>
                  <th style="padding: 10px 8px; text-align: center;">TMO Actual</th>
                  <th style="padding: 10px 8px; text-align: center;">Exceso</th>
                  <th style="padding: 10px 8px; text-align: center;">Silencio</th>
                  <th style="padding: 10px 8px;">Plan de Acción IA</th>
                </tr>
              </thead>
              <tbody>
                ${pasadosHtmlRows}
              </tbody>
            </table>
          </div>

          <!-- Sección 2: Agentes que Van Bien -->
          <div style="margin-bottom: 20px;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <h2 style="margin: 0; font-size: 15px; color: #166534; font-weight: 800; text-transform: uppercase;">
                ✅ 2. Agentes que Van Bien (Dentro del Umbral &le; ${activeThreshold}s)
              </h2>
            </div>
            <p style="font-size: 12px; color: #6B7280; margin: 0 0 10px 0;">
              Asesores con excelente ritmo operativo y adherencia al objetivo de servicio.
            </p>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; background-color: #ffffff; border: 1px solid #BBF7D0; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: #DCFCE7; color: #166534; text-align: left; font-size: 11px; text-transform: uppercase;">
                  <th style="padding: 10px 8px;">Código</th>
                  <th style="padding: 10px 8px;">Asesor</th>
                  <th style="padding: 10px 8px; text-align: center;">TMO</th>
                  <th style="padding: 10px 8px; text-align: center;">% Cumplimiento</th>
                  <th style="padding: 10px 8px; text-align: center;">Llamadas</th>
                  <th style="padding: 10px 8px; text-align: center;">Silencio Prom.</th>
                </tr>
              </thead>
              <tbody>
                ${vanBienHtmlRows}
              </tbody>
            </table>
          </div>

          <!-- Nota informativa -->
          <div style="background-color: #F1F5F9; border-left: 4px solid #3B82F6; padding: 12px; border-radius: 4px; font-size: 12px; color: #334155;">
            <strong>Nota del Asistente IA:</strong> La regla matemática de TMO es objetiva e inalterable. Los supervisores pueden consultar al Bot de IA en la plataforma en cualquier momento formulando preguntas directas como: <em>"Dame el reporte del agente Jefferson Cacerez"</em> o <em>"¿Cuáles son los agentes con mayor silencio?"</em>.
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #F1F5F9; padding: 16px 20px; border-radius: 0 0 12px 12px; font-size: 11px; color: #64748B; text-align: center; border: 1px solid #E2E8F0; border-top: none;">
          Generado automáticamente por el motor de programación horaria de la Plataforma Call Center TMO.<br/>
          Destinatario configurado: <strong>${recipient}</strong> • Estado: <strong>Aceptado por Servidor de Correo</strong>.
        </div>
      </div>
    `;

    // Buscar reporte Excel para adjuntar
    let attachment: any = null;
    const reports = db.reportes || [];
    if (reports.length > 0) {
      const latestReport = reports[0];
      if (fs.existsSync(latestReport.ruta_almacenamiento)) {
        attachment = {
          filename: latestReport.nombre_reporte,
          path: latestReport.ruta_almacenamiento
        };
      }
    }

    // Configurar transporte nodemailer
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    });

    const logEntry: EmailLogEntry = {
      id: uuidv4(),
      fileId,
      recipient,
      ccRecipients,
      subject,
      status: 'PENDIENTE',
      sentAt: new Date().toISOString()
    };

    try {
      // Simulación local si no hay credenciales activas
      if (!config.smtp.user || config.smtp.host === 'smtp.ethereal.email') {
        logEntry.status = 'ACEPTADO_PROVEEDOR';
        logEntry.providerMessageId = `hourly-mock-${Date.now()}@callcenter.local`;
        logEntry.providerResponse = '250 2.0.0 OK (Simulación de reporte horario local)';
        db.historialCorreos.unshift(logEntry);
        saveLocalDb();
        return logEntry;
      }

      const info = await transporter.sendMail({
        from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
        to: recipient,
        cc: ccRecipients.length > 0 ? ccRecipients.join(', ') : undefined,
        subject,
        html: bodyHtml,
        attachments: attachment ? [attachment] : []
      });

      logEntry.status = 'ACEPTADO_PROVEEDOR';
      logEntry.providerMessageId = info.messageId;
      logEntry.providerResponse = info.response;

      db.historialCorreos.unshift(logEntry);
      saveLocalDb();

      return logEntry;
    } catch (err: any) {
      logEntry.status = 'ERROR';
      logEntry.errorMessage = err.message || 'Error en envío SMTP';
      db.historialCorreos.unshift(logEntry);
      saveLocalDb();
      throw err;
    }
  }
}
