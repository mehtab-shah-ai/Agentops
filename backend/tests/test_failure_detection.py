import pytest
from app.schemas import ToolCallRecord
from app.traces.failure_detection import FailureDetector


def test_tool_loop_consecutive():
    # 3 identical tool calls with same args
    tool_calls = [
        ToolCallRecord(tool_name="search_db", arguments={"query": "user_123"}),
        ToolCallRecord(tool_name="search_db", arguments={"query": "user_123"}),
        ToolCallRecord(tool_name="search_db", arguments={"query": "user_123"}),
    ]
    assert FailureDetector.detect_tool_loops(tool_calls) is True

    # Diverse calls
    diverse_calls = [
        ToolCallRecord(tool_name="search_db", arguments={"query": "user_123"}),
        ToolCallRecord(tool_name="fetch_user", arguments={"id": 123}),
        ToolCallRecord(tool_name="send_email", arguments={"to": "a@b.com"}),
    ]
    assert FailureDetector.detect_tool_loops(diverse_calls) is False


def test_tool_loop_alternating_cycle():
    # Alternating cycle: A -> B -> A -> B
    cyclic_calls = [
        ToolCallRecord(tool_name="calc", arguments={"val": 1}),
        ToolCallRecord(tool_name="check", arguments={"status": True}),
        ToolCallRecord(tool_name="calc", arguments={"val": 1}),
        ToolCallRecord(tool_name="check", arguments={"status": True}),
    ]
    assert FailureDetector.detect_tool_loops(cyclic_calls) is True


def test_step_overrun():
    # Within budget
    assert FailureDetector.detect_step_overrun(step_index=4, max_steps_allowed=10) is False
    # Exceeded budget
    assert FailureDetector.detect_step_overrun(step_index=10, max_steps_allowed=10) is True
    assert FailureDetector.detect_step_overrun(step_index=15, max_steps_allowed=10) is True
    # Unset budget
    assert FailureDetector.detect_step_overrun(step_index=50, max_steps_allowed=None) is False


def test_schema_violation():
    schema = {
        "required": ["agent_action", "confidence_score"],
        "properties": {
            "agent_action": {"type": "string"},
            "confidence_score": {"type": "number"},
        },
    }

    # Valid JSON matching schema
    valid_output = '{"agent_action": "refund_approved", "confidence_score": 0.98}'
    assert FailureDetector.detect_schema_violation(valid_output, schema) is None

    # Markdown wrapped valid JSON
    wrapped_output = '```json\n{"agent_action": "refund_approved", "confidence_score": 0.98}\n```'
    assert FailureDetector.detect_schema_violation(wrapped_output, schema) is None

    # Missing required field
    missing_output = '{"agent_action": "refund_approved"}'
    err = FailureDetector.detect_schema_violation(missing_output, schema)
    assert err is not None
    assert "confidence_score" in err

    # Wrong type
    bad_type_output = '{"agent_action": "refund_approved", "confidence_score": "high"}'
    err = FailureDetector.detect_schema_violation(bad_type_output, schema)
    assert err is not None
    assert "expected number" in err

    # Completely invalid JSON
    invalid_json = 'I decided to approve the refund without JSON formatting.'
    err = FailureDetector.detect_schema_violation(invalid_json, schema)
    assert err is not None
    assert "Invalid JSON" in err


def test_timeout_detection():
    normal_output = "The financial report was generated successfully in 3.4 seconds."
    assert FailureDetector.detect_timeout(normal_output) is False

    timeout_output = "Error: ReadTimeoutError: Connection timed out while contacting upstream database."
    assert FailureDetector.detect_timeout(timeout_output) is True


def test_detect_all_integration():
    failures = FailureDetector.detect_all(
        output_result="Execution timed out after 30000ms",
        status="failed",
        step_index=12,
        max_steps_allowed=10,
        tool_calls=[
            ToolCallRecord(tool_name="get_data", arguments={"k": 1}),
            ToolCallRecord(tool_name="get_data", arguments={"k": 1}),
            ToolCallRecord(tool_name="get_data", arguments={"k": 1}),
        ],
    )
    assert "unhandled_exception" in failures
    assert "loop_detected" in failures
    assert "max_step_overrun" in failures
    assert "timeout" in failures
