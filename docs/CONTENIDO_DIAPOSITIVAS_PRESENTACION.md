# 📑 Guion y Contenido Estructurado para Diapositivas de Presentación

> **Instrucciones para el Expositor:**
> Puedes copiar y pegar directamente cada bloque en **PowerPoint**, **Google Slides**, **Canva** o importarlo en **Gamma AI** (`https://gamma.app`).  
> Cada diapositiva incluye los **Puntos Clave Visuales** y las **Notas del Orador (Guion de lo que debes decir al exponer)**.

---

## 🖥️ Diapositiva 1: Portada Ejecutiva
- **Título:** Plataforma Inteligente de Análisis de Llamadas, Control de TMO y Automatización de Reportes
- **Subtítulo:** Monitoreo Operativo en Tiempo Real, Asistente de IA y Alertas Horarias para Call Centers
- **Autor / Expositor:** Jefferson Cacerez (o Equipo de Operaciones y Analítica)
- **Tecnologías Clave:** Node.js, Express, React, TypeScript, Python openpyxl, SMTP y n8n

> **🎙️ Notas del Orador:**
> *"Buenos días a todos. Hoy les presento la Plataforma Inteligente de Control de TMO y Automatización de Reportes para Call Centers. Esta solución fue creada para transformar un proceso que antes consumía horas de trabajo manual en un sistema ágil, matemático y automatizado, capaz de alertar en tiempo real sobre el desempeño de nuestros asesores y permitir a cualquier persona consultar la información a través de un Asistente de IA."*

---

## 🖥️ Diapositiva 2: La Problemática en los Call Centers (Los Dolores del Negocio)
- **Título:** El Desafío Operativo de la Supervisión Manual
- **Puntos Clave:**
  - ⏳ **3 a 5 Horas Diarias Perdidas:** Supervisores limpiando hojas de cálculo y generando reportes celda por celda.
  - ❌ **La Falacia del Promedio Simple:** Si un asesor atiende 100 llamadas y otro solo 2, promediar sus TMOs distorsiona la realidad operativa del equipo.
  - 🔇 **Tiempos de Silencio y Espera Ocultos:** Dificultad para detectar asesores que dejan a clientes en espera prolongada o se demoran buscando en el CRM.
  - ⚠️ **Reacción Tardía:** La gerencia se entera de los incumplimientos al final del día o al cierre de mes, cuando los costos y las pérdidas ya ocurrieron.

> **🎙️ Notas del Orador:**
> *"En cualquier operación de Call Center, el TMO (Tiempo Medio de Operación) impacta directamente en los costos y la satisfacción del cliente. Sin embargo, los supervisores pierden hasta 5 horas al día consolidando archivos Excel manualmente. Peor aún, se suele cometer el error matemático de promediar los TMOs sin ponderar el volumen de llamadas, lo que entrega cifras engañosas a la gerencia. Además, los problemas de silencio o demoras se descubren demasiado tarde para corregirlos."*

---

## 🖥️ Diapositiva 3: La Solución Implementada
- **Título:** Nuestra Propuesta de Valor: Automatización Integral
- **Puntos Clave:**
  - ⚡ **Ingesta Inteligente:** Carga de archivos Excel (.xlsx/.xls) y normalización en menos de 2 segundos.
  - 📐 **Rigor Matemático:** Cálculo de TMO ponderado por volumen real de llamadas y detección de anomalías.
  - 🤖 **Bot / Asistente de IA en Lenguaje Natural:** Consultas instantáneas sobre cualquier agente (ej. *"Dame el reporte de Jefferson Cacerez"*).
  - ⏰ **Despacho Automático de Correos Cada 1 Hora:** Alertas periódicas con la lista de agentes que están pasados con el TMO y los que van bien.
  - 📊 **Libros Excel Oficiales de 4 Hojas:** Gráficos nativos de barras y dona embebidos directamente en el archivo para auditoría.

> **🎙️ Notas del Orador:**
> *"Nuestra plataforma resuelve este dolor con una suite integral. Elimina el trabajo manual ingiriendo archivos en segundos, aplica un motor matemático objetivo que no depende de opiniones subjetivas, ofrece un bot de inteligencia artificial al que cualquiera puede preguntarle por un asesor, y despacha automáticamente correos cada hora con los asesores que van bien y los que necesitan ayuda."*

---

