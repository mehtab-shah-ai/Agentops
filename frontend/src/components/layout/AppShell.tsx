import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { wsService } from '../../services/websocket';
import { ConnectAgentModal } from '../modal/ConnectAgentModal';
import { BrandLogo } from '../common/BrandLogo';
import {
  Layers,
  Bot,
  Bell,
  Settings,
  LogOut,
  Plus,
  Menu,
  X,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, logout, isDemoMode, exitDemoMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = wsService.subscribe((event) => {
      if (event.type === 'status') {
        setIsLive(event.data.connected);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const navItems = [
    { label: 'Runs', path: '/app', icon: Layers },
    { label: 'Agents', path: '/app/agents', icon: Bot },
    { label: 'Alerts', path: '/app/alerts', icon: Bell },
  ];

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-[#080A0F] text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Nav */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-[#1F2737] bg-[#0E121B]">
        <Link to="/app">
          <BrandLogo size="sm" />
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-400 p-1.5 rounded-lg border border-[#1F2737]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar (Desktop) */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-40 w-64 bg-[#0B0E17] border-r border-[#1F2737] p-4 flex flex-col justify-between transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Brand Logo */}
          <Link to="/app" className="block px-2 py-1.5">
            <BrandLogo size="md" />
          </Link>

          {/* Primary Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/app'
                  ? location.pathname === '/app'
                  : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#131824] border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="h-[1px] bg-[#1F2737]" />

          {/* Secondary Navigation */}
          <nav className="space-y-1">
            <Link
              to="/app/settings"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                location.pathname.startsWith('/app/settings')
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131824] border border-transparent'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        {/* Bottom User Area */}
        <div className="space-y-3 pt-4 border-t border-[#1F2737]">
          {isDemoMode && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5 text-center space-y-1.5">
              <div className="text-[11px] text-indigo-300 font-mono font-medium">Demo Workspace Active</div>
              <button
                onClick={exitDemoMode}
                className="w-full text-[10px] font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 py-1 rounded-lg border border-indigo-500/30 transition-colors"
              >
                Exit Demo Mode
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-2">
            <div className="min-w-0 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-300">
                {(user?.email || 'A')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                  {user?.email || 'developer'}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {user?.organization_name || 'Organization'}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top App Header */}
        <header className="h-16 border-b border-[#1F2737] bg-[#0E121B] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isLive ? 'bg-emerald-400 animate-live-pulse' : 'bg-slate-500'
                }`}
              />
              <span className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1">
                {isLive ? 'Live Stream' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl transition-all shadow-sm shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Agent</span>
            </button>
          </div>
        </header>

        {/* Demo Mode Notice Banner */}
        {isDemoMode && (
          <div className="bg-gradient-to-r from-indigo-950/90 via-purple-950/80 to-indigo-950/90 border-b border-indigo-500/30 px-6 py-2 flex items-center justify-between text-xs text-indigo-200 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[10px] uppercase tracking-wider border border-indigo-500/40">
                Demo Preview Mode
              </span>
              <span className="hidden sm:inline text-slate-300">
                You are currently viewing preloaded sample agent traces. Your real account is clean and isolated.
              </span>
            </div>
            <button
              onClick={exitDemoMode}
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg transition-colors shadow-sm shrink-0"
            >
              Exit Demo Mode
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Connect Agent Modal */}
      <ConnectAgentModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />
    </div>
  );
};
