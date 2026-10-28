-- =============================================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS: PLATAFORMA DE ANÁLISIS DE LLAMADAS Y TMO
-- Sistema PostgreSQL / Supabase con RLS, Índices, Restricciones y Auditoría
-- =============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TABLA: perfiles_usuarios (Usuarios de la plataforma)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfiles_usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'analista' CHECK (rol IN ('admin', 'supervisor', 'analista')),
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. TABLA: configuracion_umbral (Configuración del límite de TMO)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion_umbral (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbral_segundos NUMERIC(10,2) NOT NULL DEFAULT 20.00 CHECK (umbral_segundos > 0),
    descripcion VARCHAR(255) DEFAULT 'Umbral estándar de TMO (segundos)',
    activo BOOLEAN NOT NULL DEFAULT true,
    actualizado_por UUID REFERENCES perfiles_usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserción inicial de umbral predeterminado (20 segundos)
INSERT INTO configuracion_umbral (umbral_segundos, descripcion, activo)
VALUES (20.00, 'Umbral predeterminado de TMO: 20 segundos', true)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. TABLA: archivos_cargados (Historial de Excels importados)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS archivos_cargados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_archivo VARCHAR(255) NOT NULL,
    hash_sha256 VARCHAR(64) NOT NULL,
    tamano_bytes BIGINT NOT NULL CHECK (tamano_bytes > 0),
    tipo_mime VARCHAR(100) NOT NULL,
    ruta_almacenamiento VARCHAR(500) NOT NULL,
    nombre_hoja_seleccionada VARCHAR(100),
    total_filas INTEGER DEFAULT 0,
    filas_validas INTEGER DEFAULT 0,
    filas_invalidas INTEGER DEFAULT 0,
    filas_duplicadas INTEGER DEFAULT 0,
    estado VARCHAR(50) NOT NULL DEFAULT 'CARGADO' 
        CHECK (estado IN ('CARGADO', 'PREVISUALIZADO', 'PROCESANDO', 'PROCESADO', 'ERROR', 'CANCELADO')),
    mapeo_columnas JSONB,
    cargado_por UUID REFERENCES perfiles_usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archivos_hash ON archivos_cargados(hash_sha256);
CREATE INDEX IF NOT EXISTS idx_archivos_estado ON archivos_cargados(estado);

-- -----------------------------------------------------------------------------
-- 4. TABLA: agentes (Catálogo de agentes de Call Center)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_agente VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    departamento VARCHAR(150) DEFAULT 'Atención al Cliente',
    email VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agentes_codigo ON agentes(codigo_agente);

-- -----------------------------------------------------------------------------
-- 5. TABLA: registros_llamadas (Detalle llamada por llamada con datos crudos y validados)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros_llamadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    archivo_id UUID NOT NULL REFERENCES archivos_cargados(id) ON DELETE CASCADE,
    agente_id UUID REFERENCES agentes(id) ON DELETE SET NULL,
    codigo_agente_origen VARCHAR(100) NOT NULL,
    nombre_agente_origen VARCHAR(255),
    identificador_llamada VARCHAR(150),
    fecha_llamada TIMESTAMP WITH TIME ZONE,
    tipo_llamada VARCHAR(50) DEFAULT 'ENTRANTE' CHECK (tipo_llamada IN ('ENTRANTE', 'SALIENTE', 'INTERNA', 'DESCONOCIDO')),
    estado_llamada VARCHAR(50) DEFAULT 'CONTESTADA' CHECK (estado_llamada IN ('CONTESTADA', 'PERDIDA', 'OCUPADA', 'NO_CONTESTADA', 'DESCONOCIDO')),
    
    -- Tiempos en segundos
    tiempo_conversacion_seg NUMERIC(10,2) DEFAULT 0 CHECK (tiempo_conversacion_seg >= 0),
    tiempo_espera_seg NUMERIC(10,2) DEFAULT 0 CHECK (tiempo_espera_seg >= 0),
    tiempo_post_llamada_seg NUMERIC(10,2) DEFAULT 0 CHECK (tiempo_post_llamada_seg >= 0),
    tiempo_silencio_seg NUMERIC(10,2) DEFAULT 0 CHECK (tiempo_silencio_seg >= 0),
    duracion_total_seg NUMERIC(10,2) NOT NULL CHECK (duracion_total_seg >= 0),
    
    -- Control de calidad del registro
    es_valido BOOLEAN NOT NULL DEFAULT true,
    es_duplicado BOOLEAN NOT NULL DEFAULT false,
    errores_validacion TEXT[],
    datos_crudos_json JSONB,
    
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llamadas_archivo ON registros_llamadas(archivo_id);
CREATE INDEX IF NOT EXISTS idx_llamadas_agente ON registros_llamadas(agente_id);
CREATE INDEX IF NOT EXISTS idx_llamadas_fecha ON registros_llamadas(fecha_llamada);
CREATE INDEX IF NOT EXISTS idx_llamadas_es_valido ON registros_llamadas(es_valido);

-- -----------------------------------------------------------------------------
-- 6. TABLA: resumen_agentes (Métricas calculadas y consolidadas por agente por archivo)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resumen_agentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    archivo_id UUID NOT NULL REFERENCES archivos_cargados(id) ON DELETE CASCADE,
    agente_id UUID NOT NULL REFERENCES agentes(id) ON DELETE RESTRICT,
    codigo_agente VARCHAR(100) NOT NULL,
    nombre_agente VARCHAR(255) NOT NULL,
    
    total_llamadas INTEGER NOT NULL DEFAULT 0 CHECK (total_llamadas >= 0),
    llamadas_contestadas INTEGER NOT NULL DEFAULT 0 CHECK (llamadas_contestadas >= 0),
    llamadas_perdidas INTEGER NOT NULL DEFAULT 0 CHECK (llamadas_perdidas >= 0),
    llamadas_validas INTEGER NOT NULL DEFAULT 0 CHECK (llamadas_validas >= 0),
    
    suma_tiempo_gestion_seg NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (suma_tiempo_gestion_seg >= 0),
    tmo_promedio_seg NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (tmo_promedio_seg >= 0),
    tiempo_promedio_conversacion_seg NUMERIC(10,2) DEFAULT 0.00,
    tiempo_promedio_silencio_seg NUMERIC(10,2) DEFAULT 0.00,
    porcentaje_cumplimiento NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (porcentaje_cumplimiento BETWEEN 0 AND 100),
    
    umbral_aplicado_seg NUMERIC(10,2) NOT NULL,
    clasificacion_determinista VARCHAR(50) NOT NULL CHECK (clasificacion_determinista IN ('APROBADO', 'REQUIERE_REVISION', 'ERROR_DATOS')),
    
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT uq_archivo_agente UNIQUE (archivo_id, agente_id)
);

