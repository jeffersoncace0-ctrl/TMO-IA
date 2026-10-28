import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const uploadsDir = path.resolve(process.cwd(), 'uploads');
const reportsDir = path.resolve(process.cwd(), 'reports');

// Asegurar que existan los directorios locales
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Umbral TMO configurable
  defaultTmoThreshold: parseFloat(process.env.DEFAULT_TMO_THRESHOLD || '20.0'),
  
  // Directorios de almacenamiento
  uploadsDir,
  reportsDir,

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key',
    storageBucketRaw: process.env.SUPABASE_STORAGE_BUCKET_RAW || 'raw-excels',
    storageBucketReports: process.env.SUPABASE_STORAGE_BUCKET_REPORTS || 'processed-reports',
  },

  // IA
  ai: {
    provider: process.env.AI_PROVIDER || 'gemini',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-1.5-pro',
  },

  // n8n
  n8n: {
    webhookUrlWorkflow1: process.env.N8N_WEBHOOK_URL_WORKFLOW_1 || 'http://localhost:5678/webhook/tmo-workflow-1-procesar-reporte',
    webhookUrlWorkflow2: process.env.N8N_WEBHOOK_URL_WORKFLOW_2 || 'http://localhost:5678/webhook/tmo-workflow-2-validacion-ia',
    apiKey: process.env.N8N_API_KEY || '',
  },

  // SMTP
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    user: process.env.SMTP_USER || '',
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
    fromName: process.env.SMTP_FROM_NAME || 'Call Center Analytics',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'notificaciones@callcenter.local',
  }
};
