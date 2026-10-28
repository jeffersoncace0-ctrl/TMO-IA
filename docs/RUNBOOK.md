# Guía de Instalación, Despliegue y Ejecución (RUNBOOK)

Esta guía paso a paso explica cómo instalar, verificar y ejecutar la **Plataforma Inteligente de Análisis de Llamadas, TMO y Automatización**.

---

## 1. Requisitos Previos

- **Node.js:** v18.0.0 o superior (Verificado en Node v24.21.0).
- **Python:** v3.9 o superior (con biblioteca `openpyxl` instalada para generación nativa de gráficos Excel).
- **n8n:** v1.0 o superior (opcional para ejecución de webhooks de automatización).
- **Cuenta de Supabase / PostgreSQL:** (opcional: el sistema incluye modo de persistencia local autónomo para pruebas inmediatas).

---

## 2. Instalación de Dependencias

### 2.1. Backend API
```powershell
cd backend
npm install
npm run build
```

### 2.2. Frontend Web
```powershell
cd ../frontend
npm install
npm run build
```

---

## 3. Ejecución del Sistema

### Opción A: Modo Desarrollo (Con Hot-Reload)

1. En una terminal, inicia el Backend API en el puerto `4000`:
```powershell
cd backend
npm run dev
```

2. En una segunda terminal, inicia la interfaz web Frontend en el puerto `5173`:
```powershell
cd frontend
npm run dev
```

3. Abre tu navegador web en: `http://localhost:5173`

---

### Opción B: Modo Producción

1. Inicia el servidor compilado:
```powershell
cd backend
npm start
```

---

## 4. Ejecución de la Suite de Pruebas Automatizadas

El proyecto incluye pruebas automatizadas exhaustivas que verifican:
- Fórmulas matemáticas de TMO individual y global ponderado.
- Prioridad de clasificación determinista (`APROBADO` vs `REQUIERE_REVISION` vs `ERROR_DATOS`).
- Ingesta, parseo de Excel, generación del libro de 4 hojas con gráficos nativos de barras y dona.
- Aislamiento de casos borde (registros corruptos, duraciones negativas y duplicados).

Para ejecutar todas las pruebas:
```powershell
node tests/run_tests.js
```

---

## 5. Datos de Prueba Disponibles

El proyecto incluye datasets generados y listos para ser cargados desde la interfaz web o mediante la API:

1. `sample_data/call_center_dataset_demo.xlsx`:
   - 80 llamadas de atención al cliente.
   - 8 asesores telefónicos con diversas pautas de rendimiento (agentes cumplidores con TMO &le; 20s, agentes con TMO &gt; 20s, outliers estadísticos, pausas excesivas de silencio, llamadas contestadas y perdidas).
2. `sample_data/call_center_edge_cases.xlsx`:
   - Casos borde para validar la tolerancia a fallos: registros duplicados exactos, duraciones en formato texto `00:25`, duraciones negativas y códigos de agente ausentes.

---

## 6. Endpoints Principales de la API REST

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del servicio y disponibilidad |
| `POST` | `/api/files/upload` | Carga e inspección de Excel (.xlsx / .xls) |
| `POST` | `/api/files/process` | Cálculo de TMO, consolidación y generación de reporte (con idempotencia) |
| `GET` | `/api/dashboard/stats` | Métricas KPI, series de barras verticales y donas con filtros |
| `GET` | `/api/calls` | Tabla paginada de llamadas con búsqueda y ordenamiento |
| `GET` | `/api/agents` | Métricas consolidadas por agente |
| `GET` | `/api/agents/:code` | Detalle de llamadas y auditoría de un agente específico |
| `GET` | `/api/reports` | Lista de reportes Excel generados |
| `GET` | `/api/reports/download/:id` | Descarga directa del archivo `.xlsx` de 4 hojas |
| `POST` | `/api/ai/ask` | Consulta interactiva al Asistente de IA |
| `GET` | `/api/settings/threshold` | Obtiene el umbral actual de TMO (predeterminado 20s) |
| `POST` | `/api/settings/threshold` | Actualiza el umbral dinámicamente |
| `POST` | `/api/settings/email/send` | Envía el reporte Excel a cualquier destinatario |
| `POST` | `/api/n8n/trigger-workflow-1` | Disparo idempotente del Workflow 1 de n8n |
| `POST` | `/api/n8n/trigger-workflow-2` | Disparo idempotente del Workflow 2 de n8n |
| `GET` | `/api/executions` | Historial de ejecuciones y trazabilidad de idempotencia |
| `GET` | `/api/errors` | Registro de auditoría de errores y excepciones |