CREATE INDEX IF NOT EXISTS idx_resumen_archivo ON resumen_agentes(archivo_id);
CREATE INDEX IF NOT EXISTS idx_resumen_clasificacion ON resumen_agentes(clasificacion_determinista);

-- -----------------------------------------------------------------------------
-- 7. TABLA: validaciones_ia (Resultados de auditoría inteligente y recomendaciones)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS validaciones_ia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resumen_agente_id UUID REFERENCES resumen_agentes(id) ON DELETE CASCADE,
    archivo_id UUID NOT NULL REFERENCES archivos_cargados(id) ON DELETE CASCADE,
    agente_id UUID NOT NULL REFERENCES agentes(id) ON DELETE RESTRICT,
    
    tmo_evaluado_seg NUMERIC(10,2) NOT NULL,
    umbral_aplicado_seg NUMERIC(10,2) NOT NULL,
    resultado_regla VARCHAR(50) NOT NULL,
    resultado_ia VARCHAR(50) NOT NULL CHECK (resultado_ia IN ('CONFIRMA_APROBADO', 'CONFIRMA_REVISION', 'OBSERVACION_ANOMALIA', 'PENDIENTE_REVISION')),
    
    anomalia_detectada BOOLEAN NOT NULL DEFAULT false,
    tipo_anomalia VARCHAR(100),
    motivo_clasificacion TEXT NOT NULL,
    recomendacion_operativa TEXT NOT NULL,
    es_outlier_estadistico BOOLEAN DEFAULT false,
    puntaje_z NUMERIC(8,3),
    
    modelo_utilizado VARCHAR(100) DEFAULT 'gemini-1.5-pro',
    tokens_utilizados INTEGER DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validaciones_archivo ON validaciones_ia(archivo_id);
CREATE INDEX IF NOT EXISTS idx_validaciones_anomalia ON validaciones_ia(anomalia_detectada);

