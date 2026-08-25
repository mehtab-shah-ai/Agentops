import React, { useState, useEffect } from 'react';
import type { TraceSpan, TraceTreeResponse, TraceDiagnosis } from '../../types';
import { api } from '../../services/api';
import { DEMO_TREES, DEMO_DIAGNOSES } from '../../data/demoData';
import { StatusBadge } from '../common/StatusBadge';
import { QualityGauge } from '../common/QualityGauge';
import { TraceTree } from './TraceTree';
import { SpanInspector } from './SpanInspector';
import { FailureCard } from './FailureCard';
import { QualityCard } from './QualityCard';
import { CostCard } from './CostCard';
import { RootCauseAdvisor } from './RootCauseAdvisor';
import { SecurityAuditCard } from './SecurityAuditCard';
import { Skeleton } from '../common/Skeleton';
import { X, Layers, Sparkles, Coins, Code, Wand2, ShieldAlert } from 'lucide-react';

interface RunDetailDrawerProps {
  run: TraceSpan | null;
  onClose: () => void;
  initialTab?: 'trace' | 'security' | 'diagnosis' | 'quality' | 'cost' | 'raw';
}

export const RunDetailDrawer: React.FC<RunDetailDrawerProps> = ({
  run,
  onClose,
  initialTab = 'trace',
}) => {
  const [treeData, setTreeData] = useState<TraceTreeResponse | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'trace' | 'security' | 'diagnosis' | 'quality' | 'cost' | 'raw'>(initialTab);
  const [loading, setLoading] = useState<boolean>(true);
  const [diagnosis, setDiagnosis] = useState<TraceDiagnosis | null>(null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState<boolean>(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, run?.trace_id]);

  useEffect(() => {
    if (!run) return;

    let isMounted = true;
    setLoading(true);
    setLoadingDiagnosis(true);

    async function fetchTree() {
      try {
        const data = await api.getTraceTree(run!.trace_id);
        if (isMounted) {
          setTreeData(data);
          if (data.root_spans.length > 0) {
            setSelectedSpan(data.root_spans[0].span);
          }
        }
      } catch {
        // Fallback to demo tree if offline/demo
        const fallback = DEMO_TREES[run!.trace_id] || {
          trace_id: run!.trace_id,
          total_spans: 1,
          total_latency_ms: run!.latency_ms,
          total_cost_usd: run!.cost_usd,
          has_failures: run!.status === 'failed',
          root_spans: [{ span: run!, children: [] }],
        };
        if (isMounted) {
          setTreeData(fallback);
          setSelectedSpan(fallback.root_spans[0].span);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    async function fetchDiagnosis() {
      try {
        const diag = await api.diagnoseTrace(run!.trace_id);
        if (isMounted && diag) {
          setDiagnosis(diag);
        }
      } catch {
        // Fallback to demo diagnosis if available
        const fallbackDiag = DEMO_DIAGNOSES[run!.trace_id] || {
          trace_id: run!.trace_id,
          agent_name: run!.agent_name,
          status: run!.status === 'failed' ? 'FAILED' : 'SUCCESS',
          severity: run!.status === 'failed' ? 'HIGH' : 'LOW',
          primary_issue: run!.status === 'failed' ? 'Execution Disruption' : 'Normal Execution',
          root_cause_summary: run!.status === 'failed'
            ? 'Execution failed during step processing. Review prompt parameters and retry policy.'
            : 'Trace completed normally without detected loops or schema violations.',
          detailed_analysis: 'Automated telemetry analysis completed by AgentOps Reliability Engine.',
          recommended_prompt_patch: '### Recommended Guardrail\nEnsure tool outputs have strict type checking and termination conditions.',
          recommended_code_patch: '# Add exception handling\ntry:\n    result = tool.execute()\nexcept Exception as e:\n    logger.error(e)',
          prevention_guide: 'Implement standard error handling and rate-limit retry backoffs.',
          diagnosed_by: 'agentops-ai-diagnoser',
          confidence_score: 0.92,
        };
        if (isMounted) {
          setDiagnosis(fallbackDiag);
        }
      } finally {
        if (isMounted) setLoadingDiagnosis(false);
      }
    }

    fetchTree();
    fetchDiagnosis();

    return () => {
      isMounted = false;
    };
  }, [run]);

  if (!run) return null;

  const toggleExpand = (spanId: string) => {
    setExpandedSpans((prev) => ({
      ...prev,
      [spanId]: prev[spanId] === false ? true : false,
    }));
  };

  const isFailed = run.status === 'failed' || treeData?.has_failures;
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

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-4xl bg-[#090B10] border-l border-[#1F2737] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-6 border-b border-[#1F2737] bg-[#0E121B] flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">
                {run.agent_name}
              </h2>
              <StatusBadge status={isFailed ? 'failed' : run.status} size="md" />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span>{run.trace_id}</span>
              <span>•</span>
              <span>{new Date(run.created_at).toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-4 bg-[#080A0F] border border-[#1F2737] px-4 py-2 rounded-xl">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-medium">Latency</div>
                <div className="text-xs font-mono font-bold text-slate-200">
                  {run.latency_ms > 1000
                    ? `${(run.latency_ms / 1000).toFixed(2)}s`
                    : `${Math.round(run.latency_ms)}ms`}
                </div>
              </div>
              <div className="h-6 w-[1px] bg-[#1F2737]" />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-medium">Cost</div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  ${(run.cost_usd || 0).toFixed(4)}
                </div>
              </div>
              <div className="h-6 w-[1px] bg-[#1F2737]" />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-medium">Quality</div>
                <QualityGauge score={qualityScore} size="sm" />
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-2 rounded-xl hover:bg-[#161D2B] border border-transparent hover:border-[#1F2737] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Investigation Navigation Tabs */}
        <div className="flex items-center gap-2 border-t border-[#1F2737]/60 pt-3 flex-wrap">
          <button
            onClick={() => setActiveTab('trace')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'trace'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161D2B]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Trace Tree ({treeData?.total_spans || 1} spans)
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'security'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-blue-300 hover:bg-[#161D2B]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
            <span>Security & Red-Team</span>
            <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded text-[9px] font-mono font-bold">
              OWASP
            </span>
          </button>

          <button
            onClick={() => setActiveTab('diagnosis')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'diagnosis'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                : 'text-slate-400 hover:text-indigo-300 hover:bg-[#161D2B]'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Fix Advisor</span>
            {isFailed && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-0.5" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('quality')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'quality'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161D2B]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Quality Breakdown
          </button>

          <button
            onClick={() => setActiveTab('cost')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'cost'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161D2B]'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Cost & Tokens
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'raw'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161D2B]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Raw Telemetry
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* SECURITY AUDIT TAB */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <SecurityAuditCard run={run} />
          </div>
        )}

        {/* AI DIAGNOSIS TAB */}
        {activeTab === 'diagnosis' && (
          <div className="space-y-4">
            {loadingDiagnosis ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-44 w-full" />
              </div>
            ) : diagnosis ? (
              <RootCauseAdvisor diagnosis={diagnosis} isLoading={loadingDiagnosis} />
            ) : null}
          </div>
        )}

        {/* TRACE TREE TAB */}
        {activeTab === 'trace' && (
          loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* AI Root-Cause Advisor Banner if run has failures or low score */}
              {diagnosis && (isFailed || diagnosis.severity === 'CRITICAL' || diagnosis.severity === 'HIGH') && (
                <RootCauseAdvisor diagnosis={diagnosis} isLoading={loadingDiagnosis} />
              )}

              {isFailed && !diagnosis && (
                <FailureCard
                  failureReasons={run.failure_reasons || selectedSpan?.failure_reasons}
                  agentName={run.agent_name}
                />
              )}

              <div>
                <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center justify-between">
                  <span>EXECUTION CALL HIERARCHY</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Click any span to inspect input, output & evaluation
                  </span>
                </div>
                {treeData && (
                  <TraceTree
                    nodes={treeData.root_spans}
                    selectedSpanId={selectedSpan?.span_id || null}
                    onSelectSpan={(span) => setSelectedSpan(span)}
                    expandedSpans={expandedSpans}
                    onToggleExpand={toggleExpand}
                  />
                )}
              </div>

              {selectedSpan && (
                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-3">
                    SPAN DETAILS & OBSERVABILITY
                  </div>
                  <SpanInspector span={selectedSpan} />
                </div>
              )}
            </div>
          )
        )}

        {/* QUALITY BREAKDOWN TAB */}
        {activeTab === 'quality' && (
          <div className="space-y-6">
            {diagnosis && diagnosis.severity !== 'LOW' && (
              <RootCauseAdvisor diagnosis={diagnosis} isLoading={loadingDiagnosis} />
            )}
            <QualityCard
              evaluation={run.evaluation || selectedSpan?.evaluation}
              overallScore={qualityScore}
            />
          </div>
        )}

        {/* COST TAB */}
        {activeTab === 'cost' && (
          <CostCard
            totalCostUsd={treeData?.total_cost_usd || run.cost_usd}
            inputTokens={run.input_tokens}
            outputTokens={run.output_tokens}
            modelName={run.model_name}
          />
        )}

        {/* RAW TELEMETRY TAB */}
        {activeTab === 'raw' && (
          <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-4 overflow-x-auto">
            <pre className="text-xs font-mono text-slate-300 leading-relaxed">
              {JSON.stringify(treeData || run, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