## 🖥️ Diapositiva 4: Rigor Matemático y Regla Determinista
- **Título:** Precisión Estadística: El Fin de la Falacia de Promedios
- **Puntos Clave:**
  - **Fórmula de TMO Ponderado Global:**
    $$\text{TMO Global} = \frac{\text{Suma de Segundos de Todas las Llamadas Válidas}}{\text{Total de Llamadas Válidas}}$$
  - **Regla Determinista Inalterable:**
    - 🟢 **TMO $\le$ Umbral (20s):** `APROBADO` (Dentro de meta).
    - 🟡 **Umbral $<$ TMO $\le$ 1.25 $\times$ Umbral:** `EN OBSERVACIÓN`.
    - 🔴 **TMO $>$ 1.25 $\times$ Umbral:** `REQUIERE REVISIÓN` (Excedido).
  - 📈 **Detección de Outliers Estadísticos:** Identificación rigurosa de asesores con desviación crítica ($Z\text{-score} > 2.0$).

> **🎙️ Notas del Orador:**
> *"El motor de cálculo implementa una regla determinista inquebrantable. Ninguna opinión subjetiva ni 'alucinación' de IA puede cambiar un número: si el TMO de un agente supera los 20 segundos, el sistema lo cataloga de inmediato para revisión. Además, calculamos el Z-score para aislar a los verdaderos outliers del equipo, permitiendo al supervisor enfocarse justo donde se requiere intervención."*

---

## 🖥️ Diapositiva 5: El Asistente de IA Operativo
- **Título:** Diálogo Inteligente y Diagnóstico Inmediato por Agente
- **Puntos Clave:**
  - 💬 **Consultas en Lenguaje Natural:** Pregunta libremente sin necesidad de saber comandos.
  - 🔍 **Búsqueda Inteligente de Cualquier Asesor:**
    - Ejemplo: *"Dame los reportes del TMO del agente Jefferson Cacerez"*
    - Respuesta inmediata: TMO, total de llamadas, % de adherencia, tiempos de conversación y silencio, diagnóstico y muestra de llamadas.
  - 🏆 **Rankings y Comparativas:**
    - *"¿Quiénes están pasados con el TMO?"*
    - *"¿Quiénes van bien y cumplen el estándar?"*
    - *"¿Quién es el mejor agente y quién tiene más silencios?"*
  - 💡 **Recomendaciones Accionables:** No solo muestra números, sino pautas de coaching concretas para capacitar al personal.

> **🎙️ Notas del Orador:**
> *"Una de las mayores innovaciones es nuestro Bot de IA. Anteriormente solo respondía preguntas sugeridas. Ahora, cualquier supervisor, directivo o analista puede escribir: 'Dame los reportes del TMO del agente Jefferson Cacerez' y el bot consulta la base de datos en milisegundos, devolviendo un informe ejecutivo con su TMO, adherencia, tiempos de silencio y recomendaciones. Si preguntamos quiénes van mal o quiénes van bien, entrega listas claras y priorizadas."*

---

## 🖥️ Diapositiva 6: Automatización de Correos Cada 1 Hora
- **Título:** Alertas Periódicas de Agentes Pasados vs. Agentes que Van Bien
- **Puntos Clave:**
  - ⏰ **Scheduler en Segundo Plano:** Monitorea y envía correos automáticamente cada 60 minutos (o intervalo configurable).
  - 📬 **Envío a Cualquier Correo:** Configurable dinámicamente desde la interfaz web (soporta copias CC).
  - 🚨 **Tabla 1: Agentes Pasados del TMO:** Resalta en rojo los asesores que superan el umbral, su exceso de segundos y plan de acción inmediato.
  - ✅ **Tabla 2: Agentes que Van Bien:** Resalta en verde los asesores con cumplimiento del 100% y buen ritmo.
  - 📎 **Adjunto Oficial:** Adjunta el libro Excel de 4 hojas con gráficos interactivos.
  - ⚡ **Botón de Disparo Inmediato:** Permite enviar una prueba al instante con un solo clic.

> **🎙️ Notas del Orador:**
> *"Para garantizar que la gerencia y los supervisores no tengan que entrar a la plataforma para enterarse del estado operativo, implementamos un programador horario. Cada una hora, el sistema genera y despacha un correo profesional con dos tablas clave: los agentes pasados de TMO que requieren apoyo y los que están cumpliendo la meta, adjuntando además el archivo Excel oficial. También incluye un botón para enviar este reporte en cualquier momento."*

---

