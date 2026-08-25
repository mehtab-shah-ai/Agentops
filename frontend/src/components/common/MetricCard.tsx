import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  icon?: React.ReactNode;
  variant?: 'indigo' | 'rose' | 'purple' | 'emerald' | 'cyan' | 'amber' | 'default';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  trend,
  icon,
  variant,
}) => {
  // Infer variant if not explicitly passed
  let resolvedVariant = variant;
  if (!resolvedVariant) {
    const l = label.toLowerCase();
    if (l.includes('run') || l.includes('total')) resolvedVariant = 'indigo';
    else if (l.includes('error') || l.includes('fail')) resolvedVariant = 'rose';
    else if (l.includes('quality') || l.includes('score') || l.includes('ground')) resolvedVariant = 'purple';
    else if (l.includes('spend') || l.includes('cost') || l.includes('token')) resolvedVariant = 'emerald';
    else resolvedVariant = 'indigo';
  }

  const variantStyles = {
    indigo: {
      cardBg: 'bg-gradient-to-br from-[#13152C]/90 via-[#0C0F1A]/95 to-[#070911]',
      border: 'border-indigo-500/35 hover:border-indigo-400/60',
      accentBar: 'bg-indigo-500',
      iconBox: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-950/40',
      valueText: 'text-slate-100',
      shadow: 'shadow-lg shadow-indigo-950/20 hover:shadow-indigo-950/40',
    },
    rose: {
      cardBg: 'bg-gradient-to-br from-[#260A13]/90 via-[#0C0F1A]/95 to-[#070911]',
      border: 'border-rose-500/35 hover:border-rose-400/60',
      accentBar: 'bg-rose-500',
      iconBox: 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm shadow-rose-950/40',
      valueText: typeof value === 'string' && (value === '0.0%' || value === '0%') ? 'text-emerald-400' : 'text-rose-200',
      shadow: 'shadow-lg shadow-rose-950/20 hover:shadow-rose-950/40',
    },
    purple: {
      cardBg: 'bg-gradient-to-br from-[#220C30]/90 via-[#0C0F1A]/95 to-[#070911]',
      border: 'border-purple-500/35 hover:border-purple-400/60',
      accentBar: 'bg-purple-500',
      iconBox: 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-950/40',
      valueText: 'text-purple-100',
      shadow: 'shadow-lg shadow-purple-950/20 hover:shadow-purple-950/40',
    },
    emerald: {
      cardBg: 'bg-gradient-to-br from-[#062419]/90 via-[#0C0F1A]/95 to-[#070911]',
      border: 'border-emerald-500/35 hover:border-emerald-400/60',
      accentBar: 'bg-emerald-500',
      iconBox: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950/40',
      valueText: 'text-emerald-100',
      shadow: 'shadow-lg shadow-emerald-950/20 hover:shadow-emerald-950/40',
    },
    cyan: {
      cardBg: 'bg-gradient-to-br from-[#062030]/90 via-[#0C0F1A]/95 to-[#070911]',
      border: 'border-cyan-500/35 hover:border-cyan-400/60',
      accentBar: 'bg-cyan-500',
      iconBox: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950/40',
      valueText: 'text-cyan-100',
      shadow: 'shadow-lg shadow-cyan-950/20 hover:shadow-cyan-950/40',
    },
    amber: {
      cardBg: 'bg-gradient-to-br from-[#291705]/90 via-[#0C0F1A]/95 to-[#070911]',
      border: 'border-amber-500/35 hover:border-amber-400/60',
      accentBar: 'bg-amber-500',
      iconBox: 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-950/40',
      valueText: 'text-amber-100',
      shadow: 'shadow-lg shadow-amber-950/20 hover:shadow-amber-950/40',
    },
    default: {
      cardBg: 'bg-[#0E121B]',
      border: 'border-[#1F2737] hover:border-[#2D374D]',
      accentBar: 'bg-slate-600',
      iconBox: 'bg-[#161D2B] text-slate-400 border border-[#232B3E]',
      valueText: 'text-slate-100',
      shadow: 'shadow-md',
    },
  };

  const style = variantStyles[resolvedVariant || 'default'];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 border transition-all duration-200 hover:scale-[1.01] flex flex-col justify-between ${style.cardBg} ${style.border} ${style.shadow}`}
    >
      {/* Top subtle colored accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] opacity-70 ${style.accentBar}`} />

      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold font-mono text-slate-300 tracking-wide uppercase">
          {label}
        </span>
        {icon && (
          <div className={`p-2 rounded-xl transition-transform duration-200 shrink-0 ${style.iconBox}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Main Metric Value & Trend */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className={`text-2xl lg:text-3xl font-bold font-mono tracking-tight ${style.valueText}`}>
            {value}
          </div>
          {trend && (
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                trend.positive
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>

        {subtext && (
          <div className="text-[11px] text-slate-400 font-medium">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return <div className={`animate-pulse bg-[#161D2B] rounded-xl ${className}`} />;
};
