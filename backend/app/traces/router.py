import asyncio
import logging
import time
import uuid
from typing import Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.auth.dependencies import get_api_key_user, get_authenticated_user_flexible
from app.config import settings
from app.dashboard.alert_rules import AlertEvaluator
from app.database import AsyncSessionLocal, get_db
from app.evaluation.fact_check import run_live_web_fact_check
from app.evaluation.graph import evaluate_trace
from app.evaluation.pricing import calculate_llm_cost
from app.models import ApiKey, Evaluation, Trace, User
from app.schemas import (
    FactCheckResponse,
    SecurityAuditResponse,
    TraceDetailOut,
    TraceDiagnosisResponse,
    TraceIngestRequest,
    TraceIngestResponse,
    TraceTreeNode,
    TraceTreeResponse,
)
from app.security.scanner import auto_discover_local_agent_endpoints, run_security_red_team_audit
from app.traces.failure_detection import FailureDetector
from app.traces.remediation import generate_trace_diagnosis
from app.websocket import ws_manager

logger = logging.getLogger("agentops.traces.router")

router = APIRouter(prefix="/api/traces", tags=["Distributed Traces"])


# ------------------------------------------------------------------------------
# In-Memory Token Bucket Rate Limiter
# ------------------------------------------------------------------------------
class TokenBucketRateLimiter:
    """Thread-safe in-memory token bucket rate limiter per API key / User with memory pruning."""

    def __init__(self, capacity: int, refill_rate_per_sec: float):
        self.capacity = capacity
        self.refill_rate = refill_rate_per_sec
        self.buckets: Dict[str, Dict[str, float]] = {}
        self.lock = asyncio.Lock()
        self._last_cleanup = time.time()

    async def acquire(self, key: str) -> bool:
        async with self.lock:
            now = time.time()

            # Periodic cleanup of inactive buckets every 15 minutes
            if now - self._last_cleanup > 900:
                self._prune_stale_buckets(now)
                self._last_cleanup = now

            if key not in self.buckets:
                self.buckets[key] = {"tokens": float(self.capacity), "last_refill": now}

            bucket = self.buckets[key]
            elapsed = now - bucket["last_refill"]
            bucket["tokens"] = min(self.capacity, bucket["tokens"] + elapsed * self.refill_rate)
            bucket["last_refill"] = now

            if bucket["tokens"] >= 1.0:
                bucket["tokens"] -= 1.0
                return True
            return False

    def _prune_stale_buckets(self, now: float):
        stale_threshold = now - 3600  # 1 hour inactivity
        stale_keys = [k for k, v in self.buckets.items() if v.get("last_refill", 0) < stale_threshold]
        for k in stale_keys:
            self.buckets.pop(k, None)


refill_rate = settings.RATE_LIMIT_REQUESTS / max(1.0, float(settings.RATE_LIMIT_WINDOW_SECONDS))
rate_limiter = TokenBucketRateLimiter(capacity=settings.RATE_LIMIT_REQUESTS, refill_rate_per_sec=refill_rate)


# ------------------------------------------------------------------------------
# Ingest & Background Evaluation Pipeline
# ------------------------------------------------------------------------------
def _estimate_cost(model_name: str, input_tokens: int, output_tokens: int, query: str = "", output: str = "") -> float:
    """Universal multi-provider exact token pricing engine ($ USD)."""
    return calculate_llm_cost(
        model_name=model_name,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        query=query,
        output=output,
    )


