# Plataforma Inteligente de Análisis de Llamadas, TMO y Automatización
### Ingesta de Excel, Cálculo Ponderado, Reportes con Gráficos Nativos y Auditoría con Asistente de IA en n8n

---

## 1. Portada
# Plataforma Inteligente de Análisis de Llamadas, TMO y Automatización
### Optimización Operativa para Call Centers con n8n, PostgreSQL, Supabase e Inteligencia Artificial
- **Propósito:** Transformar la ingesta y auditoría operativa de llamadas telefónicas erradicando el cálculo manual y garantizando rigor estadístico.
- **Tecnologías Integradas:** Node.js, Express, React 19, TypeScript, PostgreSQL, Supabase, n8n, Python (openpyxl) y Gmail SMTP.
- **Sector de Aplicación:** BPO, Call Centers, Gestión de Calidad y Analítica de Operaciones.

---

## 2. Problemática
# La Realidad Operativa del Call Center Tradicional
### Cuellos de botella y riesgos en la gestión manual de indicadores
- **3 a 5 Horas Diarias Perdidas:** Supervisores extrayendo y limpiando manualmente archivos Excel desde múltiples plantas telefónicas PBX.
- **La Falacia del "Promedio de Promedios":** Aplicación errónea de promedios simples entre agentes, distorsionando el TMO global al ignorar el volumen real de llamadas de cada asesor.
- **Pérdida de Detección Temprana:** Imposibilidad de detectar a tiempo asesores con tiempos de silencio excesivos (>40% de la duración) o altas tasas de abandono.
- **Proceso Lineal Ineficiente:** Descarga manual ➔ Limpieza celda por celda ➔ Fórmulas manuales ➔ Envío tardío sin auditoría de IA.

---

## 3. Objetivo y Propuesta de Valor
# Del Análisis Manual a la Eficiencia Automatizada
### Transformación digital cuantitativa y cualitativa de las operaciones

| Dimensión | Proceso Tradicional Manual | Plataforma Automatizada con n8n & IA |
| :--- | :--- | :--- |
| **Tiempo de Procesamiento** | 3 a 5 horas por jornada | **Menos de 3 segundos por archivo** |
| **Cálculo de TMO Global** | Promedio simple (estadísticamente viciado) | **Ponderado exacto por volumen de llamadas** |
| **Generación de Gráficos** | Creación manual y estática | **Nativos embebidos en el libro .XLSX** |
| **Evaluación de Rendimiento** | Opiniones humanas subjetivas | **Regla determinista + IA explicable** |
| **Trazabilidad & Idempotencia** | Sin registro de reintentos duplicados | **Hash SHA-256 y claves criptográficas** |

---

## 4. Solución Implementada
# Ecosistema Tecnológico Funcional en 5 Pilares
### Arquitectura modular orientada al rendimiento y la escalabilidad
1. **Frontend Web Moderno (React 19 + TailwindCSS):** 10 módulos operativos con 8 tarjetas KPI, gráficos de barras con línea de umbral, 2 donas independientes y filtros interactivos.
2. **Backend API Robusto (Node.js + TypeScript):** Orquestador con control criptográfico de idempotencia, esquemas Zod y seguridad en capas.
3. **Motor Estadístico & Generador Excel (Python openpyxl):** Genera libros de 4 hojas con gráficos nativos de barras y dona embebidos en el archivo.
4. **Base de Datos & Almacenamiento (PostgreSQL / Supabase):** 12 tablas relacionales con Row Level Security (RLS) y procedimientos almacenados atómicos.
5. **Orquestación n8n:** Workflows automáticos de ingesta, looping por lotes (*Loop Over Items*) y captura de excepciones.

---

## 5. Arquitectura Técnica
# Flujo de Integración y Capas del Sistema
### Comunicación segura y desacoplada de extremo a extremo
- **Capa Cliente (Frontend):** Interfaz web moderna con visualización reactiva y filtros interactivos por fecha, asesor y estado.
- **Capa de Servicios (Backend API):** Validación de esquemas, hash SHA-256 para prevenir duplicados y ejecución del motor estadístico.
- **Capa de Datos (PostgreSQL & Storage):** Almacenamiento de registros crudos en `registros_llamadas` y resultados consolidados en `resumen_agentes`.
- **Capa de Automatización (n8n):** Webhooks de ingesta, división en lotes para inferencia de IA y disparadores ante errores.
- **Capa de Notificación (Gmail SMTP):** Despacho automatizado del reporte Excel con confirmación de entrega del servidor (250 OK).

---

## 6. Funcionamiento Paso a Paso
# El Ciclo de Vida del Dato en 6 Etapas Continuas
### Procesamiento inteligente sin intervención manual
1. **Carga & Autodetección:** Inspección automática de hojas Excel y mapeo inteligente de columnas (agente, duración, silencios).
2. **Control de Calidad:** Detección y aislamiento de duplicados, duraciones negativas y registros incompletos sin modificar los datos originales.
3. **Cálculo Riguroso de TMO:** Aplicación de la fórmula estricta por asesor y cálculo del TMO global ponderado por volumen.
4. **Exportación de Reporte Excel:** Creación automática del libro de 4 hojas con gráficos nativos embebidos de barras y dona.
5. **Envío Automatizado:** Despacho inmediato del reporte por correo electrónico a los destinatarios configurados.
6. **Auditoría con Asistente de IA:** Revisión en lotes para explicar causas de rendimiento y detectar anomalías estadísticas.

