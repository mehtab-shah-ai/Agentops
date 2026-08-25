import React from 'react';

interface QualityGaugeProps {
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export const QualityGauge: React.FC<QualityGaugeProps> = ({ score, size = 'md' }) => {
  if (score === undefined || score === null) {
    return <span className="text-slate-500 font-mono text-xs">--</span>;
  }

  // Convert fractional 0.0 - 1.0 to percentage 0 - 100 if necessary
  const displayScore = score <= 1.0 && score > 0 ? Math.round(score * 100) : Math.round(score);

  let textColor = 'text-emerald-400';
  let bgColor = 'bg-emerald-500/10';
  let borderColor = 'border-emerald-500/30';

  if (displayScore < 70) {
    textColor = 'text-rose-400';
    bgColor = 'bg-rose-500/10';
    borderColor = 'border-rose-500/30';
  } else if (displayScore < 85) {
    textColor = 'text-amber-400';
    bgColor = 'bg-amber-500/10';
    borderColor = 'border-amber-500/30';
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-1.5 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3 py-1.5 text-lg font-bold'
      : 'px-2 py-0.5 text-sm font-semibold';

  return (
    <span
      className={`inline-flex items-center font-mono rounded border ${bgColor} ${borderColor} ${textColor} ${sizeClasses}`}
    >
      {displayScore}
    </span>
  );
};
