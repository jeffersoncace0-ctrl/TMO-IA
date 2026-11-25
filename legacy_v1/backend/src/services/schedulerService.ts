import { getLocalDb, saveLocalDb, supabase } from '../config/supabase';
import { EmailService } from './emailService';
import { config } from '../config';

export interface SchedulerConfig {
  enabled: boolean;
  intervalMinutes: number; // default 60 (1 hora)
  recipientEmail: string;
  ccRecipients: string[];
  lastSentAt: string | null;
  nextSendAt: string | null;
  totalSentCount: number;
  lastStatus: 'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR';
  lastError: string | null;
}

export class SchedulerService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  private static currentConfig: SchedulerConfig = {
    enabled: true,
    intervalMinutes: 60, // Cada 1 hora
    recipientEmail: config.smtp.user || 'paulcacerez768@gmail.com',
    ccRecipients: [],
    lastSentAt: null,
    nextSendAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    totalSentCount: 0,
    lastStatus: 'IDLE',
    lastError: null
  };

  /**
   * Inicializa el scheduler en segundo plano cuando arranca el servidor
   */
  public static initScheduler() {
    // Cargar estado persistido si existe
    const db = getLocalDb();
    if ((db as any).schedulerConfig) {
      this.currentConfig = { ...this.currentConfig, ...(db as any).schedulerConfig };
    } else {
      (db as any).schedulerConfig = this.currentConfig;
      saveLocalDb();
    }

    // Si nextSendAt no está definido o es anterior a ahora y está activo, recalcular
    if (!this.currentConfig.nextSendAt || new Date(this.currentConfig.nextSendAt).getTime() < Date.now()) {
      this.currentConfig.nextSendAt = new Date(Date.now() + this.currentConfig.intervalMinutes * 60 * 1000).toISOString();
    }

    if (this.timer) {
      clearInterval(this.timer);
    }

    console.log(`⏰ Scheduler de Reportes Horarios activado. Próximo envío programado: ${this.currentConfig.nextSendAt} a ${this.currentConfig.recipientEmail}`);

    // Comprobador cada 30 segundos
    this.timer = setInterval(async () => {
      await this.checkAndExecute();
    }, 30 * 1000);
  }

  /**
   * Verifica si ha llegado la hora de ejecutar el envío programado
   */
  private static async checkAndExecute() {
    if (!this.currentConfig.enabled || this.isRunning) return;

    const now = Date.now();
    const nextTime = this.currentConfig.nextSendAt ? new Date(this.currentConfig.nextSendAt).getTime() : 0;

    if (nextTime > 0 && now >= nextTime) {
      console.log(`⏰ [Scheduler] Disparando envío automático programado cada ${this.currentConfig.intervalMinutes} minutos...`);
      await this.executeDispatch(true);
    }
  }

  /**
   * Ejecuta el despacho del reporte de TMO (agentes pasados y agentes que van bien)
   */
  public static async executeDispatch(isAutomated = true, overrideRecipient?: string): Promise<{ success: boolean; message: string; log?: any }> {
    if (this.isRunning) {
      return { success: false, message: 'Ya hay un envío de reporte en proceso actualmente.' };
    }

    this.isRunning = true;
    this.currentConfig.lastStatus = 'SENDING';
    this.currentConfig.lastError = null;

    const targetRecipient = overrideRecipient || this.currentConfig.recipientEmail;

    try {
      const emailLog = await EmailService.sendHourlyTMODigest({
        recipient: targetRecipient,
        ccRecipients: this.currentConfig.ccRecipients,
        threshold: undefined, // usa el actual configurado
        isAutomated
      });

      this.currentConfig.lastSentAt = new Date().toISOString();
      this.currentConfig.totalSentCount += 1;
      this.currentConfig.lastStatus = 'SUCCESS';
      // Programar próximo envío
      this.currentConfig.nextSendAt = new Date(Date.now() + this.currentConfig.intervalMinutes * 60 * 1000).toISOString();

      // Persistir
      const db = getLocalDb();
      (db as any).schedulerConfig = this.currentConfig;
      saveLocalDb();

      console.log(`✅ [Scheduler] Reporte horario entregado exitosamente a: ${targetRecipient}. Próximo: ${this.currentConfig.nextSendAt}`);
      return {
        success: true,
        message: `Reporte de TMO enviado exitosamente a ${targetRecipient}. Próximo envío en ${this.currentConfig.intervalMinutes} minutos.`,
        log: emailLog
      };
    } catch (err: any) {
      console.error(`❌ [Scheduler] Error enviando reporte horario:`, err);
      this.currentConfig.lastStatus = 'ERROR';
      this.currentConfig.lastError = err.message || 'Error en envío SMTP';

      const db = getLocalDb();
      (db as any).schedulerConfig = this.currentConfig;
      saveLocalDb();

      return {
        success: false,
        message: `Fallo al enviar reporte: ${err.message || 'Error SMTP'}`
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Obtiene la configuración y estado actual del scheduler
   */
  public static getStatus() {
    const now = Date.now();
    const nextTime = this.currentConfig.nextSendAt ? new Date(this.currentConfig.nextSendAt).getTime() : 0;
    const secondsRemaining = Math.max(0, Math.round((nextTime - now) / 1000));
    const minutesRemaining = Math.round(secondsRemaining / 60);

    return {
      ...this.currentConfig,
      secondsRemaining,
      minutesRemaining,
      isRunning: this.isRunning
    };
  }

  /**
   * Actualiza la configuración del scheduler (destinatario, intervalo, activar/desactivar)
   */
  public static updateConfig(updates: Partial<SchedulerConfig>) {
    if (updates.intervalMinutes !== undefined && updates.intervalMinutes > 0) {
      this.currentConfig.intervalMinutes = updates.intervalMinutes;
      // Recalcular nextSendAt a partir de ahora con el nuevo intervalo
      this.currentConfig.nextSendAt = new Date(Date.now() + updates.intervalMinutes * 60 * 1000).toISOString();
    }
    if (updates.recipientEmail !== undefined && updates.recipientEmail.trim()) {
      this.currentConfig.recipientEmail = updates.recipientEmail.trim();
    }
    if (updates.ccRecipients !== undefined) {
      this.currentConfig.ccRecipients = updates.ccRecipients;
    }
    if (updates.enabled !== undefined) {
      this.currentConfig.enabled = updates.enabled;
      if (updates.enabled) {
        this.currentConfig.nextSendAt = new Date(Date.now() + this.currentConfig.intervalMinutes * 60 * 1000).toISOString();
      }
    }

    const db = getLocalDb();
    (db as any).schedulerConfig = this.currentConfig;
    saveLocalDb();

    return this.getStatus();
  }
}