---

## 7. Diagrama del Flujo Automatizado
# Flujo Lógico y Árbol de Decisiones en n8n
### Ruta de éxito, bifurcaciones de control y manejo de excepciones
- **Punto de Entrada:** Recepción de webhook autenticado con identificador único de ejecución.
- **Guardia de Idempotencia:** Si la clave ya fue procesada ➔ Abortar duplicado. Si es nueva ➔ Iniciar procesamiento.
- **Validación Estructural:** Si el archivo está dañado ➔ Disparar Workflow de Error. Si es íntegro ➔ Continuar.
- **Regla Determinista Inquebrantable:**
  - Si TMO &le; 20s (Umbral configurable): **APROBADO** (Verde).
  - Si TMO &gt; 20s: **REQUIERE REVISIÓN** (Rojo) / **EN OBSERVACIÓN** (Amarillo).
- **Asistente de IA:** Inferencia contextual que explica el porqué del resultado sin modificar los datos calculados.

---

## 8. Demostración Práctica
# Caso Real Verificado sobre Dataset de 80 Llamadas
### Evidencia empírica de funcionamiento con datos de producción
- **Volumen Total:** 80 llamadas reales registradas (69 contestadas, 11 perdidas ➔ 86.25% de atención).
- **Asesores Evaluados:** 8 agentes bajo el umbral objetivo de 20.0 segundos.
- **TMO Global Ponderado Calculado:** 20.39 segundos.
- **5 Agentes Aprobados (&le; 20s):** Carlos Ramirez (14s), Maria Fernandez (18s), Andres Torres (19s), Sofia Castro (15s), Elena Vargas (12s).
- **3 Agentes en Revisión (&gt; 20s):**
  - Juan Delgado (26.8s) y Pedro Morales (22.8s): Incumplimiento por tiempos de conversación extensos.
  - Laura Gomez (38.6s): **Outlier Estadístico Crítico (Z > 2.0)** con 16.0s de silencio promedio (41% del tiempo de gestión).

---

## 9. Valor y Retorno de Inversión
# Beneficios Cuantificados para la Operación
### Impacto directo en la productividad, calidad y costos
- **98% de Reducción en Tiempo Operativo:** De 4 horas a solo 3 segundos por informe consolidado.
- **100% de Consistencia Estadística:** Erradicación de discrepancias numéricas en auditorías y comités directivos.
- **Detección Oportuna de Riesgos:** Identificación instantánea de asesores con tiempos excesivos de espera o pausas prolongadas.
- **Trazabilidad Total:** Bitácora inmutable en base de datos de cada ejecución, envío SMTP y respuesta del servidor.

---

## 10. Pruebas y Resultados
# Evidencias Reales de Validación Técnica
### Comprobación empírica en entorno de producción local
- **Suite de Pruebas Automatizadas:** 100% de tests aprobados (`tests/run_tests.js`).
- **Tolerancia a Fallos:** Detección y aislamiento comprobado de duplicados y duraciones negativas en casos borde.
- **Evidencia Real de Envío SMTP (Gmail):**
  - **Cuenta Remitente:** `paulcacerez768@gmail.com`
  - **Estado del Proveedor:** `ACEPTADO_PROVEEDOR (250 2.0.0 OK)`
  - **Message ID:** `<3cf9f8c8-60d9-1a6c-9de3-320f8d290022@gmail.com>`
  - **Adjunto Verificado:** Reporte Excel oficial de 4 hojas con gráficos nativos incluidos.

---

## 11. Conclusiones y Mejoras Futuras
# Hitos Alcanzados y Hoja de Ruta Tecnológica
### Solución integral lista para escalar a nivel corporativo
- **Conclusión:** Se entregó una plataforma completa, funcional y validada que resuelve de raíz la manipulación manual de datos de Call Center.
- **Próximas Mejoras Tecnológicas:**
  - Conexión vía WebSockets en tiempo real con centrales telefónicas (Asterisk, Genesys Cloud, Twilio).
  - Integración de análisis acústico y reconocimiento de voz (Speech-to-Text) cruzado con el TMO.
  - Modelos predictivos de tráfico de llamadas mediante Machine Learning.

---

## 12. Replicación del Proyecto
# Pasos Clave para Replicar la Solución desde Cero
### Guía rápida de despliegue independiente
1. **Requisitos:** Node.js 18+, Python 3.9+ (openpyxl), PostgreSQL / Supabase, n8n y cuenta SMTP.
2. **Base de Datos:** Ejecutar los scripts `schema.sql`, `rls_policies.sql` y `functions.sql`.
3. **Variables de Entorno:** Configurar credenciales en `backend/.env`.
4. **Ejecución de Servicios:** Iniciar Backend (`npm run dev`) y Frontend (`npm run dev`).
5. **Workflows n8n:** Importar `master_call_center_tmo_workflow.json` en n8n.
- **Manual Completo:** Consultar `docs/REPLICATION_MANUAL.md` para el paso a paso detallado.
