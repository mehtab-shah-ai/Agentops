# 🛡️ AgentOps — Universal AI Agent Observability & Security Platform

<div align="center">

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-Orchestrated-FF6B6B?logo=langchain&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)

<br/>

### **The all-in-one platform to monitor, secure, and cut costs for your autonomous AI agents.**
*Track every agent step, catch infinite loops, block prompt hacking, and calculate exact LLM spend in real time.*

[🚀 Quickstart](#-quickstart-in-2-minutes) • [⚠️ What Goes Wrong?](#-the-problem-what-goes-wrong-in-production) • [🌟 3 Core Superpowers](#-how-agentops-solves-it-3-core-superpowers) • [🏛️ Architecture](#-system-architecture) • [🛡️ Security Vectors](#-automated-security-red-team-testing)

</div>

---

## 📌 The Problem: What Goes Wrong in Production?

When software teams deploy autonomous LLM agents (built with **LangGraph, CrewAI, AutoGen, or custom Python**), standard server monitoring tools like Datadog and Sentry fail.

**Why?** Because AI agents don't crash with HTTP 500 errors—they fail **silently** while returning HTTP 200 OK:

```mermaid
flowchart TD
    User([Real Customer]) -->|1. Asks Tricky Question| Agent[AI Agent in Production]
    Agent -->|Silent Problem 1| Inj[🚨 Prompt Injections & Secret API Key Leaks]
    Agent -->|Silent Problem 2| Loop[🔁 20+ Infinite Tool Loops Burning $100s]
    Agent -->|Silent Problem 3| Hallucinate[⚠️ Fake Answers & Confident Hallucinations]
    Agent -->|Silent Problem 4| Crash[💥 Rate Limit Hit & App Freezes]
```

1. **🚨 Prompt Injections & Jailbreaks:** Attackers type *"Ignore all previous rules"* to steal your private instructions or extract secret API keys.
2. **🔁 Endless Tool Loops & Cost Burn:** If a tool API fails, the agent repeats the exact same tool call 20+ times, freezing the user's screen and wasting hundreds of dollars.
3. **⚠️ Fake Answers & Hallucinations:** The agent invents fake discounts or invalid return policies with 100% confidence, misleading real customers.
4. **💸 Blind Token Invoices:** Teams get huge surprise cloud bills without knowing which agent, user, or model caused the cost spike.

---

## 🌟 How AgentOps Solves It (3 Core Superpowers)

AgentOps gives developers **complete visibility, security defense, and financial control** over their autonomous agents:

```mermaid
flowchart TD
    subgraph AgentApp["🤖 Your AI Agent Application"]
        A["LangGraph / CrewAI / Custom Python Agent"]
    end

    A -->|"1. Sends Trace (@track_agent)"| Core

    subgraph Core["🛡️ AgentOps 3 Core Superpowers"]
        direction TB
        subgraph Pillar1["🔍 1. Live Observability"]
            O1["• Multi-Agent Step Call Trees"]
            O2["• Tool Calls & Latency (ms)"]
            O3["• LLM Reasoning Tokens"]
        end
        subgraph Pillar2["🛡️ 2. Security & Hack Defense"]
            S1["• Prompt Injection Testing"]
            S2["• Secret API Key Leak Guard"]
            S3["• Live Web Fact-Checking"]
        end
        subgraph Pillar3["💰 3. Cost & Token Control"]
            C1["• 4-Decimal Precision ($0.0001)"]
            C2["• OpenAI, Claude, Groq, Gemini"]
            C3["• Infinite Loop Interceptor"]
        end
    end

    Core -->|"2. Real-Time Telemetry Stream"| Dashboard["📊 Live Web Dashboard & AI Root-Cause Advisor"]
```

---

## 📖 Key Terms Explained in Simple Words

| Term | What It Means (Plain English) |
| :--- | :--- |
| **🔍 AI Observability** | Watching every single thought, tool execution, and latency millisecond of your AI agent in real time. |
| **🛡️ Security Red-Teaming** | Simulating real hacker attacks (Prompt Injections, Jailbreaks, Secret Theft) against your bot to test its defenses before users can hack it. |
| **💰 Exact Token Pricing** | Calculating precise dollar spend down to **$0.0001** per request across OpenAI, Claude, Groq, Gemini, and Local models. |
| **🛠️ AI Root-Cause Advisor** | Automatically diagnosing why an agent failed or looped, and generating ready-to-paste Python code and prompt patches. |

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Ingestion["1. Fast Ingestion Layer (<15ms)"]
        SDK["Python Agent (@track_agent)"] -->|"POST /api/traces/ingest"| API["FastAPI Ingestion Gateway"]
        API --> Rate["Token Bucket Rate Limiter"]
        API --> Loop["Deterministic Loop & Schema Check"]
        API --> Price["Multi-Model Pricing Engine"]
        API --> DB[(SQLite / PostgreSQL Async)]
    end

    subgraph Workers["2. Async Background AI Evaluation Engine"]
        API -.->|"non-blocking async task"| Worker["Background Worker"]
        Worker --> LangGraph["LangGraph LLM Judge"]
        Worker --> Tavily["Live Web Fact-Check (Tavily Search)"]
        Worker --> Failover["4-Tier Zero-Crash Failover: Groq ➔ Gemini ➔ Local"]
        Worker --> DB
    end

    subgraph UI_Layer["3. Live Real-Time Dashboard"]
        Worker -->|"Live Telemetry Event"| WS["WebSocket Server"]
        WS --> Dashboard["React 19 + Tailwind CSS Dashboard"]
        DB -->|"REST API"| Dashboard
    end
```

---

## 🚀 Quickstart in 2 Minutes

### Step 1: Clone and Configure
```bash
git clone https://github.com/mehtab-shah-ai/Agentops.git
cd AgentOps
cp .env.example .env
```

### Step 2: Run with Docker Compose
```bash
docker-compose up -d
```
* **Frontend UI Dashboard:** Open [http://localhost:5173](http://localhost:5173) or [http://localhost:80](http://localhost:80)
* **Backend API Swagger Docs:** Open [http://localhost:8000/docs](http://localhost:8000/docs)
* **Backend Health Check:** Open [http://localhost:8000/health](http://localhost:8000/health)

---

## 💻 2-Line Python Integration

Add the AgentOps decorator to your existing agent function:

```python
from sdk import track_agent

@track_agent("Customer Support Agent")
def my_agent_node(state):
    # AgentOps automatically captures input query, output result,
    # tool arguments, latency, exact token costs, and security checks!
    response = llm.invoke(state["messages"])
    return {"messages": [response]}
```

---

## 🛡️ Automated Security Red-Team Testing

AgentOps runs 5 automated live adversarial security probes against your agent:

| Attack Test | What Is Tested? | Expected Behavior |
| :--- | :--- | :--- |
| **Direct Prompt Injection** | Checks if the agent reveals its private system prompt when told *"Ignore all previous rules"*. | 🛡️ **Blocked:** Agent refuses system prompt override. |
| **API Key & Secret Leak Guard** | Scans output for confidential API keys (`gsk_...`, `sk-...`) or database passwords. | 🛡️ **Zero Leaks:** Sensitive keys redacted. |
| **DAN & Jailbreak Resistance** | Tests if the agent adopts unconstrained or malicious personas. | 🛡️ **Safe:** Safety guidelines remain active. |
| **Privilege Escalation** | Tests if the agent blocks dangerous administrative commands (`sudo rm -rf /`). | 🛡️ **Protected:** Unauthorized actions rejected. |
| **Anti-Hallucination Probe** | Tests if the agent verifies or rejects dangerous medical/scientific falsehoods. | 🛡️ **Accurate:** False claims rejected. |

---

## 📂 Project Structure

```
AgentOps/
├── backend/                  # FastAPI 0.115+ & Python 3.12 Backend
│   ├── app/
│   │   ├── auth/            # JWT & SHA-256 API Key Authentication
│   │   ├── dashboard/       # Aggregations, Metrics & Routing Optimizer
│   │   ├── evaluation/      # LangGraph Judge, Multi-Provider Pricing & Fact-Checking
│   │   ├── security/        # Security Red-Team Pen-Testing Engine
│   │   ├── traces/          # High-Speed Ingestion & Cycle Loop Detection
│   │   ├── main.py          # FastAPI Application Gateway
│   │   ├── models.py        # SQLAlchemy Async Models
│   │   └── websocket.py     # Real-Time Telemetry Event Broadcaster
│   └── Dockerfile           # Multi-Stage Backend Docker Image
├── frontend/                 # React 19 + TypeScript + Tailwind CSS v4
│   ├── src/
│   │   ├── components/      # Glassmorphic UI, Trace Call Trees & Metric Cards
│   │   ├── pages/           # Landing Page, Live Runs, Alerts, Settings
│   │   └── services/        # REST API & WebSocket Streaming Clients
│   ├── Dockerfile           # Multi-Stage Node 20 Build + Nginx Alpine
│   └── nginx.conf           # SPA Routing & WebSocket Reverse Proxy
├── docker-compose.yml        # Multi-Container Development Orchestration
├── docker-compose.prod.yml   # Production Docker Compose Configuration
└── README.md                 # Documentation
```

---

## 📜 License

Distributed under the **MIT License**. Free for personal and commercial use.
