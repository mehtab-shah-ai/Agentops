import React, { useState, useEffect } from 'react';
import type { AlertRule, AlertHistory, TraceSpan } from '../types';
import { api } from '../services/api';
import { DEMO_ALERT_RULES, DEMO_ALERT_HISTORY, DEMO_TRACES } from '../data/demoData';
import { RunDetailDrawer } from '../components/runs/RunDetailDrawer';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Plus,
  Trash2,
  Mail,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { isDemoMode } = useAuth();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [selectedRun, setSelectedRun] = useState<TraceSpan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New Rule Form State
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [metric, setMetric] = useState('hallucination_rate');
  const [threshold, setThreshold] = useState<number>(10.0);
  const [windowMinutes, setWindowMinutes] = useState<number>(60);
  const [targetEmail, setTargetEmail] = useState('');

  const fetchAlerts = async () => {
    setIsLoading(true);
    if (isDemoMode) {
      setRules(DEMO_ALERT_RULES);
      setHistory(DEMO_ALERT_HISTORY);
      setIsLoading(false);
      return;
    }

    try {
      const [rulesData, histData] = await Promise.all([
        api.getAlertRules(),
        api.getAlertHistory(50),
      ]);
      setRules(rulesData || []);
      setHistory(histData || []);
    } catch {
      setRules([]);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [isDemoMode]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetEmail) return;

    try {
      if (isDemoMode) {
        const newRule: AlertRule = {
          id: `rule-${Date.now()}`,
          name,
          metric,
          threshold: Number(threshold),
          window_minutes: Number(windowMinutes),
          target_email: targetEmail,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        setRules([newRule, ...rules]);
      } else {
        await api.createAlertRule({
          name,
          metric,
          threshold: Number(threshold),
          window_minutes: Number(windowMinutes),
          target_email: targetEmail,
        });
        await fetchAlerts();
      }
      setIsCreating(false);
      setName('');
      setTargetEmail('');
    } catch {
      setIsCreating(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      if (!isDemoMode) {
        await api.deleteAlertRule(ruleId);
      }
      setRules(rules.filter((r) => r.id !== ruleId));
    } catch {
      setRules(rules.filter((r) => r.id !== ruleId));
    }
  };

  const inspectRelatedRun = (metricText: string) => {
    if (metricText.toLowerCase().includes('loop')) {
      setSelectedRun(DEMO_TRACES[2]); // Planner Agent tool loop
    } else if (
      metricText.toLowerCase().includes('support') ||
      metricText.toLowerCase().includes('quality') ||
      metricText.toLowerCase().includes('hallucination')
    ) {
      setSelectedRun(DEMO_TRACES[1]); // Support Agent quality drop
    } else {
      setSelectedRun(DEMO_TRACES[0]); // Research Agent
    }
  };

  // Format unit accurately according to metric type
  const formatMetricUnit = (metricName: string, value: number) => {
    const m = metricName.toLowerCase();
    if (m.includes('latency')) {
      return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
    }
    if (m.includes('cost')) {
      return `$${value.toFixed(2)}`;
    }
    return `${value}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            Alerts & SLA Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time incident detection, hallucination monitoring, and automated notifications for agent SLA violations.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Alert Rule</span>
        </button>
      </div>

      {/* Create Rule Modal / Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateRule}
          className="bg-[#0E121B] border border-indigo-500/40 rounded-2xl p-5 space-y-4 animate-in fade-in"
        >
          <h2 className="text-sm font-semibold text-slate-100 font-mono">Create Alert Rule</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Rule Name</label>
              <input
                type="text"
                required
                placeholder="e.g. High Hallucination Alert"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#080A0F] border border-[#1F2737] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Metric</label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="w-full bg-[#080A0F] border border-[#1F2737] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              >
                <option value="hallucination_rate">Hallucination Rate (%)</option>
                <option value="error_rate">Error Rate (%)</option>
                <option value="cost_threshold">Cost Threshold ($)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Trigger Threshold</label>
              <input
                type="number"
                step="0.1"
                required
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#080A0F] border border-[#1F2737] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Window (Minutes)</label>
              <input
                type="number"
                min="1"
                required
                value={windowMinutes}
                onChange={(e) => setWindowMinutes(parseInt(e.target.value) || 60)}
                className="w-full bg-[#080A0F] border border-[#1F2737] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-300">Target Email</label>
              <input
                type="email"
                required
                placeholder="alerts@company.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="w-full bg-[#080A0F] border border-[#1F2737] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow"
            >
              Save Rule
            </button>
          </div>
        </form>
      )}

      {/* Incident & Alert History */}
      <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Incident & Alert History
        </h2>

        {history.length === 0 && !isLoading ? (
          <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-8 text-center space-y-2">
            <Info className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-xs font-semibold text-slate-200 font-mono">No alerts yet</div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Alerts will appear when AgentOps detects tool loops, SLA timeouts, or high hallucination rates in your agent runs.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((item) => {
              const isCritical = item.message.includes('CRITICAL') || item.metric === 'error_rate';
              const isHigh = item.message.includes('HIGH') || item.metric === 'hallucination_rate';

              // Accurate unit formatting
              const formattedThreshold = formatMetricUnit(
                item.message.includes('Latency') ? 'latency' : item.metric,
                item.threshold
              );
              const formattedTriggered = formatMetricUnit(
                item.message.includes('Latency') ? 'latency' : item.metric,
                item.triggered_value
              );

              return (
                <div
                  key={item.id}
                  onClick={() => inspectRelatedRun(item.message)}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.005] ${
                    isCritical
                      ? 'bg-rose-950/20 border-rose-900/50 hover:border-rose-700'
                      : isHigh
                      ? 'bg-amber-950/20 border-amber-900/50 hover:border-amber-700'
                      : 'bg-[#080A0F] border-[#1F2737] hover:border-[#2D374D]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-400'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-indigo-500/20 text-indigo-400'
                      }`}
                    >
                      {isCritical ? (
                        <AlertOctagon className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 leading-snug">
                        {item.message}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1 font-mono">
                        <span>Threshold: {formattedThreshold}</span>
                        <span>•</span>
                        <span>Triggered value: {formattedTriggered}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {item.sent_to}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium self-end sm:self-center">
                    <span>Inspect run</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Configured Alert Rules */}
      <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 font-mono flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          Configured Alert Rules
        </h2>

        {rules.length === 0 && !isLoading ? (
          <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-8 text-center space-y-2">
            <ShieldCheck className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-xs font-semibold text-slate-200 font-mono">No alert rules configured</div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Create an alert rule above to automatically receive email notifications when thresholds are crossed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xs font-bold text-slate-100">{rule.name}</h3>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-slate-400 hover:text-rose-400 p-1"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs font-mono text-indigo-300">
                    {rule.metric.replace(/_/g, ' ')} &gt; {formatMetricUnit(rule.metric, rule.threshold)}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-[#1F2737]/60 flex items-center justify-between">
                  <span>Window: {rule.window_minutes}m</span>
                  <span className="truncate max-w-[140px]">{rule.target_email}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Investigation Drawer */}
      <RunDetailDrawer
        run={selectedRun}
        onClose={() => setSelectedRun(null)}
      />
    </div>
  );
};
