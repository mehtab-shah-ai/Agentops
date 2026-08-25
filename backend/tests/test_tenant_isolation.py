from unittest.mock import AsyncMock, patch
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_tenant_isolation_suite(async_client: AsyncClient):
    with patch("app.traces.router.process_background_evaluation", new_callable=AsyncMock):
        # ----------------------------------------------------------------------
        # SETUP: Create User A
        # ----------------------------------------------------------------------
        res_a = await async_client.post(
            "/api/auth/register",
            json={"email": "usera@company.com", "password": "Password123!", "organization_name": "Tenant A"},
        )
        assert res_a.status_code == 201
        token_a = res_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # User A creates an API Key
        key_res_a = await async_client.post(
            "/api/auth/keys",
            json={"name": "User A Ingestion Key"},
            headers=headers_a,
        )
        assert key_res_a.status_code == 201
        api_key_a = key_res_a.json()["api_key"]

        # TEST F: Trace ingestion through API key belongs to User A
        trace_payload_a = {
            "trace_id": "trace_user_a_001",
            "span_id": "span_a_root",
            "agent_name": "research_agent_a",
            "task_type": "research",
            "model_name": "gpt-4o",
            "input_query": "User A proprietary query",
            "output_result": "User A confidential result",
            "latency_ms": 150.0,
            "cost_usd": 0.05,
        }
        ingest_res_a = await async_client.post(
            "/api/traces/ingest",
            json=trace_payload_a,
            headers={"X-API-Key": api_key_a},
        )
        assert ingest_res_a.status_code == 200

        # TEST B Setup: User A creates an Alert Rule
        rule_payload_a = {
            "name": "User A Private Alert",
            "metric": "hallucination_rate",
            "threshold": 15.0,
            "window_minutes": 60,
            "target_email": "alerts@usera.com",
        }
        alert_res_a = await async_client.post(
            "/api/dashboard/alerts",
            json=rule_payload_a,
            headers=headers_a,
        )
        assert alert_res_a.status_code == 201
        rule_id_a = alert_res_a.json()["id"]

        # ----------------------------------------------------------------------
        # SETUP: Create User B (Brand New Tenant)
        # ----------------------------------------------------------------------
        res_b = await async_client.post(
            "/api/auth/register",
            json={"email": "userb@company.com", "password": "Password123!", "organization_name": "Tenant B"},
        )
        assert res_b.status_code == 201
        token_b = res_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # ----------------------------------------------------------------------
        # TEST A: User B cannot retrieve User A's trace or trace tree
        # ----------------------------------------------------------------------
        recent_traces_b = await async_client.get("/api/traces/recent", headers=headers_b)
        assert recent_traces_b.status_code == 200
        assert len(recent_traces_b.json()) == 0  # Brand new user has 0 traces

        tree_b = await async_client.get("/api/traces/trace_user_a_001", headers=headers_b)
        assert tree_b.status_code == 404  # Cannot access User A's trace tree

        # ----------------------------------------------------------------------
        # TEST B: User B cannot see User A's alert rules or alert history
        # ----------------------------------------------------------------------
        rules_b = await async_client.get("/api/dashboard/alerts", headers=headers_b)
        assert rules_b.status_code == 200
        assert len(rules_b.json()) == 0  # User B sees no rules

        del_rule_b = await async_client.delete(f"/api/dashboard/alerts/{rule_id_a}", headers=headers_b)
        assert del_rule_b.status_code == 404  # User B cannot delete User A's rule

        history_b = await async_client.get("/api/dashboard/alerts/history", headers=headers_b)
        assert history_b.status_code == 200
        assert len(history_b.json()) == 0  # User B sees no alert history

        # ----------------------------------------------------------------------
        # TEST C: User B cannot see User A's API keys
        # ----------------------------------------------------------------------
        keys_b = await async_client.get("/api/auth/keys", headers=headers_b)
        assert keys_b.status_code == 200
        assert len(keys_b.json()) == 0  # User B has 0 API keys initially

        # ----------------------------------------------------------------------
        # TEST D: Dashboard metrics for User B remain zero
        # ----------------------------------------------------------------------
        costs_b = await async_client.get("/api/dashboard/costs", headers=headers_b)
        assert costs_b.status_code == 200
        cost_data_b = costs_b.json()
        assert cost_data_b["total_cost_usd"] == 0.0
        assert cost_data_b["total_tokens"] == 0
        assert cost_data_b["total_calls"] == 0
        assert len(cost_data_b["by_agent"]) == 0

        failures_b = await async_client.get("/api/dashboard/failures", headers=headers_b)
        assert failures_b.status_code == 200
        fail_data_b = failures_b.json()
        assert fail_data_b["total_calls"] == 0
        assert fail_data_b["failed_calls"] == 0
        assert fail_data_b["failure_rate_percent"] == 0.0
        assert len(fail_data_b["recent_failures"]) == 0

        trends_b = await async_client.get("/api/dashboard/trends", headers=headers_b)
        assert trends_b.status_code == 200
        trends_data_b = trends_b.json()
        assert trends_data_b["avg_latency_ms"] == 0.0
        assert len(trends_data_b["bottlenecks"]) == 0

        # ----------------------------------------------------------------------
        # TEST E: When User B ingests their own trace, only User B sees it
        # ----------------------------------------------------------------------
        key_res_b = await async_client.post(
            "/api/auth/keys",
            json={"name": "User B Ingest Key"},
            headers=headers_b,
        )
        assert key_res_b.status_code == 201
        api_key_b = key_res_b.json()["api_key"]

        trace_payload_b = {
            "trace_id": "trace_user_b_002",
            "span_id": "span_b_root",
            "agent_name": "support_agent_b",
            "task_type": "support",
            "model_name": "llama-3.3-70b-versatile",
            "input_query": "User B query",
            "output_result": "User B result",
            "latency_ms": 220.0,
            "cost_usd": 0.02,
        }
        ingest_res_b = await async_client.post(
            "/api/traces/ingest",
            json=trace_payload_b,
            headers={"X-API-Key": api_key_b},
        )
        assert ingest_res_b.status_code == 200

        # User B now sees exactly 1 trace
        traces_after_b = await async_client.get("/api/traces/recent", headers=headers_b)
        assert len(traces_after_b.json()) == 1
        assert traces_after_b.json()[0]["trace_id"] == "trace_user_b_002"

        # User A still only sees User A's trace
        traces_after_a = await async_client.get("/api/traces/recent", headers=headers_a)
        assert len(traces_after_a.json()) == 1
        assert traces_after_a.json()[0]["trace_id"] == "trace_user_a_001"
