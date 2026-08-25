import React from 'react';
import type { TraceTreeNode, TraceSpan } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { ChevronRight, ChevronDown, Bot, Wrench, Globe, Brain, CheckCircle2, AlertCircle } from 'lucide-react';

interface TraceTreeProps {
  nodes: TraceTreeNode[];
  selectedSpanId: string | null;
  onSelectSpan: (span: TraceSpan) => void;
  expandedSpans: Record<string, boolean>;
  onToggleExpand: (spanId: string) => void;
  level?: number;
}

export const TraceTree: React.FC<TraceTreeProps> = ({
  nodes,
  selectedSpanId,
  onSelectSpan,
  expandedSpans,
  onToggleExpand,
  level = 0,
}) => {
  const getTaskIcon = (taskType: string, isFailed: boolean) => {
    if (isFailed) return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
    const lower = (taskType || '').toLowerCase();
    if (lower.includes('route') || lower.includes('router')) return <Bot className="w-3.5 h-3.5 text-indigo-400" />;
    if (lower.includes('tool')) return <Wrench className="w-3.5 h-3.5 text-amber-400" />;
    if (lower.includes('search') || lower.includes('web')) return <Globe className="w-3.5 h-3.5 text-sky-400" />;
    if (lower.includes('reason') || lower.includes('plan')) return <Brain className="w-3.5 h-3.5 text-purple-400" />;
    if (lower.includes('final') || lower.includes('answer')) return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    return <Bot className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="space-y-1">
      {nodes.map((node) => {
        const span = node.span;
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedSpans[span.span_id] !== false; // default expanded
        const isSelected = selectedSpanId === span.span_id;
        const isFailed = span.status === 'failed';

        return (
          <div key={span.span_id} className="relative">
            {/* Tree connector line */}
            <div
              onClick={() => onSelectSpan(span)}
              className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                  : isFailed
                  ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60'
                  : 'bg-[#0E121B] border-[#1F2737] hover:border-[#2D374D] hover:bg-[#131824]'
              }`}
              style={{ marginLeft: `${level * 18}px` }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {hasChildren ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(span.span_id);
                    }}
                    className="text-slate-400 hover:text-slate-200 p-0.5"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                ) : (
                  <div className="w-4" />
                )}

                <div className="p-1 rounded bg-[#161D2B] border border-[#232B3E] shrink-0">
                  {getTaskIcon(span.task_type || span.agent_name, isFailed)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {span.task_type ? span.task_type.replace(/_/g, ' ') : span.agent_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.2 rounded bg-[#161D2B] border border-[#232B3E]">
                      {span.model_name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                    {span.input_query}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-right">
                <div className="hidden sm:block">
                  <div className="text-xs font-mono font-medium text-slate-300">
                    {span.latency_ms > 1000
                      ? `${(span.latency_ms / 1000).toFixed(2)}s`
                      : `${Math.round(span.latency_ms)}ms`}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    ${(span.cost_usd || 0).toFixed(4)}
                  </div>
                </div>

                <StatusBadge status={span.status} size="sm" />
              </div>
            </div>

            {/* Render nested children recursively */}
            {hasChildren && isExpanded && (
              <div className="relative mt-1">
                <TraceTree
                  nodes={node.children}
                  selectedSpanId={selectedSpanId}
                  onSelectSpan={onSelectSpan}
                  expandedSpans={expandedSpans}
                  onToggleExpand={onToggleExpand}
                  level={level + 1}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
