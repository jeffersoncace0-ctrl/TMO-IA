import React, { useState } from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  title: string;
  subtitle?: string;
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  emptyMessage?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  subtitle,
  segments,
  centerLabel = 'Total',
  centerValue,
  emptyMessage = 'No hay suficientes datos disponibles para esta distribución.'
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0 || segments.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[320px]">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-400 mt-3 text-center px-4">{emptyMessage}</p>
      </div>
    );
  }

  // Dimensiones SVG
  const size = 200;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="relative flex items-center justify-center my-4">
        <svg width={size} height={size} className="transform -rotate-90">
          {segments.map((seg, idx) => {
            const strokeDasharray = `${(seg.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += (seg.percentage / 100) * circumference;

            const isHovered = hoveredIndex === idx;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>

        {/* Centro de la dona con KPI consolidado */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-2xl font-extrabold text-slate-900">
            {hoveredIndex !== null ? segments[hoveredIndex].value : (centerValue !== undefined ? centerValue : total)}
          </span>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            {hoveredIndex !== null ? `${segments[hoveredIndex].percentage}%` : centerLabel}
          </span>
        </div>
      </div>

      {/* Lista detallada con porcentajes y cantidades */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        {segments.map((seg, idx) => {
          const isHovered = hoveredIndex === idx;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors cursor-pointer ${
                isHovered ? 'bg-slate-50 font-semibold' : 'text-slate-600'
              }`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }}></span>
                <span className="truncate">{seg.label}</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-900 font-bold">{seg.value}</span>
                <span className="text-slate-400 font-normal">({seg.percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
