import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Users, 
  Clock, 
  VolumeX, 
  Mic, 
  CheckCircle2, 
  PhoneOff, 
  Percent, 
  Filter,
  RotateCcw
} from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { BarChart } from '../components/BarChart';
import { DonutChart } from '../components/DonutChart';
import { api, FilterParams } from '../services/api';

interface DashboardPageProps {
  currentThreshold: number;
  selectedFileId?: string;
  files: any[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentThreshold,
  selectedFileId,
  files
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtros interactivos (Sección 6.4)
  const [filters, setFilters] = useState<FilterParams>({
    fileId: selectedFileId || '',
    agentCode: '',
    startDate: '',
    endDate: '',
    callType: '',
    callStatus: '',
    classification: '',
    threshold: currentThreshold
  });

  const loadStats = async (f: FilterParams = filters) => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats(f);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Error cargando métricas de dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats({ ...filters, threshold: currentThreshold });
  }, [currentThreshold, filters.fileId]);

  const handleFilterChange = (key: keyof FilterParams, value: any) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    loadStats(updated);
  };

  const resetFilters = () => {
    const defaultFilters: FilterParams = {
      fileId: selectedFileId || '',
      agentCode: '',
      startDate: '',
      endDate: '',
      callType: '',
      callStatus: '',
      classification: '',
      threshold: currentThreshold
    };
    setFilters(defaultFilters);
    loadStats(defaultFilters);
  };

  const kpis = data?.kpis || {};
  const barCharts = data?.barCharts || {};
  const donutCharts = data?.donutCharts || {};

  return (
    <div className="space-y-6">
      {/* Barra de Filtros Interactivos (Sección 6.4) */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Filtros Interactivos del Dashboard</h3>
          </div>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Filtros</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Selector de Archivo */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Archivo Procesado</label>
            <select
              value={filters.fileId}
              onChange={(e) => handleFilterChange('fileId', e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos los archivos</option>
              {files.map(f => (
                <option key={f.id} value={f.id}>{f.nombre_archivo}</option>
              ))}
            </select>
          </div>

          {/* Tipo de Llamada */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo de Llamada</label>
            <select
              value={filters.callType}
              onChange={(e) => handleFilterChange('callType', e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos los tipos</option>
              <option value="ENTRANTE">Entrante</option>
              <option value="SALIENTE">Saliente</option>
              <option value="INTERNA">Interna</option>
            </select>
          </div>

          {/* Estado de Llamada */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Estado de Llamada</label>
            <select
              value={filters.callStatus}
              onChange={(e) => handleFilterChange('callStatus', e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="CONTESTADA">Contestada</option>
              <option value="PERDIDA">Perdida</option>
              <option value="OCUPADA">Ocupada</option>
            </select>
          </div>

          {/* Clasificación de TMO */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Clasificación TMO</label>
            <select
              value={filters.classification}
              onChange={(e) => handleFilterChange('classification', e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todas</option>
              <option value="APROBADO">Aprobado (&le;{currentThreshold}s)</option>
              <option value="REQUIERE_REVISION">Requiere Revisión (&gt;{currentThreshold}s)</option>
              <option value="ERROR_DATOS">Error de Datos</option>
            </select>
          </div>

          {/* Fecha Inicio */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Fecha Desde</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 8 Tarjetas KPI Principales (Sección 6.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Calls"
          value={kpis.totalCalls ?? 0}
          unit="llamadas"
          icon={PhoneCall}
          changeRate={kpis.periodComparison?.callsGrowthRate}
          isPositiveChangeGood={true}
          colorScheme="blue"
        />

        <KPICard
          title="Total Agents"
          value={kpis.totalAgents ?? 0}
          unit="agentes"
          icon={Users}
          colorScheme="indigo"
          subtitle="Agentes evaluados"
        />

        <KPICard
          title="Average Handle Time (TMO)"
          value={kpis.averageHandleTimeSeconds ?? 0}
          unit="segundos"
          icon={Clock}
          changeRate={kpis.periodComparison?.tmoChangeSeconds}
          isPositiveChangeGood={false}
          colorScheme={kpis.averageHandleTimeSeconds <= currentThreshold ? 'green' : 'red'}
          subtitle={`Umbral objetivo: ${currentThreshold}s`}
        />

        <KPICard
          title="Percentage of Compliance"
          value={`${kpis.percentageOfCompliance ?? 0}%`}
          icon={Percent}
          changeRate={kpis.periodComparison?.complianceChangeRate}
          isPositiveChangeGood={true}
          colorScheme={kpis.percentageOfCompliance >= 75 ? 'green' : 'amber'}
        />

        <KPICard
          title="Accepted Calls"
          value={kpis.acceptedCalls ?? 0}
          unit={`(${kpis.acceptedCallsPercentage ?? 0}%)`}
          icon={CheckCircle2}
          colorScheme="green"
        />

        <KPICard
          title="Missed Calls"
          value={kpis.missedCalls ?? 0}
          unit={`(${kpis.missedCallsPercentage ?? 0}%)`}
          icon={PhoneOff}
          colorScheme={kpis.missedCalls > 0 ? 'red' : 'green'}
        />

        <KPICard
          title="Average Talk Time"
          value={kpis.averageTalkTimeSeconds ?? 0}
          unit="segundos"
          icon={Mic}
          colorScheme="blue"
        />

        <KPICard
          title="Average Silence Time"
          value={kpis.averageSilenceTimeSeconds ?? 0}
          unit="segundos"
          icon={VolumeX}
          colorScheme={kpis.averageSilenceTimeSeconds > 5 ? 'amber' : 'green'}
          subtitle="Pausa promedio en línea"
        />
      </div>

      {/* Gráficos de Barras Principales (Sección 6.2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: TMO por Agente con Línea de Umbral */}
        <BarChart
          title="TMO Promedio por Agente (s) vs Umbral Objetivo"
          subtitle={`Línea roja discontinua representa el umbral configurado de ${currentThreshold}s`}
          items={(barCharts.tmoByAgent || []).map((a: any) => ({
            label: a.agentCode,
            subLabel: a.agentName,
            value: a.tmo,
            color: a.color,
            status: a.status
          }))}
          threshold={currentThreshold}
          thresholdLabel="Umbral"
          unit="s"
        />

        {/* Gráfico 2: Total de Llamadas por Agente */}
        <BarChart
          title="Total de Llamadas Gestionadas por Agente"
          subtitle="Distribución del volumen de atención entre los integrantes del equipo"
          items={(barCharts.callsByAgent || []).map((a: any) => ({
            label: a.agentCode,
            subLabel: a.agentName,
            value: a.totalCalls,
            color: '#3B82F6'
          }))}
          unit=" llamadas"
        />

        {/* Gráfico 3: Tiempo Promedio de Silencio por Agente */}
        <BarChart
          title="Tiempo Promedio de Silencio por Agente (s)"
          subtitle="Detección de demoras de búsqueda en CRM o pausas prolongadas"
          items={(barCharts.silenceByAgent || []).map((a: any) => ({
            label: a.agentCode,
            subLabel: a.agentName,
            value: a.avgSilence,
            color: a.color
          }))}
          unit="s"
        />

        {/* Gráfico 4: Distribución de Llamadas por Rangos de Duración */}
        <BarChart
          title="Distribución de Llamadas por Rangos de Duración"
          subtitle="Concentración del tráfico según intervalos temporales"
          items={(barCharts.durationRanges || []).map((r: any) => ({
            label: r.range,
            value: r.count,
            color: r.range === '0 - 10s' || r.range === '11 - 20s' ? '#22C55E' : (r.range === '21 - 40s' ? '#F59E0B' : '#EF4444')
          }))}
          unit=" llamadas"
        />
      </div>

      {/* Gráficos de Dona Independientes (Sección 6.3) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dona 1: Estado de las Llamadas (Contestadas vs Perdidas) */}
        <DonutChart
          title="Gráfico 1: Estado de las Llamadas"
          subtitle="Proporción de llamadas contestadas frente a llamadas perdidas/abandonadas"
          centerLabel="Llamadas"
          centerValue={kpis.totalCalls}
          segments={[
            {
              label: 'Llamadas Contestadas',
              value: donutCharts.callStatus?.accepted || 0,
              percentage: donutCharts.callStatus?.acceptedPct || 0,
              color: '#22C55E'
            },
            {
              label: 'Llamadas Perdidas',
              value: donutCharts.callStatus?.missed || 0,
              percentage: donutCharts.callStatus?.missedPct || 0,
              color: '#EF4444'
            }
          ]}
          emptyMessage="Cargue un archivo para visualizar la distribución de estados de llamadas."
        />

        {/* Dona 2: Clasificación de TMO de Agentes */}
        <DonutChart
          title="Gráfico 2: Clasificación de TMO de Agentes"
          subtitle="Distribución de asesores según cumplimiento estricto del umbral"
          centerLabel="Agentes"
          centerValue={kpis.totalAgents}
          segments={[
            {
              label: 'Agentes Aprobados (TMO <= 20s)',
              value: donutCharts.tmoClassification?.approved || 0,
              percentage: donutCharts.tmoClassification?.approvedPct || 0,
              color: '#22C55E'
            },
            {
              label: 'En Observación (TMO cercano)',
              value: donutCharts.tmoClassification?.observation || 0,
              percentage: donutCharts.tmoClassification?.observationPct || 0,
              color: '#F59E0B'
            },
            {
              label: 'Requieren Revisión (TMO Crítico)',
              value: donutCharts.tmoClassification?.reviewRequired || 0,
              percentage: donutCharts.tmoClassification?.reviewPct || 0,
              color: '#EF4444'
            }
          ]}
          emptyMessage="No hay agentes clasificados en el archivo seleccionado."
        />
      </div>
    </div>
  );
};
