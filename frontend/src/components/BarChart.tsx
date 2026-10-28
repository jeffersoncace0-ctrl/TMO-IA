import React, { useState } from 'react';

export interface BarChartItem {
  label: string;
  subLabel?: string;
  value: number;
  color?: string;
  status?: string;
  secondaryValue?: number;
}

interface BarChartProps {
  title: string;
  subtitle?: string;
  items: BarChartItem[];
  threshold?: number;
  thresholdLabel?: string;
  unit?: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  title,
  subtitle,
  items,
  threshold,
  thresholdLabel = 'Umbral Objetivo',
  unit = 's',
  height = 280
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-400 mt-2">No hay suficientes datos disponibles para graficar.</p>
      </div>
    );
  }

  const maxValue = Math.max(...items.map(i => i.value), threshold || 0) * 1.15 || 10;
  const chartHeight = height - 70;

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        {threshold !== undefined && (
          <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md self-start">
            <span className="w-3 h-0.5 bg-rose-500 rounded"></span>
            <span className="text-slate-600 font-medium">{thresholdLabel}: <strong className="text-slate-900">{threshold}{unit}</strong></span>
          </div>
        )}
      </div>

      {/* Área del Gráfico SVG Responsivo */}
      <div className="relative pt-6 pb-2" style={{ height: `${height}px` }}>
        {/* Línea de referencia del umbral */}
        {threshold !== undefined && maxValue > 0 && (
          <div
            className="absolute left-0 right-0 border-b-2 border-dashed border-rose-500 z-10 transition-all pointer-events-none"
            style={{
              bottom: `${(threshold / maxValue) * chartHeight + 35}px`
            }}
          >
            <span className="absolute right-0 -top-4 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
              Límite {threshold}{unit}
            </span>
          </div>
        )}

        {/* Barras verticales */}
        <div className="flex items-end justify-between gap-2 h-full pb-8">
          {items.map((item, idx) => {
            const barHeightPct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            const isHovered = hoveredIndex === idx;

            // Color semántico por defecto si no viene indicado
            let barColor = item.color || '#3B82F6';
            if (!item.color && threshold !== undefined) {
              if (item.value <= threshold) barColor = '#22C55E'; // Verde
              else if (item.value <= threshold * 1.25) barColor = '#F59E0B'; // Amarillo / Naranja
              else barColor = '#EF4444'; // Rojo
            }

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip flotante interactivo */}
                {isHovered && (
                  <div className="absolute -top-14 z-30 bg-slate-900 text-white text-xs rounded-lg py-1.5 px-3 shadow-xl whitespace-nowrap pointer-events-none transform -translate-x-1/2 left-1/2">
                    <p className="font-semibold text-slate-100">{item.subLabel || item.label}</p>
                    <p className="text-slate-300">
                      Valor: <strong className="text-white">{item.value}{unit}</strong>
                      {item.status && <span className="ml-1 text-[10px] opacity-80">({item.status})</span>}
                    </p>
                    <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                  </div>
                )}

                {/* Valor superior a la barra */}
                <span className={`text-[11px] font-semibold mb-1 transition-opacity ${isHovered ? 'text-slate-900' : 'text-slate-500'}`}>
                  {item.value}
                </span>

                {/* Barra */}
                <div
                  className="w-full max-w-[42px] rounded-t-md transition-all duration-300 group-hover:brightness-95 group-hover:scale-x-105"
                  style={{
                    height: `${Math.max(barHeightPct, 2)}%`,
                    backgroundColor: barColor
                  }}
                />

                {/* Etiqueta inferior */}
                <div className="absolute -bottom-6 w-full text-center">
                  <span className="text-[10px] font-medium text-slate-600 truncate block px-0.5" title={item.label}>
                    {item.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda de semáforo */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
          <span>Aprobado / Cumple</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
          <span>En Observación / Advertencia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-rose-500"></span>
          <span>Crítico / Requiere Revisión</span>
        </div>
      </div>
    </div>
  );
};
