import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { RunsPage } from './pages/RunsPage';
import { AgentsPage } from './pages/AgentsPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppShell } from './components/layout/AppShell';

// Protected Route Wrapper
const ProtectedLayout: React.FC = () => {
  const { user, isLoading, isDemoMode } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080A0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <div className="text-xs font-mono text-slate-400">Loading AgentOps...</div>
        </div>
      </div>
    );
  }

  if (!user && !isDemoMode) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<RunsPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AppShell>
  );
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/app/*" element={<ProtectedLayout />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
