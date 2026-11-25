import React, { useState } from 'react';
import { 
  Sliders, 
  Check, 
  Info, 
  Save, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

interface ThresholdConfigPageProps {
  currentThreshold: number;
  onThresholdUpdated: (newThreshold: number) => void;
}

export const ThresholdConfigPage: React.FC<ThresholdConfigPageProps> = ({
  currentThreshold,
  onThresholdUpdated
}) => {
  const [threshold, setThreshold] = useState<number>(currentThreshold);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (threshold <= 0) return;

    try {
      setSaving(true);
      setMessage(null);
      const res = await api.updateThreshold(threshold);
      if (res.success) {
        onThresholdUpdated(threshold);
        setMessage(`Umbral actualizado exitosamente a ${threshold} segundos.`);
      }
    } catch (err: any) {
      setMessage('Error al guardar configuración: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Configuración del Umbral de TMO</h2>
        <p className="text-sm text-slate-500 mt-1">
          Ajuste dinámico del límite objetivo de Tiempo Medio de Operación aplicado a los dashboards, reportes y workflows de n8n.
        </p>
      </div>

      {/* Tarjeta de Configuración */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Límite Máximo Permitido (Segundos)
            </label>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="120"
                step="1"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-mono font-bold text-lg text-slate-900 w-28 justify-center">
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                  className="w-14 text-center bg-transparent outline-none"
                />
                <span className="text-xs text-slate-400 font-sans">seg</span>
              </div>
            </div>
          </div>

          {/* Comparativa Visual de la Regla */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs">
              <span className="font-bold text-emerald-800 block text-sm mb-1">APROBADO</span>
              <p className="text-emerald-700">TMO &le; {threshold} segundos</p>
              <span className="text-[10px] text-emerald-600 mt-1 block">El agente cumple con el estándar de agilidad.</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs">
              <span className="font-bold text-amber-800 block text-sm mb-1">EN OBSERVACIÓN</span>
              <p className="text-amber-700">{threshold}s &lt; TMO &le; {Math.round(threshold * 1.25)}s</p>
              <span className="text-[10px] text-amber-600 mt-1 block">Cercano al límite. Requiere monitoreo preventivo.</span>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs">
              <span className="font-bold text-rose-800 block text-sm mb-1">REQUIERE REVISIÓN</span>
              <p className="text-rose-700">TMO &gt; {Math.round(threshold * 1.25)} segundos</p>
              <span className="text-[10px] text-rose-600 mt-1 block">Incumplimiento crítico. Plan de capacitación sugerido.</span>
            </div>
          </div>

          {/* Feedback de Guardado */}
          {message && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Guardando...' : 'Guardar y Aplicar Umbral'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Nota técnica */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Impacto en el flujo de trabajo:</strong> Al actualizar el umbral, los workflows de n8n aplicarán automáticamente el nuevo valor en la clasificación determinista y en las líneas de referencia de los gráficos del dashboard y reportes Excel.
        </p>
      </div>
    </div>
  );
};
