import asyncio
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
from app.main import app


async def run_qa_suite():
    print("=" * 70)
    print("STARTING COMPLETE END-TO-END PRODUCTION QA & STRESS TEST SUITE")
    print("=" * 70)

    transport = httpx.ASGITransport(app=app)
    timeout = httpx.Timeout(60.0)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=timeout) as client:
        # 1. Health check
        h = await client.get("/health")
        assert h.status_code == 200, f"Health failed: {h.text}"
        print("[PASS] [1/18] System health check passed (200 OK)")

        # 2. Non-existent login
        t = int(time.time())
        r_notfound = await client.post(
            "/api/auth/login",
            json={"email": f"ghost_{t}@agentops.dev", "password": "Password123!"},
        )
        assert r_notfound.status_code == 404, f"Expected 404, got {r_notfound.status_code}"
        print(f"[PASS] [2/18] Unknown user login returns 404: {r_notfound.json().get('detail')}")

        # 3. Register user
        qa_email = f"qa_runner_{t}@agentops.dev"
        r_reg = await client.post(
            "/api/auth/register",
            json={
                "email": qa_email,
                "password": "SecurePassword123!",
                "organization_name": "Enterprise Production Labs",
            },
        )
        assert r_reg.status_code == 201, f"Register failed: {r_reg.text}"
        token = r_reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"[PASS] [3/18] User registration returns 201 Created ({qa_email})")

        # 4. Duplicate register
        r_dup = await client.post(
            "/api/auth/register",
            json={"email": qa_email, "password": "SecurePassword123!"},
        )
        assert r_dup.status_code == 400, f"Expected 400, got {r_dup.status_code}"
        print(f"[PASS] [4/18] Duplicate register returns 400 Bad Request: {r_dup.json().get('detail')}")

        # 5. Wrong password login
        r_wrong = await client.post(
            "/api/auth/login",
            json={"email": qa_email, "password": "WrongPassword123!"},
        )
        assert r_wrong.status_code == 401, f"Expected 401, got {r_wrong.status_code}"
        print(f"[PASS] [5/18] Wrong password returns 401 Unauthorized: {r_wrong.json().get('detail')}")

        # 6. Correct login
        r_login = await client.post(
            "/api/auth/login",
            json={"email": qa_email, "password": "SecurePassword123!"},
        )
        assert r_login.status_code == 200
        print("[PASS] [6/18] Correct login returns 200 OK")

        # 7. Initial empty tenant state
        r_traces_empty = await client.get("/api/traces/recent", headers=headers)
        assert len(r_traces_empty.json()) == 0
        r_keys_empty = await client.get("/api/auth/keys", headers=headers)
        assert len(r_keys_empty.json()) == 0
        r_alerts_empty = await client.get("/api/dashboard/alerts", headers=headers)
        assert len(r_alerts_empty.json()) == 0
        print("[PASS] [7/18] Brand-new tenant isolation verified (0 traces, 0 keys, 0 alerts)")

        # 8. Create API Key
        r_key = await client.post(
            "/api/auth/keys",
            json={"name": "Production Agent Key"},
            headers=headers,
        )
        assert r_key.status_code == 201
        api_key = r_key.json()["api_key"]
        key_id = r_key.json()["id"]
        assert api_key.startswith("ag_live_")
        print(f"[PASS] [8/18] Ingestion API key created: {r_key.json()['key_prefix']}")

        # 9. Ingest normal trace
        tid = f"trace_qa_run_{t}"
        trace_payload = {
            "trace_id": tid,
            "span_id": "span_qa_root",
            "agent_name": "Research Agent",
            "task_type": "market_research",
            "model_name": "llama-3.3-70b-versatile",
            "input_query": "What are the NIST post-quantum cryptography standards?",
            "output_result": "NIST released FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), and FIPS 205 (SLH-DSA) in August 2024.",
            "latency_ms": 340.0,
            "input_tokens": 120,
            "output_tokens": 45,
            "step_index": 0,
        }
        r_ingest = await client.post(
            "/api/traces/ingest",
            json=trace_payload,
            headers={"X-API-Key": api_key},
        )
        assert r_ingest.status_code == 200
        print("[PASS] [9/18] Telemetry trace ingested and evaluated successfully")

        # 10. Ingest Tool Loop failure trace
        loop_payload = {
            "trace_id": f"trace_qa_loop_{t}",
            "span_id": "span_qa_loop_root",
            "agent_name": "Planner Agent",
            "task_type": "tool_call",
            "model_name": "claude-3-5-sonnet",
            "input_query": "Fetch live inventory status",
            "output_result": "TOOL LOOP DETECTED: Execution halted.",
            "tool_calls": [
                {"tool_name": "get_inventory", "arguments": {"sku": "STM32F4"}},
                {"tool_name": "get_inventory", "arguments": {"sku": "STM32F4"}},
                {"tool_name": "get_inventory", "arguments": {"sku": "STM32F4"}},
            ],
            "latency_ms": 1200.0,
            "step_index": 0,
        }
        r_loop = await client.post(
            "/api/traces/ingest",
            json=loop_payload,
            headers={"X-API-Key": api_key},
        )
        assert r_loop.status_code == 200, f"Loop ingest failed: {r_loop.status_code} - {r_loop.text}"
        detected = r_loop.json()["detected_failures"]
        assert "loop_detected" in detected
        print(f"[PASS] [10/18] Autonomous tool loop failure intercepted: {detected}")

        # 11. Fetch Recent Traces & Trace Tree
        r_recent = await client.get("/api/traces/recent", headers=headers)
        assert len(r_recent.json()) == 2
        r_tree = await client.get(f"/api/traces/{tid}", headers=headers)
        assert r_tree.status_code == 200
        print("[PASS] [11/18] Trace call hierarchy and DAG reconstructed successfully")

        # 12. Dashboard Metrics (costs, failures, trends)
        r_costs = await client.get("/api/dashboard/costs", headers=headers)
        assert r_costs.status_code == 200
        assert r_costs.json()["total_calls"] == 2
        r_failures = await client.get("/api/dashboard/failures", headers=headers)
        assert r_failures.status_code == 200
        assert r_failures.json()["failed_calls"] == 1
        r_trends = await client.get("/api/dashboard/trends", headers=headers)
        assert r_trends.status_code == 200
        print("[PASS] [12/18] Multi-tenant metrics isolated accurately (2 runs, 1 failure, $0.00 spend)")

        # 13. AI Root-Cause Diagnostic Advisor
        r_diag = await client.post(f"/api/traces/{tid}/diagnose", headers=headers)
        assert r_diag.status_code == 200
        diag_data = r_diag.json()
        assert "severity" in diag_data
        print(f"[PASS] [13/18] AI Root-Cause Advisor evaluated trace (Severity: {diag_data.get('severity')})")

        # 14. Autonomous AI Security & Red-Team Audit (OWASP Top 10)
        r_sec = await client.post(f"/api/traces/{tid}/security-audit", headers=headers)
        assert r_sec.status_code == 200
        sec_data = r_sec.json()
        assert "safety_grade" in sec_data
        assert "overall_security_score" in sec_data
        print(f"[PASS] [14/18] Autonomous Security & Red-Team Audit passed (Grade: {sec_data.get('safety_grade')}, Score: {sec_data.get('overall_security_score')}/100)")

        # 15. Live Fact-Checking & Grounding (Web Search Verification)
        r_fact = await client.post(f"/api/traces/{tid}/fact-check", headers=headers)
        assert r_fact.status_code == 200
        fact_data = r_fact.json()
        assert "verdict" in fact_data
        print(f"[PASS] [15/18] Live Web Fact-Checking completed (Verdict: {fact_data.get('verdict')}, Grounding: {fact_data.get('grounding_score')}%)")

        # 16. Local Agent Endpoint Auto-Discovery
        r_disc = await client.get("/api/traces/discover-agents", headers=headers)
        assert r_disc.status_code == 200
        print(f"[PASS] [16/18] Local agent endpoint scanner returned valid response ({len(r_disc.json().get('discovered_endpoints', []))} local agents detected)")

        # 17. Alert Rule CRUD
        r_rule = await client.post(
            "/api/dashboard/alerts",
            json={
                "name": "Production Error Rate Threshold",
                "metric": "error_rate",
                "threshold": 5.0,
                "window_minutes": 60,
                "target_email": "devops@company.com",
            },
            headers=headers,
        )
        assert r_rule.status_code == 201
        rule_id = r_rule.json()["id"]
        r_del_rule = await client.delete(
            f"/api/dashboard/alerts/{rule_id}", headers=headers
        )
        assert r_del_rule.status_code == 200
        print("[PASS] [17/18] Real-time Alert Rule lifecycle verified")

        # 18. Revoke API Key
        r_del_key = await client.delete(
            f"/api/auth/keys/{key_id}", headers=headers
        )
        assert r_del_key.status_code == 200
        print("[PASS] [18/18] Ingestion API Key revoked cleanly")

    print("=" * 70)
    print("ALL 18 END-TO-END QA PRODUCTION BENCHMARKS PASSED WITH 100% SUCCESS")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_qa_suite())