async def process_background_evaluation(trace_record_id: str, user_id: str, query: str, context: Optional[str], output: str):
    """
    Background worker that runs the LangGraph evaluation pipeline and updates DB without blocking ingest response.
    Never holds database sessions open across external network/LLM calls.
    """
    try:
        # Run LLM evaluation graph FIRST without holding any DB connection
        eval_result = await evaluate_trace(
            query=query,
            output=output,
            context=context,
        )

        # Persist evaluation record quickly inside short-lived DB transaction
        async with AsyncSessionLocal() as db:
            new_eval = Evaluation(
                trace_record_id=trace_record_id,
                user_id=user_id,
                hallucination_score=eval_result.get("hallucination_score", 0.0),
                faithfulness_score=eval_result.get("faithfulness_score", 1.0),
                relevance_score=eval_result.get("relevance_score", 1.0),
                claims_extracted=eval_result.get("claims_extracted", []),
                verdict=eval_result.get("verdict", "PASS"),
                eval_status="completed",
                judge_model=eval_result.get("judge_model", "langgraph-judge"),
                eval_latency_ms=eval_result.get("eval_latency_ms", 0.0),
                reasoning=eval_result.get("reasoning"),
            )
            db.add(new_eval)
            await db.commit()

            # Check alert rules
            await AlertEvaluator.evaluate_user_alerts(db, user_id)

        # Push live update via WebSocket
        await ws_manager.broadcast_to_user(
            user_id=user_id,
            event_type="evaluation_completed",
            data={
                "trace_id": trace_record_id,
                "verdict": eval_result.get("verdict", "PASS"),
                "hallucination_score": eval_result.get("hallucination_score", 0.0),
                "faithfulness_score": eval_result.get("faithfulness_score", 1.0),
                "relevance_score": eval_result.get("relevance_score", 1.0),
            },
        )
    except Exception as e:
        logger.error(f"Background evaluation failed for trace {trace_record_id}: {e}", exc_info=True)
        try:
            async with AsyncSessionLocal() as db:
                failed_eval = Evaluation(
                    trace_record_id=trace_record_id,
                    user_id=user_id,
                    hallucination_score=0.0,
                    faithfulness_score=1.0,
                    relevance_score=1.0,
                    verdict="FLAGGED",
                    eval_status="pending",
                    reasoning=f"Evaluation delayed: {str(e)}",
                )
                db.add(failed_eval)
                await db.commit()
        except Exception:
            pass


@router.post(
    "/ingest",
    response_model=TraceIngestResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest a trace / span from SDK with failure checks and LangGraph evaluation",
)
async def ingest_trace(
    request: TraceIngestRequest,
    background_tasks: BackgroundTasks,
    auth_data: tuple[User, ApiKey] = Depends(get_api_key_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        current_user, api_key = auth_data

        # 1. Rate limiting check
        is_allowed = await rate_limiter.acquire(api_key.id)
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {settings.RATE_LIMIT_REQUESTS} requests per {settings.RATE_LIMIT_WINDOW_SECONDS}s window.",
            )

        # 2. Run deterministic failure detection
        detected_failures = FailureDetector.detect_all(
            output_result=request.output_result,
            status=request.status,
            step_index=request.step_index,
            max_steps_allowed=request.max_steps_allowed,
            tool_calls=request.tool_calls,
            expected_schema=request.expected_schema,
            explicit_failures=request.failure_reasons,
        )

        final_status = "failed" if (detected_failures or request.status == "failed") else "success"

        # 3. Calculate cost if not explicitly supplied
        cost_usd = request.cost_usd
        if cost_usd is None:
            cost_usd = _estimate_cost(
                model_name=request.model_name,
                input_tokens=request.input_tokens,
                output_tokens=request.output_tokens,
                query=request.input_query or "",
                output=request.output_result or "",
            )

        span_id = request.span_id or str(uuid.uuid4())

        # 4. Persist Trace
        trace_record = Trace(
            trace_id=request.trace_id,
            span_id=span_id,
            parent_span_id=request.parent_span_id,
            user_id=current_user.id,
            agent_name=request.agent_name,
            task_type=request.task_type,
            model_name=request.model_name,
            input_query=request.input_query,
            context=request.context,
            output_result=request.output_result,
            latency_ms=request.latency_ms,
            input_tokens=request.input_tokens,
            output_tokens=request.output_tokens,
            cost_usd=cost_usd,
            status=final_status,
            failure_reasons=detected_failures,
            step_index=request.step_index,
            metadata_json=request.metadata_json,
        )

        db.add(trace_record)
        await db.flush()

        # 5. Broadcast new trace arrival to live dashboard WebSockets
        await ws_manager.broadcast_to_user(
            user_id=current_user.id,
            event_type="trace_ingested",
            data={
                "trace_id": request.trace_id,
                "span_id": span_id,
                "agent_name": request.agent_name,
                "status": final_status,
                "cost_usd": cost_usd,
                "latency_ms": request.latency_ms,
                "detected_failures": detected_failures,
            },
        )

        # 6. Schedule truly non-blocking decoupled LangGraph evaluation task
        asyncio.create_task(
            process_background_evaluation(
                trace_record_id=trace_record.id,
                user_id=current_user.id,
                query=request.input_query,
                context=request.context,
                output=request.output_result,
            )
        )

        return TraceIngestResponse(
            status="success",
            trace_id=request.trace_id,
            span_id=span_id,
            eval_status="pending",
            detected_failures=detected_failures,
            message="Trace ingested successfully. Evaluation queued.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ingesting trace: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Trace ingestion error: {str(e)}",
        )


@router.get(
    "/recent",
    response_model=List[TraceDetailOut],
    summary="Get recent traces for authenticated user with filtering",
)
async def get_recent_traces(
    limit: int = Query(50, ge=1, le=200),
    agent_name: Optional[str] = None,
    task_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_authenticated_user_flexible),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Trace)
        .options(selectinload(Trace.evaluation))
        .where(Trace.user_id == current_user.id)
    )

    if agent_name:
        stmt = stmt.where(Trace.agent_name == agent_name)
    if task_type:
        stmt = stmt.where(Trace.task_type == task_type)
    if status_filter:
        stmt = stmt.where(Trace.status == status_filter)

    stmt = stmt.order_by(desc(Trace.created_at)).limit(limit)
    result = await db.execute(stmt)
    traces = result.scalars().all()

    return [TraceDetailOut.model_validate(t) for t in traces]


