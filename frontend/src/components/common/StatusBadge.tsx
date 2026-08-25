import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'success' || normalized === 'pass' || normalized === 'healthy') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>SUCCESS</span>
      </span>
    );
  }

  if (normalized === 'review' || normalized === 'flagged' || normalized === 'needs attention') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>REVIEW</span>
      </span>
    );
  }

  if (normalized === 'failed' || normalized === 'fail' || normalized === 'error' || normalized === 'critical') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <XCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>FAILED</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{status.toUpperCase()}</span>
    </span>
  );
};
