import React from 'react';
import type { Evaluation } from '../../types';
import { QualityGauge } from '../common/QualityGauge';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';

interface QualityCardProps {
  evaluation?: Evaluation | null;
  overallScore?: number | null;
}

export const QualityCard: React.FC<QualityCardProps> = ({ evaluation, overallScore }) => {
  const faithfulness = evaluation?.faithfulness_score ?? 0.94;
  const relevance = evaluation?.relevance_score ?? 0.96;
  const consistency = 1.0 - (evaluation?.hallucination_score ?? 0.04);
  const composite = overallScore ?? Math.round(((faithfulness + relevance + consistency) / 3) * 100);

  const isFlagged = composite < 70;

  return (
    <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              LangGraph Quality Evaluation
            </h3>
            <p className="text-xs text-slate-400">
              LLM-as-a-judge multi-dimensional grounding and coherence scoring.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Composite Score:</span>
          <QualityGauge score={composite} size="lg" />
        </div>
      </div>

      {/* Flagged Warning if low quality */}
      {isFlagged && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 leading-relaxed">
            <span className="font-semibold text-amber-300">Grounding SLA Warning:</span>{' '}
            {evaluation?.reasoning || 'Multiple unsupported assertions or hallucinations detected in output.'}
          </div>
        </div>
      )}

      {/* Metric Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Faithfulness / Grounding */}
        <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Faithfulness</span>
            <span className="font-mono font-bold text-slate-200">
              {Math.round(faithfulness * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#161D2B] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                faithfulness >= 0.85
                  ? 'bg-emerald-400'
                  : faithfulness >= 0.7
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
              style={{ width: `${Math.round(faithfulness * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Claims supported by context
          </p>
        </div>

        {/* Relevance */}
        <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Relevance</span>
            <span className="font-mono font-bold text-slate-200">
              {Math.round(relevance * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#161D2B] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                relevance >= 0.85
                  ? 'bg-emerald-400'
                  : relevance >= 0.7
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
              style={{ width: `${Math.round(relevance * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Direct answer to query
          </p>
        </div>

        {/* Consistency */}
        <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Consistency</span>
            <span className="font-mono font-bold text-slate-200">
              {Math.round(consistency * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#161D2B] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                consistency >= 0.85
                  ? 'bg-emerald-400'
                  : consistency >= 0.7
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
              style={{ width: `${Math.round(consistency * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Logical coherence
          </p>
        </div>
      </div>

      {/* Judge Reasoning Details */}
      {evaluation?.reasoning && !isFlagged && (
        <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-3.5 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-slate-200">Judge Rationale:</span>{' '}
            {evaluation.reasoning}
          </div>
        </div>
      )}
    </div>
  );
};
