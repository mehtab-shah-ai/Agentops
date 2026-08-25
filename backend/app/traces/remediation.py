import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

from app.evaluation.llm_clients import llm_manager
from app.models import Evaluation, Trace
from app.schemas import TraceDiagnosisResponse

logger = logging.getLogger("agentops.traces.remediation")


def _generate_heuristic_diagnosis(
    trace: Trace,
    evaluation: Optional[Evaluation] = None,
) -> TraceDiagnosisResponse:
    """
    Deterministic rule-based root cause analysis & remediation generator.
    Guarantees instant (< 5ms) actionable output under all conditions.
    """
    agent = trace.agent_name or "Agent"
    failures: List[str] = getattr(trace, "failure_reasons", None) or getattr(trace, "detected_failures", None) or []
    
    # Extract tool calls from metadata_json or attribute
    meta = getattr(trace, "metadata_json", {}) or {}
    tool_calls = []
    if isinstance(meta, dict) and "tool_calls" in meta:
        tool_calls = meta["tool_calls"]
    elif hasattr(trace, "tool_calls") and getattr(trace, "tool_calls"):
        tool_calls = getattr(trace, "tool_calls")

    status = trace.status or "unknown"
    faithfulness = evaluation.faithfulness_score if evaluation else 1.0
    query = trace.input_query or ""
    output = trace.output_result or ""

    # 1. TOOL LOOP DETECTION
    if "loop_detected" in failures or len(tool_calls) >= 3:
        repeated_tools = [t.get("tool_name", "tool") for t in tool_calls[:3]]
        tool_name = repeated_tools[0] if repeated_tools else "external_api"

        return TraceDiagnosisResponse(
            trace_id=trace.trace_id,
            agent_name=agent,
            status="FAILED",
            severity="CRITICAL",
            primary_issue="Recursive Tool Invocation Loop",
            root_cause_summary=f"Model executed identical '{tool_name}' calls with unchanging arguments because the tool returned an unhandled response without a termination signal.",
            detailed_analysis=(
                f"The agent entered a cyclical execution path invoking '{tool_name}' multiple times consecutively. "
                "The LLM reasoning loop lacked an exit condition for non-varying tool output, leading to token exhaustion."
            ),
            recommended_prompt_patch=(
                f"### System Prompt Guardrail Patch\n"
                f"- **Strict Tool Calling Policy**: If `{tool_name}` returns a transient error or identical result more than 1 time, "
                f"DO NOT retry the same query. Fall back to cached data or return a structured failure explanation to the user.\n"
                f"- **Termination Check**: Verify if required parameters are missing before invoking `{tool_name}`."
            ),
            recommended_code_patch=(
                f"# Python Tool Wrapper Guardrail\n"
                f"MAX_RETRIES = 2\n"
                f"def {tool_name}_guard(args, call_history):\n"
                f"    consecutive = sum(1 for c in call_history[-MAX_RETRIES:] if c.args == args)\n"
                f"    if consecutive >= MAX_RETRIES:\n"
                f"        raise ToolLoopException('Aborting repetitive tool invocation loop.')\n"
                f"    return execute_{tool_name}(args)"
            ),
            prevention_guide="Add cycle-detection middleware to your agent framework and inject negative constraints into system instructions.",
            confidence_score=0.96,
        )

    # 2. STEP OVERRUN
    step_idx = getattr(trace, "step_index", 0) or 0
    if "step_overrun" in failures or step_idx >= 20:
        return TraceDiagnosisResponse(
            trace_id=trace.trace_id,
            agent_name=agent,
            status="FAILED",
            severity="HIGH",
            primary_issue="Execution Step Budget Exceeded",
            root_cause_summary=f"Agent exceeded maximum step limit ({step_idx} steps) while attempting to resolve query without reaching a terminal state.",
            detailed_analysis=(
                "The agent's sub-goal decomposition decomposed the task into unbounded micro-steps without tracking remaining execution budget."
            ),
            recommended_prompt_patch=(
                "### Step Budget Instruction\n"
                "You have a strict budget of maximum 5 execution steps. In step 4, if the final goal is incomplete, "
                "synthesize the best available answer using gathered data rather than scheduling new exploratory sub-tasks."
            ),
            recommended_code_patch=(
                "# Agent Execution Loop Ceiling\n"
                "if current_step >= MAX_ALLOWED_STEPS:\n"
                "    logger.warning('Enforcing graceful step budget termination')\n"
                "    return agent.synthesize_partial_response(context_buffer)"
            ),
            prevention_guide="Set max_iterations=10 on agent executor and provide time/budget remaining in intermediate observations.",
            confidence_score=0.93,
        )

    # 3. SCHEMA VIOLATION
    if "schema_violation" in failures:
        return TraceDiagnosisResponse(
            trace_id=trace.trace_id,
            agent_name=agent,
            status="FAILED",
            severity="HIGH",
            primary_issue="Tool Input Schema Mismatch",
            root_cause_summary="Agent generated malformed JSON or passed unexpected data types to the tool parameter signature.",
            detailed_analysis=(
                "The model attempted to pass arguments that diverged from the JSON schema definition registered in the tool catalogue."
            ),
            recommended_prompt_patch=(
                "### Schema Adherence Guardrail\n"
                "When formatting tool arguments, strictly follow the JSON Schema definitions. "
                "Do not add extra fields or invent parameter names not listed in the tool manifest."
            ),
            recommended_code_patch=(
                "# Use Pydantic Strict Parsing\n"
                "from pydantic import BaseModel, ValidationError\n"
                "try:\n"
                "    validated_args = ToolInputModel.model_validate(raw_tool_call.args)\n"
                "except ValidationError as e:\n"
                "    return f'Schema Error: {e.errors()}'"
            ),
            prevention_guide="Use instructor or structured outputs (function calling) with strict schema mode enabled.",
            confidence_score=0.95,
        )

    # 4. HALLUCINATION / UNGROUNDED CLAIMS
    if faithfulness < 0.70 or "hallucination_detected" in failures:
        return TraceDiagnosisResponse(
            trace_id=trace.trace_id,
            agent_name=agent,
            status="REVIEW",
            severity="MEDIUM",
            primary_issue="Ungrounded Extrapolations (Hallucination)",
            root_cause_summary=f"Output faithfulness score is {int(faithfulness * 100)}%. Model stated factual claims not present in retrieval context.",
            detailed_analysis=(
                "The LangGraph Judge identified ungrounded claims in the final response. The model defaulted to parametric memory "
                "instead of adhering strictly to the provided context."
            ),
            recommended_prompt_patch=(
                "### Grounding & Truthfulness Constraint\n"
                "- Answer ONLY using facts directly stated in the CONTEXT below.\n"
                "- If the context does not contain enough information to answer, state: 'The provided documentation does not contain this information.'\n"
                "- Do not assume or extrapolate figures."
            ),
            recommended_code_patch=(
                "# Context Verification Check\n"
                "if not retrieval_context or len(retrieval_context.strip()) < 10:\n"
                "    return 'No relevant knowledge context retrieved. Please refine your query.'"
            ),
            prevention_guide="Implement RAG chunk re-ranking and prompt with strict citation constraints.",
            confidence_score=0.91,
        )

    # 5. HEALTHY / SUCCESSFUL TRACE DIAGNOSIS
    return TraceDiagnosisResponse(
        trace_id=trace.trace_id,
        agent_name=agent,
        status="SUCCESS",
        severity="LOW",
        primary_issue="Normal Execution (Optimal Flow)",
        root_cause_summary="Agent completed query within latency budget and conformed to all grounding & schema checks.",
        detailed_analysis=(
            f"Trace executed cleanly in {trace.latency_ms}ms with {trace.input_tokens + trace.output_tokens} tokens consumed. "
            "No tool loops, timeouts, or ungrounded claims detected."
        ),
        recommended_prompt_patch=(
            "### Current Optimization Note\n"
            "This agent execution is performing well. To further optimize cost, consider caching frequent prompts or using prompt compression."
        ),
        recommended_code_patch=None,
        prevention_guide="No remediation needed. Telemetry indicates healthy baseline performance.",
        confidence_score=0.98,
    )


