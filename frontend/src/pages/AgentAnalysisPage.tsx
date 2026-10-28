import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  VolumeX, 
  Sparkles,
  PhoneCall,
  ChevronRight,
  X
} from 'lucide-react';
import { api } from '../services/api';

interface AgentAnalysisPageProps {
  currentThreshold: number;
  selectedFileId?: string;
}

export const AgentAnalysisPage: React.FC<AgentAnalysisPageProps> = ({
  currentThreshold,
  selectedFileId
}) => {
  const [agents, setAgents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [agentCalls, setAgentCalls] = useState<any[]>([]);
  const [agentAI, setAgentAI] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const res = await api.getAgents(selectedFileId);
        if (res.success) {
          setAgents(res.agents);
        }
      } catch (err) {
        console.error('Error cargando agentes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [selectedFileId]);

  const handleSelectAgent = async (ag: any) => {
    setSelectedAgent(ag);
    try {
      const res = await api.getAgentDetails(ag.codigo_agente || ag.agentCode, selectedFileId);
      if (res.success) {
        setAgentCalls(res.calls || []);
        setAgentAI(res.aiValidation || null);
      }
    } catch (err) {
      console.error('Error cargando detalle del agente:', err);
    }
  };

  const filteredAgents = agents.filter(a => {
    const name = (a.nombre_agente || a.agentName || '').toLowerCase();
    const code = (a.codigo_agente || a.agentCode || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Análisis Consolidado por Agente</h2>
          <p className="text-sm text-slate-500 mt-1">
            Evaluación individualizada del TMO, índice de cumplimiento del umbral de {currentThreshold}s y detección de anomalías.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por agente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grid de Tarjetas de Agentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
            Cargando agentes...
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
            No hay agentes registrados en el archivo seleccionado. Cargue un archivo Excel para ver resultados.
          </div>
        ) : (
          filteredAgents.map((ag) => {
            const tmo = ag.tmo_promedio_seg || ag.ahtTmoSeconds || 0;
            const clasif = ag.clasificacion_determinista || ag.classification || 'REQUIERE_REVISION';
            const isApproved = clasif === 'APROBADO';
            const isOutlier = ag.isStatisticalOutlier || (ag.zScore && ag.zScore > 2);

            return (
              <div
                key={ag.id || ag.codigo_agente || ag.agentCode}
                onClick={() => handleSelectAgent(ag)}
                className={`bg-white rounded-xl p-5 border transition-all cursor-pointer hover:shadow-md ${
                  selectedAgent?.codigo_agente === (ag.codigo_agente || ag.agentCode)
                    ? 'border-blue-500 ring-2 ring-blue-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{ag.nombre_agente || ag.agentName}</h3>
                    <span className="text-xs text-slate-400 font-mono">{ag.codigo_agente || ag.agentCode}</span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    isApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {clasif}
                  </span>
                </div>

                {/* Métricas clave */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block uppercase">TMO</span>
                    <strong className={`text-sm ${isApproved ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tmo}s
                    </strong>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block uppercase">Llamadas</span>
                    <strong className="text-sm text-slate-800">{ag.total_llamadas || ag.totalCalls}</strong>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block uppercase">Cumple</span>
                    <strong className="text-sm text-slate-800">{ag.porcentaje_cumplimiento || ag.complianceRate}%</strong>
                  </div>
                </div>

                {/* Alerta de Outlier si aplica */}
                {isOutlier && (
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Outlier estadístico crítico (Z-score: {ag.zScore})</span>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-xs text-blue-600 font-medium">
                  <span>Ver detalle y revisión IA</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal / Panel Lateral de Detalle del Agente */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedAgent.nombre_agente || selectedAgent.agentName}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Código: {selectedAgent.codigo_agente || selectedAgent.agentCode}
                </span>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen de IA para este agente */}
            {agentAI && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Diagnóstico del Asistente de IA: {agentAI.aiClassification || 'CONFIRMADO'}</span>
                </div>
                <p className="text-indigo-800 leading-relaxed">
                  {agentAI.classificationReason || agentAI.motivo_clasificacion}
                </p>
                <div className="pt-2 border-t border-indigo-200/60 font-medium text-indigo-950">
                  <strong>Recomendación Operativa:</strong> {agentAI.operationalRecommendation || agentAI.recomendacion_operativa}
                </div>
              </div>
            )}

            {/* Últimas llamadas del agente */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Llamadas Gestionadas por este Asesor ({agentCalls.length})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Fecha</th>
                      <th className="p-2.5">Estado</th>
                      <th className="p-2.5 text-right">Duración</th>
                      <th className="p-2.5 text-right">Silencio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {agentCalls.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-2.5">{c.identificador_llamada}</td>
                        <td className="p-2.5 font-sans">{c.fecha_llamada ? new Date(c.fecha_llamada).toLocaleTimeString() : '-'}</td>
                        <td className="p-2.5 font-sans">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            c.estado_llamada === 'CONTESTADA' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {c.estado_llamada}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold">{c.duracion_total_seg}s</td>
                        <td className="p-2.5 text-right text-slate-500">{c.tiempo_silencio_seg}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