## 🖥️ Diapositiva 7: Reportes Ejecutivos en Excel (4 Hojas con Gráficos Nativos)
- **Título:** Entregables de Grado Auditoría con Python y ExcelJS
- **Estructura del Libro Generado:**
  1. 📄 **Hoja 1: Datos Originales:** Bitácora inmutable de llamadas con duraciones y marcas de validez.
  2. 📊 **Hoja 2: Resumen por Agente + Gráfico de Barras:** Comparativa de TMO individual frente a la línea roja del umbral.
  3. 🍩 **Hoja 3: Análisis Estadístico + Gráfico de Dona:** Distribución porcentual de llamadas contestadas vs. perdidas.
  4. 🧠 **Hoja 4: Validación de IA:** Diagnósticos explicables y planes de acción por asesor.

> **🎙️ Notas del Orador:**
> *"Cuando el directivo abre el archivo Excel adjunto en su computadora, no ve una simple tabla de datos crudos. Se encuentra con un reporte estructurado de 4 hojas diseñado con Python openpyxl que incluye gráficos nativos de barras y dona embebidos directamente en el archivo, cumpliendo con los estándares más estrictos de auditoría empresarial."*

---

## 🖥️ Diapositiva 8: Arquitectura Tecnológica y Seguridad
- **Título:** Stack Tecnológico Robusto, Reactivo y Seguro
- **Puntos Clave:**
  - ⚛️ **Frontend:** React 19, TypeScript, TailwindCSS, Lucide Icons y Vite para una experiencia fluida.
  - ⚙️ **Backend:** Node.js, Express, TypeScript, arquitectura modular en capas (Controllers, Services, Middleware).
  - 🐍 **Motor Gráfico:** Python 3 + openpyxl con fallback determinista a ExcelJS.
  - ✉️ **Servidor de Correo:** Nodemailer SMTP seguro (Gmail SSL/TLS en puerto 465 con respuesta 250 OK verificada).
  - 🔒 **Persistencia & Idempotencia:** Base de datos relacional y firmas criptográficas SHA-256 para evitar duplicaciones.

> **🎙️ Notas del Orador:**
> *"La solución fue construida con tecnologías de última generación. En el frontend utilizamos React 19 y TypeScript para una interfaz reactiva; en el backend, Node.js y Express con un servicio en segundo plano para el programador de correos; y para el despacho de correos, integración SMTP certificada que garantiza la entrega sin exponer contraseñas."*

---

## 🖥️ Diapositiva 9: Impacto en el Negocio y Retorno de Inversión (ROI)
- **Título:** Beneficios Tangibles para la Operación
- **Indicadores de Impacto:**
  - ⏱️ **Reducción del 95% del Tiempo de Reportes:** De 4 horas diarias a menos de 3 segundos.
  - 📉 **Disminución Inmediata del TMO Excedido:** Identificación temprana de pausas y tiempos de silencio antes de que afecten la jornada.
  - 🎯 **Decisiones Basadas en Hechos:** Eliminación de sesgos personales gracias a la regla determinista inquebrantable.
  - 👥 **Empoderamiento del Equipo:** Consultas en lenguaje natural al bot de IA que democratizan el acceso a la información operativa.

> **🎙️ Notas del Orador:**
> *"El impacto en el negocio es rotundo: los supervisores recuperan entre 15 y 20 horas a la semana que antes perdían en Excel y ahora pueden dedicar a capacitar y acompañar a los asesores. Pasamos de una gestión reactiva de 'apagar incendios' al final del día a un control proactivo hora tras hora."*

---

## 🖥️ Diapositiva 10: Conclusión y Demostración en Vivo
- **Título:** Conclusión y Demostración Práctica
- **Resumen:**
  - ✅ Plataforma 100% funcional y verificada con tests automatizados.
  - ✅ Bot de IA mejorado para responder por cualquier asesor en lenguaje natural.
  - ✅ Alertas horarias configurables y despachadas por correo a cualquier destinatario.
  - ✅ Libro Excel de 4 hojas con gráficos nativos listo para presentación.
- **Acción:** *Demostración en vivo en `http://localhost:5173` y `http://localhost:4000/api`.*

> **🎙️ Notas del Orador:**
> *"En conclusión, esta plataforma moderniza por completo la gestión operativa de un Call Center. A continuación, pasaremos a la demostración en vivo, donde veremos cómo consultarle al Bot por el agente Jefferson Cacerez y cómo despachar el reporte horario con solo un clic. Quedo a su disposición para cualquier pregunta. ¡Muchas gracias!"*
