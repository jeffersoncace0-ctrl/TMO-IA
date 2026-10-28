-- =============================================================================
-- FUNCIONES ALMACENADAS Y TRIGGERS DE POSTGRESQL / SUPABASE
-- Plataforma Inteligente de Análisis de Llamadas y TMO
-- =============================================================================

-- Trigger generador de actualización automática de timestamp
CREATE OR REPLACE FUNCTION actualizar_timestamp_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asignación de triggers
DROP TRIGGER IF EXISTS trg_actualizar_archivos ON archivos_cargados;
CREATE TRIGGER trg_actualizar_archivos
    BEFORE UPDATE ON archivos_cargados
    FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_modificacion();

DROP TRIGGER IF EXISTS trg_actualizar_resumen ON resumen_agentes;
CREATE TRIGGER trg_actualizar_resumen
    BEFORE UPDATE ON resumen_agentes
    FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_modificacion();

-- -----------------------------------------------------------------------------
-- FUNCIÓN: calcular_resumen_agentes
-- Agrupa las llamadas válidas por agente, calcula el TMO ponderado exacto,
-- el porcentaje de cumplimiento y aplica la regla determinista.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calcular_resumen_agentes(
    p_archivo_id UUID,
    p_umbral_segundos NUMERIC DEFAULT 20.00
)
RETURNS TABLE (
    agentes_procesados INTEGER,
    llamadas_totales INTEGER,
    tmo_global_ponderado NUMERIC
) AS $$
DECLARE
    v_total_agentes INTEGER := 0;
    v_total_llamadas INTEGER := 0;
    v_tmo_global NUMERIC := 0.00;
BEGIN
    -- Eliminar resumen previo del archivo para evitar inconsistencias si es reprocesamiento
    DELETE FROM resumen_agentes WHERE archivo_id = p_archivo_id;

    -- Insertar el resumen consolidado por agente
    INSERT INTO resumen_agentes (
        archivo_id,
        agente_id,
        codigo_agente,
        nombre_agente,
        total_llamadas,
        llamadas_contestadas,
        llamadas_perdidas,
        llamadas_validas,
        suma_tiempo_gestion_seg,
        tmo_promedio_seg,
        tiempo_promedio_conversacion_seg,
        tiempo_promedio_silencio_seg,
        porcentaje_cumplimiento,
        umbral_aplicado_seg,
        clasificacion_determinista
    )
    SELECT
        p_archivo_id,
        r.agente_id,
        r.codigo_agente_origen,
        COALESCE(MAX(r.nombre_agente_origen), MAX(a.nombre), r.codigo_agente_origen),
        COUNT(*)::INTEGER AS total_llamadas,
        COUNT(CASE WHEN r.estado_llamada = 'CONTESTADA' THEN 1 END)::INTEGER AS llamadas_contestadas,
        COUNT(CASE WHEN r.estado_llamada = 'PERDIDA' THEN 1 END)::INTEGER AS llamadas_perdidas,
        COUNT(CASE WHEN r.es_valido = true THEN 1 END)::INTEGER AS llamadas_validas,
        COALESCE(SUM(CASE WHEN r.es_valido = true THEN r.duracion_total_seg ELSE 0 END), 0) AS suma_tiempo_gestion_seg,
        
        -- TMO del Agente = Suma de tiempos válidos / Cantidad de gestiones válidas
        CASE 
            WHEN COUNT(CASE WHEN r.es_valido = true THEN 1 END) > 0 THEN
                ROUND(
                    SUM(CASE WHEN r.es_valido = true THEN r.duracion_total_seg ELSE 0 END) / 
                    COUNT(CASE WHEN r.es_valido = true THEN 1 END), 
                    2
                )
            ELSE 0.00
        END AS tmo_promedio_seg,
        
        -- Promedio de conversación
        CASE 
            WHEN COUNT(CASE WHEN r.es_valido = true THEN 1 END) > 0 THEN
                ROUND(
                    SUM(CASE WHEN r.es_valido = true THEN r.tiempo_conversacion_seg ELSE 0 END) / 
                    COUNT(CASE WHEN r.es_valido = true THEN 1 END), 
                    2
                )
            ELSE 0.00
        END AS tiempo_promedio_conversacion_seg,
        
        -- Promedio de silencio
        CASE 
            WHEN COUNT(CASE WHEN r.es_valido = true THEN 1 END) > 0 THEN
                ROUND(
                    SUM(CASE WHEN r.es_valido = true THEN r.tiempo_silencio_seg ELSE 0 END) / 
                    COUNT(CASE WHEN r.es_valido = true THEN 1 END), 
                    2
                )
            ELSE 0.00
        END AS tiempo_promedio_silencio_seg,
        
        -- % de Cumplimiento: llamadas válidas con duración <= umbral sobre el total de llamadas válidas
        CASE 
            WHEN COUNT(CASE WHEN r.es_valido = true THEN 1 END) > 0 THEN
                ROUND(
                    (COUNT(CASE WHEN r.es_valido = true AND r.duracion_total_seg <= p_umbral_segundos THEN 1 END)::NUMERIC / 
                     COUNT(CASE WHEN r.es_valido = true THEN 1 END)::NUMERIC) * 100.0,
                    2
                )
            ELSE 0.00
        END AS porcentaje_cumplimiento,
        
        p_umbral_segundos AS umbral_aplicado_seg,
        
        -- Clasificación determinista obligatoria
        CASE
            WHEN COUNT(CASE WHEN r.es_valido = true THEN 1 END) = 0 THEN 'ERROR_DATOS'
            WHEN (SUM(CASE WHEN r.es_valido = true THEN r.duracion_total_seg ELSE 0 END) / 
                  COUNT(CASE WHEN r.es_valido = true THEN 1 END)) <= p_umbral_segundos THEN 'APROBADO'
            ELSE 'REQUIERE_REVISION'
        END AS clasificacion_determinista

    FROM registros_llamadas r
    LEFT JOIN agentes a ON r.agente_id = a.id
    WHERE r.archivo_id = p_archivo_id
    GROUP BY r.agente_id, r.codigo_agente_origen;

    -- Obtener métricas calculadas
    SELECT COUNT(*), COALESCE(SUM(total_llamadas), 0)
    INTO v_total_agentes, v_total_llamadas
    FROM resumen_agentes
    WHERE archivo_id = p_archivo_id;

    -- Calcular TMO global ponderado
    SELECT 
        CASE 
            WHEN SUM(llamadas_validas) > 0 THEN 
                ROUND(SUM(suma_tiempo_gestion_seg) / SUM(llamadas_validas), 2)
            ELSE 0.00 
        END
    INTO v_tmo_global
    FROM resumen_agentes
    WHERE archivo_id = p_archivo_id;

    -- Actualizar estado del archivo cargado a PROCESADO
    UPDATE archivos_cargados
    SET estado = 'PROCESADO',
        total_filas = v_total_llamadas,
        actualizado_en = NOW()
    WHERE id = p_archivo_id;

    RETURN QUERY SELECT v_total_agentes, v_total_llamadas, v_tmo_global;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- FUNCIÓN: verificar_o_crear_ejecucion_idempotente
