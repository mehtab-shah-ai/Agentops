import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, Play, AlertCircle, Loader2 } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register, enterDemoMode } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const isDemoAccount = email.trim().toLowerCase() === 'demo@agentops.dev';

    try {
      if (mode === 'signup') {
        await register(email, password, organization || 'My AI Labs');
      } else {
        if (isDemoAccount) {
          try {
            await login(email, password);
          } catch {
            // If backend is waking up / offline, seamlessly enter demo mode with 0 latency
            await enterDemoMode();
          }
        } else {
          await login(email, password);
        }
      }
      navigate('/app');
    } catch (err: any) {
      if (isDemoAccount) {
        await enterDemoMode();
        navigate('/app');
      } else {
        setError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await enterDemoMode();
      navigate('/app');
    } catch {
      setError('Unable to launch demo mode.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080A0F] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top minimal header */}
      <header className="p-6 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-slate-100 font-mono tracking-tight">
            AgentOps
          </span>
        </Link>

        <button
          onClick={handleDemo}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#151B27] hover:bg-[#1C2333] border border-[#232B3E] px-3.5 py-2 rounded-xl transition-colors"
        >
          <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
          <span>Explore Demo</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#0E121B] border border-[#1F2737] rounded-2xl p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-mono">
              {mode === 'signin' ? 'Sign in to AgentOps' : 'Create an account'}
            </h1>
            <p className="text-xs text-slate-400">
              {mode === 'signin'
                ? 'Enter your credentials to access your observability workspace.'
                : 'Monitor agent traces, detect loops, and evaluate grounding.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-[#080A0F] border border-[#1F2737] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mode === 'signin'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mode === 'signup'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-3 flex flex-col gap-2 text-xs text-rose-300 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {mode === 'signin' && error.toLowerCase().includes('create account') && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="self-start ml-6 text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 flex items-center gap-1"
                >
                  <span>Click here to create this account now</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Organization / Team Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme AI Labs"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full bg-[#080A0F] border border-[#1F2737] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all font-mono"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="developer@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#080A0F] border border-[#1F2737] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#080A0F] border border-[#1F2737] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-3 rounded-xl transition-all shadow-md shadow-indigo-600/25 disabled:opacity-50 mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick seeded demo tip */}
          <div className="pt-2 border-t border-[#1F2737] text-center">
            <p className="text-[11px] text-slate-400">
              Demo credentials:{' '}
              <button
                type="button"
                onClick={() => {
                  setEmail('demo@agentops.dev');
                  setPassword('Demo12345!');
                }}
                className="text-indigo-400 hover:underline font-mono"
              >
                demo@agentops.dev / Demo12345!
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-400">
        AgentOps © 2026. Enterprise AI-Agent Observability Platform.
      </footer>
    </div>
  );
};
