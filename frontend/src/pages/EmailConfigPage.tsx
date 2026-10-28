import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  Clock, 
  FileSpreadsheet,
  RefreshCw,
  Info,
  Calendar,
  Zap,
  Users,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

interface EmailConfigPageProps {
  selectedFileId?: string;
}

export const EmailConfigPage: React.FC<EmailConfigPageProps> = ({ selectedFileId }) => {
  // Estado de envío manual
  const [recipient, setRecipient] = useState('');
  const [ccRecipients, setCcRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [smtpConfig, setSmtpConfig] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado del Scheduler Horario (Cada 1 Hora)
  const [scheduler, setScheduler] = useState<any>(null);
  const [schedRecipient, setSchedRecipient] = useState('paulcacerez768@gmail.com');
  const [schedCc, setSchedCc] = useState('');
  const [schedInterval, setSchedInterval] = useState(60);
  const [schedEnabled, setSchedEnabled] = useState(true);
  const [savingSched, setSavingSched] = useState(false);
  const [triggeringNow, setTriggeringNow] = useState(false);
  const [schedFeedback, setSchedFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Resumen de Agentes para Previsualización en Vivo
  const [agentsSummary, setAgentsSummary] = useState<{ pasados: any[]; vanBien: any[]; threshold: number }>({
    pasados: [],
    vanBien: [],
    threshold: 20.0
  });

  const loadData = async () => {
    try {
      const [reportsRes, settingsRes, schedulerRes, agentsRes, thresholdRes] = await Promise.all([
        api.getReports(),
        api.getEmailSettings(),
        api.getSchedulerStatus(),
        api.getAgents(selectedFileId),
        api.getThreshold()
      ]);

      if (reportsRes.success) {
        setReports(reportsRes.reports || []);
        if (reportsRes.reports?.length > 0 && !selectedReportId) {
          setSelectedReportId(reportsRes.reports[0].id);
        }
      }

      if (settingsRes.success) {
        setSmtpConfig(settingsRes.config);
        setEmailLogs(settingsRes.logs || []);
        if (settingsRes.config?.fromEmail && !recipient) {
          setRecipient(settingsRes.config.fromEmail);
        }
      }

      if (schedulerRes.success && schedulerRes.scheduler) {
        const s = schedulerRes.scheduler;
        setScheduler(s);
        setSchedRecipient(s.recipientEmail || 'paulcacerez768@gmail.com');
        setSchedCc(s.ccRecipients ? s.ccRecipients.join(', ') : '');
        setSchedInterval(s.intervalMinutes || 60);
        setSchedEnabled(s.enabled ?? true);
      }

      const activeThreshold = thresholdRes?.thresholdSeconds || 20.0;
      if (agentsRes.success && agentsRes.agents) {
        const pasados = agentsRes.agents.filter((a: any) => (a.tmo_promedio_seg || a.ahtTmoSeconds || 0) > activeThreshold);
        const vanBien = agentsRes.agents.filter((a: any) => (a.tmo_promedio_seg || a.ahtTmoSeconds || 0) <= activeThreshold);
        setAgentsSummary({ pasados, vanBien, threshold: activeThreshold });
      }
    } catch (err) {
      console.error('Error cargando configuración de correo:', err);
    }
  };

  useEffect(() => {
    loadData();
    setSubject(`[Reporte Call Center] Consolidado TMO & Indicadores - ${new Date().toLocaleDateString('es-ES')}`);

    // Polling ligero para actualizar el contador de minutos restantes del scheduler
    const interval = setInterval(() => {
      api.getSchedulerStatus().then(res => {
        if (res.success && res.scheduler) {
          setScheduler(res.scheduler);
        }
      }).catch(() => {});
    }, 20000);

    return () => clearInterval(interval);
  }, [selectedFileId]);

  // Guardar configuración del Scheduler
  const handleSaveScheduler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedRecipient.trim()) {
      setSchedFeedback({ type: 'error', text: 'El correo de destino para el envío horario es requerido.' });
      return;
    }

    try {
      setSavingSched(true);
      setSchedFeedback(null);

      const ccArray = schedCc.split(',').map(c => c.trim()).filter(c => c.length > 0);
      const res = await api.updateSchedulerConfig({
        enabled: schedEnabled,
        intervalMinutes: schedInterval,
        recipientEmail: schedRecipient.trim(),
        ccRecipients: ccArray
      });

      if (res.success) {
        setScheduler(res.scheduler);
        setSchedFeedback({
          type: 'success',
          text: `Configuración horaria guardada. El sistema enviará el reporte a ${schedRecipient} cada ${schedInterval} minutos.`
        });
        loadData();
      } else {
        setSchedFeedback({ type: 'error', text: res.message || 'Error al actualizar automatización.' });
      }
    } catch (err: any) {
      setSchedFeedback({ type: 'error', text: err.message || 'Error guardando automatización.' });
    } finally {
      setSavingSched(false);
    }
  };

  // Disparar reporte horario ahora mismo (prueba inmediata)
  const handleTriggerNow = async () => {
    try {
      setTriggeringNow(true);
      setSchedFeedback(null);

      const res = await api.triggerSchedulerNow(schedRecipient.trim());
      if (res.success) {
        setSchedFeedback({
          type: 'success',
          text: `⚡ ¡Reporte de agentes pasados y en cumplimiento enviado exitosamente a ${schedRecipient}!`
        });
        loadData();
      } else {
        setSchedFeedback({ type: 'error', text: res.message || 'Error al disparar el reporte horario.' });
      }
    } catch (err: any) {
      setSchedFeedback({ type: 'error', text: err.message || 'Fallo de conexión SMTP.' });
    } finally {
      setTriggeringNow(false);
    }
  };

  // Envío manual de reporte regular
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) {
      setStatusFeedback({ type: 'error', text: 'El correo del destinatario es obligatorio.' });
      return;
    }

    try {
      setSending(true);
      setStatusFeedback(null);

      const ccList = ccRecipients
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      const res = await api.sendReportEmail({
        recipient: recipient.trim(),
        ccRecipients: ccList,
        subject,
        customMessage,
        reportId: selectedReportId,
        fileId: selectedFileId
      });

      if (res.success) {
        setStatusFeedback({
          type: 'success',
          text: `Reporte aceptado por el proveedor de correo y enrutado a ${recipient}. Estado: ACEPTADO_PROVEEDOR.`
        });
        loadData();
      } else {
        setStatusFeedback({ type: 'error', text: res.message || 'Error al enviar correo' });
      }
    } catch (err: any) {
      setStatusFeedback({ type: 'error', text: err.message || 'Fallo en la conexión SMTP' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Configuración & Envío de Reportes por Correo</h2>
        <p className="text-sm text-slate-500 mt-1">
          Envíe el balance de agentes pasados de TMO y agentes que van bien a cualquier correo de forma manual o programada cada 1 hora.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN DESTACADA: AUTOMATIZACIÓN DE ENVÍO CADA 1 HORA                   */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Automatización de Reportes Horarios de TMO</h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  schedEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'
                }`}>
                  {schedEnabled ? '● Programación Activa (Cada 1 Hora)' : 'Pausado'}
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Envía automáticamente el listado de agentes que están pasados con el TMO y los que van bien a cualquier correo indicado.
              </p>
            </div>
          </div>

          {/* Botón Disparar Ahora Mismo */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleTriggerNow}
              disabled={triggeringNow}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {triggeringNow ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
              <span>{triggeringNow ? 'Despachando Reporte...' : 'Enviar Reporte Ahora Mismo (Prueba)'}</span>
            </button>
          </div>
        </div>

        {/* Formulario del Scheduler Horario */}
        <form onSubmit={handleSaveScheduler} className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
          {/* Correo Destino */}
          <div className="md:col-span-4 space-y-1">
            <label className="font-semibold text-blue-100 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-300" />
              <span>Enviar Reporte a Cualquier Correo</span>
            </label>
            <input
              type="email"
              placeholder="correo_destinatario@empresa.com"
              value={schedRecipient}
              onChange={(e) => setSchedRecipient(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Destinatarios CC */}
          <div className="md:col-span-3 space-y-1">
            <label className="font-semibold text-blue-100">
              Copias (CC) <span className="text-blue-300 font-normal">(separadas por comas)</span>
            </label>
            <input
              type="text"
              placeholder="supervisor@callcenter.com"
              value={schedCc}
              onChange={(e) => setSchedCc(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Frecuencia de Envío */}
          <div className="md:col-span-3 space-y-1">
            <label className="font-semibold text-blue-100 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-300" />
              <span>Frecuencia de Envío</span>
            </label>
            <select
              value={schedInterval}
              onChange={(e) => setSchedInterval(parseInt(e.target.value, 10))}
              className="w-full bg-slate-800 border border-white/20 rounded-xl px-3.5 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value={60}>Cada 1 Hora (Recomendado)</option>
              <option value={30}>Cada 30 Minutos</option>
              <option value={120}>Cada 2 Horas</option>
              <option value={240}>Cada 4 Horas</option>
            </select>
          </div>

          {/* Switch Activar/Desactivar & Guardar */}
          <div className="md:col-span-2 flex flex-col justify-end gap-2">
            <label className="inline-flex items-center gap-2 cursor-pointer text-blue-200">
              <input
                type="checkbox"
                checked={schedEnabled}
                onChange={(e) => setSchedEnabled(e.target.checked)}
                className="rounded border-white/20 text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span className="font-medium text-xs">Activar Programación</span>
            </label>
            <button
              type="submit"
              disabled={savingSched}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow disabled:opacity-50"
            >
              {savingSched ? 'Guardando...' : 'Guardar Ajustes'}
            </button>
          </div>
        </form>

        {/* Feedback del Scheduler */}
        {schedFeedback && (
          <div className={`p-3 rounded-xl flex items-center gap-2 text-xs ${
            schedFeedback.type === 'success' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-200 border border-rose-500/30'
          }`}>
            {schedFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{schedFeedback.text}</span>
          </div>
        )}

        {/* Tarjetas Informativas en Vivo del Contenido del Correo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Tarjeta 1: Agentes Pasados */}
          <div className="bg-white/5 border border-rose-500/30 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-rose-400">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Agentes Pasados de TMO
              </span>
              <span className="text-base font-extrabold">{agentsSummary.pasados.length}</span>
            </div>
            <p className="text-[11px] text-slate-300">
              {agentsSummary.pasados.length > 0 
                ? agentsSummary.pasados.map(a => a.nombre_agente || a.agentName).slice(0, 3).join(', ') + (agentsSummary.pasados.length > 3 ? '...' : '')
                : 'Ningún asesor excede el límite'}
            </p>
          </div>

          {/* Tarjeta 2: Agentes que Van Bien */}
          <div className="bg-white/5 border border-emerald-500/30 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Agentes que Van Bien
              </span>
              <span className="text-base font-extrabold">{agentsSummary.vanBien.length}</span>
            </div>
            <p className="text-[11px] text-slate-300">
              {agentsSummary.vanBien.length > 0 
                ? agentsSummary.vanBien.map(a => a.nombre_agente || a.agentName).slice(0, 3).join(', ') + (agentsSummary.vanBien.length > 3 ? '...' : '')
                : 'Sin registros'}
            </p>
          </div>

          {/* Tarjeta 3: Próximo Despacho */}
          <div className="bg-white/5 border border-blue-400/20 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between text-blue-300">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Próximo Envío Horario
              </span>
              <span className="text-xs font-semibold">
                {scheduler?.minutesRemaining !== undefined ? `En ~${scheduler.minutesRemaining} min` : 'Programado'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Destino: <strong>{scheduler?.recipientEmail || schedRecipient}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN: FORMULARIO DE ENVÍO MANUAL REGULAR                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulario de Envío Manual (Columna Izquierda) */}
        <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Mail className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Envío Manual con Reporte Excel Adjunto</h3>
          </div>

          <form onSubmit={handleSendEmail} className="space-y-4 text-xs">
            {/* Destinatario Principal */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Correo Destinatario Principal <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="ejemplo@empresa.com"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Destinatarios CC */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Destinatarios en Copia (CC) <span className="text-slate-400 font-normal">(separados por comas)</span>
              </label>
              <input
                type="text"
                placeholder="supervisor1@empresa.com, gerente@empresa.com"
                value={ccRecipients}
                onChange={(e) => setCcRecipients(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Asunto */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Asunto del Correo</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              />
            </div>

            {/* Selector de Reporte Adjunto */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Archivo Excel Adjunto (4 Hojas con Gráficos Nativos)
              </label>
              <select
                value={selectedReportId}
                onChange={(e) => setSelectedReportId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {reports.length === 0 ? (
                  <option value="">No hay reportes disponibles (procese un Excel primero)</option>
                ) : (
                  reports.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre_reporte}</option>
                  ))
                )}
              </select>
            </div>

            {/* Mensaje Personalizado */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mensaje Personalizado (Opcional)</label>
              <textarea
                rows={3}
                placeholder="Escriba comentarios u observaciones específicas para la directiva..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Feedback */}
            {statusFeedback && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                statusFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {statusFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{statusFeedback.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={sending || reports.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 text-xs"
            >
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{sending ? 'Enviando Reporte al Servidor...' : 'Enviar Reporte Manual'}</span>
            </button>
          </form>
        </div>

        {/* Información Técnica de Servidor SMTP (Columna Derecha) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm text-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Server className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-slate-900">Estado del Servidor de Correo</h4>
            </div>

            {smtpConfig && (
              <div className="space-y-1.5 font-mono text-[11px] text-slate-600">
                <p><strong>Host SMTP:</strong> {smtpConfig.host}</p>
                <p><strong>Puerto:</strong> {smtpConfig.port} ({smtpConfig.secure ? 'SSL/TLS' : 'STARTTLS'})</p>
                <p><strong>Remitente:</strong> {smtpConfig.fromName} &lt;{smtpConfig.fromEmail}&gt;</p>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600 text-[11px] leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Aclaración de Estados de Envío:</strong>
                <p className="mt-0.5">
                  El sistema registra el estado <em>Aceptado por proveedor</em> (250 OK) con su ID de transacción único para trazabilidad inmutable y auditoría de directivas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Envíos de Correo */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Historial de Notificaciones y Envíos ({emailLogs.length})</span>
          <button onClick={loadData} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
            <RefreshCw className="w-3 h-3" />
            <span>Refrescar</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          {emailLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No hay envíos registrados aún. Utilice el botón de despacho inmediato o configure la programación horaria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="p-3">Destinatario</th>
                  <th className="p-3">Asunto</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Fecha y Hora</th>
                  <th className="p-3">ID Proveedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {emailLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-900">{log.destinatario || log.recipient}</td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">{log.asunto || log.subject}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        (log.estado_envio || log.status) === 'ACEPTADO_PROVEEDOR' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {(log.estado_envio || log.status) === 'ACEPTADO_PROVEEDOR' && <CheckCircle2 className="w-3 h-3" />}
                        {log.estado_envio || log.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {new Date(log.fecha_envio || log.sentAt).toLocaleString('es-ES')}
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[10px] truncate max-w-[150px]">
                      {log.id_mensaje_proveedor || log.providerMessageId || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
