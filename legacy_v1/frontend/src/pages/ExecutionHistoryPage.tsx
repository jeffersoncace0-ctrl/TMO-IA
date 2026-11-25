import React, { useState, useEffect } from 'react';
import { 
  History, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Play, 
  RotateCw, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { api } from '../services/api';

interface ExecutionHistoryPageProps {
  selectedFileId?: string;
  currentThreshold: number;
}

export const ExecutionHistoryPage: React.FC<ExecutionHistoryPageProps> = ({
  selectedFileId,
  currentThreshold
}) => {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggeringWF, setTriggeringWF] = useState<'wf1' | 'wf2' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchExecutions = async () => {
    try {
      setLoading(true);
      const res = await api.getExecutions();
      if (res.success) {
        setExecutions(res.executions || []);
      }
    } catch (err) {
      console.error('Error cargando ejecuciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, []);

  const handleTriggerWF1 = async () => {
    try {
      setTriggeringWF('wf1');
      setFeedback(null);
      const res = await api.triggerWorkflow1({
        fileId: selectedFileId || 'archivo_demo',
        recipientEmail: 'supervisor@callcenter.com',
        threshold: currentThreshold
      });
      if (res.success) {
        setFeedback('Workflow 1 ejecutado con éxito. Clave de idempotencia verificada.');
        fetchExecutions();
      }
    } catch (err: any) {
      setFeedback('Error al disparar Workflow 1: ' + err.message);
    } finally {
      setTriggeringWF(null);
    }
  };

  const handleTriggerWF2 = async () => {
    try {
      setTriggeringWF('wf2');
      setFeedback(null);
      const res = await api.triggerWorkflow2({
        fileId: selectedFileId || 'archivo_demo',
        threshold: currentThreshold
      });
      if (res.success) {
        setFeedback('Workflow 2 (Validación IA) ejecutado con éxito.');
        fetchExecutions();
      }
    } catch (err: any) {
      setFeedback('Error al disparar Workflow 2: ' + err.message);
    } finally {
      setTriggeringWF(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Historial de Ejecuciones & Idempotencia</h2>
          <p className="text-sm text-slate-500 mt-1">
            Trazabilidad de ejecuciones de los flujos de n8n con garantía de no duplicación accidental por reintentos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerWF1}
            disabled={triggeringWF !== null}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {triggeringWF === 'wf1' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Disparar WF 1 (Reporte)</span>
          </button>

          <button
            onClick={handleTriggerWF2}
            disabled={triggeringWF !== null}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {triggeringWF === 'wf2' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Disparar WF 2 (Revisión IA)</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabla de Ejecuciones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Registro de Ejecuciones n8n</span>
          <button
            onClick={fetchExecutions}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
              <tr>
                <th className="p-3">Workflow</th>
                <th className="p-3">Clave de Idempotencia</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Intentos</th>
                <th className="p-3">Iniciado En</th>
                <th className="p-3">ID n8n</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 font-sans">
                    No se registran ejecuciones automáticas aún. Dispare un flujo para iniciar la trazabilidad.
                  </td>
                </tr>
              ) : (
                executions.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="p-3 font-sans font-semibold text-slate-900">{e.nombre_workflow || e.workflowName}</td>
                    <td className="p-3 text-[10px] text-slate-500 truncate max-w-[180px]">
                      {e.clave_idempotencia || e.idempotencyKey}
                    </td>
                    <td className="p-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (e.estado || e.status) === 'COMPLETADO'
                          ? 'bg-emerald-50 text-emerald-700'
                          : ((e.estado || e.status) === 'IGNORADO_DUPLICADO' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700')
                      }`}>
                        {e.estado || e.status}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">{e.intentos || 1}</td>
                    <td className="p-3 font-sans text-slate-500">
                      {new Date(e.iniciado_en || e.startedAt).toLocaleString('es-ES')}
                    </td>
                    <td className="p-3 text-[10px] text-slate-400">
                      {e.id_ejecucion_n8n || e.executionId || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
