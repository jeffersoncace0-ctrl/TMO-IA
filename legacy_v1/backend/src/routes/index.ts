import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { FileController } from '../controllers/fileController';
import { DashboardController } from '../controllers/dashboardController';
import { CallController } from '../controllers/callController';
import { AgentController } from '../controllers/agentController';
import { ReportController } from '../controllers/reportController';
import { AIController } from '../controllers/aiController';
import { SettingsController } from '../controllers/settingsController';
import { N8NController } from '../controllers/n8nController';
import { ExecutionController } from '../controllers/executionController';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { config } from '../config';

const router = Router();

// Configuración de Multer para carga segura de archivos Excel
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `excel-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Límite de 50MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos con extensión .xlsx o .xls'));
    }
  }
});

// Rutas de Archivos y Carga Excel (Sección 2)
router.post('/files/upload', upload.single('file'), FileController.uploadAndPreview);
router.post('/files/process', idempotencyMiddleware('Procesar Archivo'), FileController.processFile);
router.get('/files', FileController.getFiles);

// Rutas de Dashboard y KPIs (Sección 1)
router.get('/dashboard/stats', DashboardController.getDashboardStats);

// Rutas de Tabla de Llamadas (Sección 3)
router.get('/calls', CallController.getCalls);

// Rutas de Análisis de Agentes (Sección 4)
router.get('/agents', AgentController.getAgents);
router.get('/agents/:agentCode', AgentController.getAgentDetails);

// Rutas de Reportes y Descargas (Sección 5)
router.get('/reports', ReportController.getReports);
router.get('/reports/download/:reportId', ReportController.downloadReport);

// Rutas de Asistente de IA (Sección 6)
router.get('/ai/validations', AIController.getValidations);
router.post('/ai/ask', AIController.askAssistant);

// Rutas de Configuración del Umbral (Sección 7)
router.get('/settings/threshold', SettingsController.getThreshold);
router.post('/settings/threshold', SettingsController.updateThreshold);

// Rutas de Configuración de Correo y Envíos (Sección 8)
router.get('/settings/email', SettingsController.getEmailSettings);
router.post('/settings/email/send', SettingsController.sendReportEmail);
router.get('/settings/scheduler', SettingsController.getSchedulerStatus);
router.post('/settings/scheduler', SettingsController.updateSchedulerConfig);
router.post('/settings/scheduler/send-now', SettingsController.triggerSchedulerNow);

// Rutas de Automatización n8n (Workflows 1, 2 y Webhooks)
router.post('/n8n/trigger-workflow-1', N8NController.triggerWorkflow1);
router.post('/n8n/trigger-workflow-2', N8NController.triggerWorkflow2);
router.post('/n8n/webhook-callback', N8NController.handleWebhookCallback);

// Rutas de Historial de Ejecuciones y Auditoría de Errores (Secciones 9 y 10)
router.get('/executions', ExecutionController.getExecutions);
router.get('/errors', ExecutionController.getAuditErrors);
router.post('/errors/:errorId/action', ExecutionController.resolveError);

export default router;
