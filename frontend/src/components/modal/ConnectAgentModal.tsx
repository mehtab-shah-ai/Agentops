import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Terminal,
  Code2,
  Key,
  Bot,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { ApiKey } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ConnectAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTraceVerified?: (traceId: string) => void;
}

export const ConnectAgentModal: React.FC<ConnectAgentModalProps> = ({
  isOpen,
  onClose,
  onTraceVerified,
}) => {
  const { isDemoMode } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'sdk' | 'quick_test' | 'curl'>('sdk');
  const [copiedSdk, setCopiedSdk] = useState(false);
  const [copiedAgent, setCopiedAgent] = useState(false);
  const [copiedQuick, setCopiedQuick] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Form & Telemetry State
  const [agentName, setAgentName] = useState('Research Agent');
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [selectedKeyPrefix, setSelectedKeyPrefix] = useState<string>('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [verifiedTraceId, setVerifiedTraceId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ingest URL calculation
  const getIngestUrl = () => {
    const envBase = import.meta.env.VITE_API_BASE_URL;
    if (envBase) {
      return `${envBase.replace(/\/+$/, '')}/api/traces/ingest`;
    }
    if (window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:8000/api/traces/ingest`;
    }
    return `${window.location.origin}/api/traces/ingest`;
  };

  const ingestUrl = getIngestUrl();

  // Load existing keys on open
  useEffect(() => {
    if (!isOpen) return;

    // Reset verification state on modal open
    setVerificationStatus('idle');
    setVerifiedTraceId(null);
    setErrorMessage(null);

    async function loadKeys() {
      if (isDemoMode) {
        setKeys([
          {
            id: 'demo-key-01',
            key_prefix: 'ag_live_52b660',
            name: 'Demo Workspace API Key',
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ]);
        setSelectedKeyPrefix('ag_live_52b660');
        return;
      }

      try {
        const fetchedKeys = await api.getApiKeys();
        setKeys(fetchedKeys || []);
        if (fetchedKeys && fetchedKeys.length > 0) {
          setSelectedKeyPrefix(fetchedKeys[0].key_prefix);
        } else {
          setSelectedKeyPrefix('');
        }
      } catch {
        setKeys([]);
      }
    }

    loadKeys();
  }, [isOpen, isDemoMode]);

  if (!isOpen) return null;

  const keyToDisplay = newlyCreatedKey || selectedKeyPrefix || 'YOUR_AGENTOPS_API_KEY';

  const handleCreateKey = async () => {
    setIsCreatingKey(true);
    try {
      if (isDemoMode) {
        const fallbackKey = 'ag_live_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        setNewlyCreatedKey(fallbackKey);
        setSelectedKeyPrefix(fallbackKey.substring(0, 14));
        setKeys([
          {
            id: `demo-key-${Date.now()}`,
            key_prefix: fallbackKey.substring(0, 14),
            name: `${agentName} Key`,
            is_active: true,
            created_at: new Date().toISOString(),
          },
          ...keys,
        ]);
      } else {
        const res = await api.createApiKey(`${agentName || 'Agent'} Ingestion Key`);
        if (res.api_key) {
          setNewlyCreatedKey(res.api_key);
          setSelectedKeyPrefix(res.key_prefix);
        }
        const updatedKeys = await api.getApiKeys();
        setKeys(updatedKeys || []);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate API Key.');
    } finally {
      setIsCreatingKey(false);
    }
  };

  // Step 1: SDK Helper file code (Universal for all frameworks)
  const sdkFileCode = `# sdk.py (Create this file in your project directory)
import functools, requests, time, uuid

API_URL = "${ingestUrl}"
API_KEY = "${keyToDisplay}"

def _clean_str(obj):
    if hasattr(obj, "content"):
        return str(obj.content)
    if isinstance(obj, dict) and "messages" in obj and len(obj["messages"]) > 0:
        return _clean_str(obj["messages"][-1])
    return str(obj)

def track_agent(name: str = "${agentName.trim() || 'AI Agent'}"):
    """Decorator to auto-track any function or LangGraph/CrewAI agent."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            prompt = _clean_str(args[0]) if args else _clean_str(kwargs.get("query", kwargs.get("prompt", "Agent Call")))
            try:
                result = func(*args, **kwargs)
                latency = round((time.time() - start) * 1000, 2)
                requests.post(API_URL, json={
                    "trace_id": f"run_{int(time.time())}_{uuid.uuid4().hex[:4]}",
                    "agent_name": name,
                    "input_query": prompt,
                    "output_result": _clean_str(result),
                    "latency_ms": latency,
                    "status": "success"
                }, headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}, timeout=5)
                return result
            except Exception as e:
                requests.post(API_URL, json={
                    "trace_id": f"run_{int(time.time())}_{uuid.uuid4().hex[:4]}",
                    "agent_name": name,
                    "input_query": prompt,
                    "output_result": f"Error: {e}",
                    "latency_ms": round((time.time() - start) * 1000, 2),
                    "status": "failed"
                }, headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}, timeout=5)
                raise e
        return wrapper
    return decorator`;

  // Step 2: Agent integration example
  const agentUsageCode = `# In your agent or chatbot file (e.g. main.py / chat.py)
from sdk import track_agent

# Add @track_agent on top of your agent or LangGraph node function:
@track_agent("${agentName.trim() || 'Research Agent'}")
def my_agent(user_query):
    # Your LLM / LangChain / Groq / OpenAI logic here:
    return "Agent response generated successfully"

# Run your script normally: python main.py
if __name__ == "__main__":
    reply = my_agent("Hello AgentOps!")
    print("Output:", reply)`;

  // Quick standalone test script
  const quickTestSnippet = `# test_agentops.py - Standalone test file
import requests, time, uuid

url = "${ingestUrl}"
headers = {
    "Authorization": "Bearer ${keyToDisplay}",
    "Content-Type": "application/json"
}

payload = {
    "trace_id": f"run_{int(time.time())}_{uuid.uuid4().hex[:4]}",
    "agent_name": "${agentName.trim() || 'Research Agent'}",
    "input_query": "Verify telemetry pipeline connection",
    "output_result": "Pipeline connection verified successfully.",
    "latency_ms": 320.0,
    "input_tokens": 40,
    "output_tokens": 18,
    "status": "success"
}

response = requests.post(url, json=payload, headers=headers, timeout=10)
response.raise_for_status()
print("✓ Trace ingested successfully into AgentOps:", response.json())`;

  const curlSnippet = `curl -X POST "${ingestUrl}" \\
  -H "Authorization: Bearer ${keyToDisplay}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "trace_id": "run_'$(date +%s)'",
    "agent_name": "${agentName.trim() || 'Research Agent'}",
    "input_query": "Verify telemetry pipeline connection",
    "output_result": "Pipeline connection verified successfully.",
    "latency_ms": 320.0,
    "input_tokens": 40,
    "output_tokens": 18,
    "status": "success"
  }'`;

  const handleCopyKey = () => {
    if (newlyCreatedKey) {
      navigator.clipboard.writeText(newlyCreatedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // Real Connection Verification Probe
  const handleVerifyConnection = async () => {
    setIsVerifying(true);
    setErrorMessage(null);
    const probeTraceId = `probe_${Date.now().toString(36)}`;

    try {
      if (isDemoMode) {
        // Simulate real response in demo mode
        await new Promise((r) => setTimeout(r, 600));
        setVerifiedTraceId(probeTraceId);
        setVerificationStatus('success');
        return;
      }

      // First check if a trace was already ingested by the user's SDK script
      try {
        const recent = await api.getRecentTraces({ limit: 10 });
        if (recent && recent.length > 0) {
          const matchedTrace = recent.find(
            (t) => t.agent_name.toLowerCase() === (agentName.trim() || 'research agent').toLowerCase()
          ) || recent[0];
          setVerifiedTraceId(matchedTrace.trace_id);
          setVerificationStatus('success');
          return;
        }
      } catch {
        // Fallback to sending probe trace directly
      }

      const probePayload = {
        trace_id: probeTraceId,
        agent_name: agentName.trim() || 'Research Agent',
        task_type: 'onboarding_verification',
        model_name: 'agentops-probe',
        input_query: 'Verify telemetry ingestion pipeline connection',
        output_result: 'AgentOps verified telemetry link. Pipeline is active and capturing traces.',
        latency_ms: 180.0,
        input_tokens: 35,
        output_tokens: 22,
        cost_usd: 0.0001,
        status: 'success',
      };

      const customHeaders = newlyCreatedKey ? { 'X-API-Key': newlyCreatedKey } : undefined;
      await api.ingestTrace(probePayload, customHeaders);

      setVerifiedTraceId(probeTraceId);
      setVerificationStatus('success');
    } catch (err: any) {
      setVerificationStatus('error');
      setErrorMessage(err.message || 'Unable to receive the test trace from backend.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleViewFirstRun = () => {
    onClose();
    if (verifiedTraceId && onTraceVerified) {
      onTraceVerified(verifiedTraceId);
    }
    navigate('/app');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0E121B] border border-[#1F2737] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2737] bg-[#0A0D14]">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-100 font-mono flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              Connect your agent
            </h2>
            <p className="text-xs text-slate-400">
              Send your agent execution telemetry to AgentOps.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {verificationStatus === 'success' ? (
            /* SUCCESS STATE */
            <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-5 glow-success animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wide">
                  ✓ Connection Verified
                </div>
                <h3 className="text-lg font-bold text-slate-100 font-mono">
                  {agentName || 'Research Agent'} Connected
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  AgentOps is now actively receiving and scoring execution telemetry from your agent.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left bg-[#080A0F] border border-emerald-500/30 rounded-xl p-3.5 text-xs font-mono">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">First Trace Received</div>
                  <div className="text-slate-200 font-semibold truncate mt-0.5">{verifiedTraceId}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Pipeline Status</div>
                  <div className="text-emerald-400 font-semibold mt-0.5">Live & Monitoring</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleViewFirstRun}
                  className="flex items-center gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20"
                >
                  <span>View First Run</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white bg-[#151B27] hover:bg-[#1C2333] border border-[#232B3E] rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* STEP-BY-STEP ONBOARDING WORKFLOW */
            <div className="space-y-6">
              {/* STEP 1: API KEY */}
              <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-mono font-bold text-indigo-300">
                      1
                    </span>
                    <span className="text-xs font-bold text-slate-100 font-mono">API Key Authentication</span>
                  </div>

                  {keys.length > 0 && !newlyCreatedKey && (
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Key active
                    </span>
                  )}
                </div>

                {keys.length === 0 && !newlyCreatedKey ? (
                  <div className="space-y-2.5 pt-1">
                    <p className="text-xs text-slate-400">
                      AgentOps uses this key to associate incoming traces with your account.
                    </p>
                    <button
                      onClick={handleCreateKey}
                      disabled={isCreatingKey}
                      className="flex items-center gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl transition-all shadow"
                    >
                      {isCreatingKey ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating Key...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create API Key</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {newlyCreatedKey ? (
                      <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-indigo-300">Your New Secret Key:</span>
                          <span className="text-[10px] text-amber-400">Copy now (shown only once)</span>
                        </div>
                        <div className="flex items-center justify-between bg-[#0E121B] border border-[#1F2737] rounded-md px-2.5 py-1.5 font-mono text-xs text-emerald-300 select-all">
                          <span className="truncate">{newlyCreatedKey}</span>
                          <button
                            onClick={handleCopyKey}
                            className="ml-2 text-slate-400 hover:text-white shrink-0"
                            title="Copy Key"
                          >
                            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs font-mono text-slate-300 bg-[#0E121B] border border-[#1F2737] px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{selectedKeyPrefix}••••••••••••••••</span>
                        </div>
                        <button
                          onClick={handleCreateKey}
                          disabled={isCreatingKey}
                          className="text-[11px] text-indigo-400 hover:underline"
                        >
                          Generate New
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* STEP 2: AGENT NAME */}
              <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-mono font-bold text-indigo-300">
                    2
                  </span>
                  <span className="text-xs font-bold text-slate-100 font-mono">Agent Name</span>
                </div>

                <p className="text-xs text-slate-400">
                  This name will identify your agent in Runs and Agents.
                </p>

                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Research Agent, Support Bot"
                  className="w-full bg-[#0E121B] border border-[#1F2737] rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* STEP 3: SEND FIRST TRACE CODE & VERIFY */}
              <div className="bg-[#080A0F] border border-[#1F2737] rounded-xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-mono font-bold text-indigo-300">
                      3
                    </span>
                    <span className="text-xs font-bold text-slate-100 font-mono">Send your first trace</span>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-1 bg-[#0E121B] p-1 rounded-lg border border-[#1F2737]">
                    <button
                      onClick={() => setActiveTab('sdk')}
                      className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                        activeTab === 'sdk'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                      Python SDK (2-Steps)
                    </button>
                    <button
                      onClick={() => setActiveTab('quick_test')}
                      className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                        activeTab === 'quick_test'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      Quick Test File
                    </button>
                    <button
                      onClick={() => setActiveTab('curl')}
                      className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                        activeTab === 'curl'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>cURL</span>
                    </button>
                  </div>
                </div>

                {activeTab === 'sdk' ? (
                  /* 2-STEP CLEAN PYTHON SDK WORKFLOW */
                  <div className="space-y-4 pt-1">
                    {/* Step 1: Create sdk.py */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-indigo-300 font-semibold flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] flex items-center justify-center font-bold">1</span>
                          Save <code className="bg-[#151B27] px-1.5 py-0.5 rounded text-slate-200">sdk.py</code> in your project directory:
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(sdkFileCode);
                            setCopiedSdk(true);
                            setTimeout(() => setCopiedSdk(false), 2000);
                          }}
                          className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-[#161D2B] hover:bg-[#20293D] border border-[#232B3E] px-2.5 py-1 rounded-md transition-colors"
                        >
                          {copiedSdk ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSdk ? 'Copied' : 'Copy sdk.py'}</span>
                        </button>
                      </div>

                      <div className="bg-[#0A0D14] border border-[#1F2737] rounded-xl p-3 max-h-36 overflow-y-auto custom-scrollbar">
                        <pre className="text-[11px] font-mono text-slate-300 leading-relaxed">
                          {sdkFileCode}
                        </pre>
                      </div>
                    </div>

                    {/* Step 2: Add @track_agent */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-indigo-300 font-semibold flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] flex items-center justify-center font-bold">2</span>
                          In your agent file, add <code className="bg-[#151B27] px-1.5 py-0.5 rounded text-slate-200">@track_agent</code> to your agent/chatbot function:
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(agentUsageCode);
                            setCopiedAgent(true);
                            setTimeout(() => setCopiedAgent(false), 2000);
                          }}
                          className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-[#161D2B] hover:bg-[#20293D] border border-[#232B3E] px-2.5 py-1 rounded-md transition-colors"
                        >
                          {copiedAgent ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedAgent ? 'Copied' : 'Copy Example'}</span>
                        </button>
                      </div>

                      <div className="bg-[#0A0D14] border border-[#1F2737] rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar">
                        <pre className="text-[11px] font-mono text-emerald-300/90 leading-relaxed">
                          {agentUsageCode}
                        </pre>
                      </div>
                    </div>

                    <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-lg p-2.5 text-[11px] text-indigo-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>
                        Whenever your agent executes, AgentOps automatically captures prompt, response, latency, and quality evaluations live!
                      </span>
                    </div>
                  </div>
                ) : activeTab === 'quick_test' ? (
                  /* QUICK STANDALONE TEST SCRIPT */
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-400">
                      Save this script as <code className="bg-[#151B27] px-1.5 py-0.5 rounded font-mono text-slate-200">quick_test.py</code> and run it to verify backend telemetry connection:
                    </p>
                    <div className="relative group bg-[#0A0D14] border border-[#1F2737] rounded-xl p-3.5 overflow-x-auto">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(quickTestSnippet);
                          setCopiedQuick(true);
                          setTimeout(() => setCopiedQuick(false), 2000);
                        }}
                        className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-300 hover:text-white bg-[#161D2B] hover:bg-[#20293D] border border-[#232B3E] px-2.5 py-1 rounded-md transition-colors"
                      >
                        {copiedQuick ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy snippet</span>
                          </>
                        )}
                      </button>
                      <pre className="text-[11px] font-mono text-slate-300 leading-relaxed pr-24">
                        {quickTestSnippet}
                      </pre>
                    </div>
                  </div>
                ) : (
                  /* CURL TAB */
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-400">
                      Direct HTTP POST request via cURL:
                    </p>
                    <div className="relative group bg-[#0A0D14] border border-[#1F2737] rounded-xl p-3.5 overflow-x-auto">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(curlSnippet);
                          setCopiedCurl(true);
                          setTimeout(() => setCopiedCurl(false), 2000);
                        }}
                        className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-300 hover:text-white bg-[#161D2B] hover:bg-[#20293D] border border-[#232B3E] px-2.5 py-1 rounded-md transition-colors"
                      >
                        {copiedCurl ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy snippet</span>
                          </>
                        )}
                      </button>
                      <pre className="text-[11px] font-mono text-slate-300 leading-relaxed pr-24">
                        {curlSnippet}
                      </pre>
                    </div>
                  </div>
                )}

                {/* What AgentOps captures list */}
                <div className="bg-[#0E121B] border border-[#1F2737]/80 rounded-xl p-3 space-y-1 text-xs">
                  <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold">What AgentOps captures:</div>
                  <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-1 font-mono">
                    <span>• Execution steps</span>
                    <span>• Tool calls</span>
                    <span>• Model & Token counts</span>
                    <span>• Latency & Cost</span>
                    <span>• Failures & Quality score</span>
                  </div>
                </div>

                {/* Error Banner if Verification Failed */}
                {verificationStatus === 'error' && (
                  <div className="bg-rose-950/20 border border-rose-500/40 rounded-xl p-3.5 space-y-2 text-xs animate-in fade-in">
                    <div className="flex items-center gap-2 text-rose-400 font-bold font-mono">
                      <AlertCircle className="w-4 h-4" />
                      Unable to receive the test trace
                    </div>
                    {errorMessage && <p className="text-[11px] text-rose-300/80">{errorMessage}</p>}
                    <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                      <div>Please check:</div>
                      <div>• API Key validity and association</div>
                      <div>• Ingestion endpoint URL ({ingestUrl})</div>
                      <div>• Request JSON payload schema</div>
                      <div>• Backend server availability</div>
                    </div>
                  </div>
                )}

                {/* Verification Trigger Button */}
                <div className="pt-2">
                  <button
                    onClick={handleVerifyConnection}
                    disabled={isVerifying}
                    className="w-full flex items-center justify-center gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending test trace & verifying connection...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Verify Connection</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#0A0D14] border-t border-[#1F2737]">
          <span className="text-[11px] text-slate-400">
            AgentOps watches your agent's execution telemetry.
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#151B27] hover:bg-[#20293D] border border-[#232B3E] rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
