import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  RotateCw, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert,
  Code
} from 'lucide-react';
import { api } from '../services/api';

export const ErrorManagementPage: React.FC = () => {
  const [errors, setErrors] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const res = await api.getErrors();
      if (res.success) {
        setErrors(res.errors || []);
      }
    } catch (err) {
      console.error('Error cargando auditoría de errores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, []);

  const handleAction = async (errorId: string, action: 'resolve' | 'retry') => {
    try {
      setActionLoading(errorId);
      const res = await api.resolveError(errorId, action);
      if (res.success) {
        fetchErrors();
      }
    } catch (err) {
      console.error('Error en acción:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICA':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'ALTA':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MEDIA':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gestión de Errores & Auditoría Operativa</h2>
          <p className="text-sm text-slate-500 mt-1">
            Supervisión continua de excepciones, fallos de lectura, desconexiones y mecanismos de recuperación automática.
          </p>
        </div>

        <button
          onClick={fetchErrors}
          disabled={loading}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Errores</span>
        </button>
      </div>

      {/* Lista de Errores */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Excepciones Registradas ({errors.length})
          </span>
          <span className="text-xs text-slate-400">
            Pendientes: {errors.filter(e => !e.resuelto).length}
          </span>
        </div>

        {errors.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700">Sin errores registrados en el sistema.</p>
            <p className="text-slate-400 mt-1">Todas las integraciones y procesamientos operan con normalidad.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {errors.map((err) => {
              const isExpanded = expandedId === err.id;
              const isResolved = err.resuelto;

              return (
                <div key={err.id} className="p-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg border text-xs font-bold shrink-0 ${getSeverityBadge(err.gravedad)}`}>
                        {err.gravedad}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold font-mono text-slate-900">{err.codigo_error}</h4>
                          <span className="text-[10px] text-slate-400">Origen: {err.origen}</span>
                        </div>
                        <p className="text-xs text-slate-700 mt-0.5">{err.mensaje}</p>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Registrado: {new Date(err.creado_en).toLocaleString('es-ES')} • Reintentos: {err.reintentos_realizados || 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        onClick={() => handleAction(err.id, 'retry')}
                        disabled={actionLoading === err.id || isResolved}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1 font-medium transition-colors disabled:opacity-50"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Reintentar</span>
                      </button>

                      <button
                        onClick={() => handleAction(err.id, 'resolve')}
                        disabled={actionLoading === err.id || isResolved}
                        className={`text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1 font-semibold transition-colors ${
                          isResolved
                            ? 'bg-emerald-50 text-emerald-700 cursor-default'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isResolved ? 'Resuelto' : 'Resolver'}</span>
                      </button>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : err.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Detalles Técnicos Desplegables */}
                  {isExpanded && err.detalles_tecnicos && (
                    <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-lg text-[10px] font-mono overflow-x-auto">
                      <div className="flex items-center gap-1 text-slate-400 mb-1">
                        <Code className="w-3 h-3" />
                        <span>Stack Trace / Detalles de Diagnóstico</span>
                      </div>
                      <pre className="whitespace-pre-wrap">{err.detalles_tecnicos}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
