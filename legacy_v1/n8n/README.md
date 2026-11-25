# Manual de Integración de Workflows en n8n

Esta carpeta contiene las definiciones oficiales en formato JSON listas para ser importadas en cualquier instancia de **n8n** (Cloud, Docker o Local).

## Workflows Disponibles

1. `workflow_1_processing_and_delivery.json`
   - **Propósito:** Ingesta del archivo Excel, validación de idempotencia, cálculo matemático del TMO, generación del libro Excel de 4 hojas con gráficos nativos, almacenamiento en Supabase Storage y envío automático por correo electrónico.
   - **Punto de Entrada:** Webhook POST en `/webhook/tmo-workflow-1-procesar-reporte`.
   - **Salida:** Dispara automáticamente el Workflow 2 tras confirmar el envío del correo.

2. `workflow_2_ai_validation_and_review.json`
   - **Propósito:** Validación determinista y revisión mediante Asistente de IA con looping sobre agentes.
   - **Punto de Entrada Dual:**
     a) Webhook autenticado emitido por el Workflow 1 (`/webhook/tmo-workflow-2-validacion-ia`).
     b) Listener IMAP de correo para procesar libros Excel recibidos como archivo adjunto.
   - **Proceso:** Aplica el umbral determinista de 20 segundos (`APROBADO` vs `REQUIERE_REVISION`), evalúa en lotes mediante IA para detectar anomalías (outliers estadísticos con Z-Score > 2 y tiempos excesivos de silencio) y persiste los resultados en Supabase.

3. `workflow_3_audit_and_error_handling.json`
   - **Propósito:** Captura centralizada de excepciones no controladas mediante nodo *Error Trigger*.
   - **Proceso:** Categoriza fallos de conexión a Supabase, archivos corruptos, cuotas de IA o errores SMTP, registra la trazabilidad en la tabla `auditoria_errores` y envía alertas prioritarias para fallos críticos.

## Instrucciones de Importación en n8n

1. Accede a tu interfaz de n8n (`http://localhost:5678`).
2. En el menú lateral, selecciona **Workflows** -> **Import from File**.
3. Selecciona cada uno de los archivos `.json` ubicados en `n8n/workflows/`.
4. Configura las siguientes credenciales en n8n:
   - **Postgres / Supabase:** Credenciales de conexión directa a la base de datos PostgreSQL de Supabase.
   - **SMTP:** Servidor de correo para envío de notificaciones y reportes.
   - **IMAP (Opcional para Workflow 2):** Buzón de correo para lectura automática de adjuntos.
5. Haz clic en **Activate Workflow** para habilitar los Webhooks en producción.
