import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  BarChart3, 
  Calendar, 
  FileCheck, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { api } from '../services/api';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.getReports();
      if (res.success) {
        setReports(res.reports || []);
      }
    } catch (err) {
      console.error('Error cargando reportes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reportes Generados & Descargas</h2>
          <p className="text-sm text-slate-500 mt-1">
            Descargue libros oficiales en Excel (.xlsx) estructurados en 4 hojas con gráficos de barras y de dona integrados.
          </p>
        </div>

        <button
          onClick={fetchReports}
          disabled={loading}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Lista</span>
        </button>
      </div>

      {/* Explicación de las 4 Hojas y Gráficos */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md">
        <h3 className="text-base font-bold mb-3 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-emerald-400" />
          <span>Estructura Oficial del Libro Excel Exportado</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-blue-100">
          <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
            <strong className="block text-white font-semibold text-sm mb-1">Hoja 1: Datos Originales</strong>
            <p className="opacity-90 leading-relaxed">
              Registros crudos importados con trazabilidad de llamada, tiempos individuales y auditoría de validez.
            </p>
          </div>

          <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
            <strong className="block text-white font-semibold text-sm mb-1">Hoja 2: Resumen de Agentes</strong>
            <p className="opacity-90 leading-relaxed">
              Consolidado de TMO por agente, % de cumplimiento y clasificación con <strong>Gráfico de Barras vertical nativo</strong> integrado.
            </p>
          </div>

          <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
            <strong className="block text-white font-semibold text-sm mb-1">Hoja 3: Análisis Estadístico</strong>
            <p className="opacity-90 leading-relaxed">
              KPIs globales ponderados y tabla de estados con <strong>Gráfico de Dona nativo</strong> de contestadas vs perdidas.
            </p>
          </div>

          <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
            <strong className="block text-white font-semibold text-sm mb-1">Hoja 4: Validación de IA</strong>
            <p className="opacity-90 leading-relaxed">
              Explicabilidad causal del cumplimiento, detección de anomalías contextuales y recomendaciones operativas.
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Reportes Disponibles */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Historial de Reportes Exportados</span>
          <span className="text-xs text-slate-400">{reports.length} reportes disponibles</span>
        </div>

        {reports.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30 text-blue-600" />
            <p>Aún no se ha generado ningún reporte Excel.</p>
            <p className="text-xs text-slate-400 mt-1">Cargue y procese un archivo en la sección "Carga de Excel" para generar reportes automáticos.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((rep) => (
              <div key={rep.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{rep.nombre_reporte}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(rep.creado_en).toLocaleString('es-ES')}
                      </span>
                      <span>•</span>
                      <span>{rep.tamano_bytes ? (rep.tamano_bytes / 1024).toFixed(1) : 0} KB</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-semibold">
                        <BarChart3 className="w-3 h-3" />
                        {rep.graficos_incluidos ? 'Gráficos Nativo (Barras + Dona)' : 'Tablas Estilizadas'}
                      </span>
                      <span>•</span>
                      <span className="text-blue-700 font-medium">4 Hojas</span>
                    </div>
                  </div>
                </div>

                <a
                  href={api.getDownloadReportUrl(rep.id)}
                  download
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors self-start sm:self-center"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar .XLSX</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
