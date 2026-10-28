# Guía de Configuración de Supabase (PostgreSQL, Auth & Storage)

Esta guía detalla los pasos exactos para configurar la base de datos PostgreSQL, las políticas de seguridad (RLS) y los buckets de almacenamiento en Supabase.

---

## 1. Creación del Proyecto en Supabase

1. Inicia sesión en [Supabase](https://supabase.com/).
2. Haz clic en **New Project**.
3. Asigna un nombre al proyecto (ej. `call-center-tmo-platform`).
4. Selecciona tu región geográfica preferida y define una contraseña segura para la base de datos.
5. Copia la URL del proyecto (`SUPABASE_URL`), la clave pública anónima (`SUPABASE_ANON_KEY`) y la clave de rol de servicio (`SUPABASE_SERVICE_ROLE_KEY`) desde **Project Settings** -> **API**.

---

## 2. Ejecución del Esquema y Migraciones SQL

Abre el **SQL Editor** en el panel de Supabase y ejecuta los archivos en el siguiente orden secuencial:

### Paso 2.1: Crear Tablas e Índices
Ejecuta el contenido íntegro de [`database/schema.sql`](file:///C:/Users/Fabrica%20de%20cultura/.gemini/antigravity/scratch/call-center-tmo-platform/database/schema.sql):
- Habilita las extensiones `uuid-ossp` y `pgcrypto`.
- Crea las 12 tablas relacionales con sus claves foráneas, restricciones `CHECK`, índices optimizados y tipos de datos normalizados.

### Paso 2.2: Configurar Políticas de Seguridad RLS
Ejecuta el archivo [`database/rls_policies.sql`](file:///C:/Users/Fabrica%20de%20cultura/.gemini/antigravity/scratch/call-center-tmo-platform/database/rls_policies.sql):
- Habilita Row Level Security en todas las tablas sensibles.
- Configura las políticas de acceso para usuarios autenticados según su rol (`admin`, `supervisor`, `analista`).
- Permite el acceso total seguro para el `service_role` (Backend API y n8n).

### Paso 2.3: Instalar Funciones Almacenadas y Triggers
Ejecuta el archivo [`database/functions.sql`](file:///C:/Users/Fabrica%20de%20cultura/.gemini/antigravity/scratch/call-center-tmo-platform/database/functions.sql):
- Instala la función `calcular_resumen_agentes` para agregaciones atómicas y ponderación matemática estricta.
- Instala la función `verificar_o_crear_ejecucion_idempotente` para prevenir ejecuciones y envíos duplicados por reintentos accidentales.
- Configura los triggers de actualización automática de timestamps.

---

## 3. Configuración de Almacenamiento (Supabase Storage)

En la sección **Storage** de Supabase:

1. Crea un bucket privado llamado: `raw-excels`
   - **Public bucket:** Desactivado (Privado).
   - **Allowed MIME types:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`.
   - **File size limit:** 50 MB.
2. Crea un bucket privado llamado: `processed-reports`
   - **Public bucket:** Desactivado (Privado).
   - **Allowed MIME types:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
   - **File size limit:** 50 MB.

---

## 4. Variables de Entorno en el Backend

Actualiza el archivo `.env` en la carpeta `backend/` con las credenciales de tu proyecto Supabase:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role-secreta
SUPABASE_ANON_KEY=tu-clave-anonima-publica
SUPABASE_STORAGE_BUCKET_RAW=raw-excels
SUPABASE_STORAGE_BUCKET_REPORTS=processed-reports
DATABASE_URL=postgresql://postgres:[TU_PASSWORD]@db.tu-proyecto.supabase.co:5432/postgres
```
