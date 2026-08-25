import React from 'react';
import type { TraceSpan } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { QualityGauge } from '../common/QualityGauge';
import { ChevronRight, Bot, ShieldAlert, Cpu } from 'lucide-react';

interface RunRowProps {
  run: TraceSpan;
  isSelected: boolean;
  onSelect: (run: TraceSpan) => void;
  onSelectTab?: (run: TraceSpan, tab: 'trace' | 'security' | 'diagnosis') => void;
}

export const RunRow: React.FC<RunRowProps> = ({ run, isSelected, onSelect, onSelectTab }) => {
  const qualityScore =
    run.evaluation?.faithfulness_score != null
      ? Math.round(
          ((run.evaluation.faithfulness_score +
            run.evaluation.relevance_score +
            (1 - run.evaluation.hallucination_score)) /
            3) *
            100
        )
      : null;

  // Format relative time or time string (Proper UTC to Local conversion)
  const formatTime = (isoString: string) => {
    if (!isoString) return 'just now';
    try {
      const formattedIso = isoString.includes('Z') || isoString.includes('+')
        ? isoString
        : `${isoString.replace(' ', 'T')}Z`;

      const date = new Date(formattedIso);
      const diffMs = Date.now() - date.getTime();
      if (isNaN(diffMs)) return isoString;

      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return isoString;
    }
  };

  return (
    <tr
      onClick={() => onSelect(run)}
      className={`group cursor-pointer border-b border-[#1F2737]/60 transition-colors ${
        isSelected
          ? 'bg-indigo-950/30 hover:bg-indigo-950/40'
          : run.status === 'failed'
          ? 'bg-rose-950/10 hover:bg-rose-950/20'
          : 'hover:bg-[#121622]'
      }`}
    >
      {/* Agent & Query + Live Output Preview */}
      <td className="py-3.5 px-4">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-[#161D2B] border border-[#232B3E] shrink-0 group-hover:border-indigo-500/40 transition-colors mt-0.5">
            <Bot className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="font-semibold text-xs text-slate-100 group-hover:text-indigo-200 transition-colors flex items-center gap-2 flex-wrap">
              <span>{run.agent_name}</span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">
                {run.trace_id.slice(-8)}
              </span>
              {run.model_name && (
                <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#161D2B] text-slate-400 border border-[#232B3E]">
                  <Cpu className="w-2.5 h-2.5 text-indigo-400" />
                  {run.model_name.split('/').pop()}
                </span>
              )}
            </div>

            {/* Prompt */}
            <div className="text-xs text-slate-300 truncate max-w-sm sm:max-w-md flex items-center gap-1.5">
              <span className="text-slate-500 font-mono text-[10px] uppercase font-bold">In:</span>
              <span className="text-slate-200 truncate">{run.input_query || '—'}</span>
            </div>

            {/* Actual Agent Output */}
            {run.output_result && (
              <div className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-md flex items-center gap-1.5">
                <span className="text-emerald-400 font-mono text-[10px] uppercase font-bold">Out:</span>
                <span className="text-slate-400 truncate italic">
                  "{run.output_result}"
                </span>
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="py-3.5 px-4 whitespace-nowrap">
        <StatusBadge status={run.status} size="sm" />
      </td>

      {/* Quality */}
      <td className="py-3.5 px-4 whitespace-nowrap">
        <QualityGauge score={qualityScore} size="sm" />
      </td>

      {/* Latency */}
      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-slate-300">
        {run.latency_ms > 1000
          ? `${(run.latency_ms / 1000).toFixed(2)}s`
          : `${Math.round(run.latency_ms)}ms`}
      </td>

      {/* Cost */}
      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono font-medium text-emerald-400">
        ${(run.cost_usd || 0).toFixed(4)}
      </td>

      {/* Time */}
      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-400 text-right">
        {formatTime(run.created_at)}
      </td>

      {/* Quick Security Audit Action */}
      <td className="py-3.5 pr-4 pl-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => {
              if (onSelectTab) {
                onSelectTab(run, 'security');
              } else {
                onSelect(run);
              }
            }}
            title="Run OWASP Security & Red-Team Audit"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-colors"
          >
            <ShieldAlert className="w-3 h-3 text-blue-400" />
            <span className="hidden sm:inline">Audit</span>
          </button>
          <ChevronRight
            onClick={() => onSelect(run)}
            className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5 inline-block cursor-pointer"
          />
        </div>
      </td>
    </tr>
  );
};
