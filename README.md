# Enterprise Suite 360°: Plataforma Unificada de Auditoría Comercial (ETL), Control de TMO y Analítica Reactiva

[![Python Version](https://img.shields.io/badge/Python-3.12%2B-blue.svg)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-6.1.3-success.svg)](https://www.djangoproject.com/)
[![Dash](https://img.shields.io/badge/Dash-4.5.1-informational.svg)](https://dash.plotly.com/)
[![Plotly](https://img.shields.io/badge/Plotly-7.2.0-orange.svg)](https://plotly.com/)
[![Pandas](https://img.shields.io/badge/Pandas-3.1.1-darkblue.svg)](https://pandas.pydata.org/)
[![APScheduler](https://img.shields.io/badge/APScheduler-3.11.3-yellow.svg)](https://apscheduler.readthedocs.io/)
[![Pytest Suite](https://img.shields.io/badge/Tests-39%20Passed-brightgreen.svg)](https://pytest.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20%26%20SOLID-purple.svg)]()

> **Enterprise Suite 360°** es una macro-plataforma web unificada de analítica corporativa, auditoría financiera de facturación y control operativo de Call Centers. Integra en **100% Python puro** el backend transaccional de **Django 6**, dos dashboards interactivos con **Dash & Plotly** montados en la capa WSGI, pipelines ETL de normalización con **Pandas**, generación de libros contables y operativos nativos con **OpenPyXL**, y un motor persistente de tareas programadas con **APScheduler**.

---

## 📋 Tabla de Contenidos

1. [Visión General y Filosofía de Diseño](#-visión-general-y-filosofía-de-diseño)
2. [Stack Tecnológico y Restricciones Estrictas](#-stack-tecnológico-y-restricciones-estrictas)
3. [Arquitectura del Sistema](#-arquitectura-del-sistema)
4. [Estructura del Proyecto](#-estructura-del-proyecto)
5. [Instalación y Configuración Paso a Paso](#-instalación-y-configuración-paso-a-paso)
6. [Puesta en Marcha y Ejecución](#-puesta-en-marcha-y-ejecución)
7. [Módulos Funcionales y Fundamento Matemático](#-módulos-funcionales-y-fundamento-matemático)
   - [7.1 Ingesta Inteligente y Deduplicación Criptográfica](#71-ingesta-inteligente-y-deduplicación-criptográfica)
   - [7.2 Motor Estadístico: TMO Ponderado y Detección de Outliers (Z-Score)](#72-motor-estadístico-tmo-ponderado-y-detección-de-outliers-z-score)
   - [7.3 Generador de Reportes Ejecutivos OpenPyXL (4 Hojas con Gráficos)](#73-generador-de-reportes-ejecutivos-openpyxl-4-hojas-con-gráficos)
   - [7.4 Automatización Horaria APScheduler y Despacho SMTP](#74-automatización-horaria-apscheduler-y-despacho-smtp)
   - [7.5 Dashboard Analítico Dash & Plotly Integrado en WSGI](#75-dashboard-analítico-dash--plotly-integrado-en-wsgi)
8. [Suite de Pruebas Automatizadas (Pytest)](#-suite-de-pruebas-automatizadas-pytest)
9. [Guía para Desarrolladores: Cómo Extender el Sistema](#-guía-para-desarrolladores-cómo-extender-el-sistema)
10. [Despliegue en Entornos de Producción](#-despliegue-en-entornos-de-producción)
11. [Diagnóstico y Solución de Problemas Frecuentes](#-diagnóstico-y-solución-de-problemas-frecuentes)
12. [Enlace Oficial del Repositorio](#-enlace-oficial-del-repositorio)

---

## 🎯 Visión General y Filosofía de Diseño

En las operaciones de telecomunicaciones y BPO, el **TMO (Tiempo Medio de Operación / AHT - Average Handle Time)** es el indicador crítico de costo y productividad. Sin embargo, las organizaciones cometen dos errores operativos graves:
1. **La falacia del "promedio de promedios":** Promediar directamente los promedios de duración de los agentes sin ponderar el número de llamadas atenúa la realidad de quienes atienden grandes volúmenes.
2. **Dependencia de procesos manuales:** Los coordinadores pierden horas diarias formateando hojas de cálculo, enviando reportes tardíos que impiden la toma de decisiones en tiempo real.

**TMO-IA** resuelve estos problemas eliminando la intervención manual:
- Ingesta cualquier archivo Excel de telefonía (`.xlsx`, `.xls`) en milisegundos.
- Calcula el TMO ponderado exacto por asesor y a nivel global.
- Aplica análisis de dispersión gaussiana ($Z\text{-Score}$) para aislar agentes con desvíos anómalos.
- Ejecuta auditorías periódicas automáticas en segundo plano (cada 60 minutos u horarios programados) y despacha correos ejecutivos con informes multiformato.
- Ofrece dashboards interactivos reactivos con filtros y simuladores de umbral sin recargar la página.

---

## 🛠 Stack Tecnológico y Restricciones Estrictas

El proyecto fue construido bajo la regla irrestricta de **cero dependencias de JavaScript o frameworks frontend externos**. Toda la lógica de negocio, manipulación de datos, tareas asíncronas y renderizado visual reactivo está gobernada al 100% por Python:

| Componente | Tecnología | Versión | Responsabilidad |
|---|---|---|---|
| **Lenguaje Core** | Python | 3.12.10 | Lógica del sistema, tipado estricto y ejecución |
| **Backend & ORM** | Django | 6.1.3 | Rutas, seguridad, administración, transacciones ORM |
| **Analítica Reactiva** | Dash | 4.5.1 | Dashboard interactivo y arquitectura de componentes |
| **Visualización** | Plotly | 7.2.0 | Gráficos de barras, dona, dispersión y composición |
| **Procesamiento de Datos** | Pandas | 3.1.1 | Normalización de DataFrames, transformaciones vectorizadas |
| **Reportes Excel** | OpenPyXL | 3.1.5 | Generación de libros Excel con formato y gráficos nativos |
| **Automatización** | APScheduler | 3.11.3 | Tareas programadas en background con control de concurrencia |
| **Testing** | Pytest & pytest-django | 9.2.0 | Suite integral de pruebas unitarias, E2E y de resiliencia |
| **Base de Datos** | SQLite3 / PostgreSQL | Compatible | Almacenamiento relacional transaccional |
| **Configuración** | Python-Decouple | 3.8 | Gestión segura de variables de entorno mediante `.env` |

---

## 🏛 Arquitectura del Sistema

El proyecto sigue una arquitectura por capas basada en principios **SOLID** y **Clean Architecture**, aislando completamente la lógica de negocio del framework web:

```
                                  USUARIO / NAVEGADOR
                                           │
                                           ▼
                             ┌───────────────────────────┐
                             │       WSGI Server         │
                             │  (DispatcherMiddleware)   │
                             └─────────────┬─────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
                    ▼                                             ▼
          ┌───────────────────┐                         ┌───────────────────┐
          │   Django Core     │                         │     Dash App      │
          │   HTTP Requests   │                         │  (/analitica/dash)│
          └─────────┬─────────┘                         └─────────┬─────────┘
                    │                                             │
    ┌───────────────┼───────────────┐                             │
    ▼               ▼               ▼                             │
┌─────────┐   ┌───────────┐   ┌────────────┐                      │
│  Core   │   │Operations │   │ Automation │                      │
│  Views  │   │   Views   │   │   Views    │                      │
└─────────┘   └─────┬─────┘   └─────┬──────┘                      │
                    │               │                             │
                    └───────┬───────┴─────────────────────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │    Servicios de Dominio   │
              │  (services/data_processor)│
              │  (services/tmo_calculator)│
              │  (services/excel_generator│
              │  (services/email_notifier)│
              │  (services/scheduler)     │
              └─────────────┬─────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    ┌───────────────────┐       ┌───────────────────┐
    │     Django ORM    │       │    APScheduler    │
    │  Modelos & Querys │       │ Background Worker │
    └─────────┬─────────┘       └───────────────────┘
              │
              ▼
    ┌───────────────────┐
    │   Base de Datos   │
    │ SQLite/PostgreSQL │
    └───────────────────┘
```

---

## 📂 Estructura del Proyecto

```
TMO-IA/
├── apps/
│   ├── analytics/               # Módulo de Cuadros de Mando Dash & Plotly
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── dash_app.py          # Dashboard interactivo con 4 KPIs y 4 gráficos
│   │   ├── urls.py              # Rutas de analítica
│   │   └── views.py             # Adaptador WSGI y template wrapper
│   ├── automation/              # Módulo de Automatización y Tareas Programadas
│   │   ├── __init__.py
│   │   ├── apps.py              # Hook de arranque seguro del Scheduler
│   │   ├── models.py            # AutomationJob, ExecutionLog, AutomationAlertRecipient
│   │   ├── urls.py              # Endpoints para panel de control y disparo manual
│   │   └── views.py             # Vistas de monitoreo y logs de ejecución
│   ├── core/                    # Módulo Central de Navegación y Páginas Base
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── urls.py              # Enrutador principal (Home, Health check)
│   │   └── views.py             # Landing page con métricas agregadas
│   └── operations/              # Módulo Operativo de Ingesta y Gestión de Llamadas
│       ├── __init__.py
│       ├── apps.py
│       ├── forms.py             # Validación estricta de archivos Excel
│       ├── models.py            # Agent, IngestedFile, CallRecord, ThresholdConfig
│       ├── urls.py              # Rutas de upload, listado y descarga de reportes
│       └── views.py             # Vistas de carga y visualización de registros
├── config/                      # Configuración Global del Proyecto Django
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py              # Configuración centralizada, decouple y logging
│   ├── urls.py                  # Enrutador maestro con alias de resiliencia
│   └── wsgi.py                  # DispatcherMiddleware integrando Django + Dash
├── services/                    # Capa de Servicios de Dominio (Pure Python)
│   ├── __init__.py
│   ├── automation_service.py    # Scheduler Singleton y pipeline de auditoría periódica
│   ├── data_processor.py        # Ingesta Pandas, deduplicación y parsing de duraciones
│   ├── email_service.py         # Formateador de plantillas HTML y despacho SMTP
│   ├── excel_generator.py       # Generador de 4 hojas de cálculo con OpenPyXL
│   └── tmo_calculator.py        # Algoritmos estadísticos: TMO Ponderado y Z-Score
├── templates/                   # Plantillas HTML Semánticas con Estilos Puros
│   ├── analytics/dashboard.html # Contenedor responsive del Dash App
│   ├── automation/panel.html    # Panel de control de tareas y monitor de logs
│   ├── base.html                # Plantilla base con barra de navegación institucional
│   ├── core/home.html           # Vista principal con estado operativo
│   └── operations/              # Vistas de subida de archivos y tabla de llamadas
├── tests/                       # Suite Exhaustiva de Pruebas Pytest (36 Tests)
│   ├── test_analytics.py        # Pruebas unitarias de Dash y callbacks
│   ├── test_automation.py       # Pruebas de modelos, jobs y scheduler
│   ├── test_data_processor.py   # Pruebas de parsing de duraciones y normalización
│   ├── test_edge_cases_and_resilience.py # Pruebas con archivos corruptos y concurrencia
│   ├── test_environment.py      # Pruebas de configuración y rutas HTTP
│   ├── test_excel_generator.py  # Pruebas de integridad del libro Excel generado
│   ├── test_integration_e2e.py  # Ciclo de vida completo: Ingesta -> TMO -> Reporte -> Email
│   ├── test_operations_views.py # Pruebas de endpoints de carga y descarga
│   ├── test_performance_and_security.py # Inyecciones SQL, Headers y benchmarks
│   └── test_tmo_calculator.py   # Pruebas matemáticas de algoritmos ponderados
├── sample_data/                 # Archivos de prueba (demo_call_center.xlsx, etc.)
├── .env.example                 # Plantilla documentada de variables de entorno
├── manage.py                    # Gestor CLI de Django
├── pytest.ini                   # Configuración del ejecutor de pruebas
├── requirements.txt             # Dependencias estrictamente versionadas
└── README.md                    # Manual integral de documentación y despliegue
```

---

## 🚀 Instalación y Configuración Paso a Paso

### 1. Prerrequisitos
- **Python:** 3.12.x instalado y registrado en el `PATH` del sistema.
- **Git:** Instalado en el sistema operativo.

### 2. Clonar el Repositorio
```bash
git clone https://github.com/jeffersoncace0-ctrl/TMO-IA.git
cd TMO-IA
```

### 3. Crear y Activar el Entorno Virtual
En Windows (PowerShell / CMD):
```powershell
python -m venv venv
.\venv\Scripts\activate
```

En Linux / macOS:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 4. Instalar las Dependencias Oficiales
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Configurar las Variables de Entorno
Copia la plantilla `.env.example` a `.env`:
```powershell
Copy-Item .env.example .env
```
Edita `.env` para personalizar tu configuración (clave secreta, base de datos, umbral de TMO y credenciales SMTP si deseas despachar correos reales).

### 6. Ejecutar las Migraciones de la Base de Datos
```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. Crear el Superusuario Administrador (Opcional)
```bash
python manage.py createsuperuser
```

---

## ⚡ Puesta en Marcha y Ejecución

### 1. Iniciar el Servidor de Desarrollo
```powershell
python manage.py runserver 8000
```
El sistema estará accesible inmediatamente en:
- **Plataforma Principal:** `http://127.0.0.1:8000/`
- **Gestión de Operaciones:** `http://127.0.0.1:8000/operaciones/`
- **Subida de Archivos Excel:** `http://127.0.0.1:8000/operaciones/subir/`
- **Dashboard Analítico Dash:** `http://127.0.0.1:8000/analitica/`
- **Panel de Automatización:** `http://127.0.0.1:8000/automatizacion/panel/`
- **Panel de Administración Django:** `http://127.0.0.1:8000/admin/`

> **Nota sobre Conflictos de Puertos en Windows:**
> Si al iniciar el servidor recibes el error `That port is already in use`, puedes liberar el puerto 8000 con el siguiente comando en PowerShell:
> ```powershell
> Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
> ```
> O iniciar el servidor en un puerto alternativo:
> ```powershell
> python manage.py runserver 8080
> ```

---

## 🧠 Módulos Funcionales y Fundamento Matemático

### 7.1 Ingesta Inteligente y Deduplicación Criptográfica
- **Cálculo de Hash SHA-256:** Cada archivo subido es procesado mediante `hashlib.sha256()`. Si un supervisor intenta cargar el mismo archivo dos veces, el sistema detecta la colisión y previene la duplicación de datos.
- **Parsing Resiliente de Duraciones:** El servicio `DataProcessorService` admite formatos heterogéneos (`"00:03:45"`, `"03:45"`, `225` segundos, números decimales, cadenas vacías o con espacios) normalizándolos a segundos de forma determinista.
- **Mapeo Inteligente de Columnas:** Tolera variaciones de nomenclatura (`ID_Llamada`, `id_llamada`, `CALL_ID`, `AGENTE`, `ASESOR`, etc.) garantizando una ingesta robusta sin fallos por diferencias de formato.

### 7.2 Motor Estadístico: TMO Ponderado y Detección de Outliers (Z-Score)
El cálculo del TMO por agente y global no se efectúa promediando promedios. Se aplica la **fórmula ponderada estricta**:

$$\text{TMO}_{\text{Ponderado}} = \frac{\sum_{i=1}^{n} (\text{Duración Hablada}_i + \text{Tiempo Espera}_i + \text{Tiempo Post-Llamada}_i)}{\sum_{i=1}^{n} \text{Llamadas Atendidas}_i}$$

Para la detección de asesores atípicos, se calcula el desvío estándar ($\sigma$) y la puntuación Z ($Z\text{-Score}$):

$$Z_i = \frac{\text{TMO}_i - \mu}{\sigma}$$

- Si $Z_i > 2.0$: El asesor es clasificado como **Outlier Crítico / Requiere Revisión**, lo que activa automáticamente una alerta prioritaria en los tableros y en los correos de auditoría.

### 7.3 Generador de Reportes Ejecutivos OpenPyXL (4 Hojas con Gráficos)
El servicio `ExcelReportService` genera un libro de cálculo profesional con estilo corporativo estructurado en 4 hojas:
1. **Resumen Ejecutivo:** KPIs globales (Total llamadas, TMO ponderado general, distribución de asesores por estado: Aprobado, Observación, Crítico).
2. **Detalle por Asesor:** Tabla formateada con totales de tiempo, TMO individual, ratio de cumplimiento y semaforización condicional.
3. **Registro de Llamadas:** Detalle íntegro de llamadas con identificador, fecha/hora y duraciones.
4. **Gráficos:** Contiene gráficos nativos embebidos de OpenPyXL (`BarChart` de TMO por Asesor vs. Umbral y `PieChart` de distribución porcentual de estados).

### 7.4 Automatización Horaria APScheduler y Despacho SMTP
- **Patrón Singleton:** El `AutomationSchedulerService` utiliza un patrón Singleton y un bloqueo reentrante (`threading.Lock`) para garantizar que exista **una única instancia del scheduler** activa en todo el ciclo de vida del proceso web.
- **Auditoría Periódica:** Cada 60 minutos (o al presionar *"Ejecutar Auditoría Ahora"* en el panel web), el servicio:
  1. Consulta los registros de llamadas disponibles en la base de datos.
  2. Ejecuta el cálculo estadístico y clasifica a los asesores.
  3. Genera un libro Excel en memoria mediante `ExcelReportService`.
  4. Compila una plantilla HTML con el balance operativo (asesores aprobados vs. en observación/críticos).
  5. Despacha el correo vía SMTP con el archivo Excel adjunto y registra el log de ejecución con su tiempo de cómputo en la tabla `ExecutionLog`.

### 7.5 Dashboard Analítico Dash & Plotly Integrado en WSGI
Integrado mediante el estándar WSGI (`DispatcherMiddleware` en `config/wsgi.py`), la aplicación Dash corre bajo la misma instancia del servidor Django sin necesidad de procesos Node.js o puertos secundarios:
- **Simulador de Umbral Interactivo:** Un control deslizante (`Slider`) permite simular en tiempo real cómo varía la tasa de cumplimiento si el umbral exigido cambia entre 10 y 60 segundos.
- **Filtro de Asesores:** Menú desplegable dinámico para aislar métricas de asesores específicos.
- **4 Tarjetas de Métricas (KPIs):** Total Llamadas, TMO Ponderado, Agentes Activos y Cumplimiento Operativo.
- **4 Gráficos Interactivos Plotly:**
  1. *Bar Chart:* TMO por asesor vs. Línea de umbral meta.
  2. *Donut Chart:* Porcentaje de agentes en Aprobado, Observación y Crítico.
  3. *Scatter Plot:* Detección de Outliers según Z-Score.
  4. *Stacked Bar:* Composición del tiempo (Conversación vs. Espera vs. ACW).

---

## 🧪 Suite de Pruebas Automatizadas (Pytest)

El proyecto cuenta con **36 pruebas automatizadas** que validan la solidez del sistema ante fallos, datos corruptos y estrés de concurrencia:

```bash
pytest -v
```

### Resumen de la Cobertura de Pruebas:
1. **Pruebas de Ingesta y Parsing (`test_data_processor.py`):** Detección de colisiones SHA-256, tolerancia a columnas faltantes y conversiones de tiempo complejas.
2. **Pruebas Estadísticas (`test_tmo_calculator.py`):** Verificación matemática del TMO ponderado vs. promedio simple y asignación determinista de umbrales.
3. **Pruebas de Generación Excel (`test_excel_generator.py`):** Comprobación de existencia de las 4 hojas, estilos de celda y gráficos nativos.
4. **Pruebas de Automatización y Scheduler (`test_automation.py`):** Validación del Singleton, ejecución de jobs sin duplicación y despacho SMTP con backend de memoria.
5. **Pruebas de Dash & Callbacks (`test_analytics.py`):** Validación de rutas WSGI de Dash (`/_dash-layout`, `/_dash-dependencies`), cálculo de gráficos y callbacks reactivos.
6. **Pruebas de Casos Borde y Resiliencia (`test_edge_cases_and_resilience.py`):** Archivos binarios corruptos, extensiones no permitidas (.exe, .txt), concurrencia simultánea con `threading.Lock`.
7. **Pruebas de Rendimiento y Seguridad (`test_performance_and_security.py`):** Ingesta de 1,000 registros en <0.5s, persistencia bulk en <1.5s, protección contra SQL Injection en ORM y verificación de headers de seguridad (`X-Frame-Options: SAMEORIGIN`).
8. **Prueba Integral End-to-End (`test_integration_e2e.py`):** Ciclo completo desde la carga HTTP del archivo Excel hasta la generación del reporte, ejecución del scheduler y reflejo en el dashboard.

---

## 🛠 Guía para Desarrolladores: Cómo Extender el Sistema

### 1. Agregar un Nuevo Algoritmo Estadístico
Crea el método en `services/tmo_calculator.py` utilizando type hints y docstrings explicativos:
```python
def calculate_agent_fcr(self, calls_df: pd.DataFrame) -> float:
    """Calcula el First Call Resolution (FCR) ponderado."""
    # Lógica con Pandas vectorizado
    ...
```

### 2. Agregar una Nueva Tarea Programada al Scheduler
En `services/automation_service.py`, agrega un método de auditoría y regístralo en el scheduler:
```python
def schedule_weekly_consolidated_job(self) -> None:
    self.scheduler.add_job(
        func=self._execute_weekly_pipeline,
        trigger="cron",
        day_of_week="sun",
        hour=23,
        id="weekly_consolidated_audit",
        replace_existing=True
    )
```

### 3. Incorporar un Nuevo Gráfico al Dashboard Dash
En `apps/analytics/dash_app.py`, añade el componente `dcc.Graph` al layout y define el callback correspondiente en Python puro.

---

## 🌐 Despliegue en Entornos de Producción

### 1. Servidor WSGI en Producción (Linux / Gunicorn)
Instalar Gunicorn:
```bash
pip install gunicorn
```
Ejecutar con 4 workers concurrentes enlazando la aplicación combinada Django+Dash:
```bash
gunicorn config.wsgi:application --workers 4 --bind 0.0.0.0:8000 --timeout 120
```

### 2. Servidor WSGI en Producción (Windows / Waitress)
Instalar Waitress:
```bash
pip install waitress
```
Ejecutar el servicio:
```powershell
waitress-serve --listen=0.0.0.0:8000 config.wsgi:application
```

### 3. Configuración de Base de Datos PostgreSQL
En `.env`, configura el motor PostgreSQL:
```ini
DEBUG=False
SECRET_KEY=clave_criptografica_real_de_produccion
DB_ENGINE=django.db.backends.postgresql
DB_NAME=tmo_production
DB_USER=tmo_user
DB_PASSWORD=contrasena_segura
DB_HOST=127.0.0.1
DB_PORT=5432
```
Aplica migraciones y recopila los archivos estáticos:
```bash
python manage.py collectstatic --noinput
python manage.py migrate
```

---

## 🔍 Diagnóstico y Solución de Problemas Frecuentes

| Síntoma / Error | Causa Raíz | Solución Técnica |
|---|---|---|
| `Port 8000 is already in use` | Otro proceso de Python o Django está ejecutándose en segundo plano. | Identificar el PID con `Get-NetTCPConnection -LocalPort 8000` y detenerlo con `Stop-Process -Id <PID> -Force`, o iniciar en otro puerto: `python manage.py runserver 8080`. |
| `Page not found (404) at /automatizacion/panel/` | El navegador está conectado a un proceso Django antiguo de otro directorio. | Detén el proceso huérfano y ejecuta el servidor desde la raíz de `C:\Users\User\Desktop\TMO-IA\`. |
| `TypeError: unexpected keyword argument` en modelos | Inconsistencia de campos en migraciones no aplicadas. | Ejecutar `python manage.py migrate` para sincronizar el esquema de base de datos. |
| Fallo al autenticar en SMTP de Gmail | Contraseña normal utilizada en lugar de App Password. | Generar una "Contraseña de Aplicación" en la configuración de seguridad de Google y asignarla en `SMTP_PASSWORD`. |

---

## 🔗 Enlace Oficial del Repositorio

El código fuente completo, con control de versiones, suites de pruebas y documentación de arquitectura, se encuentra disponible en GitHub:

👉 **[https://github.com/jeffersoncace0-ctrl/TMO-IA.git](https://github.com/jeffersoncace0-ctrl/TMO-IA.git)**

---

*Desarrollado con estándares de ingeniería de software empresarial: Clean Code, SOLID, Pure Python y Arquitectura Modular.*
