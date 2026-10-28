# Informe de Validación Técnica: Plataforma de Análisis de Llamadas, TMO y Automatización

Este informe documenta el estado real, empírico y verificado del sistema tras ejecutar los ciclos de validación matemática, pruebas estructurales, tests de integración y pruebas de entrega SMTP.

---

## 1. Resumen Ejecutivo del Estado del Proyecto

| Área Evaluada | Estado | Criterio de Aprobación |
| :--- | :--- | :--- |
| **Cálculo de TMO y Estadísticas** | 🟢 **100% Validado** | Fórmulas individuales exactas y TMO global ponderado (sin promedio simple). |
| **Regla Determinista** | 🟢 **100% Validada** | $\le 20$s APROBADO, $> 20$s REQUIERE REVISIÓN, nulo/negativo ERROR DE DATOS. |
| **Generación de Excel 4 Hojas** | 🟢 **100% Validada** | Libro `.xlsx` generado con gráficos nativos de barras y dona embebidos. |
| **Entrega de Correo (Gmail SMTP)** | 🟢 **100% Validada** | Entrega confirmada con respuesta `250 2.0.0 OK` y Message ID registrado. |
| **Compilación de Código (TS/Vite)** | 🟢 **100% Validada** | Cero errores de sintaxis o empaquetado en Backend y Frontend. |
| **Orquestación n8n** | 🟢 **100% Validada** | Workflows exportables con nodos de idempotencia y looping por lotes. |

---

## 2. Validaciones Estructurales Realizadas

### 2.1. Validación del Esquema de Base de Datos (PostgreSQL / Supabase)
- **Tablas:** 12 tablas creadas con claves foráneas cruzadas e integridad referencial (`ON DELETE CASCADE` y `SET NULL` según criticidad).
- **Restricciones CHECK:** Verificación de duraciones $\ge 0$, porcentajes entre 0 y 100, y enums de estado válidos.
- **Seguridad RLS:** Políticas activadas que aíslan la lectura pública y exigen rol administrativo para la modificación de umbrales.

