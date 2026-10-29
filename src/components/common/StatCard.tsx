import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  indicator?: 'neutral' | 'positive' | 'warning' | 'negative';
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  sublabel,
  trend,
  trendDirection = 'up',
  icon,
  onClick,
}: StatCardProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`p-6 bg-white border border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all ${
        isClickable
          ? 'cursor-pointer hover:border-slate-200 hover:shadow-md active:scale-[0.99]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Soft circle icon container */}
        <div className="w-10 h-10 rounded-full bg-[#f8f9fa] flex items-center justify-center text-slate-800 shrink-0">
          {icon}
        </div>

        {/* Minimalist Trend indicator */}
        {trend && (
          <div
            className={`flex items-center gap-0.5 text-xs font-semibold ${
              trendDirection === 'up'
                ? 'text-lime-600'
                : trendDirection === 'down'
                ? 'text-rose-600'
                : 'text-slate-400'
            }`}
          >
            {trendDirection === 'up' && '↑ '}
            {trendDirection === 'down' && '↓ '}
            <span>{trend}</span>
          </div>
        )}
      </div>

      <div className="mt-4 text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
        {value}
      </div>

      <div className="text-xs text-slate-400 font-medium mt-1 truncate">
        {label}
      </div>

      {sublabel && (
        <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
          {sublabel}
        </div>
      )}
    </div>
  );
}