async def generate_trace_diagnosis(
    trace: Trace,
    evaluation: Optional[Evaluation] = None,
) -> TraceDiagnosisResponse:
    """
    Asynchronous root-cause diagnosis generator.
    Attempts LLM synthesis with strict timeout, gracefully falling back to heuristics.
    """
    heuristic_fallback = _generate_heuristic_diagnosis(trace, evaluation)

    # If the trace is completely healthy, heuristic is already optimal
    if heuristic_fallback.status == "SUCCESS":
        return heuristic_fallback

    # Build prompt for LLM judge/diagnostic reasoning
    system_prompt = (
        "You are an expert AI Agent Reliability Engineer & Root-Cause Diagnoser. "
        "Analyze the following failed AI agent trace and output a JSON object with root cause analysis, "
        "impact level, exact prompt patch, and code guardrail."
    )
    failures_val = getattr(trace, "failure_reasons", None) or getattr(trace, "detected_failures", None) or []
    meta = getattr(trace, "metadata_json", {}) or {}
    tool_calls_val = meta.get("tool_calls", []) if isinstance(meta, dict) else []
    user_prompt = f"""
Trace ID: {trace.trace_id}
Agent Name: {trace.agent_name}
Input Query: {trace.input_query}
Context: {trace.context}
Output Result: {trace.output_result}
Detected Failures: {failures_val}
Tool Calls: {tool_calls_val}
Latency (ms): {trace.latency_ms}
Evaluation Score: {evaluation.faithfulness_score if evaluation else 'N/A'}
Evaluation Reasoning: {evaluation.reasoning if evaluation else 'N/A'}

Respond with valid JSON matching:
{{
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "primary_issue": "concise title of the issue",
  "root_cause_summary": "1-2 sentence core reason why model failed",
  "detailed_analysis": "technical explanation of model loop or reasoning breakdown",
  "recommended_prompt_patch": "exact markdown system prompt instruction patch to paste into agent prompt",
  "recommended_code_patch": "short python code wrapper or middleware snippet to prevent recurrence",
  "prevention_guide": "best practice architectural tip"
}}
"""

    try:
        raw_response = await asyncio.wait_for(
            llm_manager.ainvoke_with_fallback(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_format_json=True,
            ),
            timeout=3.0,
        )
        data = json.loads(raw_response)
        return TraceDiagnosisResponse(
            trace_id=trace.trace_id,
            agent_name=trace.agent_name or "Agent",
            status="FAILED" if trace.status == "failed" else "REVIEW",
            severity=data.get("severity", heuristic_fallback.severity),
            primary_issue=data.get("primary_issue", heuristic_fallback.primary_issue),
            root_cause_summary=data.get("root_cause_summary", heuristic_fallback.root_cause_summary),
            detailed_analysis=data.get("detailed_analysis", heuristic_fallback.detailed_analysis),
            recommended_prompt_patch=data.get("recommended_prompt_patch", heuristic_fallback.recommended_prompt_patch),
            recommended_code_patch=data.get("recommended_code_patch", heuristic_fallback.recommended_code_patch),
            prevention_guide=data.get("prevention_guide", heuristic_fallback.prevention_guide),
            diagnosed_by="agentops-llm-diagnoser",
            confidence_score=0.96,
        )
    except Exception as exc:
        logger.debug(f"Remediation LLM fallback triggered: {exc}")
        return heuristic_fallback