-- -----------------------------------------------------------------------------
-- 8. TABLA: reportes_generados (Libros Excel de 4 hojas con gráficos generados)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reportes_generados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    archivo_id UUID NOT NULL REFERENCES archivos_cargados(id) ON DELETE CASCADE,
    nombre_reporte VARCHAR(255) NOT NULL,
    ruta_almacenamiento VARCHAR(500) NOT NULL,
    tamano_bytes BIGINT NOT NULL CHECK (tamano_bytes > 0),
    graficos_incluidos BOOLEAN NOT NULL DEFAULT true,
    total_hojas INTEGER NOT NULL DEFAULT 4,
    contador_descargas INTEGER DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. TABLA: configuracion_correo (Configuración de servicio SMTP o API)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion_correo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_smtp VARCHAR(255) NOT NULL,
    puerto_smtp INTEGER NOT NULL DEFAULT 587,
    usuario_smtp VARCHAR(255) NOT NULL,
    contrasena_encriptada TEXT NOT NULL,
    requiere_tls BOOLEAN NOT NULL DEFAULT true,
    remitente_nombre VARCHAR(150) NOT NULL DEFAULT 'Call Center Analytics',
    remitente_email VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. TABLA: historial_notificaciones_correo (Trazabilidad detallada de emails)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historial_notificaciones_correo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    archivo_id UUID REFERENCES archivos_cargados(id) ON DELETE SET NULL,
    reporte_id UUID REFERENCES reportes_generados(id) ON DELETE SET NULL,
    destinatario VARCHAR(255) NOT NULL,
    destinatarios_cc TEXT[],
    asunto VARCHAR(255) NOT NULL,
    cuerpo_mensaje TEXT,
    adjunto_nombre VARCHAR(255),
    estado_envio VARCHAR(50) NOT NULL DEFAULT 'ACEPTADO_PROVEEDOR'
        CHECK (estado_envio IN ('PENDIENTE', 'ACEPTADO_PROVEEDOR', 'ENTREGADO', 'RECHAZADO', 'ERROR')),
    id_mensaje_proveedor VARCHAR(255),
    respuesta_servidor TEXT,
    mensaje_error TEXT,
    fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correo_destinatario ON historial_notificaciones_correo(destinatario);
CREATE INDEX IF NOT EXISTS idx_correo_estado ON historial_notificaciones_correo(estado_envio);

-- -----------------------------------------------------------------------------
-- 11. TABLA: n8n_ejecuciones (Registro y control de idempotencia de flujos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS n8n_ejecuciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clave_idempotencia VARCHAR(128) UNIQUE NOT NULL,
    nombre_workflow VARCHAR(150) NOT NULL,
    id_ejecucion_n8n VARCHAR(100),
    archivo_id UUID REFERENCES archivos_cargados(id) ON DELETE SET NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'FALLIDO', 'IGNORADO_DUPLICADO')),
    intentos INTEGER NOT NULL DEFAULT 1,
    payload_entrada JSONB,
    resultado_salida JSONB,
    mensaje_error TEXT,
    iniciado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalizado_en TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_n8n_idempotencia ON n8n_ejecuciones(clave_idempotencia);
CREATE INDEX IF NOT EXISTS idx_n8n_estado ON n8n_ejecuciones(estado);

-- -----------------------------------------------------------------------------
-- 12. TABLA: auditoria_errores (Registro global de anomalías, fallos y reintentos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria_errores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ejecucion_n8n_id UUID REFERENCES n8n_ejecuciones(id) ON DELETE SET NULL,
    archivo_id UUID REFERENCES archivos_cargados(id) ON DELETE SET NULL,
    codigo_error VARCHAR(100) NOT NULL,
    origen VARCHAR(100) NOT NULL,
    gravedad VARCHAR(50) NOT NULL DEFAULT 'MEDIA' CHECK (gravedad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    mensaje TEXT NOT NULL,
    detalles_tecnicos TEXT,
    reintentos_realizados INTEGER DEFAULT 0,
    maximo_reintentos INTEGER DEFAULT 3,
    resuelto BOOLEAN NOT NULL DEFAULT false,
    resuelto_en TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_errores_codigo ON auditoria_errores(codigo_error);
CREATE INDEX IF NOT EXISTS idx_errores_resuelto ON auditoria_errores(resuelto);
