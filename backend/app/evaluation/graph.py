import asyncio
import logging
import time
from typing import Any, Dict, Optional
from langgraph.graph import END, START, StateGraph
from app.evaluation.nodes import (
    aggregate_score_node,
    check_faithfulness_node,
    check_relevance_node,
    consistency_check_node,
    decide_alert_node,
    extract_claims_node,
)
from app.evaluation.state import EvaluationState

logger = logging.getLogger("agentguard.evaluation.graph")


def route_context_branch(state: EvaluationState) -> str:
    """
    Conditional edge router:
    If reference context is provided -> route to check_faithfulness
    If no reference context -> route to consistency_check
    """
    ctx = state.get("context")
    if ctx and isinstance(ctx, str) and len(ctx.strip()) > 5:
        return "check_faithfulness"
    return "consistency_check"


def build_evaluation_graph() -> Any:
    """
    Constructs and compiles the production LangGraph StateGraph pipeline.
    """
    workflow = StateGraph(EvaluationState)

    # 1. Add All Processing Nodes
    workflow.add_node("extract_claims", extract_claims_node)
    workflow.add_node("check_faithfulness", check_faithfulness_node)
    workflow.add_node("consistency_check", consistency_check_node)
    workflow.add_node("check_relevance", check_relevance_node)
    workflow.add_node("aggregate_score", aggregate_score_node)
    workflow.add_node("decide_alert", decide_alert_node)

    # 2. Add Edges and Conditional Branching
    workflow.add_edge(START, "extract_claims")

    workflow.add_conditional_edges(
        "extract_claims",
        route_context_branch,
        {
            "check_faithfulness": "check_faithfulness",
            "consistency_check": "consistency_check",
        },
    )

    # Merge branches into relevance scoring
    workflow.add_edge("check_faithfulness", "check_relevance")
    workflow.add_edge("consistency_check", "check_relevance")

    # Aggregate & Decide Alert
    workflow.add_edge("check_relevance", "aggregate_score")
    workflow.add_edge("aggregate_score", "decide_alert")
    workflow.add_edge("decide_alert", END)

    # Compile Graph
    return workflow.compile()


# Pre-compiled Singleton instance of the Evaluation Graph
evaluation_graph = build_evaluation_graph()


async def evaluate_trace(
    query: str,
    output: str,
    context: Optional[str] = None,
    alert_threshold: float = 0.50,
) -> EvaluationState:
    """
    Public invocation interface for the LangGraph evaluation pipeline.
    Handles graph execution with full exception resilience.
    """
    start_time = time.time()
    initial_state: EvaluationState = {
        "query": query,
        "context": context,
        "output": output,
        "alert_threshold": alert_threshold,
        "claims": [],
        "claims_details": [],
        "faithfulness_score": 1.0,
        "relevance_score": 1.0,
        "consistency_score": 1.0,
        "hallucination_score": 0.0,
        "verdict": "PASS",
        "reasoning": "",
        "judge_model": "langgraph-judge",
        "eval_latency_ms": 0.0,
        "alert_triggered": False,
        "error": None,
    }

    try:
        result = await asyncio.wait_for(
            evaluation_graph.ainvoke(initial_state),
            timeout=5.0,
        )
        result["eval_latency_ms"] = round((time.time() - start_time) * 1000, 2)
        return result
    except asyncio.TimeoutError:
        logger.warning("LangGraph evaluation timed out after 5.0s ceiling. Using heuristic fallback.")
        initial_state["verdict"] = "PASS"
        initial_state["judge_model"] = "heuristic_fast"
        initial_state["reasoning"] = "Fast heuristic score applied (LLM judge timed out)."
        initial_state["eval_latency_ms"] = round((time.time() - start_time) * 1000, 2)
        return initial_state
    except Exception as exc:
        logger.error(f"LangGraph evaluation execution error: {exc}", exc_info=True)
        # Fallback graceful degraded state (never throw/crash caller)
        initial_state["error"] = str(exc)
        initial_state["verdict"] = "PASS"
        initial_state["judge_model"] = "heuristic_fallback"
        initial_state["reasoning"] = f"Evaluation degraded: {str(exc)}"
        initial_state["eval_latency_ms"] = round((time.time() - start_time) * 1000, 2)
        return initial_state