### 2.2. Validación del Flujo JSON de n8n
- **Archivo:** [`n8n/workflows/master_call_center_tmo_workflow.json`](file:///C:/Users/Fabrica%20de%20cultura/.gemini/antigravity/scratch/call-center-tmo-platform/n8n/workflows/master_call_center_tmo_workflow.json)
- **Estructura:** Sintaxis JSON conforme al esquema oficial de n8n v1/v2.
- **Conexiones:** 14 nodos enlazados sin bifurcaciones huérfanas, cubriendo la ruta de éxito, descarte por idempotencia y captura de excepciones con `Error Trigger`.

---

## 3. Pruebas Funcionales Ejecutadas y Evidencias Reales

### Prueba 1: Precisión Matemática del TMO Individual y Ponderado Global
- **Comando Ejecutado:** `node tests/run_tests.js`
- **Casos Probados:**
  - *Agente AG-01:* 3 llamadas (10s, 15s, 20s) ➔ $\text{TMO} = \frac{10+15+20}{3} = 15.0\text{s}$ (Clasificación: `APROBADO`).
  - *Agente AG-02:* 2 llamadas (30s, 40s) ➔ $\text{TMO} = \frac{30+40}{2} = 35.0\text{s}$ (Clasificación: `REQUIERE_REVISION`).
  - *Agente AG-03:* 1 llamada corrupta ➔ Clasificación: `ERROR_DATOS`.
  - *TMO Global Ponderado:* $\frac{10+15+20+30+40}{5} = \frac{115}{5} = 23.0\text{s}$.
- **Resultado Comprobado:** $\text{TMO Global} = 23.0\text{s}$ exacto (se descartó con aserción estricta el valor erróneo de 25.0s que resultaría de promediar $15.0$ y $35.0$).

### Prueba 2: Ingesta de Excel y Generación de Gráficos Nativos
- **Dataset Evaluado:** `sample_data/call_center_dataset_demo.xlsx` (80 llamadas de 8 agentes).
- **Resultados:**
  - 80 filas normalizadas sin pérdida de registros.
  - TMO global resultante: **20.39s**.
  - Asesores aprobados: **5**.
  - Asesores en revisión: **3** (incluyendo la detección del outlier Laura Gomez con $Z > 2.0$ y 16s de silencio).
  - Archivo generado físicamente:
    `reports/Reporte_Validacion_1791988349891.xlsx` (Tamaño: >12 KB).
  - Indicador de gráficos nativos embebidos: **`chartsIncluded: true`** (con `openpyxl.chart.BarChart` y `DoughnutChart`).

### Prueba 3: Tolerancia a Fallos y Casos Borde
- **Dataset Evaluado:** `sample_data/call_center_edge_cases.xlsx`
- **Resultados:**
  - Detección de 1 registro duplicado exacto.
  - Aislamiento de 2 duraciones inválidas (duración negativa `-15s` y texto no numérico `INVALID_TIME`).
  - El sistema no se detuvo ni produjo un fallo de ejecución (*zero-crash tolerance*).

### Prueba 4: Envío Real de Correo por Gmail SMTP
- **Credenciales Utilizadas:** `paulcacerez768@gmail.com` con Contraseña de Aplicación de 16 caracteres.
- **Destinatario del Envío:** `paulcacerez768@gmail.com`
- **Asunto:** *Reporte Oficial Call Center - Análisis de TMO y Desempeño Operativo*
- **Adjunto:** Reporte Excel oficial de 4 hojas con gráficos nativos.
- **Evidencia Empírica Obtenida del Servidor de Google:**
  ```text
  Respuesta Servidor: 250 2.0.0 OK 1791992626 ada2fe7eead31-7cb354681e4sm11721299137.10 - gsmtp
  Message ID: <3cf9f8c8-60d9-1a6c-9de3-320f8d290022@gmail.com>
  Estado: ACEPTADO_PROVEEDOR
  ```

---

## 4. Errores Detectados y Correcciones Implementadas

Durante el ciclo iterativo **LOOPING (Analizar ➔ Construir ➔ Validar ➔ Corregir)** se diagnosticaron y solucionaron 3 inconsistencias:

1. **Incompatibilidad de Tipos en ReportController:**
   - *Error:* `req.params.reportId` fue tipado por Express como `string | string[]`, provocando error TS2345 en `path.resolve`.
   - *Corrección:* Se aplicó casting explícito `const reportId = String(req.params.reportId);`.
2. **Error de Firma en Función Python openpyxl:**
   - *Error:* `TypeError: create_styled_cell() got an unexpected keyword argument 'italic'` en `generate_excel_charts.py`.
   - *Corrección:* Se incorporó el parámetro opcional `italic=False` en la declaración y se aplicó al objeto `Font(italic=italic)`. Tras la corrección, los gráficos nativos de barras y dona se compilaron al 100%.
3. **Manejo de Espacios en Contraseña de Aplicación de Google:**
   - *Error:* Las contraseñas de Google se proporcionan usualmente en bloques de 4 caracteres separados por espacios (`bmps uhwo rtrw iuxo`), lo que en algunos clientes SMTP provoca fallos de autenticación.
   - *Corrección:* Se integró una limpieza automática por expresión regular `(process.env.SMTP_PASS || '').replace(/\s+/g, '')` en la carga de configuración.

---

## 5. Limitaciones Identificadas y Tareas Pendientes

1. **Acceso a Gamma AI:**
   - *Limitación:* El entorno local no cuenta con una clave de API directa de Gamma (`https://gamma.app`).
   - *Mitigación Implementada:* Se diseñó el prompt estructurado para importación directa en Gamma (`docs/gamma_prompt_import.txt`) y se desarrolló un reproductor interactivo de diapositivas en HTML (`docs/presentation_slides.html`) para visualización inmediata en cualquier navegador.
2. **Conexión en Tiempo Real con PBX Telefónica:**
   - *Estado:* En la versión actual los datos ingresan vía Excel (.xlsx/.xls) o Webhooks.
   - *Ruta Futura:* Integrar un socket WebSocket en tiempo real para Asterisk / FreePBX en la versión 2.0.
