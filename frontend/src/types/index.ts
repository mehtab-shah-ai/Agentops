export interface User {
  id: string;
  email: string;
  organization_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
  api_key?: string; // only present on creation
}

export interface Evaluation {
  id: string;
  trace_record_id: string;
  hallucination_score: number;
  faithfulness_score: number;
  relevance_score: number;
  claims_extracted?: string[] | any[];
  verdict: 'PASS' | 'FLAGGED' | 'FAIL' | string;
  eval_status: 'completed' | 'pending' | 'failed' | string;
  judge_model?: string;
  eval_latency_ms?: number;
  reasoning?: string;
  created_at: string;
}

export interface TraceSpan {
  id: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string | null;
  agent_name: string;
  task_type: string;
  model_name: string;
  input_query: string;
  context?: string | null;
  output_result: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  status: 'success' | 'failed' | string;
  failure_reasons?: string[] | null;
  step_index?: number;
  metadata_json?: Record<string, any>;
  created_at: string;
  evaluation?: Evaluation | null;
}

export interface TraceTreeNode {
  span: TraceSpan;
  children: TraceTreeNode[];
}

export interface TraceTreeResponse {
  trace_id: string;
  root_spans: TraceTreeNode[];
  total_spans: number;
  total_latency_ms: number;
  total_cost_usd: number;
  has_failures: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: 'hallucination_rate' | 'error_rate' | 'cost_threshold' | string;
  threshold: number;
  window_minutes: number;
  target_email: string;
  is_active: boolean;
  created_at: string;
}

export interface AlertHistory {
  id: string;
  rule_id?: string | null;
  metric: string;
  triggered_value: number;
  threshold: number;
  message: string;
  sent_to: string;
  status: string;
  created_at: string;
}

export interface CostBreakdownItem {
  dimension: string;
  cost_usd: number;
  token_count: number;
  call_count: number;
}

export interface CostAnalytics {
  total_cost_usd: number;
  total_tokens: number;
  total_calls: number;
  by_agent: CostBreakdownItem[];
  by_model: CostBreakdownItem[];
  by_task: CostBreakdownItem[];
  daily_trend: Array<{
    date: string;
    cost_usd: number;
    tokens: number;
    calls: number;
  }>;
}

export interface FailureAnalytics {
  total_calls: number;
  failed_calls: number;
  failure_rate_percent: number;
  failures_by_type: Record<string, number>;
  affected_agents: Array<{
    agent_name: string;
    failure_count: number;
  }>;
  recent_failures: TraceSpan[];
}

export interface TrendsAnalytics {
  avg_latency_ms: number;
  p95_latency_ms: number;
  avg_faithfulness_score: number;
  avg_relevance_score: number;
  hallucination_rate_percent: number;
  bottlenecks: Array<{
    agent_name: string;
    model_name: string;
    avg_latency_ms: number;
    p95_latency_ms: number;
    call_count: number;
  }>;
  time_series: Array<{
    date: string;
    avg_latency_ms: number;
    calls: number;
  }>;
}

export interface AgentSummary {
  name: string;
  status: 'Healthy' | 'Needs Attention' | 'Degraded';
  total_runs: number;
  error_rate: number;
  avg_quality: number;
  total_spend: number;
  avg_latency_ms: number;
  last_active: string;
}

export interface TraceDiagnosis {
  trace_id: string;
  agent_name: string;
  status: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  primary_issue: string;
  root_cause_summary: string;
  detailed_analysis: string;
  recommended_prompt_patch: string;
  recommended_code_patch?: string | null;
  prevention_guide: string;
  diagnosed_by: string;
  confidence_score: number;
}

export interface FactCheckCitation {
  title: string;
  url: string;
  snippet: string;
  supports: boolean;
}

export interface FactCheckClaim {
  claim: string;
  status: 'SUPPORTED' | 'CONTRADICTED' | 'UNVERIFIED' | string;
  evidence: string;
}

export interface FactCheckResult {
  trace_id: string;
  verdict: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'FACT_MISMATCH' | 'UNVERIFIED' | string;
  grounding_score: number;
  summary: string;
  verified_answer: string;
  search_query: string;
  latency_ms: number;
  judge_model: string;
  citations: FactCheckCitation[];
  claims_checked: FactCheckClaim[];
}

export interface RedTeamProbe {
  probe_id: string;
  name: string;
  payload_tested: string;
  agent_defense: string;
  status: 'PASSED' | 'FAILED' | 'WARNING' | string;
  threat_vector: string;
}

export interface SecurityAuditResult {
  trace_id: string;
  agent_name: string;
  is_live_test?: boolean;
  server_online?: boolean;
  target_url?: string;
  overall_security_score: number;
  safety_grade: 'A+' | 'A' | 'B' | 'C' | 'F' | 'OFFLINE' | string;
  threat_level: 'SAFE' | 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'CRITICAL_THREAT' | 'SERVER_UNREACHABLE' | string;
  prompt_injection_status: 'NONE' | 'ATTEMPT_BLOCKED' | 'INJECTION_VULNERABLE' | string;
  pii_leakage_status: 'NO_LEAKAGE' | 'PII_DETECTED' | 'CRITICAL_SECRET_EXPOSED' | string;
  system_prompt_leakage: 'PROTECTED' | 'PARTIAL_LEAK' | 'FULL_LEAK' | string;
  role_boundary_status: 'MAINTAINED' | 'SLIGHT_DEVIATION' | 'VIOLATED' | string;
  executive_summary: string;
  test_probes_executed: RedTeamProbe[];
  vulnerabilities_found: string[];
  remediation_guardrail: string;
  latency_ms: number;
  audited_by: string;
  heuristic_flags?: Record<string, any>;
}


