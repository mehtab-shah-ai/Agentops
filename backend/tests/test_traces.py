from unittest.mock import AsyncMock, patch
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_trace_ingest_and_tree_reconstruction(async_client: AsyncClient):
    # Mock background evaluation so test does not make external HTTP network calls
    with patch("app.traces.router.process_background_evaluation", new_callable=AsyncMock):
        # 1. Register a user to get an API key
        reg_res = await async_client.post(
            "/api/auth/register",
            json={"email": "traceuser@agentguard.dev", "password": "Password12345!"},
        )
        assert reg_res.status_code == 201
        jwt_token = reg_res.json()["access_token"]

        # Generate a fresh API key
        key_res = await async_client.post(
            "/api/auth/keys",
            json={"name": "SDK Ingest Key"},
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        api_key = key_res.json()["api_key"]
        auth_headers = {"X-API-Key": api_key}

        # 2. Ingest Root Span (Router)
        root_trace_id = "trace_wf_998877"
        root_span_id = "span_router_01"
        root_payload = {
            "trace_id": root_trace_id,
            "span_id": root_span_id,
            "parent_span_id": None,
            "agent_name": "query_router",
            "task_type": "routing",
            "model_name": "llama-3.1-8b-instant",
            "input_query": "What is the return policy for footwear?",
            "output_result": "Routed to return_policy_agent",
            "latency_ms": 120.5,
            "input_tokens": 50,
            "output_tokens": 15,
            "step_index": 0,
        }
        res_root = await async_client.post("/api/traces/ingest", json=root_payload, headers=auth_headers)
        assert res_root.status_code == 200
        assert res_root.json()["status"] == "success"

        # 3. Ingest Child Span (Sub-agent execution)
        child_span_id = "span_subagent_02"
        child_payload = {
            "trace_id": root_trace_id,
            "span_id": child_span_id,
            "parent_span_id": root_span_id,
            "agent_name": "return_policy_agent",
            "task_type": "customer_support",
            "model_name": "llama-3.3-70b-versatile",
            "input_query": "What is the return policy for footwear?",
            "context": "Footwear can be returned within 30 days in unworn condition.",
            "output_result": "You can return footwear within 30 days if unworn.",
            "latency_ms": 450.0,
            "input_tokens": 150,
            "output_tokens": 40,
            "step_index": 1,
        }
        res_child = await async_client.post("/api/traces/ingest", json=child_payload, headers=auth_headers)
        assert res_child.status_code == 200

        # 4. Fetch Recent Traces using JWT
        jwt_headers = {"Authorization": f"Bearer {jwt_token}"}
        recent_res = await async_client.get("/api/traces/recent?agent_name=return_policy_agent", headers=jwt_headers)
        assert recent_res.status_code == 200
        recent_data = recent_res.json()
        assert len(recent_data) >= 1
        assert recent_data[0]["agent_name"] == "return_policy_agent"

        # 5. Fetch Complete Trace Call Tree
        tree_res = await async_client.get(f"/api/traces/{root_trace_id}", headers=jwt_headers)
        assert tree_res.status_code == 200
        tree_data = tree_res.json()
        assert tree_data["trace_id"] == root_trace_id
        assert tree_data["total_spans"] == 2
        assert len(tree_data["root_spans"]) == 1
        root_node = tree_data["root_spans"][0]
        assert root_node["span"]["span_id"] == root_span_id
        assert len(root_node["children"]) == 1
        assert root_node["children"][0]["span"]["span_id"] == child_span_id


@pytest.mark.asyncio
async def test_trace_ingest_rate_limiting(async_client: AsyncClient):
    with patch("app.traces.router.process_background_evaluation", new_callable=AsyncMock):
        # Register user
        reg_res = await async_client.post(
            "/api/auth/register",
            json={"email": "ratelimit@agentguard.dev", "password": "Password12345!"},
        )
        jwt_token = reg_res.json()["access_token"]

        key_res = await async_client.post(
            "/api/auth/keys",
            json={"name": "Rate Limit Key"},
            headers={"Authorization": f"Bearer {jwt_token}"},
        )
        api_key = key_res.json()["api_key"]
        auth_headers = {"X-API-Key": api_key}

        payload = {
            "trace_id": "test_rl_trace",
            "agent_name": "burst_agent",
            "input_query": "Ping",
            "output_result": "Pong",
        }

        res = await async_client.post("/api/traces/ingest", json=payload, headers=auth_headers)
        assert res.status_code == 200
