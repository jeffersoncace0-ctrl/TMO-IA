import React from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  PhoneCall, 
  Users, 
  FileText, 
  Sparkles, 
  Sliders, 
  Mail, 
  History, 
  AlertTriangle 
} from 'lucide-react';

export type SectionType = 
  | 'dashboard'
  | 'upload'
  | 'calls'
  | 'agents'
  | 'reports'
  | 'ai'
  | 'threshold'
  | 'email'
  | 'executions'
  | 'errors';

interface SidebarProps {
  activeSection: SectionType;
  onSelectSection: (section: SectionType) => void;
  unresolvedErrorsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  unresolvedErrorsCount = 0
}) => {
  const navItems = [
    { id: 'dashboard' as SectionType, label: '1. Dashboard General', icon: LayoutDashboard, badge: null },
    { id: 'upload' as SectionType, label: '2. Carga de Excel', icon: UploadCloud, badge: 'XLSX' },
    { id: 'calls' as SectionType, label: '3. Tabla de Llamadas', icon: PhoneCall, badge: null },
    { id: 'agents' as SectionType, label: '4. Análisis por Agente', icon: Users, badge: null },
    { id: 'reports' as SectionType, label: '5. Reportes & Descargas', icon: FileText, badge: '4 Hojas' },
    { id: 'ai' as SectionType, label: '6. Asistente de IA', icon: Sparkles, badge: 'IA' },
    { id: 'threshold' as SectionType, label: '7. Configurar Umbral', icon: Sliders, badge: null },
    { id: 'email' as SectionType, label: '8. Configurar Correos', icon: Mail, badge: 'SMTP' },
    { id: 'executions' as SectionType, label: '9. Historial n8n', icon: History, badge: 'Idemp.' },
    { 
      id: 'errors' as SectionType, 
      label: '10. Gestión de Errores', 
      icon: AlertTriangle, 
      badge: unresolvedErrorsCount > 0 ? String(unresolvedErrorsCount) : null,
      badgeColor: 'bg-rose-500 text-white'
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-65px)]">
      <div className="p-4 border-b border-slate-800">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Módulos Operativos
        </span>
      </div>

      <nav className="p-3 space-y-1.5 flex-1">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                  item.badgeColor || (isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400')
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer del Sidebar con info de sistema */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span>Motor n8n & Supabase</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">PostgreSQL • IA • Excel 4-Hojas</p>
      </div>
    </aside>
  );
};
