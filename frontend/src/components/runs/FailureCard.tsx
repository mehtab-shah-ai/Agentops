import React from 'react';
import { AlertOctagon, Repeat, Clock, FileWarning, ShieldAlert } from 'lucide-react';

interface FailureCardProps {
  failureReasons?: string[] | null;
  agentName: string;
}

export const FailureCard: React.FC<FailureCardProps> = ({ failureReasons, agentName }) => {
  const reasons = failureReasons || [];
  const isLoop = reasons.some((r) => r.toLowerCase().includes('loop'));
  const isSchema = reasons.some((r) => r.toLowerCase().includes('schema') || r.toLowerCase().includes('json'));
  const isTimeout = reasons.some((r) => r.toLowerCase().includes('timeout'));
  const isMaxSteps = reasons.some((r) => r.toLowerCase().includes('step') || r.toLowerCase().includes('overrun'));

  let title = 'EXECUTION FAILURE DETECTED';
  let description = 'Agent execution encountered an unhandled exception or failed SLA threshold.';
  let icon = <AlertOctagon className="w-5 h-5 text-rose-400" />;

  if (isLoop) {
    title = 'TOOL LOOP DETECTED';
    description = 'AgentOps detected repeated identical tool calls with identical arguments and halted execution to prevent runaway loop and token drain.';
    icon = <Repeat className="w-5 h-5 text-rose-400 animate-spin" />;
  } else if (isSchema) {
    title = 'SCHEMA VALIDATION FAILURE';
    description = 'Agent model output failed required JSON schema validation or emitted malformed response structure.';
    icon = <FileWarning className="w-5 h-5 text-rose-400" />;
  } else if (isTimeout) {
    title = 'EXECUTION TIMEOUT';
    description = 'Agent step exceeded maximum latency budget SLA.';
    icon = <Clock className="w-5 h-5 text-rose-400" />;
  } else if (isMaxSteps) {
    title = 'MAX STEPS BUDGET EXCEEDED';
    description = 'Workflow exceeded configured max steps quota without achieving terminal goal state.';
    icon = <ShieldAlert className="w-5 h-5 text-rose-400" />;
  }

  return (
    <div className="bg-rose-950/25 border border-rose-900/50 rounded-2xl p-5 space-y-4 glow-danger">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60 shrink-0">
          {icon}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-rose-300 tracking-wide font-mono">
              {title}
            </h3>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
              CRITICAL
            </span>
          </div>
          <p className="text-xs text-rose-200/80 leading-relaxed">
            {agentName}: {description}
          </p>
        </div>
      </div>

      {/* Visual illustration of tool loop if applicable */}
      {isLoop && (
        <div className="bg-[#080A0F]/80 border border-rose-900/40 rounded-xl p-3.5 space-y-2 font-mono text-xs">
          <div className="text-slate-400 text-[11px] mb-2 font-sans font-medium">
            Repetition Pattern Detected:
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-amber-400">1.</span>
            <span className="bg-[#161D2B] px-2 py-0.5 rounded border border-[#232B3E]">Search Tool</span>
            <span className="text-slate-500">→</span>
            <span className="text-slate-400 truncate">fetch_distributor_pricing(part_no="STM32F407VGT6")</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-amber-400">2.</span>
            <span className="bg-[#161D2B] px-2 py-0.5 rounded border border-[#232B3E]">Search Tool</span>
            <span className="text-slate-500">→</span>
            <span className="text-slate-400 truncate">fetch_distributor_pricing(part_no="STM32F407VGT6")</span>
          </div>
          <div className="flex items-center gap-2 text-rose-300 font-semibold">
            <span className="text-rose-400">3.</span>
            <span className="bg-rose-950/50 px-2 py-0.5 rounded border border-rose-800 text-rose-300">Search Tool</span>
            <span className="text-rose-500">→</span>
            <span className="text-rose-400 truncate">HALTED BY AGENTOPS DETECTOR</span>
          </div>
        </div>
      )}

      {/* Raw failure logs */}
      {reasons.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
            Failure Diagnostic Logs
          </div>
          <div className="bg-[#080A0F] border border-rose-950 rounded-lg p-2.5 space-y-1">
            {reasons.map((r, i) => (
              <div key={i} className="text-xs font-mono text-rose-300/90 break-words">
                • {r}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
