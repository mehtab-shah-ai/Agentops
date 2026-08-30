import json
from unittest.mock import AsyncMock, patch
import pytest
from langchain_core.messages import AIMessage
from app.evaluation.graph import evaluate_trace, evaluation_graph
from app.evaluation.llm_clients import LLMClientManager


@pytest.mark.asyncio
async def test_evaluation_graph_with_context():
    # Mock LLM manager to return structured responses
    with patch("app.evaluation.nodes.llm_manager.ainvoke_with_fallback") as mock_invoke:
        # Mock responses in order:
        # 1. extract_claims -> ["Product X costs $49.99"]
        # 2. check_faithfulness -> [{"claim": "Product X costs $49.99", "is_supported": true, "confidence": 1.0, "explanation": "Direct match"}]
        # 3. check_relevance -> {"relevance_score": 0.95}
        mock_invoke.side_effect = [
            (json.dumps(["Product X costs $49.99"]), "groq:llama-3.3-70b-versatile"),
            (json.dumps([{"claim": "Product X costs $49.99", "is_supported": True, "confidence": 1.0, "explanation": "Matches"}]), "groq:llama-3.3-70b-versatile"),
            (json.dumps({"relevance_score": 0.95}), "groq:llama-3.3-70b-versatile"),
        ]

        result = await evaluate_trace(
            query="What is the price of Product X?",
            context="Catalog: Product X costs $49.99 with free shipping.",
            output="Product X costs $49.99.",
            alert_threshold=0.50,
        )

        assert result["verdict"] == "PASS"
        assert result["faithfulness_score"] == 1.0
        assert result["hallucination_score"] == 0.0
        assert result["relevance_score"] == 0.95
        assert result["alert_triggered"] is False
        assert len(result["claims"]) == 1


@pytest.mark.asyncio
async def test_evaluation_graph_hallucination_and_alert():
    # Test ungrounded output with low faithfulness triggering alert
    with patch("app.evaluation.nodes.llm_manager.ainvoke_with_fallback") as mock_invoke:
        mock_invoke.side_effect = [
            (json.dumps(["Product X has a 5-year warranty", "Product X comes in gold"]), "groq:llama-3.3-70b-versatile"),
            (json.dumps([
                {"claim": "Product X has a 5-year warranty", "is_supported": False, "confidence": 0.9, "explanation": "Not in context"},
                {"claim": "Product X comes in gold", "is_supported": False, "confidence": 0.9, "explanation": "Not in context"},
            ]), "groq:llama-3.3-70b-versatile"),
            (json.dumps({"relevance_score": 0.85}), "groq:llama-3.3-70b-versatile"),
        ]

        result = await evaluate_trace(
            query="Tell me about Product X",
            context="Product X is a basic black USB mouse with 1-year warranty.",
            output="Product X has a 5-year warranty and comes in gold.",
            alert_threshold=0.50,
        )

        assert result["faithfulness_score"] == 0.0
        assert result["hallucination_score"] == 1.0
        assert result["verdict"] == "CRITICAL"
        assert result["alert_triggered"] is True


@pytest.mark.asyncio
async def test_evaluation_graph_no_context_branch():
    # Test conditional branch when no reference context is provided
    with patch("app.evaluation.nodes.llm_manager.ainvoke_with_fallback") as mock_invoke:
        mock_invoke.side_effect = [
            (json.dumps(["Python is a dynamically typed programming language"]), "groq:llama-3.3-70b-versatile"),
            (json.dumps({"consistency_score": 0.92, "reasoning": "Logically consistent and standard facts"}), "groq:llama-3.3-70b-versatile"),
            (json.dumps({"relevance_score": 0.90}), "groq:llama-3.3-70b-versatile"),
        ]

        result = await evaluate_trace(
            query="What is Python?",
            context=None,  # No context
            output="Python is a dynamically typed programming language.",
            alert_threshold=0.50,
        )

        assert result["verdict"] == "PASS"
        assert result["consistency_score"] == 0.92
        assert result["faithfulness_score"] == 0.92
        assert result["alert_triggered"] is False


@pytest.mark.asyncio
async def test_llm_client_fallback_execution():
    """Verify that if the primary Groq client throws an exception, the Gemini fallback is called."""
    manager = LLMClientManager()

    # Mock primary groq model to fail
    mock_groq = AsyncMock()
    mock_groq.ainvoke.side_effect = Exception("Groq 429: Rate limit exceeded")
    manager._groq_model = mock_groq
    manager._groq_secondary_model = None

    # Mock fallback gemini model to succeed
    mock_gemini = AsyncMock()
    mock_gemini.ainvoke.return_value = AIMessage(content='["Claim from Gemini fallback"]')
    manager._gemini_model = mock_gemini

    messages = [AIMessage(content="Test message")]
    content, provider_used = await manager.ainvoke_with_fallback(messages)

    assert "Claim from Gemini fallback" in content
    assert "gemini:" in provider_used
    mock_groq.ainvoke.assert_awaited_once()
    mock_gemini.ainvoke.assert_awaited_once()