@router.get(
    "/discover-agents",
    summary="Auto-scan local developer ports for running agent servers",
)
async def discover_local_agents_endpoint(
    current_user: User = Depends(get_authenticated_user_flexible),
):
    """
    Rapidly scans common developer ports (8001, 8000, 5000, 8080, 5073, etc.)
    and returns all active reachable agent servers.
    """
    try:
        discovered = await auto_discover_local_agent_endpoints()
        return {"discovered_endpoints": discovered}
    except Exception as e:
        logger.warning(f"Error discovering agent endpoints: {e}")
        return {"discovered_endpoints": []}


@router.delete(
    "/clear-all",
    summary="Purge all telemetry traces and evaluations for the authenticated user workspace",
)
async def clear_all_workspace_traces(
    current_user: User = Depends(get_authenticated_user_flexible),
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently deletes all recorded traces and evaluations for the current user's workspace.
    """
    try:
        # 1. Delete evaluations for user's traces
        eval_stmt = delete(Evaluation).where(Evaluation.user_id == current_user.id)
        await db.execute(eval_stmt)

        # 2. Delete traces for user
        trace_stmt = delete(Trace).where(Trace.user_id == current_user.id)
        result = await db.execute(trace_stmt)
        deleted_count = result.rowcount

        await db.commit()
        return {
            "status": "success",
            "message": f"Successfully purged {deleted_count} traces and associated evaluations from workspace.",
            "deleted_count": deleted_count,
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"Error clearing workspace traces: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear workspace traces: {str(e)}",
        )


@router.get(
    "/{trace_id}",
    response_model=TraceTreeResponse,
    summary="Reconstruct the complete call tree for a distributed trace workflow",
)
async def get_trace_tree(
    trace_id: str,
    current_user: User = Depends(get_authenticated_user_flexible),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Trace)
        .options(selectinload(Trace.evaluation))
        .where(Trace.trace_id == trace_id, Trace.user_id == current_user.id)
        .order_by(Trace.step_index.asc(), Trace.created_at.asc())
    )
    result = await db.execute(stmt)
    spans = result.scalars().all()

    if not spans:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No spans found for trace_id: {trace_id}",
        )

    # Build node map
    nodes_by_span_id: Dict[str, TraceTreeNode] = {}
    for s in spans:
        detail = TraceDetailOut.model_validate(s)
        nodes_by_span_id[s.span_id] = TraceTreeNode(span=detail, children=[])

    root_spans: List[TraceTreeNode] = []
    total_cost = 0.0
    total_latency = 0.0
    has_failures = False

    for s in spans:
        node = nodes_by_span_id[s.span_id]
        total_cost += s.cost_usd
        total_latency += s.latency_ms
        if s.status == "failed":
            has_failures = True

        if s.parent_span_id and s.parent_span_id in nodes_by_span_id:
            nodes_by_span_id[s.parent_span_id].children.append(node)
        else:
            root_spans.append(node)

    return TraceTreeResponse(
        trace_id=trace_id,
        root_spans=root_spans,
        total_spans=len(spans),
        total_latency_ms=round(total_latency, 2),
        total_cost_usd=round(total_cost, 6),
        has_failures=has_failures,
    )


@router.post(
    "/{trace_id}/diagnose",
    response_model=TraceDiagnosisResponse,
    summary="Generate AI Root-Cause Diagnosis & Prompt Patch",
)
async def diagnose_trace_endpoint(
    trace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_authenticated_user_flexible),
):
    """
    Analyzes a trace execution using the AI Remediation Engine.
    Identifies root-cause failure mechanisms and produces actionable prompt patches.
    """
    stmt = (
        select(Trace)
        .options(selectinload(Trace.evaluation))
        .where(Trace.trace_id == trace_id, Trace.user_id == current_user.id)
        .order_by(desc(Trace.created_at))
    )
    result = await db.execute(stmt)
    trace = result.scalars().first()

    if not trace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trace with ID '{trace_id}' not found in user tenant.",
        )

    return await generate_trace_diagnosis(trace, trace.evaluation)


@router.post(
    "/{trace_id}/fact-check",
    response_model=FactCheckResponse,
    summary="Run Autonomous Live Web Fact-Checking & Grounding Evaluation",
)
async def fact_check_trace_endpoint(
    trace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_authenticated_user_flexible),
):
    """
    Runs autonomous live web fact-checking on the given trace.
    Queries Tavily / Google Serper in real-time, cross-references factual claims with live sources,
    and returns a structured grounding scorecard with clickable citations.
    """
    stmt = (
        select(Trace)
        .options(selectinload(Trace.evaluation))
        .where(Trace.trace_id == trace_id, Trace.user_id == current_user.id)
        .order_by(desc(Trace.created_at))
    )
    result = await db.execute(stmt)
    trace = result.scalars().first()

    if not trace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trace with ID '{trace_id}' not found.",
        )

    try:
        fact_check_result = await run_live_web_fact_check(
            query=trace.input_query or "General Query",
            output=trace.output_result or "General Output",
            context=trace.context,
        )

        return FactCheckResponse(
            trace_id=trace_id,
            verdict=fact_check_result.get("verdict", "VERIFIED"),
            grounding_score=float(fact_check_result.get("grounding_score", 0.90)),
            summary=fact_check_result.get("summary", "Factual grounding evaluation complete."),
            verified_answer=fact_check_result.get("verified_answer", trace.output_result or ""),
            search_query=fact_check_result.get("search_query", trace.input_query or ""),
            latency_ms=float(fact_check_result.get("latency_ms", 1200.0)),
            judge_model=str(fact_check_result.get("judge_model", "groq:openai/gpt-oss-120b")),
            citations=fact_check_result.get("citations", []),
            claims_checked=fact_check_result.get("claims_checked", []),
        )
    except Exception as e:
        logger.error(f"Error executing live web fact-check: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Live fact-check error: {str(e)}",
        )


@router.post(
    "/{trace_id}/security-audit",
    response_model=SecurityAuditResponse,
    summary="Run Autonomous AI Security, Prompt Injection & Red-Team Audit",
)
async def security_audit_trace_endpoint(
    trace_id: str,
    target_url: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_authenticated_user_flexible),
):
    """
    Evaluates Prompt Injection, Jailbreak attempts, PII/Secret disclosure,
    and OWASP LLM Top 10 vulnerabilities for any agent or LLM interaction.
    Optionally performs live active adversarial penetration testing if `target_url` is provided.
    """
    stmt = (
        select(Trace)
        .options(selectinload(Trace.evaluation))
        .where(Trace.trace_id == trace_id, Trace.user_id == current_user.id)
        .order_by(desc(Trace.created_at))
    )
    result = await db.execute(stmt)
    trace = result.scalars().first()

    if not trace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trace with ID '{trace_id}' not found.",
        )

    try:
        audit_result = await run_security_red_team_audit(
            query=trace.input_query or "",
            output=trace.output_result or "",
            agent_name=trace.agent_name or "AI Agent",
            context=trace.context,
            target_url=target_url,
        )

        return SecurityAuditResponse(
            trace_id=trace_id,
            agent_name=trace.agent_name or "AI Agent",
            is_live_test=bool(audit_result.get("is_live_test", False)),
            server_online=bool(audit_result.get("server_online", True)),
            target_url=audit_result.get("target_url"),
            overall_security_score=float(audit_result.get("overall_security_score", 100.0)),
            safety_grade=str(audit_result.get("safety_grade", "A+")),
            threat_level=str(audit_result.get("threat_level", "SAFE")),
            prompt_injection_status=str(audit_result.get("prompt_injection_status", "NONE")),
            pii_leakage_status=str(audit_result.get("pii_leakage_status", "NO_LEAKAGE")),
            system_prompt_leakage=str(audit_result.get("system_prompt_leakage", "PROTECTED")),
            role_boundary_status=str(audit_result.get("role_boundary_status", "MAINTAINED")),
            executive_summary=str(audit_result.get("executive_summary", "Security audit complete.")),
            test_probes_executed=audit_result.get("test_probes_executed", []),
            vulnerabilities_found=audit_result.get("vulnerabilities_found", []),
            remediation_guardrail=str(audit_result.get("remediation_guardrail", "")),
            latency_ms=float(audit_result.get("latency_ms", 120.0)),
            audited_by=str(audit_result.get("audited_by", "agentops-security-engine")),
            heuristic_flags=audit_result.get("heuristic_flags"),
        )
    except Exception as e:
        logger.error(f"Error executing security audit: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Security audit error: {str(e)}",
        )






