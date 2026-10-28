import React from 'react';
import { 
  Headphones, 
  FileSpreadsheet, 
  Bell, 
  ShieldCheck, 
  Sliders, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface NavbarProps {
  currentThreshold: number;
  activeFileName?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentThreshold,
  activeFileName,
  onRefresh,
  isLoading
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-3.5">
      <div className="flex items-center justify-between">
        {/* Identidad de la Plataforma */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 leading-tight">Call Center Analytics</h1>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">TMO & IA</span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Plataforma Inteligente de Análisis y Automatización n8n</p>
          </div>
        </div>

        {/* Indicadores de Estado y Acciones Rápidas */}
        <div className="flex items-center gap-3">
          {/* Badge del Archivo Activo */}
          {activeFileName && (
            <div className="hidden md:flex items-center gap-2 text-xs bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate max-w-[180px] font-medium">{activeFileName}</span>
            </div>
          )}

          {/* Badge de Umbral Objetivo */}
          <div className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-medium">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>Umbral: <strong>{currentThreshold}s</strong></span>
          </div>

          {/* Indicador de Asistente IA Online */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Asistente IA: Activo</span>
          </div>

          {/* Botón Refrescar */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refrescar datos"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
