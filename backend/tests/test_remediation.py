import pytest
from app.models import Trace, Evaluation
from app.traces.remediation import generate_trace_diagnosis, _generate_heuristic_diagnosis


@pytest.mark.asyncio
async def test_remediation_tool_loop_diagnosis():
    trace = Trace(
        trace_id="test_loop_trace_01",
        span_id="span_root",
        user_id="user-001",
        agent_name="Planner Agent",
        status="failed",
        failure_reasons=["loop_detected"],
        input_query="Fetch real-time pricing",
        output_result="Failed after retrying",
        metadata_json={
            "tool_calls": [
                {"tool_name": "fetch_pricing", "arguments": {"part": "STM32"}},
                {"tool_name": "fetch_pricing", "arguments": {"part": "STM32"}},
                {"tool_name": "fetch_pricing", "arguments": {"part": "STM32"}},
            ]
        },
        latency_ms=3500.0,
        input_tokens=400,
        output_tokens=60,
    )

    diagnosis = await generate_trace_diagnosis(trace)
    assert diagnosis.trace_id == "test_loop_trace_01"
    assert diagnosis.agent_name == "Planner Agent"
    assert diagnosis.severity in ["CRITICAL", "HIGH"]
    assert "Loop" in diagnosis.primary_issue or "Recursive" in diagnosis.primary_issue
    assert "System Prompt" in diagnosis.recommended_prompt_patch
    assert diagnosis.recommended_code_patch is not None


@pytest.mark.asyncio
async def test_remediation_hallucination_diagnosis():
    trace = Trace(
        trace_id="test_hallucination_trace_01",
        span_id="span_root",
        user_id="user-001",
        agent_name="Research Agent",
        status="success",
        failure_reasons=["hallucination_detected"],
        input_query="What is the interest rate?",
        output_result="The interest rate is 12.5% fixed for 30 years.",
        context="Standard interest rate is 6.2% variable.",
        latency_ms=1200.0,
        input_tokens=200,
        output_tokens=50,
    )
    eval_obj = Evaluation(
        faithfulness_score=0.45,
        relevance_score=0.90,
        hallucination_score=0.55,
        verdict="FLAGGED",
        reasoning="Extrapolated factual claims not present in context.",
    )

    diagnosis = await generate_trace_diagnosis(trace, eval_obj)
    assert diagnosis.trace_id == "test_hallucination_trace_01"
    assert "Hallucination" in diagnosis.primary_issue or "Ungrounded" in diagnosis.primary_issue
    assert "Grounding" in diagnosis.recommended_prompt_patch or "Constraint" in diagnosis.recommended_prompt_patch


@pytest.mark.asyncio
async def test_remediation_healthy_trace():
    trace = Trace(
        trace_id="test_healthy_trace_01",
        span_id="span_root",
        user_id="user-001",
        agent_name="Document Agent",
        status="success",
        failure_reasons=[],
        input_query="Format financial table",
        output_result="Table formatted successfully.",
        latency_ms=450.0,
        input_tokens=150,
        output_tokens=45,
    )

    diagnosis = await generate_trace_diagnosis(trace)
    assert diagnosis.status == "SUCCESS"
    assert diagnosis.severity == "LOW"
