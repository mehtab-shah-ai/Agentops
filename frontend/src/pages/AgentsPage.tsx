import React, { useState, useEffect } from 'react';
import type { AgentSummary, TraceSpan } from '../types';
import { api } from '../services/api';
import { DEMO_AGENTS, DEMO_TRACES } from '../data/demoData';
import { StatusBadge } from '../components/common/StatusBadge';
import { QualityGauge } from '../components/common/QualityGauge';
import { RunDetailDrawer } from '../components/runs/RunDetailDrawer';
import { ConnectAgentModal } from '../components/modal/ConnectAgentModal';
import { useAuth } from '../context/AuthContext';
import { Bot, Activity, ChevronRight, Plus, Play } from 'lucide-react';

export const AgentsPage: React.FC = () => {
  const { isDemoMode, enterDemoMode } = useAuth();
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [runs, setRuns] = useState<TraceSpan[]>([]);
  const [selectedAgentName, setSelectedAgentName] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<TraceSpan | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadAgents() {
      setIsLoading(true);
      if (isDemoMode) {
        setAgents(DEMO_AGENTS);
        setRuns(DEMO_TRACES);
        setIsLoading(false);
        return;
      }

      try {
        const traces = await api.getRecentTraces({ limit: 100 });
        setRuns(traces || []);

        if (traces && traces.length > 0) {
          // Dynamically aggregate agents from real traces
          const agentMap: Record<string, TraceSpan[]> = {};
          traces.forEach((t) => {
            if (!agentMap[t.agent_name]) agentMap[t.agent_name] = [];
            agentMap[t.agent_name].push(t);
          });

          const summaries: AgentSummary[] = Object.entries(agentMap).map(([name, spans]) => {
            const totalRuns = spans.length;
            const failedCount = spans.filter((s) => s.status === 'failed').length;
            const errorRate = Number(((failedCount / totalRuns) * 100).toFixed(1));
            const evaluated = spans.filter((s) => s.evaluation?.faithfulness_score != null);
            const avgQuality =
              evaluated.length > 0
                ? Math.round(
                    (evaluated.reduce((acc, s) => acc + (s.evaluation?.faithfulness_score || 0), 0) /
                      evaluated.length) *
                      100
                  )
                : 90;
            const totalSpend = spans.reduce((acc, s) => acc + (s.cost_usd || 0), 0);
            const avgLatency =
              spans.reduce((acc, s) => acc + (s.latency_ms || 0), 0) / totalRuns;

            return {
              name,
              status: errorRate > 5.0 ? 'Needs Attention' : 'Healthy',
              total_runs: totalRuns,
              error_rate: errorRate,
              avg_quality: avgQuality,
              total_spend: totalSpend,
              avg_latency_ms: avgLatency,
              last_active: 'Recently',
            };
          });

          setAgents(summaries);
        } else {
          setAgents([]);
        }
      } catch {
        setAgents([]);
        setRuns([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadAgents();
  }, [isDemoMode]);

  // Filter traces matching the selected agent if any
  const agentTraces = selectedAgentName
    ? runs.filter((t) => t.agent_name.toLowerCase().includes(selectedAgentName.toLowerCase()))
    : runs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            Connected Agents
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time health telemetry, error rates, quality SLA compliance, and token spend across all connected agents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl transition-all shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Agent</span>
          </button>
        </div>
      </div>

      {/* Empty State when no agents are connected */}
      {agents.length === 0 && !isLoading ? (
        <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mx-auto flex items-center justify-center">
            <Bot className="w-6 h-6 text-indigo-400" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-100 font-mono">
              No agents connected yet
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Connect an agent to begin monitoring error rates, response quality, and token spend.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl transition-all shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Agent</span>
            </button>

            {!isDemoMode && (
              <button
                onClick={enterDemoMode}
                className="flex items-center gap-2 text-xs font-medium text-slate-200 hover:text-white bg-[#151B27] hover:bg-[#1C2333] border border-[#232B3E] px-4 py-2.5 rounded-xl transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                <span>Explore Demo</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Agents Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => {
              const isSelected = selectedAgentName === agent.name;

              return (
                <div
                  key={agent.name}
                  onClick={() => setSelectedAgentName(isSelected ? null : agent.name)}
                  className={`bg-[#0E121B] border rounded-2xl p-5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/20 shadow-md'
                      : 'border-[#1F2737] hover:border-[#2D374D] hover:bg-[#121622]'
                  }`}
                >
                  <div className="flex items-start justify-between pb-4 border-b border-[#1F2737]">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#161D2B] border border-[#232B3E]">
                        <Bot className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 font-mono">{agent.name}</h3>
                        <div className="text-[11px] text-slate-400">Active {agent.last_active}</div>
                      </div>
                    </div>

                    <StatusBadge status={agent.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-center">
                    <div className="bg-[#080A0F] p-2.5 rounded-xl border border-[#1F2737]">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Runs</div>
                      <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                        {agent.total_runs.toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-[#080A0F] p-2.5 rounded-xl border border-[#1F2737]">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Errors</div>
                      <div
                        className={`text-sm font-bold font-mono mt-0.5 ${
                          agent.error_rate > 5.0 ? 'text-rose-400' : 'text-slate-200'
                        }`}
                      >
                        {agent.error_rate}%
                      </div>
                    </div>

                    <div className="bg-[#080A0F] p-2.5 rounded-xl border border-[#1F2737]">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Quality</div>
                      <div className="mt-0.5">
                        <QualityGauge score={agent.avg_quality} size="sm" />
                      </div>
                    </div>

                    <div className="bg-[#080A0F] p-2.5 rounded-xl border border-[#1F2737]">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Spend</div>
                      <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                        ${agent.total_spend.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1F2737]/60 flex items-center justify-between text-xs text-indigo-400 font-medium">
                    <span>{isSelected ? 'Viewing recent runs below' : 'Click to inspect recent runs'}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Agent Recent Runs */}
          {agentTraces.length > 0 && (
            <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-200 font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  {selectedAgentName ? `Recent Runs for ${selectedAgentName}` : 'All Connected Agent Runs'}
                </h2>
                {selectedAgentName && (
                  <button
                    onClick={() => setSelectedAgentName(null)}
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    Clear filter
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {agentTraces.map((run) => (
                  <div
                    key={run.id}
                    onClick={() => setSelectedRun(run)}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#080A0F] border border-[#1F2737] hover:border-[#2D374D] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusBadge status={run.status} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate font-mono">
                          {run.agent_name}
                        </div>
                        <p className="text-xs text-slate-400 truncate max-w-sm sm:max-w-lg">
                          {run.input_query}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div className="text-xs font-mono text-slate-300">
                        {run.latency_ms > 1000 ? `${(run.latency_ms / 1000).toFixed(2)}s` : `${run.latency_ms}ms`}
                      </div>
                      <div className="text-xs font-mono text-emerald-400">
                        ${(run.cost_usd || 0).toFixed(4)}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail drawer */}
      <RunDetailDrawer
        run={selectedRun}
        onClose={() => setSelectedRun(null)}
      />

      {/* Connect Agent Modal */}
      <ConnectAgentModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onTraceVerified={async () => {
          try {
            const traces = await api.getRecentTraces({ limit: 100 });
            setRuns(traces || []);
          } catch {
            // Ignored
          }
        }}
      />
    </div>
  );
};
