import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Trace, Evaluation, AlertRule, AlertHistory

async def seed_user_starter_data(db: AsyncSession, user_id: str):
    """Seed realistic initial traces, evaluations, and alert history for a new user if empty."""
    # Check if user already has traces
    stmt = select(Trace).where(Trace.user_id == user_id).limit(1)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return

    now = datetime.now(timezone.utc)

    # =========================================================================
    # 1. RUN 1: Research Agent (SUCCESS, 2.8s, $0.018, Quality 92)
    # Execution Tree:
    #   Router Agent (root)
    #     ├── Search Tool
    #     │     └── Web Search
    #     ├── Reasoning
    #     └── Final Answer
    # =========================================================================
    trace_id_1 = "trace_run_research_921"
    r1_root_id = f"span_{uuid.uuid4().hex[:8]}"
    r1_tool_id = f"span_{uuid.uuid4().hex[:8]}"
    r1_subtool_id = f"span_{uuid.uuid4().hex[:8]}"
    r1_reasoning_id = f"span_{uuid.uuid4().hex[:8]}"
    r1_answer_id = f"span_{uuid.uuid4().hex[:8]}"

    r1_spans = [
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_1,
            span_id=r1_root_id,
            parent_span_id=None,
            agent_name="Research Agent",
            task_type="routing",
            model_name="llama-3.1-8b-instant",
            input_query="Investigate quantum computing impact on RSA encryption and summarize NIST post-quantum standards.",
            output_result="Decomposed investigation into (1) Quantum Shor's algorithm vulnerability analysis; (2) NIST FIPS 203/204/205 standard status.",
            latency_ms=120.0,
            input_tokens=180,
            output_tokens=45,
            cost_usd=0.00003,
            status="success",
            step_index=0,
            created_at=now - timedelta(minutes=18),
        ),
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_1,
            span_id=r1_tool_id,
            parent_span_id=r1_root_id,
            agent_name="Research Agent",
            task_type="tool_execution",
            model_name="llama-3.3-70b-versatile",
            input_query="Execute tool: search_nist_standards(query='FIPS post-quantum cryptographic standards 2024')",
            output_result="Retrieved 4 authoritative NIST documentation records for ML-KEM, ML-DSA, and SLH-DSA.",
            latency_ms=640.0,
            input_tokens=310,
            output_tokens=60,
            cost_usd=0.00021,
            status="success",
            step_index=1,
            created_at=now - timedelta(minutes=17, seconds=45),
        ),
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_1,
            span_id=r1_subtool_id,
            parent_span_id=r1_tool_id,
            agent_name="Research Agent",
            task_type="web_search",
            model_name="llama-3.3-70b-versatile",
            input_query="Web search: NIST FIPS 203 ML-KEM finalized parameters",
            context="NIST released official post-quantum standards: FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA) in August 2024.",
            output_result="Confirmed FIPS 203 (Kyber/ML-KEM) standard finalized August 2024 with 512, 768, 1024 parameter sets.",
            latency_ms=410.0,
            input_tokens=240,
            output_tokens=80,
            cost_usd=0.00015,
            status="success",
            step_index=2,
            created_at=now - timedelta(minutes=17, seconds=30),
        ),
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_1,
            span_id=r1_reasoning_id,
            parent_span_id=r1_root_id,
            agent_name="Research Agent",
            task_type="reasoning",
            model_name="llama-3.3-70b-versatile",
            input_query="Synthesize timeline for RSA-2048 obsolescence vs post-quantum migration deadlines.",
            output_result="Cryptographic transition required by 2030-2035; RSA-2048 vulnerable to fault-tolerant quantum computers with ~4000 logical qubits.",
            latency_ms=1200.0,
            input_tokens=850,
            output_tokens=210,
            cost_usd=0.00095,
            status="success",
            step_index=3,
            created_at=now - timedelta(minutes=17),
        ),
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_1,
            span_id=r1_answer_id,
            parent_span_id=r1_root_id,
            agent_name="Research Agent",
            task_type="final_answer",
            model_name="llama-3.3-70b-versatile",
            input_query="Format final technical briefing with actionable executive summary and migration steps.",
            context="NIST August 2024 finalized FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA). RSA-2048 requires migration by 2030.",
            output_result="NIST officially finalized FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), and FIPS 205 (SLH-DSA) in August 2024. Organizations must begin transitioning from RSA-2048 to ML-KEM-768 for key encapsulation and ML-DSA for digital signatures to protect against harvest-now-decrypt-later attacks.",
            latency_ms=530.0,
            input_tokens=450,
            output_tokens=180,
            cost_usd=0.00042,
            status="success",
            step_index=4,
            created_at=now - timedelta(minutes=16, seconds=30),
        ),
    ]

    for s in r1_spans:
        db.add(s)

    eval_r1 = Evaluation(
        id=str(uuid.uuid4()),
        trace_record_id=r1_spans[-1].id,
        user_id=user_id,
        faithfulness_score=0.94,
        relevance_score=0.96,
        hallucination_score=0.04,
        verdict="PASS",
        eval_status="completed",
        judge_model="llama-3.3-70b-versatile",
        eval_latency_ms=210.5,
        reasoning="All cryptographic standard designations and dates strictly grounded in authoritative NIST documentation.",
        created_at=now - timedelta(minutes=16),
    )
    db.add(eval_r1)

    # =========================================================================
    # 2. RUN 2: Support Agent (REVIEW, 5.1s, $0.031, Quality 61)
    # 3 unsupported claims detected in final response
    # =========================================================================
    trace_id_2 = "trace_run_support_418"
    r2_root_id = f"span_{uuid.uuid4().hex[:8]}"
    r2_kb_id = f"span_{uuid.uuid4().hex[:8]}"
    r2_ans_id = f"span_{uuid.uuid4().hex[:8]}"

    r2_spans = [
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_2,
            span_id=r2_root_id,
            parent_span_id=None,
            agent_name="Support Agent",
            task_type="routing",
            model_name="gpt-4o-mini",
            input_query="Customer asking: What is your refund policy for annual enterprise tier if cancelled after 45 days?",
            output_result="Classified as Tier-2 Billing Policy query. Querying internal knowledge base.",
            latency_ms=320.0,
            input_tokens=220,
            output_tokens=60,
            cost_usd=0.00008,
            status="success",
            step_index=0,
            created_at=now - timedelta(minutes=42),
        ),
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_2,
            span_id=r2_kb_id,
            parent_span_id=r2_root_id,
            agent_name="Support Agent",
            task_type="rag_retrieval",
            model_name="gpt-4o-mini",
            input_query="Retrieve refund terms for annual enterprise subscriptions.",
            context="Enterprise Clause 4.2: Annual subscriptions are eligible for a 100% refund within 30 days of purchase. Cancellations beyond 30 days are non-refundable and subject to early termination fees.",
            output_result="Retrieved Enterprise Master Service Agreement section 4.2.",
            latency_ms=1800.0,
            input_tokens=1400,
            output_tokens=110,
            cost_usd=0.00038,
            status="success",
            step_index=1,
            created_at=now - timedelta(minutes=41, seconds=30),
        ),
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_2,
            span_id=r2_ans_id,
            parent_span_id=r2_root_id,
            agent_name="Support Agent",
            task_type="final_answer",
            model_name="gpt-4o",
            input_query="Draft customer response regarding 45-day cancellation request.",
            context="Enterprise Clause 4.2: Annual subscriptions are eligible for a 100% refund within 30 days of purchase. Cancellations beyond 30 days are non-refundable.",
            output_result="Hello! Per our 60-day customer satisfaction guarantee, you are entitled to a pro-rated 50% cash refund or a 100% credit transfer to another workspace. Our billing team will automatically issue this to your credit card in 48 hours.",
            latency_ms=2980.0,
            input_tokens=2200,
            output_tokens=340,
            cost_usd=0.0305,
            status="success",
            step_index=2,
            created_at=now - timedelta(minutes=40),
        ),
    ]

    for s in r2_spans:
        db.add(s)

    eval_r2 = Evaluation(
        id=str(uuid.uuid4()),
        trace_record_id=r2_spans[-1].id,
        user_id=user_id,
        faithfulness_score=0.41,
        relevance_score=0.78,
        hallucination_score=0.59,
        verdict="FLAGGED",
        eval_status="completed",
        judge_model="llama-3.3-70b-versatile",
        eval_latency_ms=380.0,
        reasoning="3 unsupported claims detected: (1) Claimed non-existent '60-day satisfaction guarantee'; (2) Promised 'pro-rated 50% refund' contradicted by Clause 4.2 non-refundable policy; (3) Invented '48 hour automatic refund' timeline.",
        created_at=now - timedelta(minutes=39),
    )
    db.add(eval_r2)

    # =========================================================================
    # 3. RUN 3: Planner Agent (FAILED, 8.4s, $0.044, Tool Loop Detected)
    # Repeated calls with identical arguments
    # =========================================================================
    trace_id_3 = "trace_run_planner_104"
    r3_root_id = f"span_{uuid.uuid4().hex[:8]}"
    r3_loop1_id = f"span_{uuid.uuid4().hex[:8]}"
    r3_loop2_id = f"span_{uuid.uuid4().hex[:8]}"
    r3_loop3_id = f"span_{uuid.uuid4().hex[:8]}"

    r3_spans = [
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_3,
            span_id=r3_root_id,
            parent_span_id=None,
            agent_name="Planner Agent",
            task_type="planning",
            model_name="claude-3-5-sonnet",
            input_query="Execute multi-vendor supply chain optimization plan for Q4 microcontrollers.",
            output_result="Initiating vendor procurement lookup across distributor APIs.",
            latency_ms=950.0,
            input_tokens=620,
            output_tokens=140,
            cost_usd=0.0039,
            status="success",
            step_index=0,
            created_at=now - timedelta(hours=2, minutes=15),
        ),
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_3,
            span_id=r3_loop1_id,
            parent_span_id=r3_root_id,
            agent_name="Planner Agent",
            task_type="tool_call",
            model_name="claude-3-5-sonnet",
            input_query="Call tool: fetch_distributor_pricing(part_no='STM32F407VGT6', min_qty=5000)",
            output_result="{'status': 'rate_limited_retry_after', 'seconds': 0}",
            latency_ms=2400.0,
            input_tokens=1800,
            output_tokens=90,
            cost_usd=0.0135,
            status="success",
            step_index=1,
            created_at=now - timedelta(hours=2, minutes=14),
        ),
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_3,
            span_id=r3_loop2_id,
            parent_span_id=r3_root_id,
            agent_name="Planner Agent",
            task_type="tool_call",
            model_name="claude-3-5-sonnet",
            input_query="Call tool: fetch_distributor_pricing(part_no='STM32F407VGT6', min_qty=5000)",
            output_result="{'status': 'rate_limited_retry_after', 'seconds': 0}",
            latency_ms=2500.0,
            input_tokens=1850,
            output_tokens=95,
            cost_usd=0.0138,
            status="success",
            step_index=2,
            created_at=now - timedelta(hours=2, minutes=13),
        ),
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_3,
            span_id=r3_loop3_id,
            parent_span_id=r3_root_id,
            agent_name="Planner Agent",
            task_type="tool_call",
            model_name="claude-3-5-sonnet",
            input_query="Call tool: fetch_distributor_pricing(part_no='STM32F407VGT6', min_qty=5000)",
            output_result="TOOL LOOP DETECTED: Execution halted after 3 identical calls without state progression.",
            latency_ms=2550.0,
            input_tokens=1900,
            output_tokens=100,
            cost_usd=0.0141,
            status="failed",
            failure_reasons=["tool_loop_detected: Repeated tool 'fetch_distributor_pricing' calls with identical arguments"],
            step_index=3,
            created_at=now - timedelta(hours=2, minutes=12),
        ),
    ]

    for s in r3_spans:
        db.add(s)

    # =========================================================================
    # 4. RUN 4: Document Agent (SUCCESS, 1.9s, $0.009, Quality 95)
    # =========================================================================
    trace_id_4 = "trace_run_document_772"
    r4_root_id = f"span_{uuid.uuid4().hex[:8]}"
    r4_parse_id = f"span_{uuid.uuid4().hex[:8]}"
    r4_sum_id = f"span_{uuid.uuid4().hex[:8]}"

    r4_spans = [
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_4,
            span_id=r4_root_id,
            parent_span_id=None,
            agent_name="Document Agent",
            task_type="document_parsing",
            model_name="gemini-1.5-flash",
            input_query="Parse 28-page PDF quarterly filing and extract operational EBITDA margins and headcount variance.",
            output_result="Extracted table 4.1 (EBITDA $412M, margin 28.4%) and note 12 (Headcount +450 FTE).",
            latency_ms=620.0,
            input_tokens=3200,
            output_tokens=140,
            cost_usd=0.0028,
            status="success",
            step_index=0,
            created_at=now - timedelta(hours=4, minutes=50),
        ),
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_4,
            span_id=r4_parse_id,
            parent_span_id=r4_root_id,
            agent_name="Document Agent",
            task_type="validation",
            model_name="gemini-1.5-flash",
            input_query="Validate extracted GAAP reconciliation against historical SEC baseline.",
            context="GAAP operating income $340M, non-GAAP stock-based compensation add-back $72M = Adjusted EBITDA $412M.",
            output_result="Reconciliation checks passed with 100% arithmetic parity.",
            latency_ms=450.0,
            input_tokens=1600,
            output_tokens=85,
            cost_usd=0.0014,
            status="success",
            step_index=1,
            created_at=now - timedelta(hours=4, minutes=49),
        ),
        Trace(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trace_id=trace_id_4,
            span_id=r4_sum_id,
            parent_span_id=r4_root_id,
            agent_name="Document Agent",
            task_type="final_answer",
            model_name="gemini-1.5-flash",
            input_query="Generate executive financial brief.",
            context="Adjusted EBITDA reached $412M (28.4% margin) with net headcount expansion of 450 engineers.",
            output_result="Q3 Adjusted EBITDA reached $412M, reflecting a healthy 28.4% margin. Net headcount expanded by 450 engineering roles.",
            latency_ms=830.0,
            input_tokens=2100,
            output_tokens=220,
            cost_usd=0.0048,
            status="success",
            step_index=2,
            created_at=now - timedelta(hours=4, minutes=48),
        ),
    ]

    for s in r4_spans:
        db.add(s)

    eval_r4 = Evaluation(
        id=str(uuid.uuid4()),
        trace_record_id=r4_spans[-1].id,
        user_id=user_id,
        faithfulness_score=0.98,
        relevance_score=0.97,
        hallucination_score=0.02,
        verdict="PASS",
        eval_status="completed",
        judge_model="llama-3.3-70b-versatile",
        eval_latency_ms=195.0,
        reasoning="Accurate extraction and financial metric synthesis directly matching verified GAAP disclosures.",
        created_at=now - timedelta(hours=4, minutes=47),
    )
    db.add(eval_r4)

    # =========================================================================
    # 5. Alert Rules
    # =========================================================================
    rule1 = AlertRule(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name="Hallucination SLA Threshold (>10%)",
        metric="hallucination_rate",
        threshold=10.0,
        window_minutes=60,
        target_email="alerts@company.com",
        is_active=True,
        created_at=now - timedelta(days=2),
    )
    rule2 = AlertRule(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name="Error Rate Threshold (>5%)",
        metric="error_rate",
        threshold=5.0,
        window_minutes=60,
        target_email="devops@company.com",
        is_active=True,
        created_at=now - timedelta(days=2),
    )
    rule3 = AlertRule(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name="Cost Spike Threshold (>$0.25/run)",
        metric="cost_threshold",
        threshold=0.25,
        window_minutes=60,
        target_email="finance@company.com",
        is_active=True,
        created_at=now - timedelta(days=2),
    )
    db.add(rule1)
    db.add(rule2)
    db.add(rule3)
    await db.flush()

    # =========================================================================
    # 6. Alert History
    # =========================================================================
    h1 = AlertHistory(
        id=str(uuid.uuid4()),
        user_id=user_id,
        rule_id=rule2.id,
        metric="error_rate",
        triggered_value=25.0,
        threshold=5.0,
        message="CRITICAL: Tool loop detected in Planner Agent. Execution stopped after repeated identical calls.",
        sent_to="devops@company.com",
        status="sent",
        created_at=now - timedelta(hours=2, minutes=12),
    )
    h2 = AlertHistory(
        id=str(uuid.uuid4()),
        user_id=user_id,
        rule_id=rule1.id,
        metric="hallucination_rate",
        triggered_value=59.0,
        threshold=10.0,
        message="HIGH: Quality below threshold (61/100) in Support Agent. 3 unsupported claims detected.",
        sent_to="alerts@company.com",
        status="sent",
        created_at=now - timedelta(minutes=39),
    )
    h3 = AlertHistory(
        id=str(uuid.uuid4()),
        user_id=user_id,
        rule_id=rule2.id,
        metric="error_rate",
        triggered_value=8400.0,
        threshold=5000.0,
        message="MEDIUM: Latency above threshold (8.4s) in Planner Agent during distributor lookup.",
        sent_to="devops@company.com",
        status="sent",
        created_at=now - timedelta(hours=2, minutes=11),
    )
    db.add(h1)
    db.add(h2)
    db.add(h3)

    await db.flush()
