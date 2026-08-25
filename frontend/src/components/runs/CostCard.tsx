import React from 'react';
import { Coins, Cpu, FileText, TrendingDown } from 'lucide-react';

interface CostCardProps {
  totalCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  modelName: string;
}

export const CostCard: React.FC<CostCardProps> = ({
  totalCostUsd,
  inputTokens,
  outputTokens,
  modelName,
}) => {
  const totalTokens = inputTokens + outputTokens;

  return (
    <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Run Cost & Token Telemetry
            </h3>
            <p className="text-xs text-slate-400">
              Precise token consumption and inference cost rollup for this run.
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-bold font-mono text-emerald-400">
            ${totalCostUsd.toFixed(5)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {totalTokens.toLocaleString()} total tokens
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-3">
          <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-indigo-400" />
            Primary Model
          </div>
          <div className="text-xs font-mono font-semibold text-slate-200 truncate">
            {modelName}
          </div>
        </div>

        <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-3">
          <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-purple-400" />
            Input Tokens
          </div>
          <div className="text-xs font-mono font-semibold text-slate-200">
            {inputTokens.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-3">
          <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-emerald-400" />
            Output Tokens
          </div>
          <div className="text-xs font-mono font-semibold text-slate-200">
            {outputTokens.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-3">
          <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
            <Coins className="w-3 h-3 text-amber-400" />
            Cost / 1K Tokens
          </div>
          <div className="text-xs font-mono font-semibold text-slate-200">
            ${totalTokens > 0 ? ((totalCostUsd / totalTokens) * 1000).toFixed(4) : '0.0000'}
          </div>
        </div>
      </div>

      {/* Model Routing Optimizer Callout */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3.5 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-indigo-400" />
            Self-Optimizing Routing Engine
          </div>
          <div className="text-[11px] text-slate-400">
            AgentOps continuously assesses task accuracy vs model unit pricing to recommend cheaper model paths without sacrificing quality.
          </div>
        </div>
      </div>
    </div>
  );
};
