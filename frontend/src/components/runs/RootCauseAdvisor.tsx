import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Code2,
  FileText,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Cpu,
} from 'lucide-react';
import type { TraceDiagnosis } from '../../types';

interface RootCauseAdvisorProps {
  diagnosis: TraceDiagnosis;
  isLoading?: boolean;
}

export const RootCauseAdvisor: React.FC<RootCauseAdvisorProps> = ({ diagnosis, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'code'>('prompt');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="bg-[#0B0E17] border border-indigo-500/20 rounded-2xl p-5 space-y-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="h-4 bg-indigo-500/20 rounded w-1/3" />
            <div className="h-3 bg-slate-800 rounded w-1/2" />
          </div>
        </div>
        <div className="h-20 bg-[#080A0F] rounded-xl border border-[#1F2737]" />
      </div>
    );
  }

  const isCritical = diagnosis.severity === 'CRITICAL';
  const isHigh = diagnosis.severity === 'HIGH';
  const isMedium = diagnosis.severity === 'MEDIUM';

  const severityBadgeClass = isCritical
    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    : isHigh
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : isMedium
    ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(diagnosis.recommended_prompt_patch);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyCode = () => {
    if (diagnosis.recommended_code_patch) {
      navigator.clipboard.writeText(diagnosis.recommended_code_patch);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#0E1322] to-[#0A0D16] border border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden group">
      {/* Background glow accent */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-indigo-500/40 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 font-mono tracking-tight">
                AI Root-Cause Diagnosis & Fix
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${severityBadgeClass}`}>
                {diagnosis.severity} SEVERITY
              </span>
            </div>
            <div className="text-xs text-indigo-300/80 font-mono mt-0.5">
              {diagnosis.primary_issue}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/40 transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          {/* Root-Cause Explanation Box */}
          <div className="bg-[#080A0F]/80 border border-[#1F2737] rounded-xl p-3.5 space-y-2">
            <div className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Why this run failed / broke baseline:
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {diagnosis.root_cause_summary}
            </p>
            {diagnosis.detailed_analysis && (
              <p className="text-[11px] text-slate-400 leading-relaxed border-t border-[#1F2737]/60 pt-2">
                {diagnosis.detailed_analysis}
              </p>
            )}
          </div>

          {/* Remediation Patch Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 bg-[#080A0F] p-1 rounded-lg border border-[#1F2737]">
                <button
                  onClick={() => setActiveTab('prompt')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium rounded-md transition-colors ${
                    activeTab === 'prompt'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  System Prompt Patch
                </button>
                {diagnosis.recommended_code_patch && (
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium rounded-md transition-colors ${
                      activeTab === 'code'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Code2 className="w-3 h-3" />
                    Tool Guardrail Code
                  </button>
                )}
              </div>

              {activeTab === 'prompt' ? (
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 px-3 py-1 rounded-lg transition-colors"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied Prompt!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-indigo-400" />
                      <span>Copy Prompt Patch</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 px-3 py-1 rounded-lg transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied Code!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-indigo-400" />
                      <span>Copy Code Guardrail</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Code / Markdown Box */}
            <div className="bg-[#06080D] border border-indigo-500/20 rounded-xl p-3.5 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed max-h-56 custom-scrollbar">
              <pre className="whitespace-pre-wrap">
                {activeTab === 'prompt'
                  ? diagnosis.recommended_prompt_patch
                  : diagnosis.recommended_code_patch}
              </pre>
            </div>
          </div>

          {/* Prevention Guide Footer */}
          {diagnosis.prevention_guide && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-[#080A0F] border border-[#1F2737] px-3 py-2 rounded-xl font-mono">
              <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>
                <strong className="text-slate-300">Engineering Recommendation:</strong> {diagnosis.prevention_guide}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
