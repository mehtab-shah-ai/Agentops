import React, { useState, useEffect } from 'react';
import type { TraceSpan } from '../types';
import { api } from '../services/api';
import { DEMO_TRACES } from '../data/demoData';
import { wsService } from '../services/websocket';
import { MetricCard } from '../components/common/MetricCard';
import { RunList } from '../components/runs/RunList';
import { RunDetailDrawer } from '../components/runs/RunDetailDrawer';
import { ConnectAgentModal } from '../components/modal/ConnectAgentModal';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  ShieldAlert,
  Sparkles,
  Coins,
  Plus,
  Play,
  Activity,
  LogOut,
  Info,
} from 'lucide-react';

export const RunsPage: React.FC = () => {
  const [runs, setRuns] = useState<TraceSpan[]>([]);
  const [selectedRun, setSelectedRun] = useState<TraceSpan | null>(null);
  const [drawerTab, setDrawerTab] = useState<'trace' | 'security' | 'diagnosis' | 'quality' | 'cost' | 'raw'>('trace');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);

  const { isDemoMode, enterDemoMode, exitDemoMode } = useAuth();

  const handleClearWorkspace = async () => {
    if (isDemoMode) {
      setRuns([]);
      return;
    }
    try {
      await api.clearAllTraces();
      setRuns([]);
      setSelectedRun(null);
    } catch (e: any) {
      console.error('Failed to clear workspace traces:', e);
    }
  };

  const fetchRuns = async () => {
    setIsLoading(true);
    if (isDemoMode) {
      setRuns(DEMO_TRACES);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getRecentTraces({ limit: 50 });
      setRuns(data || []);
    } catch {
      setRuns([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();

    // Gentle background sync interval (WebSockets provides instant live push)
    const pollInterval = setInterval(() => {
      if (!isDemoMode && document.visibilityState === 'visible') {
        api.getRecentTraces({ limit: 50 }).then((data) => {
          if (data && Array.isArray(data)) {
            setRuns(data);
          }
        }).catch(() => {});
      }
    }, 20000);

    // Subscribe to live WebSocket trace events
    const unsubscribe = wsService.subscribe((event) => {
      if (event.type === 'trace_ingested' && !isDemoMode) {
        fetchRuns();
      }
    });

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, [isDemoMode]);

  // Compute summary stats 100% dynamically based on the current runs array
  const totalCount = runs.length;
  const failedCount = runs.filter((r) => r.status === 'failed').length;
  const errorRate = totalCount > 0 ? ((failedCount / totalCount) * 100).toFixed(1) + '%' : '0.0%';

  const evaluatedRuns = runs.filter((r) => r.evaluation?.faithfulness_score != null);
  const avgQualityScore =
    evaluatedRuns.length > 0
      ? (
          (evaluatedRuns.reduce((acc, r) => acc + (r.evaluation?.faithfulness_score || 0), 0) /
            evaluatedRuns.length) *
          100
        ).toFixed(1)
      : '—';

  const totalCost = runs.reduce((acc, r) => acc + (r.cost_usd || 0), 0);

  const totalRunsDisplay = String(totalCount);
  const errorRateDisplay = totalCount === 0 ? '0.0%' : errorRate;
  const qualityDisplay = totalCount === 0 ? '—' : avgQualityScore;
  const spendDisplay = totalCost === 0 ? '$0.00' : totalCost < 1 ? `$${totalCost.toFixed(4)}` : `$${totalCost.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Demo Workspace Banner */}
      {isDemoMode && (
        <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-2xl p-4 flex items-center justify-between gap-4 glow-accent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-200 font-mono">
                Explore Demo Mode Active
              </div>
              <div className="text-[11px] text-indigo-300/80">
                You are viewing simulated multi-agent telemetry and failure investigations.
              </div>
            </div>
          </div>

          <button
            onClick={exitDemoMode}
            className="flex items-center gap-1.5 text-xs font-semibold bg-[#151B27] hover:bg-[#1C2333] text-indigo-200 border border-indigo-500/30 px-3.5 py-1.5 rounded-xl transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Demo</span>
          </button>
        </div>
      )}

      {/* Page Title & Onboarding Header */}
      <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight flex items-center gap-2.5">
            <span>Runs</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {isDemoMode ? 'Demo Workspace' : 'My Runs'}
            </span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Monitor your AI agents in real time. Investigate execution traces, detect loops and schema violations, evaluate quality, and audit token spend.
          </p>
        </div>

        {/* Primary Onboarding Actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="flex items-center gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect an Agent</span>
          </button>

          {/* Quick Security & Red-Team Hub Button */}
          <button
            onClick={() => {
              if (runs.length > 0) {
                setSelectedRun(runs[0]);
                setDrawerTab('security');
              } else {
                setIsConnectModalOpen(true);
              }
            }}
            className="flex items-center gap-2 text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-3.5 py-2.5 rounded-xl transition-all shadow-md shadow-purple-950/40"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-purple-200" />
            <span>🛡️ Red-Team & Security Audit</span>
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

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Runs"
          value={totalRunsDisplay}
          subtext="Captured workflow steps"
          icon={<Layers className="w-4 h-4 text-indigo-400" />}
        />
        <MetricCard
          label="Error Rate"
          value={errorRateDisplay}
          subtext="Failures / loops intercepted"
          icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
        />
        <MetricCard
          label="Avg Quality"
          value={qualityDisplay}
          subtext="Grounding & relevance score"
          icon={<Sparkles className="w-4 h-4 text-purple-400" />}
        />
        <MetricCard
          label="Total Spend"
          value={spendDisplay}
          subtext="Inference token cost"
          icon={<Coins className="w-4 h-4 text-emerald-400" />}
        />
      </div>

      {/* Main Runs Table & Empty State */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            {isDemoMode ? 'Demo Agent Runs' : 'Recent Runs'}
          </h2>
          {runs.length > 0 && (
            <span className="text-xs text-slate-400">
              Click any run to open deep investigation drawer
            </span>
          )}
        </div>

        {runs.length === 0 && !isLoading ? (
          <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mx-auto flex items-center justify-center">
              <Layers className="w-6 h-6 text-indigo-400" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-100 font-mono">
                No agent runs yet
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Connect your first agent to start capturing traces, detecting tool loops, and evaluating grounding.
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

              {isDemoMode ? (
                <button
                  onClick={() => setRuns(DEMO_TRACES)}
                  className="flex items-center gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl transition-all shadow"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Reload Demo Traces</span>
                </button>
              ) : (
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
          <RunList
            runs={runs}
            selectedRun={selectedRun}
            onSelectRun={(run) => {
              setSelectedRun(run);
              setDrawerTab('trace');
            }}
            onSelectTab={(run, tab) => {
              setSelectedRun(run);
              setDrawerTab(tab);
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isLoading={isLoading}
            onRefresh={fetchRuns}
            onClearWorkspace={handleClearWorkspace}
          />
        )}
      </div>

      {/* Run Detail Investigation Drawer */}
      <RunDetailDrawer
        run={selectedRun}
        initialTab={drawerTab}
        onClose={() => setSelectedRun(null)}
      />

      {/* Connect Agent Modal */}
      <ConnectAgentModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onTraceVerified={async (traceId) => {
          await fetchRuns();
          try {
            const recent = await api.getRecentTraces({ limit: 10 });
            const matching = recent?.find((r) => r.trace_id === traceId);
            if (matching) {
              setSelectedRun(matching);
            }
          } catch {
            // Ignored
          }
        }}
      />
    </div>
  );
};
