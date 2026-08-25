import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_analytics_and_routing(async_client: AsyncClient):
    # Register & get auth token
    reg_res = await async_client.post(
        "/api/auth/register",
        json={"email": "dashuser@agentguard.dev", "password": "Password12345!"},
    )
    jwt_token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {jwt_token}"}

    # 1. Test Costs Endpoint
    cost_res = await async_client.get("/api/dashboard/costs?days=30", headers=headers)
    assert cost_res.status_code == 200
    cost_data = cost_res.json()
    assert "total_cost_usd" in cost_data
    assert "by_agent" in cost_data
    assert "by_model" in cost_data

    # 2. Test Failures Endpoint
    fail_res = await async_client.get("/api/dashboard/failures?days=7", headers=headers)
    assert fail_res.status_code == 200
    fail_data = fail_res.json()
    assert "failure_rate_percent" in fail_data
    assert "failures_by_type" in fail_data

    # 3. Test Trends Endpoint
    trends_res = await async_client.get("/api/dashboard/trends?days=14", headers=headers)
    assert trends_res.status_code == 200
    trends_data = trends_res.json()
    assert "avg_latency_ms" in trends_data
    assert "bottlenecks" in trends_data

    # 4. Test Model Routing Recommendation
    routing_payload = {
        "task_type": "customer_support",
        "min_quality_bar": 0.80,
    }
    route_res = await async_client.post("/api/dashboard/routing/recommend", json=routing_payload, headers=headers)
    assert route_res.status_code == 200
    route_data = route_res.json()
    assert "recommended_model" in route_data
    assert route_data["estimated_cost_per_1k_tokens"] > 0
    assert route_data["task_type"] == "customer_support"

    # 5. Test Alert Rule Creation, Listing, and Deletion
    rule_payload = {
        "name": "High Hallucination Alert",
        "metric": "hallucination_rate",
        "threshold": 0.35,
        "window_minutes": 60,
        "target_email": "alerts@agentguard.dev",
        "is_active": True,
    }
    create_rule_res = await async_client.post("/api/dashboard/alerts", json=rule_payload, headers=headers)
    assert create_rule_res.status_code == 201
    rule_id = create_rule_res.json()["id"]

    list_rules_res = await async_client.get("/api/dashboard/alerts", headers=headers)
    assert list_rules_res.status_code == 200
    assert any(r["id"] == rule_id for r in list_rules_res.json())

    del_rule_res = await async_client.delete(f"/api/dashboard/alerts/{rule_id}", headers=headers)
    assert del_rule_res.status_code == 200