-- Evita ejecuciones duplicadas atómicamente retornando si se debe continuar
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verificar_o_crear_ejecucion_idempotente(
    p_clave_idempotencia VARCHAR,
    p_nombre_workflow VARCHAR,
    p_archivo_id UUID,
    p_payload JSONB
)
RETURNS TABLE (
    permitir_ejecucion BOOLEAN,
    mensaje_estado VARCHAR,
    id_registro UUID
) AS $$
DECLARE
    v_ejecucion RECORD;
    v_nuevo_id UUID;
BEGIN
    SELECT * INTO v_ejecucion 
    FROM n8n_ejecuciones 
    WHERE clave_idempotencia = p_clave_idempotencia;

    IF FOUND THEN
        IF v_ejecucion.estado IN ('EN_PROCESO', 'COMPLETADO') THEN
            -- Ya fue procesado o está en proceso: no duplicar
            RETURN QUERY SELECT false, 'DUPLICADO_IGNORADO'::VARCHAR, v_ejecucion.id;
            RETURN;
        ELSE
            -- Si había fallado o estaba pendiente, incrementamos intentos y permitimos
            UPDATE n8n_ejecuciones 
            SET intentos = intentos + 1, 
                estado = 'EN_PROCESO', 
                iniciado_en = NOW()
            WHERE id = v_ejecucion.id;
            
            RETURN QUERY SELECT true, 'REINTENTO_PERMITIDO'::VARCHAR, v_ejecucion.id;
            RETURN;
        END IF;
    END IF;

    -- Primera vez que se recibe esta clave
    INSERT INTO n8n_ejecuciones (
        clave_idempotencia,
        nombre_workflow,
        archivo_id,
        estado,
        payload_entrada
    )
    VALUES (
        p_clave_idempotencia,
        p_nombre_workflow,
        p_archivo_id,
        'EN_PROCESO',
        p_payload
    )
    RETURNING id INTO v_nuevo_id;

    RETURN QUERY SELECT true, 'NUEVA_EJECUCION'::VARCHAR, v_nuevo_id;
END;
$$ LANGUAGE plpgsql;
