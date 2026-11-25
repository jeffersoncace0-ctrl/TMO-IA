import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  changeRate?: number;
  isPositiveChangeGood?: boolean;
  colorScheme?: 'blue' | 'green' | 'amber' | 'red' | 'indigo' | 'purple';
  subtitle?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  changeRate,
  isPositiveChangeGood = true,
  colorScheme = 'blue',
  subtitle
}) => {
  const colorMap = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    red: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' }
  };

  const scheme = colorMap[colorScheme];

  const hasChange = changeRate !== undefined && changeRate !== 0;
  const isGood = hasChange && ((changeRate > 0 && isPositiveChangeGood) || (changeRate < 0 && !isPositiveChangeGood));

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-lg ${scheme.bg} ${scheme.text} ${scheme.border} border`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {unit && <span className="text-xs font-medium text-slate-500">{unit}</span>}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs">
        {hasChange ? (
          <div className={`flex items-center gap-1 font-medium ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>
            {changeRate > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{changeRate > 0 ? `+${changeRate}%` : `${changeRate}%`}</span>
            <span className="text-slate-400 font-normal">vs periodo anterior</span>
          </div>
        ) : (
          <span className="text-slate-400">{subtitle || 'Periodo evaluado'}</span>
        )}
      </div>
    </div>
  );
};
