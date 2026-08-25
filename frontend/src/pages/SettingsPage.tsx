import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiKey } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  User,
  Shield,
  Info,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, isDemoMode, logout } = useAuth();
  const navigate = useNavigate();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keyName, setKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Danger Zone States
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [dangerMessage, setDangerMessage] = useState<string | null>(null);

  const fetchKeys = async () => {
    setIsLoading(true);
    if (isDemoMode) {
      setKeys([
        {
          id: 'key-demo-1',
          key_prefix: 'ag_live_52b660',
          name: 'Demo Workspace API Key',
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getApiKeys();
      setKeys(data || []);
    } catch {
      setKeys([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [isDemoMode]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isDemoMode) {
        const fallbackKey =
          'ag_live_' +
          Math.random().toString(36).substring(2) +
          Math.random().toString(36).substring(2);
        setNewlyCreatedKey(fallbackKey);
        setKeys([
          {
            id: `key-${Date.now()}`,
            key_prefix: fallbackKey.substring(0, 14),
            name: keyName || 'Production Key',
            is_active: true,
            created_at: new Date().toISOString(),
          },
          ...keys,
        ]);
      } else {
        const res = await api.createApiKey(keyName || 'Production Ingestion Key');
        setNewlyCreatedKey(res.api_key || 'ag_live_generated_key');
        await fetchKeys();
      }
      setKeyName('');
      setIsCreating(false);
    } catch {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      if (!isDemoMode) {
        await api.deleteApiKey(keyId);
      }
      setKeys(keys.filter((k) => k.id !== keyId));
    } catch {
      setKeys(keys.filter((k) => k.id !== keyId));
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Handler: Clear all workspace traces from server & frontend
  const handleClearAllTraces = async () => {
    setIsPurging(true);
    setDangerMessage(null);
    try {
      if (!isDemoMode) {
        const res = await api.clearAllTraces();
        setDangerMessage(`✅ ${res.message || 'All workspace telemetry traces cleared successfully.'}`);
      } else {
        setDangerMessage('✅ Demo workspace traces reset successfully.');
      }
    } catch (e: any) {
      setDangerMessage(`❌ Error clearing traces: ${e.message || 'Server error'}`);
    } finally {
      setIsPurging(false);
      setShowClearModal(false);
    }
  };

  // Handler: Permanently delete entire user account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setIsDeletingAccount(true);
    setDangerMessage(null);
    try {
      if (!isDemoMode) {
        await api.deleteAccount();
      }
      logout();
      navigate('/');
    } catch (e: any) {
      setDangerMessage(`❌ Error deleting account: ${e.message || 'Server error'}`);
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight flex items-center gap-2">
          <span>Settings</span>
          <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Workspace Configuration
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your organization profile, ingestion API credentials, security policies, and workspace data.
        </p>
      </div>

      {dangerMessage && (
        <div className="p-3.5 bg-blue-950/40 border border-blue-500/40 rounded-2xl text-xs text-blue-200 font-mono flex items-center justify-between">
          <span>{dangerMessage}</span>
          <button onClick={() => setDangerMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
          <User className="w-4 h-4 text-indigo-400" />
          <span>Organization Profile</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1 bg-[#080A0F] p-3.5 rounded-xl border border-[#1F2737]">
            <span className="text-[11px] text-slate-400">Account Email</span>
            <div className="font-mono text-slate-200 font-medium">{user?.email || 'admin@agentops.dev'}</div>
          </div>
          <div className="space-y-1 bg-[#080A0F] p-3.5 rounded-xl border border-[#1F2737]">
            <span className="text-[11px] text-slate-400">Organization Name</span>
            <div className="font-mono text-slate-200 font-medium">
              {user?.organization_name || 'Production Workspace'}
            </div>
          </div>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
            <Key className="w-4 h-4 text-indigo-400" />
            <span>Ingestion API Keys</span>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl transition-all shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Key</span>
          </button>
        </div>

        {/* Newly Created Key Alert */}
        {newlyCreatedKey && (
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Shield className="w-4 h-4" />
              <span>Key Generated Successfully!</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Copy this key immediately. For security reasons, you will not be able to view it again.
            </p>
            <div className="flex items-center justify-between bg-[#080A0F] border border-[#1F2737] px-3 py-2 rounded-lg font-mono text-xs text-slate-100">
              <span className="break-all">{newlyCreatedKey}</span>
              <button
                onClick={() => copyToClipboard(newlyCreatedKey, 'new-key')}
                className="text-slate-400 hover:text-emerald-400 p-1"
                title="Copy Key"
              >
                {copiedKeyId === 'new-key' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Create Key Form */}
        {isCreating && (
          <form
            onSubmit={handleCreateKey}
            className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-4 space-y-3 animate-in fade-in duration-200"
          >
            <label className="text-xs font-semibold text-slate-300 block">
              Key Name / Description
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                placeholder="e.g. Production Agent Key"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="flex-1 bg-[#0E121B] border border-[#1F2737] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow"
              >
                Generate
              </button>
            </div>
          </form>
        )}

        {/* API Keys Table & Empty State */}
        {keys.length === 0 && !isLoading ? (
          <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-8 text-center space-y-2">
            <Info className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-xs font-semibold text-slate-200 font-mono">No API keys created yet</div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Generate an API key above to authenticate trace ingestion from your LangChain, LlamaIndex, or custom agent frameworks.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#080A0F] border border-[#1F2737]"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">{k.name}</div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {k.key_prefix}••••••••••••••••
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => copyToClipboard(`${k.key_prefix}••••••••••••••••`, k.id)}
                    className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-[#161D2B] transition-colors"
                    title="Copy Prefix"
                  >
                    {copiedKeyId === k.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteKey(k.id)}
                    className="text-slate-400 hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors"
                    title="Revoke Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DANGER ZONE SECTION */}
      <div className="bg-[#12080C] border border-rose-900/50 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-xs font-bold text-rose-400 font-mono uppercase tracking-wider">
          <AlertOctagon className="w-4 h-4" />
          <span>Danger Zone</span>
        </div>

        <div className="space-y-4 divide-y divide-rose-950/60">
          {/* Action 1: Clear All Workspace Traces */}
          <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1 max-w-lg">
              <div className="text-xs font-bold text-slate-200">Purge Workspace Telemetry</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Permanently delete all captured trace spans, LLM call evaluations, and root-cause diagnostics from this workspace.
              </p>
            </div>

            <button
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 border border-rose-800/50 rounded-xl transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Workspace Traces</span>
            </button>
          </div>

          {/* Action 2: Delete Entire Account */}
          <div className="pt-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1 max-w-lg">
              <div className="text-xs font-bold text-rose-300">Delete Account & Organization</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Permanently delete your account, organization data, all API keys, traces, and alert rules. This action is completely irreversible.
              </p>
            </div>

            <button
              onClick={() => {
                setDeleteConfirmText('');
                setShowDeleteAccountModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-950/60 transition-all shrink-0"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1: Clear Traces Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0E131F] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono">Purge Workspace Telemetry</h3>
                <p className="text-[11px] text-slate-400">Delete all recorded traces and metrics</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#080B12] p-3 rounded-xl border border-[#1F2737]">
              This will permanently delete all runs and evaluations across your organization from both the server database and live dashboard.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isPurging}
                className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-[#151B27] hover:bg-[#1C2333] border border-[#232B3E] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllTraces}
                disabled={isPurging}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-950/50 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isPurging ? 'Purging Traces...' : 'Yes, Purge All Traces'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Delete Entire Account Confirmation Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#12080C] border border-rose-600 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-600/15 border border-rose-500/30">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono">Delete Account & Organization</h3>
                <p className="text-[11px] text-rose-400 font-semibold">Irreversible Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#080B12] p-3 rounded-xl border border-rose-900/40">
              All your API keys, traces, evaluations, alert rules, and credentials will be <strong className="text-rose-400">permanently destroyed</strong>. You will be logged out immediately.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-300 font-mono block">
                Type <span className="font-bold text-rose-400 uppercase">DELETE</span> below to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-[#080A0F] border border-rose-800/60 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={isDeletingAccount}
                className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-[#151B27] hover:bg-[#1C2333] border border-[#232B3E] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isDeletingAccount}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-950/60 transition-all disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingAccount ? 'Deleting Account...' : 'Permanently Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
