import json
import logging
from typing import Any, Dict, List, Optional
from app.schemas import ToolCallRecord

logger = logging.getLogger("agentguard.failure_detection")


class FailureDetector:
    """
    Deterministic rule-based failure detector for AI agent workflows.
    Identifies:
    1. Tool / call loops (identical consecutive or cyclic tool executions)
    2. Max-step boundary overruns
    3. JSON & Schema validation violations
    4. Timeouts & unhandled exception traces
    """

    @classmethod
    def detect_all(
        cls,
        output_result: str,
        status: Optional[str] = "success",
        step_index: Optional[int] = 0,
        max_steps_allowed: Optional[int] = None,
        tool_calls: Optional[List[ToolCallRecord]] = None,
        expected_schema: Optional[Dict[str, Any]] = None,
        explicit_failures: Optional[List[str]] = None,
    ) -> List[str]:
        failures: List[str] = list(explicit_failures or [])

        # 1. Check explicit status / exception markers
        if status == "failed" and "unhandled_exception" not in failures:
            failures.append("unhandled_exception")

        # 2. Check for tool loops
        loop_found = cls.detect_tool_loops(tool_calls)
        if loop_found and "loop_detected" not in failures:
            failures.append("loop_detected")

        # 3. Check for max step overrun
        if cls.detect_step_overrun(step_index, max_steps_allowed):
            if "max_step_overrun" not in failures:
                failures.append("max_step_overrun")

        # 4. Check schema validation
        schema_violation = cls.detect_schema_violation(output_result, expected_schema)
        if schema_violation:
            if "schema_validation_error" not in failures:
                failures.append(f"schema_validation_error: {schema_violation}")

        # 5. Check timeout indicators
        if cls.detect_timeout(output_result):
            if "timeout" not in failures:
                failures.append("timeout")

        return failures

    @classmethod
    def detect_tool_loops(cls, tool_calls: Optional[List[ToolCallRecord]]) -> bool:
        """
        Detects repetitive tool invocations:
        - 3+ identical consecutive tool calls (same tool + same arguments)
        - 2-step alternating cycles (A -> B -> A -> B)
        """
        if not tool_calls or len(tool_calls) < 3:
            return False

        # Convert tool calls to normalized signatures
        signatures = []
        for tc in tool_calls:
            if isinstance(tc, dict):
                t_name = tc.get("tool_name", "")
                t_args = tc.get("arguments", {})
            elif hasattr(tc, "tool_name"):
                t_name = tc.tool_name
                t_args = tc.arguments or {}
            else:
                continue

            try:
                args_str = json.dumps(t_args, sort_keys=True, default=str)
            except Exception:
                args_str = str(t_args)
            signatures.append(f"{t_name}:{args_str}")

        if len(signatures) < 3:
            return False

        # Check consecutive identical calls (threshold = 3)
        for i in range(len(signatures) - 2):
            if signatures[i] == signatures[i + 1] == signatures[i + 2]:
                return True

        # Check alternating cycles of length 2: A -> B -> A -> B
        if len(signatures) >= 4:
            for i in range(len(signatures) - 3):
                if (
                    signatures[i] == signatures[i + 2]
                    and signatures[i + 1] == signatures[i + 3]
                    and signatures[i] != signatures[i + 1]
                ):
                    return True

        return False

    @classmethod
    def detect_step_overrun(
        cls,
        step_index: Optional[int],
        max_steps_allowed: Optional[int],
    ) -> bool:
        """Flags when an agent exceeds its assigned step boundary."""
        if max_steps_allowed is not None and max_steps_allowed > 0:
            if (step_index or 0) >= max_steps_allowed:
                return True
        return False

    @classmethod
    def detect_schema_violation(
        cls,
        output_result: str,
        expected_schema: Optional[Dict[str, Any]],
    ) -> Optional[str]:
        """
        Validates output against expected JSON schema or basic JSON compliance.
        """
        if not expected_schema:
            return None

        # Attempt to parse JSON from output
        text = output_result.strip()
        # Handle markdown ```json code blocks
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            if end != -1:
                text = text[start:end].strip()
        elif "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            if end != -1:
                text = text[start:end].strip()

        try:
            parsed = json.loads(text)
        except Exception as e:
            return f"Invalid JSON output: {str(e)}"

        if not isinstance(parsed, dict):
            return "Output is not a valid JSON object"

        # Validate required properties if specified
        required_fields = expected_schema.get("required", [])
        if isinstance(required_fields, list):
            missing = [k for k in required_fields if k not in parsed]
            if missing:
                return f"Missing required properties: {', '.join(missing)}"

        # Validate field types if specified
        properties = expected_schema.get("properties", {})
        if isinstance(properties, dict):
            for field, spec in properties.items():
                if field in parsed and isinstance(spec, dict):
                    expected_type = spec.get("type")
                    val = parsed[field]
                    if expected_type == "string" and not isinstance(val, str):
                        return f"Field '{field}' expected string, got {type(val).__name__}"
                    elif expected_type == "number" and not isinstance(val, (int, float)):
                        return f"Field '{field}' expected number, got {type(val).__name__}"
                    elif expected_type == "array" and not isinstance(val, list):
                        return f"Field '{field}' expected array, got {type(val).__name__}"
                    elif expected_type == "boolean" and not isinstance(val, bool):
                        return f"Field '{field}' expected boolean, got {type(val).__name__}"

        return None

    @classmethod
    def detect_timeout(cls, output_result: str) -> bool:
        """Detects common timeout error patterns in output text."""
        lowered = output_result.lower()
        timeout_indicators = [
            "readtimeouterror",
            "timeouterror",
            "request timed out",
            "connection timed out",
            "execution timed out after",
            "deadline exceeded",
        ]
        return any(indicator in lowered for indicator in timeout_indicators)
