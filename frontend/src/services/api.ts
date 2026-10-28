// Cliente API Frontend para la Plataforma de Análisis de Llamadas y TMO

const API_BASE = '/api';

export interface FilterParams {
  fileId?: string;
  agentCode?: string;
  startDate?: string;
  endDate?: string;
  callType?: string;
  callStatus?: string;
  classification?: string;
  threshold?: number;
}

export const api = {
  // Archivos y Carga Excel (Sección 2)
  async uploadFile(file: File, sheetName?: string, previewLimit = 50) {
    const formData = new FormData();
    formData.append('file', file);
    let url = `${API_BASE}/files/upload?previewLimit=${previewLimit}`;
    if (sheetName) url += `&sheet=${encodeURIComponent(sheetName)}`;

    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  async processFile(payload: { fileId: string; sheetName?: string; columnMapping?: any; threshold?: number }) {
    const res = await fetch(`${API_BASE}/files/process`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `process_${payload.fileId}_${Date.now()}`
      },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getFiles() {
    const res = await fetch(`${API_BASE}/files`);
    return res.json();
  },

  // Dashboard y Métricas (Sección 1)
  async getDashboardStats(filters: FilterParams = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, String(val));
      }
    });
    const res = await fetch(`${API_BASE}/dashboard/stats?${params.toString()}`);
    return res.json();
  },

  // Tabla de Llamadas (Sección 3)
  async getCalls(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    fileId?: string;
    agentCode?: string;
    callType?: string;
    callStatus?: string;
    onlyInvalid?: boolean;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const res = await fetch(`${API_BASE}/calls?${searchParams.toString()}`);
    return res.json();
  },

  // Análisis por Agente (Sección 4)
  async getAgents(fileId?: string, classification?: string) {
    let url = `${API_BASE}/agents`;
    const params = new URLSearchParams();
    if (fileId) params.append('fileId', fileId);
    if (classification) params.append('classification', classification);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url);
    return res.json();
  },

  async getAgentDetails(agentCode: string, fileId?: string) {
    let url = `${API_BASE}/agents/${agentCode}`;
    if (fileId) url += `?fileId=${encodeURIComponent(fileId)}`;
    const res = await fetch(url);
    return res.json();
  },

  // Reportes y Descargas (Sección 5)
  async getReports() {
    const res = await fetch(`${API_BASE}/reports`);
    return res.json();
  },

  getDownloadReportUrl(reportId: string) {
    return `${API_BASE}/reports/download/${encodeURIComponent(reportId)}`;
  },

  // Asistente de IA (Sección 6)
  async getAIValidations(fileId?: string) {
    let url = `${API_BASE}/ai/validations`;
    if (fileId) url += `?fileId=${encodeURIComponent(fileId)}`;
    const res = await fetch(url);
    return res.json();
  },

  async askAIAssistant(question: string, fileId?: string) {
    const res = await fetch(`${API_BASE}/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, fileId })
    });
    return res.json();
  },

  // Configuración del Umbral (Sección 7)
  async getThreshold() {
    const res = await fetch(`${API_BASE}/settings/threshold`);
    return res.json();
  },

  async updateThreshold(thresholdSeconds: number) {
    const res = await fetch(`${API_BASE}/settings/threshold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thresholdSeconds })
    });
    return res.json();
  },

  // Configuración y Envío de Correos (Sección 8)
  async getEmailSettings() {
    const res = await fetch(`${API_BASE}/settings/email`);
    return res.json();
  },

  async sendReportEmail(payload: {
    recipient: string;
    ccRecipients?: string[];
    subject?: string;
    customMessage?: string;
    reportId?: string;
    fileId?: string;
  }) {
    const res = await fetch(`${API_BASE}/settings/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Programación de Envío Horario Automático
  async getSchedulerStatus() {
    const res = await fetch(`${API_BASE}/settings/scheduler`);
    return res.json();
  },

  async updateSchedulerConfig(payload: {
    enabled?: boolean;
    intervalMinutes?: number;
    recipientEmail?: string;
    ccRecipients?: string[];
  }) {
    const res = await fetch(`${API_BASE}/settings/scheduler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async triggerSchedulerNow(recipientEmail?: string) {
    const res = await fetch(`${API_BASE}/settings/scheduler/send-now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail })
    });
    return res.json();
  },

  // Disparadores de n8n Workflows
  async triggerWorkflow1(payload: { fileId: string; recipientEmail?: string; threshold?: number }) {
    const res = await fetch(`${API_BASE}/n8n/trigger-workflow-1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async triggerWorkflow2(payload: { fileId: string; threshold?: number }) {
    const res = await fetch(`${API_BASE}/n8n/trigger-workflow-2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Historial de Ejecuciones (Sección 9)
  async getExecutions() {
    const res = await fetch(`${API_BASE}/executions`);
    return res.json();
  },

  // Gestión de Errores (Sección 10)
  async getErrors() {
    const res = await fetch(`${API_BASE}/errors`);
    return res.json();
  },

  async resolveError(errorId: string, action: 'resolve' | 'retry') {
    const res = await fetch(`${API_BASE}/errors/${errorId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    return res.json();
  }
};
