import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle,
  Clock,
  Filter
} from 'lucide-react';
import { api } from '../services/api';

interface CallsTablePageProps {
  selectedFileId?: string;
}

export const CallsTablePage: React.FC<CallsTablePageProps> = ({ selectedFileId }) => {
  const [calls, setCalls] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('fecha_llamada');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [onlyInvalid, setOnlyInvalid] = useState(false);
  const [callStatusFilter, setCallStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const res = await api.getCalls({
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        fileId: selectedFileId,
        callStatus: callStatusFilter || undefined,
        onlyInvalid: onlyInvalid || undefined
      });
      if (res.success) {
        setCalls(res.calls);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      console.error('Error obteniendo llamadas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [page, sortBy, sortOrder, callStatusFilter, onlyInvalid, selectedFileId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCalls();
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Tabla de Llamadas Detallada</h2>
        <p className="text-sm text-slate-500 mt-1">
          Visualización y auditoría individual de cada registro importado. Filtre por agente, estado de llamada o validez de datos.
        </p>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código de agente, nombre o ID de llamada..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro de Estado */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">Estado:</span>
            <select
              value={callStatusFilter}
              onChange={(e) => { setCallStatusFilter(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none"
            >
              <option value="">Todos</option>
              <option value="CONTESTADA">Contestadas</option>
              <option value="PERDIDA">Perdidas</option>
              <option value="OCUPADA">Ocupadas</option>
            </select>
          </div>

          {/* Checkbox solo inválidos */}
          <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyInvalid}
              onChange={(e) => { setOnlyInvalid(e.target.checked); setPage(1); }}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Solo registros con errores</span>
          </label>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">ID Llamada</th>
                <th className="p-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('codigo_agente_origen')}>
                  <div className="flex items-center gap-1">
                    <span>Agente</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('fecha_llamada')}>
                  <div className="flex items-center gap-1">
                    <span>Fecha & Hora</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('duracion_total_seg')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Duración</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 text-right">Conversación</th>
                <th className="p-3 text-right">Silencio</th>
                <th className="p-3 text-center">Calidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Cargando llamadas...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No se encontraron llamadas que coincidan con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                calls.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 font-mono text-[11px]">
                    <td className="p-3 font-semibold text-slate-900">{c.identificador_llamada || 'N/A'}</td>
                    <td className="p-3 font-sans">
                      <span className="font-semibold text-slate-800 block">{c.nombre_agente_origen || c.codigo_agente_origen}</span>
                      <span className="text-[10px] text-slate-400">{c.codigo_agente_origen}</span>
                    </td>
                    <td className="p-3 text-slate-500">
                      {c.fecha_llamada ? new Date(c.fecha_llamada).toLocaleString('es-ES') : '-'}
                    </td>
                    <td className="p-3 font-sans">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                        {c.tipo_llamada}
                      </span>
                    </td>
                    <td className="p-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        c.estado_llamada === 'CONTESTADA' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {c.estado_llamada}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">{c.duracion_total_seg}s</td>
                    <td className="p-3 text-right text-slate-600">{c.tiempo_conversacion_seg || 0}s</td>
                    <td className="p-3 text-right text-slate-600">{c.tiempo_silencio_seg || 0}s</td>
                    <td className="p-3 text-center">
                      {c.es_valido ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Válida</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 text-[10px] font-semibold" title={c.errores_validacion?.join(', ')}>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inválida</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Total: <strong>{total}</strong> registros</span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Página <strong>{page}</strong> de <strong>{totalPages || 1}</strong></span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
