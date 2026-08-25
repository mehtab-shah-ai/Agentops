from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.auth.dependencies import get_current_user
from app.dashboard.routing_optimizer import RoutingOptimizer
from app.database import get_db
from app.models import AlertHistory, AlertRule, Evaluation, Trace, User
from app.schemas import (
    AlertHistoryOut,
    AlertRuleCreate,
    AlertRuleOut,
    BottleneckItem,
    CostAnalyticsResponse,
    CostBreakdownItem,
    FailureAnalyticsResponse,
    RoutingRecommendationRequest,
    RoutingRecommendationResponse,
    TraceDetailOut,
    TrendsAnalyticsResponse,
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard & Analytics"])


@router.get(
    "/costs",
    response_model=CostAnalyticsResponse,
    summary="Get cost and token analytics grouped by agent, model, task type, and daily trend",
)
async def get_cost_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    base_filter = [Trace.user_id == current_user.id, Trace.created_at >= since]

    # Total spend & tokens
    total_stmt = select(
        func.coalesce(func.sum(Trace.cost_usd), 0.0),
        func.coalesce(func.sum(Trace.input_tokens + Trace.output_tokens), 0),
        func.count(Trace.id),
    ).where(*base_filter)
    total_res = (await db.execute(total_stmt)).first()
    total_cost = float(total_res[0])
    total_tokens = int(total_res[1])
    total_calls = int(total_res[2])

    # By Agent
    agent_stmt = (
        select(
            Trace.agent_name,
            func.coalesce(func.sum(Trace.cost_usd), 0.0),
            func.coalesce(func.sum(Trace.input_tokens + Trace.output_tokens), 0),
            func.count(Trace.id),
        )
        .where(*base_filter)
        .group_by(Trace.agent_name)
    )
    by_agent = [
        CostBreakdownItem(
            dimension=r[0],
            cost_usd=round(float(r[1]), 5),
            token_count=int(r[2]),
            call_count=int(r[3]),
        )
        for r in (await db.execute(agent_stmt)).all()
    ]

    # By Model
    model_stmt = (
        select(
            Trace.model_name,
            func.coalesce(func.sum(Trace.cost_usd), 0.0),
            func.coalesce(func.sum(Trace.input_tokens + Trace.output_tokens), 0),
            func.count(Trace.id),
        )
        .where(*base_filter)
        .group_by(Trace.model_name)
    )
    by_model = [
        CostBreakdownItem(
            dimension=r[0],
            cost_usd=round(float(r[1]), 5),
            token_count=int(r[2]),
            call_count=int(r[3]),
        )
        for r in (await db.execute(model_stmt)).all()
    ]

    # By Task
    task_stmt = (
        select(
            Trace.task_type,
            func.coalesce(func.sum(Trace.cost_usd), 0.0),
            func.coalesce(func.sum(Trace.input_tokens + Trace.output_tokens), 0),
            func.count(Trace.id),
        )
        .where(*base_filter)
        .group_by(Trace.task_type)
    )
    by_task = [
        CostBreakdownItem(
            dimension=r[0],
            cost_usd=round(float(r[1]), 5),
            token_count=int(r[2]),
            call_count=int(r[3]),
        )
        for r in (await db.execute(task_stmt)).all()
    ]

    # Daily Trend
    daily_stmt = (
        select(
            func.date(Trace.created_at).label("day"),
            func.coalesce(func.sum(Trace.cost_usd), 0.0),
            func.coalesce(func.sum(Trace.input_tokens + Trace.output_tokens), 0),
            func.count(Trace.id),
        )
        .where(*base_filter)
        .group_by(func.date(Trace.created_at))
        .order_by(func.date(Trace.created_at).asc())
    )
    daily_trend = [
        {
            "date": str(r[0]),
            "cost_usd": round(float(r[1]), 5),
            "tokens": int(r[2]),
            "calls": int(r[3]),
        }
        for r in (await db.execute(daily_stmt)).all()
    ]

    return CostAnalyticsResponse(
        total_cost_usd=round(total_cost, 5),
        total_tokens=total_tokens,
        total_calls=total_calls,
        by_agent=by_agent,
        by_model=by_model,
        by_task=by_task,
        daily_trend=daily_trend,
    )


@router.get(
    "/failures",
    response_model=FailureAnalyticsResponse,
    summary="Get failure rate, breakdown by category (loop, schema, timeout), and recent failures",
)
async def get_failure_analytics(
    days: int = Query(7, ge=1, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    base_filter = [Trace.user_id == current_user.id, Trace.created_at >= since]

    total_calls = (await db.execute(select(func.count(Trace.id)).where(*base_filter))).scalar() or 0
    failed_calls = (
        await db.execute(
            select(func.count(Trace.id)).where(*base_filter, Trace.status == "failed")
        )
    ).scalar() or 0

    failure_rate = (failed_calls / total_calls * 100.0) if total_calls > 0 else 0.0

    # Fetch failed traces to analyze failure reasons
    failed_traces_stmt = (
        select(Trace)
        .options(selectinload(Trace.evaluation))
        .where(*base_filter, Trace.status == "failed")
        .order_by(Trace.created_at.desc())
        .limit(200)
    )
    failed_traces = (await db.execute(failed_traces_stmt)).scalars().all()

    breakdown: dict[str, int] = {
        "loop_detected": 0,
        "max_step_overrun": 0,
        "schema_validation_error": 0,
        "timeout": 0,
        "unhandled_exception": 0,
        "other": 0,
    }
    agent_fail_counts: dict[str, int] = {}

    for t in failed_traces:
        agent_fail_counts[t.agent_name] = agent_fail_counts.get(t.agent_name, 0) + 1
        reasons = t.failure_reasons or []
        if not reasons:
            breakdown["unhandled_exception"] += 1
        else:
            for r in reasons:
                matched = False
                for key in breakdown.keys():
                    if key in r:
                        breakdown[key] += 1
                        matched = True
                        break
                if not matched:
                    breakdown["other"] += 1

    affected_agents = [
        {"agent_name": name, "failure_count": count}
        for name, count in sorted(agent_fail_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    recent_out = [TraceDetailOut.model_validate(t) for t in failed_traces[:20]]

    return FailureAnalyticsResponse(
        total_calls=total_calls,
        failed_calls=failed_calls,
        failure_rate_percent=round(failure_rate, 2),
        failures_by_type=breakdown,
        affected_agents=affected_agents,
        recent_failures=recent_out,
    )


@router.get(
    "/trends",
    response_model=TrendsAnalyticsResponse,
    summary="Get latency percentiles, quality metrics, bottlenecks, and time series trends",
)
async def get_trends_analytics(
    days: int = Query(14, ge=1, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Latencies
    latencies_stmt = (
        select(Trace.latency_ms)
        .where(Trace.user_id == current_user.id, Trace.created_at >= since)
        .order_by(Trace.latency_ms.asc())
    )
    latencies = [r[0] for r in (await db.execute(latencies_stmt)).all() if r[0] is not None]

    if latencies:
        avg_lat = sum(latencies) / len(latencies)
        p95_idx = int(len(latencies) * 0.95)
        p95_lat = latencies[min(p95_idx, len(latencies) - 1)]
    else:
        avg_lat = 0.0
        p95_lat = 0.0

    # Evaluations averages
    eval_stmt = select(
        func.coalesce(func.avg(Evaluation.faithfulness_score), 1.0),
        func.coalesce(func.avg(Evaluation.relevance_score), 1.0),
        func.coalesce(func.avg(Evaluation.hallucination_score), 0.0),
    ).where(Evaluation.user_id == current_user.id, Evaluation.created_at >= since)
    eval_res = (await db.execute(eval_stmt)).first()
    avg_faithfulness = float(eval_res[0])
    avg_relevance = float(eval_res[1])
    hallucination_rate = float(eval_res[2]) * 100.0

    # Bottleneck detection (Agents / models with high latency)
    bottlenecks_stmt = (
        select(
            Trace.agent_name,
            Trace.model_name,
            func.avg(Trace.latency_ms).label("avg_lat"),
            func.max(Trace.latency_ms).label("max_lat"),
            func.count(Trace.id).label("cnt"),
        )
        .where(Trace.user_id == current_user.id, Trace.created_at >= since)
        .group_by(Trace.agent_name, Trace.model_name)
        .order_by(desc("avg_lat"))
        .limit(10)
    )
    bottlenecks = [
        BottleneckItem(
            agent_name=r[0],
            model_name=r[1],
            avg_latency_ms=round(float(r[2]), 1),
            p95_latency_ms=round(float(r[3]), 1),
            call_count=int(r[4]),
        )
        for r in (await db.execute(bottlenecks_stmt)).all()
    ]

    # Time series
    ts_stmt = (
        select(
            func.date(Trace.created_at).label("day"),
            func.avg(Trace.latency_ms),
            func.count(Trace.id),
        )
        .where(Trace.user_id == current_user.id, Trace.created_at >= since)
        .group_by(func.date(Trace.created_at))
        .order_by(func.date(Trace.created_at).asc())
    )
    time_series = [
        {"date": str(r[0]), "avg_latency_ms": round(float(r[1] or 0), 1), "calls": int(r[2])}
        for r in (await db.execute(ts_stmt)).all()
    ]

    return TrendsAnalyticsResponse(
        avg_latency_ms=round(avg_lat, 1),
        p95_latency_ms=round(p95_lat, 1),
        avg_faithfulness_score=round(avg_faithfulness, 3),
        avg_relevance_score=round(avg_relevance, 3),
        hallucination_rate_percent=round(hallucination_rate, 2),
        bottlenecks=bottlenecks,
        time_series=time_series,
    )


@router.post(
    "/routing/recommend",
    response_model=RoutingRecommendationResponse,
    summary="Get optimized model recommendation meeting quality & latency SLAs with escalation support",
)
async def recommend_model_route(
    request: RoutingRecommendationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await RoutingOptimizer.recommend_model(
        db=db,
        user_id=current_user.id,
        task_type=request.task_type,
        min_quality_bar=request.min_quality_bar,
        max_latency_ms=request.max_latency_ms,
    )


# ------------------------------------------------------------------------------
# Alert Rules & History Endpoints
# ------------------------------------------------------------------------------
@router.get(
    "/alerts",
    response_model=List[AlertRuleOut],
    summary="List all alert rules configured for user",
)
async def list_alert_rules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AlertRule)
        .where(AlertRule.user_id == current_user.id)
        .order_by(AlertRule.created_at.desc())
    )
    result = await db.execute(stmt)
    return [AlertRuleOut.model_validate(r) for r in result.scalars().all()]


@router.post(
    "/alerts",
    response_model=AlertRuleOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new alert threshold rule",
)
async def create_alert_rule(
    request: AlertRuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    valid_metrics = ["hallucination_rate", "error_rate", "cost_threshold"]
    if request.metric not in valid_metrics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid metric. Supported: {', '.join(valid_metrics)}",
        )

    rule = AlertRule(
        user_id=current_user.id,
        name=request.name.strip(),
        metric=request.metric,
        threshold=request.threshold,
        window_minutes=request.window_minutes,
        target_email=str(request.target_email),
        is_active=request.is_active,
    )
    db.add(rule)
    await db.flush()
    return AlertRuleOut.model_validate(rule)


@router.delete(
    "/alerts/{rule_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete an alert rule",
)
async def delete_alert_rule(
    rule_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AlertRule).where(AlertRule.id == rule_id, AlertRule.user_id == current_user.id)
    rule = (await db.execute(stmt)).scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")

    await db.delete(rule)
    return {"message": "Alert rule deleted successfully", "rule_id": rule_id}


@router.get(
    "/alerts/history",
    response_model=List[AlertHistoryOut],
    summary="List triggered alert history for current user",
)
async def get_alert_history(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AlertHistory)
        .where(AlertHistory.user_id == current_user.id)
        .order_by(AlertHistory.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [AlertHistoryOut.model_validate(h) for h in result.scalars().all()]
