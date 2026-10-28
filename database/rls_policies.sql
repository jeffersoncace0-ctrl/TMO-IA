-- =============================================================================
-- POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (ROW LEVEL SECURITY - RLS)
-- Configuración de Supabase para Plataforma de Análisis de Llamadas y TMO
-- =============================================================================

-- 1. Habilitar RLS en todas las tablas sensibles
ALTER TABLE perfiles_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_umbral ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivos_cargados ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_llamadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumen_agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE validaciones_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_generados ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_correo ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_notificaciones_correo ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_ejecuciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_errores ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Regla general para el rol de servicio (Backend y n8n via Service Role Key)
-- Permite lectura y escritura irrestricta a procesos autorizados de backend
-- -----------------------------------------------------------------------------
CREATE POLICY "service_role_acceso_total_perfiles" ON perfiles_usuarios FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_acceso_total_umbral" ON configuracion_umbral FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_acceso_total_archivos" ON archivos_cargados FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_acceso_total_agentes" ON agentes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_acceso_total_llamadas" ON registros_llamadas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_acceso_total_resumen" ON resumen_agentes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_acceso_total_ia" ON validaciones_ia FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_acceso_total_reportes" ON reportes_generados FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_acceso_total_correo_cfg" ON configuracion_correo FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_acceso_total_correo_hist" ON historial_notificaciones_correo FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_acceso_total_n8n" ON n8n_ejecuciones FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_acceso_total_errores" ON auditoria_errores FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Políticas para Usuarios Autenticados (Frontend)
-- -----------------------------------------------------------------------------

-- Lectura de usuarios y perfiles
CREATE POLICY "usuarios_lectura_autenticados" ON perfiles_usuarios
    FOR SELECT TO authenticated USING (true);

-- Umbrales: lectura para todos los autenticados; modificación solo para administradores
CREATE POLICY "umbral_lectura_autenticados" ON configuracion_umbral
    FOR SELECT TO authenticated USING (activo = true);

CREATE POLICY "umbral_modificacion_admin" ON configuracion_umbral
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM perfiles_usuarios 
            WHERE perfiles_usuarios.id = auth.uid() AND perfiles_usuarios.rol = 'admin'
        )
    );

-- Archivos cargados: lectura general para análisis
CREATE POLICY "archivos_lectura_autenticados" ON archivos_cargados
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "archivos_insercion_autenticados" ON archivos_cargados
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = cargado_por);

-- Agentes y registros de llamadas: lectura general para visualización del dashboard
CREATE POLICY "agentes_lectura_autenticados" ON agentes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "llamadas_lectura_autenticados" ON registros_llamadas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "resumen_lectura_autenticados" ON resumen_agentes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ia_lectura_autenticados" ON validaciones_ia
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "reportes_lectura_autenticados" ON reportes_generados
    FOR SELECT TO authenticated USING (true);

-- Correo: configuración visible solo para administradores y supervisores
CREATE POLICY "correo_cfg_admin_supervisor" ON configuracion_correo
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM perfiles_usuarios 
            WHERE perfiles_usuarios.id = auth.uid() AND perfiles_usuarios.rol IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "correo_historial_lectura" ON historial_notificaciones_correo
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "n8n_ejecuciones_lectura" ON n8n_ejecuciones
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "errores_lectura_autenticados" ON auditoria_errores
    FOR SELECT TO authenticated USING (true);
