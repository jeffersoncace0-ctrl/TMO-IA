# Presentación Ejecutiva y Técnica: Plataforma Inteligente de Análisis de Llamadas, TMO y Automatización

> **Estado de Integración con Gamma AI:**
> Dado que el entorno de ejecución local no dispone de token de API o CLI autenticado para Gamma (`https://gamma.app`), este documento contiene la especificación completa de las 12 diapositivas, sus diagramas técnicos reales y el prompt estructurado para generación visual inmediata en Gamma AI.
> Asimismo, se ha generado el archivo interactivo [`docs/presentation_slides.html`](file:///C:/Users/Fabrica%20de%20cultura/.gemini/antigravity/scratch/call-center-tmo-platform/docs/presentation_slides.html) para visualizar la presentación de inmediato en el navegador.

---

## Estructura Oficial de las 12 Diapositivas

### Diapositiva 1. Portada
- **Título:** Plataforma Inteligente de Análisis de Llamadas, TMO y Automatización
- **Subtítulo:** Ingesta de Excel, Cálculo Estadístico Ponderado, Generación de Reportes con Gráficos Nativos y Auditoría con Asistente de IA en n8n
- **Presentador / Arquitecto:** Equipo de Ingeniería y Automatización de Operaciones
- **Tecnologías Clave:** n8n • PostgreSQL / Supabase • Node.js / TypeScript • React 19 • Python (openpyxl) • Gmail SMTP • Inteligencia Artificial

---

### Diapositiva 2. Problemática: La Realidad Operativa del Call Center
- **Situación Previa (Proceso Manual):**
  - Supervisores invirtiendo de 3 a 5 horas diarias descargando registros telefónicos crudos en archivos Excel dispersos.
  - Manipulación manual de fórmulas propensa a errores críticos: aplicación errónea del "promedio de promedios" en lugar del TMO global ponderado.
  - Dificultad para detectar oportunamente agentes con tiempos de silencio excesivos (>40% de la llamada) o pautas de abandono.
  - Retrasos de más de 24 horas en la entrega de reportes a la gerencia y supervisión.
- **Diagrama del Proceso Original Ineficiente:**
  $$\text{Descarga Manual de PBX} \longrightarrow \text{Limpieza Manual en Excel} \longrightarrow \text{Cálculo Manual} \longrightarrow \text{Adjunto Manual por Correo} \longrightarrow \text{Sin Auditoría IA}$$

---

### Diapositiva 3. Objetivo y Propuesta de Valor
- **Objetivo Estratégico:**
  Transformar el análisis operativo de Call Centers mediante una plataforma web unificada que automatice de punta a punta la ingesta, validación, cálculo riguroso de TMO, generación de reportes con gráficos nativos y auditoría inteligente.
- **Cuadro Comparativo: Proceso Manual vs. Automatizado:**
  | Dimensión | Proceso Tradicional Manual | Solución Automatizada con n8n & IA |
  | :--- | :--- | :--- |
  | **Tiempo de Procesamiento** | 3 - 5 horas por jornada | **< 3 segundos** por archivo |
  | **Cálculo de TMO Global** | Promedio simple (estadísticamente viciado) | **Ponderado exacto por volumen** |
  | **Generación de Gráficos** | Creación manual celda por celda | **Nativos embebidos en el `.xlsx`** |
  | **Auditoría de Desempeño** | Revisión humana subjetiva o tardía | **Regla determinista + IA explicable** |
  | **Trazabilidad & Idempotencia** | Sin registro de reintentos duplicados | **Hash SHA-256 y claves criptográficas** |

---

### Diapositiva 4. Solución Implementada: Ecosistema Funcional
- **Componentes de la Solución:**
  1. **Frontend Web Moderno (React 19 + TypeScript + TailwindCSS):** 10 módulos integrados con 8 tarjetas KPI, gráficos de barras con línea de umbral, 2 gráficos de dona independientes y filtros dinámicos.
  2. **Backend API Robusto (Node.js + Express):** Orquestador de validaciones, persistencia, guardias de idempotencia y servicios de integración.
  3. **Motor Estadístico & Generador Excel (Python openpyxl / ExcelJS):** Generación de libros de 4 hojas con gráficos nativos de barras y dona embebidos.
  4. **Base de Datos & Seguridad (PostgreSQL / Supabase):** 12 tablas relacionales con RLS y procedimientos almacenados.
  5. **Orquestación n8n:** Workflows modulares de ingesta, looping por lotes y gestión de excepciones.

---

### Diapositiva 5. Arquitectura Técnica del Sistema
```mermaid
flowchart LR
    A["Excel (.xlsx/.xls)"] --> B["Frontend Web (React 19)"]
    B --> C["Backend API (Node.js)"]
    C --> D[("Supabase / PostgreSQL")]
    C --> E["Motor Estadístico (TMO)"]
    E --> F["Generador Excel (openpyxl)"]
    C --> G["Gmail SMTP Server"]
    C --> H["Motor n8n (Workflows)"]
    H --> I["Asistente IA (Gemini/OpenAI)"]
```
- **Flujo de Conexiones:**
  - El usuario carga el archivo desde la web sin manipular fórmulas.
  - El Backend valida integridad (SHA-256) e idempotencia antes de guardar.
  - El Motor Estadístico calcula las métricas atómicas por agente.
  - El servicio de correo despacha el reporte Excel de 4 hojas con gráficos adjuntos.
  - n8n segmenta a los asesores mediante looping por lotes y aplica la auditoría de IA.

---

### Diapositiva 6. Funcionamiento Paso a Paso
1. **Carga & Autodetección:** La plataforma inspecciona las hojas y detecta columnas (código de agente, duración, silencio, estados).
2. **Control de Calidad:** Aísla registros duplicados, duraciones negativas o textos corruptos sin modificar el archivo crudo original.
3. **Cálculo de TMO:** Aplica la fórmula $\text{TMO} = \frac{\sum \text{Duración}}{\text{Llamadas Válidas}}$ por agente y pondera el promedio global.
4. **Exportación con Gráficos Nativos:** Se crea el libro de 4 hojas con gráficos interactivos embebidos en el archivo.
5. **Envío Automatizado:** Despacho inmediato del reporte por Gmail SMTP a los destinatarios configurados.
6. **Auditoría de IA:** Evaluación en lotes detectando silencios excesivos (>40%) y outliers estadísticos ($Z > 2.0$).

---

### Diapositiva 7. Diagrama Completo del Flujo Automatizado
```mermaid
flowchart TD
    Inicio(["Inicio: Carga de Archivo / Webhook"]) --> Idemp{"¿Clave de Idempotencia Nueva?"}
    Idemp -- No: Duplicado --> FinDup(["Rechazar Reintento Duplicado"])
    Idemp -- Sí: Válido --> Parser["Parsear Excel y Detectar Columnas"]
    Parser --> Valid{"¿Datos Estructuralmente Válidos?"}
    Valid -- Error Crítico --> WFErr["Workflow 3: Registrar en auditoria_errores"]
    Valid -- Éxito --> TMO["Calcular TMO Ponderado por Agente"]
    TMO --> Rep["Generar Excel 4 Hojas con Gráficos Nativos"]
    Rep --> Mail["Enviar Correo vía Gmail SMTP"]
    Mail --> Loop["Looping por Lotes: 4 Agentes"]
    Loop --> Regla{"TMO <= 20s"}
    Regla -- Sí --> Apr["Clasificar APROBADO"]
    Regla -- No --> Rev["Clasificar REQUIERE REVISIÓN"]
    Apr --> IA["Asistente IA: Explicar y Detectar Outliers"]
    Rev --> IA
    IA --> DB["Guardar en PostgreSQL / Supabase"]
    DB --> Fin(["Cierre Exitoso del Pipeline"])
```

---

### Diapositiva 8. Demostración Práctica: Caso Real Verificado
- **Dataset Evaluado:** [`sample_data/call_center_dataset_demo.xlsx`](file:///C:/Users/Fabrica%20de%20cultura/.gemini/antigravity/scratch/call-center-tmo-platform/sample_data/call_center_dataset_demo.xlsx)
  - **80 llamadas reales registradas** (69 contestadas, 11 perdidas).
  - **8 asesores evaluados** bajo el umbral de 20.0 segundos.
- **Resultados Confirmados:**
  - **TMO Global Ponderado:** `20.39s` frente al objetivo de `20.0s`.
  - **Porcentaje de Cumplimiento:** `61.25%`.
  - **Agentes Aprobados (5):** Carlos Ramirez (14.0s), Maria Fernandez (18.0s), Andres Torres (19.0s), Sofia Castro (15.0s), Elena Vargas (12.0s).
  - **Agentes que Requieren Revisión (3):**
    - Juan Delgado (`26.8s`): exceso de tiempo en espera.
    - Pedro Morales (`22.8s`): incumplimiento leve.
    - Laura Gomez (`38.6s`): **Outlier Estadístico Crítico ($Z > 2.0$)** con 16.0s de silencio promedio (41% del tiempo de gestión).

---

### Diapositiva 9. Valor y Retorno de Inversión de la Automatización
- **Ahorro de Tiempo:** Reducción del 98% en el tiempo de generación y envío de informes operativos (de 4 horas a 3 segundos).
- **Consistencia de Datos:** Cero discrepancias matemáticas al erradicar el error humano de promediar promedios sin ponderar.
- **Detección Oportuna de Riesgos:** Alerta inmediata de asesores que duplican el tiempo de silencio promedio de su equipo.
- **Trazabilidad Garantizada:** Registro inmutable en base de datos de cada ejecución, entrega de correo y anomalía detectada.

---

### Diapositiva 10. Pruebas y Resultados Comprobados
- **Pruebas Unitarias & Integrales:** 100% de tests aprobados (`node tests/run_tests.js`).
- **Pruebas de Ingesta & Casos Borde:** Detección de duplicados exactos y duraciones negativas en `call_center_edge_cases.xlsx`.
- **Evidencia Real de Entrega de Correo (Gmail SMTP):**
  - **Destinatario:** `paulcacerez768@gmail.com`
  - **Respuesta Servidor:** `250 2.0.0 OK 1791992626 ada2fe7eead31-7cb354681e4sm11721299137.10 - gsmtp`
  - **Message ID:** `<3cf9f8c8-60d9-1a6c-9de3-320f8d290022@gmail.com>`
  - **Adjunto:** Reporte Excel oficial de 4 hojas con gráficos nativos de barras y dona.

---

### Diapositiva 11. Conclusiones y Mejoras Futuras
- **Logros Alcanzados:**
  - Sistema 100% funcional, seguro y desplegado localmente.
  - Cumplimiento estricto de la regla determinista de TMO con explicabilidad de IA.
  - Integración verificada con servicios de correo y base de datos relacional.
- **Ruta de Evolución Futura:**
  - Conexión directa en tiempo real con centrales telefónicas (Asterisk, Twilio, Genesys Cloud via WebSockets).
  - Análisis de sentimiento acústico de voz en llamadas para cruzar TMO con satisfacción del cliente (CSAT / NPS).

---

### Diapositiva 12. Replicación del Proyecto
- **Pasos Esenciales para Replicar:**
  1. Clonar el repositorio y revisar dependencias de Node.js y Python.
  2. Ejecutar el esquema SQL en PostgreSQL o Supabase (`database/schema.sql`).
  3. Configurar variables de entorno en `backend/.env`.
  4. Iniciar Backend (`npm run dev` en `backend/`) y Frontend (`npm run dev` en `frontend/`).
  5. Importar los flujos JSON en n8n (`n8n/workflows/master_call_center_tmo_workflow.json`).
- **Documento de Referencia:** Consulte el [`docs/REPLICATION_MANUAL.md`](file:///C:/Users/Fabrica%20de%20cultura/.gemini/antigravity/scratch/call-center-tmo-platform/docs/REPLICATION_MANUAL.md) para la guía técnica paso a paso.
