from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class ClaimEvaluation(TypedDict):
    claim: str
    is_supported: bool
    confidence: float
    explanation: str


class EvaluationState(TypedDict):
    # Inputs
    query: str
    context: Optional[str]
    output: str
    alert_threshold: float

    # Extracted Claims
    claims: List[str]
    claims_details: List[ClaimEvaluation]

    # Individual Dimension Scores (0.0 to 1.0)
    faithfulness_score: float
    relevance_score: float
    consistency_score: float

    # Aggregated Metric
    hallucination_score: float  # 0.0 = completely grounded/truthful, 1.0 = heavy hallucination
    verdict: str                # "PASS", "FLAGGED", "CRITICAL"
    reasoning: str
    judge_model: str
    eval_latency_ms: float

    # Alert Trigger Decision
    alert_triggered: bool
    error: Optional[str]
