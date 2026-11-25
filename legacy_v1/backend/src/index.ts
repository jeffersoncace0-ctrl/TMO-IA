import express from 'express';
import cors from 'cors';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { SchedulerService } from './services/schedulerService';

const app = express();

// Middlewares globales
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'Plataforma Inteligente de Análisis de Llamadas, TMO y Automatización',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Enrutador de la API
app.use('/api', routes);

// Middleware de manejo de errores global
app.use(errorHandler);

// Inicio del servidor
app.listen(config.port, () => {
  console.log('================================================================');
  console.log(`🚀 SERVIDOR BACKEND INICIADO EN PUERTO: ${config.port}`);
  console.log(`📡 URL API: http://localhost:${config.port}/api`);
  console.log(`📊 Umbral TMO Predeterminado: ${config.defaultTmoThreshold} segundos`);
  console.log(`📂 Directorio Subidas: ${config.uploadsDir}`);
  console.log(`📑 Directorio Reportes: ${config.reportsDir}`);
  console.log('================================================================');

  // Inicializar programador horario de envíos
  try {
    SchedulerService.initScheduler();
  } catch (err) {
    console.error('Error inicializando scheduler horario:', err);
  }
});

export default app;
