# Manual Independiente de Replicación: Plataforma de Análisis de Llamadas, TMO y Automatización

Esta guía técnica autónoma proporciona todas las instrucciones, dependencias, configuraciones y comandos exactos para instalar, configurar, ejecutar y validar la solución desde cero en cualquier entorno sin requerir explicaciones externas.

---

## 1. Requisitos Previos

### 1.1. Software y Herramientas Necesarias
- **Node.js:** v18.0.0 o superior (Recomendado v20+ o v24+).
- **npm:** v9.0.0 o superior.
- **Python:** v3.9 o superior (con `openpyxl` instalado para generación de gráficos nativos en Excel).
- **n8n:** v1.0.0 o superior (Autoalojado en Docker o versión Desktop/Cloud).
- **PostgreSQL / Supabase:** Instancia activa de PostgreSQL v14+ o proyecto en [Supabase](https://supabase.com).
- **Servidor SMTP:** Cuenta de correo compatible (ej. Gmail con contraseña de aplicación o servidor SMTP corporativo).

### 1.2. Archivos Requeridos del Repositorio
- `database/schema.sql`: Tablas, restricciones y claves foráneas.
- `database/rls_policies.sql`: Políticas de seguridad Row Level Security.
- `database/functions.sql`: Funciones almacenadas atómicas.
- `n8n/workflows/master_call_center_tmo_workflow.json`: Flujo completo de n8n.
- `sample_data/call_center_dataset_demo.xlsx`: Dataset de prueba con 80 llamadas.
- `sample_data/call_center_edge_cases.xlsx`: Dataset para validación de casos borde.

---

## 2. Instalación y Organización de Carpetas

### 2.1. Clonar u Obtener el Proyecto
```powershell
cd "C:\Users\Fabrica de cultura\.gemini\antigravity\scratch"
git clone <URL_REPOSITORIO> call-center-tmo-platform
cd call-center-tmo-platform
```

### 2.2. Instalar Dependencias del Backend
```powershell
cd backend
npm install
npm run build
```
*Resultado esperado:* Se compila el código TypeScript a JavaScript en `backend/dist/` sin advertencias críticas.

### 2.3. Instalar Dependencias del Frontend
```powershell
cd ../frontend
npm install
npm run build
```
*Resultado esperado:* Vite compila los módulos y genera el bundle en `frontend/dist/` en aproximadamente 1.5 a 2 segundos.

### 2.4. Instalar Biblioteca Python openpyxl
```powershell
python -m pip install openpyxl
```
*Resultado esperado:* Confirmación de instalación `Successfully installed openpyxl`.

---

## 3. Configuración de Base de Datos y Variables de Entorno

### 3.1. Configuración de Supabase / PostgreSQL
1. Accede a tu panel de PostgreSQL o Supabase (SQL Editor).
2. Ejecuta secuencialmente los tres scripts SQL ubicados en `database/`:
   ```sql
   -- 1. Ejecutar database/schema.sql
   -- 2. Ejecutar database/rls_policies.sql
   -- 3. Ejecutar database/functions.sql
   ```
3. Crea dos buckets en Supabase Storage:
   - `raw-excels` (Privado)
   - `processed-reports` (Privado)

> **Nota de Resiliencia:** Si decides operar en un entorno de desarrollo local offline sin Supabase configurado, la plataforma activa automáticamente su adaptador de persistencia local en `database_local.json`, manteniendo idéntica funcionalidad.

### 3.2. Configuración de Variables de Entorno (.env)
Crea o edita el archivo `backend/.env` con la siguiente estructura:

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Credenciales de Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role-secreta
SUPABASE_ANON_KEY=tu-clave-anonima-publica
SUPABASE_STORAGE_BUCKET_RAW=raw-excels
SUPABASE_STORAGE_BUCKET_REPORTS=processed-reports

# Configuración de Correo (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=tu-contrasena-de-aplicacion-de-16-caracteres
SMTP_FROM_NAME="Call Center Analytics & TMO"
SMTP_FROM_EMAIL=tu-correo@gmail.com

# Umbral predeterminado de TMO
DEFAULT_TMO_THRESHOLD=20.0
```

---

## 4. Importación de Flujos en n8n

1. Inicia tu instancia de n8n (`http://localhost:5678`).
2. En el menú de navegación, ve a **Workflows** ➔ **Import from File**.
3. Selecciona el archivo:
   [`n8n/workflows/master_call_center_tmo_workflow.json`](file:///C:/Users/Fabrica%20de%20cultura/.gemini/antigravity/scratch/call-center-tmo-platform/n8n/workflows/master_call_center_tmo_workflow.json)
4. Configura las siguientes credenciales en n8n:
   - **Postgres:** Host, base de datos, usuario y contraseña de Supabase/PostgreSQL.
   - **Email / SMTP:** `smtp.gmail.com`, puerto `465`, usuario y contraseña de aplicación.
5. Haz clic en **Activate Workflow** (interruptor superior derecho).

---

## 5. Ejecución Paso a Paso de la Solución

Sigue estos 9 pasos numerados para una verificación integral:

### Paso 1: Iniciar el Servidor Backend API
En una terminal:
```powershell
cd backend
npm run dev
```
*Salida esperada:*
```text
🚀 SERVIDOR BACKEND INICIADO EN PUERTO: 4000
📡 URL API: http://localhost:4000/api
📊 Umbral TMO Predeterminado: 20 segundos
```

### Paso 2: Iniciar la Aplicación Frontend Web
En una segunda terminal:
```powershell
cd frontend
npm run dev
```
*Salida esperada:*
```text
VITE ready in 200 ms
➜  Local:   http://localhost:5173/
```

### Paso 3: Abrir la Plataforma Web
Abre tu navegador en: `http://localhost:5173`.

### Paso 4: Cargar Archivo de Prueba
1. Ve al módulo **"2. Carga de Excel"**.
2. Arrastra el archivo [`sample_data/call_center_dataset_demo.xlsx`](file:///C:/Users/Fabrica%20de%20cultura/.gemini/antigravity/scratch/call-center-tmo-platform/sample_data/call_center_dataset_demo.xlsx).
3. Haz clic en **"Inspeccionar Hojas & Columnas"**.
4. Verifica que el sistema autodetecte:
   - Código de agente: `Codigo_Agente`
   - Duración: `Duracion_Total_Seg`
   - Silencio: `Tiempo_Silencio_Seg`

### Paso 5: Ejecutar el Análisis
Haz clic en el botón verde **"Ejecutar Análisis y Procesar"**.
*Resultado:* En menos de 2 segundos se calculan las métricas, se actualiza el resumen de agentes y se genera el libro de 4 hojas con gráficos nativos.

### Paso 6: Validar el Dashboard de KPIs y Gráficos
Ve al módulo **"1. Dashboard General"**:
- Confirma que aparezcan 80 llamadas, TMO ponderado de 20.39s y 5 agentes aprobados.
- Verifica que el gráfico de barras muestre la línea de umbral en 20s.
- Revisa las 2 donas independientes (llamadas contestadas vs perdidas, y clasificación de agentes).

### Paso 7: Descargar el Reporte Excel Oficial
Ve al módulo **"5. Reportes & Descargas"** y haz clic en **"Descargar .XLSX"**.
Abre el archivo en Microsoft Excel para comprobar que contenga:
- Hoja 1: Datos Originales
- Hoja 2: Resumen por Agente (con Gráfico de Barras vertical nativo embebido)
- Hoja 3: Análisis Estadístico (con Gráfico de Dona nativo embebido)
- Hoja 4: Validación de IA

### Paso 8: Enviar Reporte por Correo
Ve al módulo **"8. Configurar Correos"**:
- Escribe el correo del destinatario.
- Haz clic en **"Enviar Reporte por Correo"**.
*Resultado:* El servidor SMTP responderá con estado `ACEPTADO_PROVEEDOR (250 2.0.0 OK)`.

### Paso 9: Comprobar Auditoría de n8n e Idempotencia
Ve al módulo **"9. Historial n8n"**:
- Haz clic en **"Disparar WF 1 (Reporte)"**.
- Si haces clic una segunda vez inmediata con la misma clave, el sistema responderá con `DUPLICADO_IGNORADO`, demostrando que no se duplican correos ni filas en base de datos.

---

## 6. Guía de Solución de Errores Frecuentes

| Síntoma o Error | Causa Probable | Solución Paso a Paso | Verificación |
| :--- | :--- | :--- | :--- |
| **`EADDRINUSE: port 4000`** | Otro proceso está ocupando el puerto 4000. | Ejecuta `netstat -ano \| findstr :4000` y elimina el proceso con `taskkill /F /PID <PID>` o cambia el puerto en `.env`. | Vuelve a ejecutar `npm run dev`. |
| **`535-5.7.8 Username and Password not accepted`** | La contraseña de Gmail no es una Contraseña de Aplicación de 16 caracteres. | Ve a tu cuenta de Google ➔ Seguridad ➔ Verificación en dos pasos ➔ Contraseñas de aplicaciones. Genera una nueva y actualiza `SMTP_PASS` en `.env`. | Ejecuta `node backend/scripts/test_gmail_smtp.js`. |
| **`openpyxl is not installed`** | Python no tiene la biblioteca de gráficos instalada. | Ejecuta `python -m pip install openpyxl` en la terminal. | Ejecuta `python -c "import openpyxl; print('OK')"`. |
| **`Execution policy blocks npm.ps1`** | Política de PowerShell en Windows restringe scripts. | Utiliza `npm.cmd` en lugar de `npm`, o ejecuta en PowerShell con permisos de administrador: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`. | `npm.cmd -v` debe devolver la versión instalada. |
| **`Supabase connection timeout`** | Credenciales no configuradas o firewall bloqueando puerto 5432. | La plataforma activa automáticamente su persistencia local en `database_local.json`, permitiendo operar sin cortes. | Comprueba que el API responda en `/api/health`. |

---

## 7. Mantenimiento y Buenas Prácticas

1. **Copias de Seguridad:** Realiza backups periódicos de la base de datos PostgreSQL mediante `pg_dump` o snapshots automáticos en Supabase.
2. **Renovación de Credenciales:** Si cambias la contraseña de Google, actualiza inmediatamente el `SMTP_PASS` en `backend/.env` y reinicia el servicio backend.
3. **Monitoreo de Logs:** Revisa periódicamente el módulo **"10. Gestión de Errores"** para identificar patrones atípicos de llamadas o fallos de red.

---

## 8. Lista de Comprobación Final (Checklist de Replicación)

- [x] Node.js 18+ y Python 3.9+ instalados en el sistema operativo.
- [x] Dependencias de Backend y Frontend instaladas (`npm install`).
- [x] Biblioteca `openpyxl` instalada en el entorno de Python.
- [x] Esquema SQL, políticas RLS y funciones almacenadas ejecutadas en la base de datos.
- [x] Archivo `backend/.env` configurado con credenciales SMTP y puertos.
- [x] Servidor Backend respondiendo en `http://localhost:4000/api/health`.
- [x] Frontend Web operativo en `http://localhost:5173`.
- [x] Carga y procesamiento exitoso del dataset de prueba (`call_center_dataset_demo.xlsx`).
- [x] Reporte Excel generado con las 4 hojas y gráficos nativos incluidos.
- [x] Envío de correo verificado mediante Gmail SMTP (`250 2.0.0 OK`).
- [x] Flujo Master de n8n importado y validado en la plataforma.
