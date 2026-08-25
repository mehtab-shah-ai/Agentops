import React from 'react';
import type { TraceSpan } from '../../types';
import { RunRow } from './RunRow';
import { Skeleton } from '../common/Skeleton';
import { Search, RefreshCw, Layers, Trash2 } from 'lucide-react';

interface RunListProps {
  runs: TraceSpan[];
  selectedRun: TraceSpan | null;
  onSelectRun: (run: TraceSpan) => void;
  onSelectTab?: (run: TraceSpan, tab: 'trace' | 'security' | 'diagnosis') => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  onClearWorkspace?: () => void;
}

export const RunList: React.FC<RunListProps> = ({
  runs,
  selectedRun,
  onSelectRun,
  onSelectTab,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  isLoading,
  onRefresh,
  onClearWorkspace,
}) => {
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);

  const handleConfirmClear = async () => {
    if (!onClearWorkspace) return;
    setIsClearing(true);
    try {
      await onClearWorkspace();
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  const filteredRuns = runs.filter((run) => {
    const matchesSearch =
      !searchQuery ||
      run.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.input_query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.trace_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'success' && run.status === 'success') ||
      (statusFilter === 'failed' && run.status === 'failed') ||
      (statusFilter === 'review' && run.evaluation?.verdict === 'FLAGGED');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl overflow-hidden flex flex-col relative">
      {/* Clear Workspace Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0E131F] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono">Clear Workspace Telemetry</h3>
                <p className="text-[11px] text-slate-400">Permanently purge all recorded traces</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#080B12] p-3 rounded-xl border border-[#1F2737]">
              Are you sure you want to clear all telemetry traces in this workspace? This will permanently delete all captured runs, token costs, and evaluations from both the server database and dashboard.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-[#151B27] hover:bg-[#1C2333] border border-[#232B3E] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isClearing}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-950/50 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearing ? 'Purging Traces...' : 'Yes, Clear All Traces'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Controls / Filters Header */}
      <div className="p-4 border-b border-[#1F2737] flex flex-wrap items-center justify-between gap-3 bg-[#0E121B]">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by agent, query, or trace ID..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#080A0F] border border-[#1F2737] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all font-mono"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#080A0F] border border-[#1F2737] p-1 rounded-xl">
            {['all', 'success', 'review', 'failed'].map((filter) => (
              <button
                key={filter}
                onClick={() => onStatusFilterChange(filter)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors capitalize ${
                  statusFilter === filter
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161D2B]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClearWorkspace && runs.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 hover:border-rose-700/60 px-3 py-1.5 rounded-xl transition-colors"
              title="Clear all recorded workspace traces"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Workspace</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-[#161D2B] hover:bg-[#1F2737] border border-[#232B3E] px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1F2737] bg-[#0A0D14] text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              <th className="py-3 px-4">Agent / Query</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Quality</th>
              <th className="py-3 px-4">Latency</th>
              <th className="py-3 px-4">Cost</th>
              <th className="py-3 px-4 text-right">Time</th>
              <th className="py-3 pr-4 pl-1"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && runs.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-[#1F2737]/40">
                  <td className="py-4 px-4" colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            ) : filteredRuns.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No matching agent runs found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting your filters or connect an agent to ingest live traces.
                  </p>
                </td>
              </tr>
            ) : (
              filteredRuns.map((run) => (
                <RunRow
                  key={run.id || run.trace_id}
                  run={run}
                  isSelected={selectedRun?.trace_id === run.trace_id}
                  onSelect={onSelectRun}
                  onSelectTab={onSelectTab}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
