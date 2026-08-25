import type {
  User,
  ApiKey,
  TraceSpan,
  TraceTreeResponse,
  TraceDiagnosis,
  FactCheckResult,
  SecurityAuditResult,
  AlertRule,
  AlertHistory,
  CostAnalytics,
  FailureAnalytics,
  TrendsAnalytics,
} from '../types';

const BASE_URL = '';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('agentops_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      // Ignored
    }
    let message = 'An unexpected error occurred. Please try again.';
    if (typeof errorData?.detail === 'string') {
      message = errorData.detail;
    } else if (Array.isArray(errorData?.detail)) {
      message = errorData.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
    } else if (errorData?.message) {
      message = errorData.message;
    } else if (response.status === 404) {
      message = 'Account not found. Please create an account first.';
    } else if (response.status === 401) {
      message = 'Incorrect password. Please verify your credentials.';
    } else if (response.status === 500) {
      message = 'Server connection error. Please verify backend is running.';
    }
    throw new ApiError(message, response.status, errorData);
  }

  return response.json();
}

export const api = {
  // Auth
  async register(email: string, password: string, organization_name?: string) {
    return request<{ access_token: string; token_type: string; user: User }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, organization_name }),
      }
    );
  },

  async login(email: string, password: string) {
    return request<{ access_token: string; token_type: string; user: User }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
  },

  async getMe(): Promise<User> {
    return request<User>('/api/auth/me');
  },

  // API Keys
  async getApiKeys(): Promise<ApiKey[]> {
    return request<ApiKey[]>('/api/auth/keys');
  },

  async createApiKey(name: string): Promise<ApiKey & { api_key: string }> {
    return request<ApiKey & { api_key: string }>('/api/auth/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async deleteApiKey(keyId: string): Promise<{ message: string; key_id: string }> {
    return request<{ message: string; key_id: string }>(`/api/auth/keys/${keyId}`, {
      method: 'DELETE',
    });
  },

  // Traces
  async getRecentTraces(params?: {
    limit?: number;
    agent_name?: string;
    task_type?: string;
    status?: string;
  }): Promise<TraceSpan[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.agent_name) query.set('agent_name', params.agent_name);
    if (params?.task_type) query.set('task_type', params.task_type);
    if (params?.status) query.set('status', params.status);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<TraceSpan[]>(`/api/traces/recent${qs}`);
  },

  async getTraceTree(traceId: string): Promise<TraceTreeResponse> {
    return request<TraceTreeResponse>(`/api/traces/${encodeURIComponent(traceId)}`);
  },

  async ingestTrace(payload: any, customHeaders?: Record<string, string>) {
    return request('/api/traces/ingest', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: customHeaders,
    });
  },

  async diagnoseTrace(traceId: string): Promise<TraceDiagnosis> {
    return request<TraceDiagnosis>(`/api/traces/${encodeURIComponent(traceId)}/diagnose`, {
      method: 'POST',
    });
  },

  // Dashboard Analytics
  async getCosts(days = 30): Promise<CostAnalytics> {
    return request<CostAnalytics>(`/api/dashboard/costs?days=${days}`);
  },

  async getFailures(days = 7): Promise<FailureAnalytics> {
    return request<FailureAnalytics>(`/api/dashboard/failures?days=${days}`);
  },

  async getTrends(days = 14): Promise<TrendsAnalytics> {
    return request<TrendsAnalytics>(`/api/dashboard/trends?days=${days}`);
  },

  // Alerts
  async getAlertRules(): Promise<AlertRule[]> {
    return request<AlertRule[]>('/api/dashboard/alerts');
  },

  async createAlertRule(rule: {
    name: string;
    metric: string;
    threshold: number;
    window_minutes: number;
    target_email: string;
  }): Promise<AlertRule> {
    return request<AlertRule>('/api/dashboard/alerts', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  },

  async deleteAlertRule(ruleId: string): Promise<{ message: string; rule_id: string }> {
    return request<{ message: string; rule_id: string }>(`/api/dashboard/alerts/${ruleId}`, {
      method: 'DELETE',
    });
  },

  async getAlertHistory(limit = 50): Promise<AlertHistory[]> {
    return request<AlertHistory[]>(`/api/dashboard/alerts/history?limit=${limit}`);
  },

  // Autonomous Live Web Fact-Checking & Grounding
  async runLiveFactCheck(traceId: string): Promise<FactCheckResult> {
    return request<FactCheckResult>(`/api/traces/${encodeURIComponent(traceId)}/fact-check`, {
      method: 'POST',
    });
  },

  // Autonomous AI Security, Prompt Injection & Red-Team Audit
  async runSecurityAudit(traceId: string, targetUrl?: string): Promise<SecurityAuditResult> {
    const queryParam = targetUrl ? `?target_url=${encodeURIComponent(targetUrl)}` : '';
    return request<SecurityAuditResult>(`/api/traces/${encodeURIComponent(traceId)}/security-audit${queryParam}`, {
      method: 'POST',
    });
  },

  // Auto-scan local ports for running agent servers
  async discoverAgents(): Promise<{ discovered_endpoints: Array<{ url: string; status: string; latency_ms: number }> }> {
    return request<{ discovered_endpoints: Array<{ url: string; status: string; latency_ms: number }> }>(
      '/api/traces/discover-agents',
      { method: 'GET' }
    );
  },

  // Purge all workspace traces
  async clearAllTraces(): Promise<{ status: string; message: string; deleted_count?: number }> {
    return request<{ status: string; message: string; deleted_count?: number }>(
      '/api/traces/clear-all',
      { method: 'DELETE' }
    );
  },

  // Permanently delete user account and organization data
  async deleteAccount(): Promise<{ status: string; message: string }> {
    return request<{ status: string; message: string }>(
      '/api/auth/account',
      { method: 'DELETE' }
    );
  },
};

