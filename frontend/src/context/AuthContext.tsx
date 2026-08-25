import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { api } from '../services/api';
import { wsService } from '../services/websocket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, organization?: string) => Promise<void>;
  logout: () => void;
  enterDemoMode: () => Promise<void>;
  exitDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_PROFILE: User = {
  id: 'demo-user-id-01',
  email: 'demo@agentops.dev',
  organization_name: 'AI Agent Labs (Demo Preview)',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [realUser, setRealUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('agentops_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => localStorage.getItem('agentops_demo_mode') === 'true');

  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem('agentops_real_user_token') || localStorage.getItem('agentops_token');
      
      if (storedToken) {
        try {
          // Set real token in localStorage for API requests
          localStorage.setItem('agentops_token', storedToken);
          const me = await api.getMe();
          setRealUser(me);
          setToken(storedToken);
          if (!isDemoMode) {
            wsService.connect(storedToken);
          }
        } catch {
          // If token is invalid or expired
          if (!isDemoMode) {
            localStorage.removeItem('agentops_token');
            localStorage.removeItem('agentops_real_user_token');
            setToken(null);
            setRealUser(null);
          }
        }
      }
      setIsLoading(false);
    }

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      // Save real user session
      localStorage.setItem('agentops_token', res.access_token);
      localStorage.setItem('agentops_real_user_token', res.access_token);
      localStorage.removeItem('agentops_demo_mode');
      setToken(res.access_token);
      setRealUser(res.user);
      setIsDemoMode(false);
      wsService.connect(res.access_token);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, organization?: string) => {
    setIsLoading(true);
    try {
      const res = await api.register(email, password, organization);
      // Save real user session
      localStorage.setItem('agentops_token', res.access_token);
      localStorage.setItem('agentops_real_user_token', res.access_token);
      localStorage.removeItem('agentops_demo_mode');
      setToken(res.access_token);
      setRealUser(res.user);
      setIsDemoMode(false);
      wsService.connect(res.access_token);
    } finally {
      setIsLoading(false);
    }
  };

  const enterDemoMode = async () => {
    // Preserve current real token if present
    const currentRealToken = localStorage.getItem('agentops_real_user_token') || localStorage.getItem('agentops_token');
    if (currentRealToken) {
      localStorage.setItem('agentops_real_user_token', currentRealToken);
    }
    localStorage.setItem('agentops_demo_mode', 'true');
    setIsDemoMode(true);
  };

  const exitDemoMode = () => {
    localStorage.removeItem('agentops_demo_mode');
    setIsDemoMode(false);

    // Restore real user session if one was logged in
    const realToken = localStorage.getItem('agentops_real_user_token');
    if (realToken) {
      localStorage.setItem('agentops_token', realToken);
      setToken(realToken);
      api.getMe()
        .then((me) => {
          setRealUser(me);
          wsService.connect(realToken);
        })
        .catch(() => {
          logout();
        });
    } else {
      // If guest entered demo mode, exit takes them to login
      logout();
    }
  };

  const logout = () => {
    localStorage.removeItem('agentops_token');
    localStorage.removeItem('agentops_real_user_token');
    localStorage.removeItem('agentops_demo_mode');
    setToken(null);
    setRealUser(null);
    setIsDemoMode(false);
    wsService.disconnect();
  };

  // Active user to surface: Demo profile when in Demo Mode, otherwise Real User
  const activeUser = isDemoMode ? DEMO_USER_PROFILE : realUser;

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        token,
        isLoading,
        isDemoMode,
        login,
        register,
        logout,
        enterDemoMode,
        exitDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
