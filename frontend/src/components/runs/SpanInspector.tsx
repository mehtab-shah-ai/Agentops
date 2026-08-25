import React, { useState } from 'react';
import type { TraceSpan } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { QualityGauge } from '../common/QualityGauge';
import { Copy, Check, Terminal, FileText, Cpu, Coins, Clock } from 'lucide-react';

interface SpanInspectorProps {
  span: TraceSpan;
}

export const SpanInspector: React.FC<SpanInspectorProps> = ({ span }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="bg-[#0E121B] border border-[#1F2737] rounded-xl p-4 space-y-4">
      {/* Header telemetry pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1F2737]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-100 font-mono">
            {span.agent_name}
          </span>
          <span className="text-xs text-slate-400">/</span>
          <span className="text-xs text-indigo-300 font-medium font-mono">
            {span.task_type}
          </span>
        </div>
        <StatusBadge status={span.status} size="sm" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#080A0F] border border-[#1F2737] rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
            <Cpu className="w-3 h-3 text-indigo-400" />
            Model
          </div>
          <div className="text-xs font-mono font-medium text-slate-200 truncate">
            {span.model_name}
          </div>
        </div>

        <div className="bg-[#080A0F] border border-[#1F2737] rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
            <Clock className="w-3 h-3 text-sky-400" />
            Latency
          </div>
          <div className="text-xs font-mono font-medium text-slate-200">
            {span.latency_ms > 1000
              ? `${(span.latency_ms / 1000).toFixed(2)}s`
              : `${Math.round(span.latency_ms)}ms`}
          </div>
        </div>

        <div className="bg-[#080A0F] border border-[#1F2737] rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
            <FileText className="w-3 h-3 text-purple-400" />
            Tokens
          </div>
          <div className="text-xs font-mono font-medium text-slate-200">
            {span.input_tokens} in / {span.output_tokens} out
          </div>
        </div>

        <div className="bg-[#080A0F] border border-[#1F2737] rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
            <Coins className="w-3 h-3 text-emerald-400" />
            Cost
          </div>
          <div className="text-xs font-mono font-medium text-slate-200">
            ${(span.cost_usd || 0).toFixed(5)}
          </div>
        </div>
      </div>

      {/* Input Query */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            INPUT PROMPT
          </span>
          <button
            onClick={() => copyToClipboard(span.input_query, 'input')}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            {copiedSection === 'input' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <div className="bg-[#080A0F] border border-[#1F2737] rounded-lg p-3 text-xs font-mono text-slate-300 whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto">
          {span.input_query}
        </div>
      </div>

      {/* Context if present */}
      {span.context && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              RETRIEVED CONTEXT
            </span>
            <button
              onClick={() => copyToClipboard(span.context || '', 'context')}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              {copiedSection === 'context' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="bg-[#080A0F] border border-[#1F2737] rounded-lg p-3 text-xs font-mono text-amber-200/90 whitespace-pre-wrap break-words leading-relaxed max-h-40 overflow-y-auto">
            {span.context}
          </div>
        </div>
      )}

      {/* Output Result */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            OUTPUT RESULT
          </span>
          <button
            onClick={() => copyToClipboard(span.output_result, 'output')}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            {copiedSection === 'output' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <div
          className={`border rounded-lg p-3 text-xs font-mono whitespace-pre-wrap break-words leading-relaxed max-h-56 overflow-y-auto ${
            span.status === 'failed'
              ? 'bg-rose-950/20 border-rose-900/40 text-rose-200'
              : 'bg-[#080A0F] border-[#1F2737] text-slate-200'
          }`}
        >
          {span.output_result}
        </div>
      </div>

      {/* Span Evaluation if attached */}
      {span.evaluation && (
        <div className="bg-[#080A0F] border border-[#1F2737] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              LangGraph Evaluation Verdict
            </span>
            <QualityGauge score={span.evaluation.faithfulness_score} size="sm" />
          </div>
          {span.evaluation.reasoning && (
            <p className="text-xs text-slate-400 leading-relaxed">
              {span.evaluation.reasoning}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
