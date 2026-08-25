import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Evaluation, Trace
from app.schemas import RoutingRecommendationResponse

logger = logging.getLogger("agentguard.routing_optimizer")

# Baseline cost and capability catalog ($ per 1k tokens blended, default quality baseline)
DEFAULT_MODEL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "gemini-1.5-flash": {
        "cost_per_1k": 0.00015,
        "default_quality": 0.82,
        "avg_latency_ms": 380,
        "tier": 1,
    },
    "llama-3.1-8b-instant": {
        "cost_per_1k": 0.00010,
        "default_quality": 0.78,
        "avg_latency_ms": 220,
        "tier": 1,
    },
    "gpt-4o-mini": {
        "cost_per_1k": 0.00030,
        "default_quality": 0.85,
        "avg_latency_ms": 450,
        "tier": 2,
    },
    "llama-3.3-70b-versatile": {
        "cost_per_1k": 0.00075,
        "default_quality": 0.91,
        "avg_latency_ms": 650,
        "tier": 3,
    },
    "gpt-4o": {
        "cost_per_1k": 0.00500,
        "default_quality": 0.95,
        "avg_latency_ms": 820,
        "tier": 4,
    },
    "claude-3-5-sonnet": {
        "cost_per_1k": 0.00600,
        "default_quality": 0.96,
        "avg_latency_ms": 890,
        "tier": 4,
    },
}


class RoutingOptimizer:
    """
    Self-optimizing model routing engine that dynamically tracks live quality, latency,
    and cost per (model, task_type) to recommend the most cost-effective model meeting
    configured quality and latency bars, with automatic escalation on quality dips.
    """

    @classmethod
    async def recommend_model(
        cls,
        db: AsyncSession,
        user_id: str,
        task_type: str,
        min_quality_bar: float = 0.80,
        max_latency_ms: Optional[float] = None,
    ) -> RoutingRecommendationResponse:
        # 1. Fetch live historical stats for user's past calls under this task_type
        stmt = (
            select(
                Trace.model_name,
                func.count(Trace.id).label("sample_count"),
                func.avg(Trace.latency_ms).label("avg_latency"),
                func.avg(Evaluation.faithfulness_score).label("avg_faithfulness"),
                func.avg(Evaluation.relevance_score).label("avg_relevance"),
                func.avg(Evaluation.hallucination_score).label("avg_hallucination"),
            )
            .join(Evaluation, Trace.id == Evaluation.trace_record_id, isouter=True)
            .where(Trace.user_id == user_id, Trace.task_type == task_type)
            .group_by(Trace.model_name)
        )
        result = await db.execute(stmt)
        rows = result.all()

        live_stats: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            model = r.model_name
            # Quality is composite of faithfulness and relevance
            f_score = r.avg_faithfulness if r.avg_faithfulness is not None else 0.85
            r_score = r.avg_relevance if r.avg_relevance is not None else 0.85
            composite_quality = (f_score + r_score) / 2.0

            live_stats[model] = {
                "sample_count": r.sample_count,
                "avg_latency_ms": r.avg_latency or 400.0,
                "quality_score": composite_quality,
            }

        # 2. Score and sort candidates
        candidates = []
        for model_name, default_info in DEFAULT_MODEL_REGISTRY.items():
            if model_name in live_stats and live_stats[model_name]["sample_count"] >= 3:
                stats = live_stats[model_name]
                quality = stats["quality_score"]
                latency = stats["avg_latency_ms"]
                sample_count = stats["sample_count"]
                confidence = "calibrated_from_live_telemetry"
            else:
                quality = default_info["default_quality"]
                latency = default_info["avg_latency_ms"]
                sample_count = live_stats.get(model_name, {}).get("sample_count", 0)
                confidence = "catalog_baseline_estimate"

            cost_per_1k = default_info["cost_per_1k"]
            tier = default_info["tier"]

            candidates.append({
                "model_name": model_name,
                "cost_per_1k": cost_per_1k,
                "quality_score": quality,
                "avg_latency_ms": latency,
                "sample_count": sample_count,
                "tier": tier,
                "confidence": confidence,
            })

        # Filter candidates meeting quality and latency SLA
        eligible = [
            c for c in candidates
            if c["quality_score"] >= (min_quality_bar - 0.03)  # Allow small tolerance
            and (max_latency_ms is None or c["avg_latency_ms"] <= max_latency_ms)
        ]

        if not eligible:
            # Fallback to highest tier available
            eligible = sorted(candidates, key=lambda x: x["tier"], reverse=True)

        # Sort eligible by cheapest cost
        eligible.sort(key=lambda x: x["cost_per_1k"])
        best = eligible[0]

        # 3. Check for escalation condition:
        # If live telemetry shows quality dropped significantly below target, escalate
        escalation_triggered = False
        escalation_reason = None
        fallback_model = "llama-3.3-70b-versatile" if best["model_name"] != "llama-3.3-70b-versatile" else "gpt-4o"

        if best["sample_count"] >= 5 and best["quality_score"] < min_quality_bar:
            escalation_triggered = True
            escalation_reason = (
                f"Live quality score ({best['quality_score']:.2f}) dipped below threshold "
                f"({min_quality_bar:.2f}) across {best['sample_count']} traces. Escalating to {fallback_model}."
            )
            recommended_model = fallback_model
        else:
            recommended_model = best["model_name"]

        return RoutingRecommendationResponse(
            task_type=task_type,
            recommended_model=recommended_model,
            estimated_cost_per_1k_tokens=best["cost_per_1k"],
            historical_quality_score=round(best["quality_score"], 3),
            historical_avg_latency_ms=round(best["avg_latency_ms"], 1),
            sample_count=best["sample_count"],
            escalation_triggered=escalation_triggered,
            escalation_reason=escalation_reason,
            fallback_model=fallback_model,
            confidence_note=best["confidence"],
        )
