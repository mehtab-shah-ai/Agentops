import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/common/BrandLogo';
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Play,
  Repeat,
  Bot,
  Terminal,
  Key,
  Crosshair,
  Code2,
  Check,
  Layers,
  Wrench,
  Brain,
  Zap,
  AlertTriangle,
  Copy,
  Coins,
  User,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { enterDemoMode } = useAuth();
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const handleExploreDemo = async () => {
    await enterDemoMode();
    navigate('/app');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(`from sdk import track_agent

@track_agent("Customer Support Agent")
def my_agent_node(state):
    # Automatically tracks steps, tool calls, costs, and security
    response = llm.invoke(state["messages"])
    return {"messages": [response]}`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 selection:bg-blue-500/30 selection:text-blue-200 font-sans antialiased overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        {/* Background Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-blue-600/15 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[450px] h-[280px] bg-purple-600/12 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[450px] h-[280px] bg-emerald-600/10 rounded-full blur-[130px] pointer-events-none" />

        {/* High-Tech Futuristic Cyber Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.09)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_10%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-purple-500/15 border border-blue-500/30 text-xs font-mono font-medium text-blue-300 shadow-lg shadow-blue-950/40 animate-in fade-in duration-300">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-sm shadow-blue-400" />
            <span>AI Agent Observability, Security & Cost Control</span>
          </div>

          {/* Core Story Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-100 tracking-tight leading-[1.08]">
              Know what your AI agents are doing.
            </h1>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent tracking-tight">
              Before they fail, hallucinate, get hacked, or burn cash.
            </h2>
          </div>

          {/* Simple, Plain-English Value Proposition */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Track every single step your AI agent takes in real time. Catch infinite loops, block prompt hacking & secret leaks, and see your exact token spend down to the penny.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/auth"
              className="flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-7 py-3.5 rounded-xl transition-all shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02]"
            >
              <span>Start Monitoring Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleExploreDemo}
              className="flex items-center gap-2 text-sm font-medium text-slate-200 hover:text-white bg-[#101522] hover:bg-[#182033] border border-[#222C42] hover:border-blue-500/40 px-6 py-3.5 rounded-xl transition-all shadow-md"
            >
              <Play className="w-4 h-4 text-blue-400 fill-blue-400" />
              <span>Explore Live Demo</span>
            </button>
          </div>

          {/* HERO VISUAL: Crystal Clear Real-World Agent Flow */}
          <div className="pt-8 max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-[#0E1322]/95 via-[#0A0E18] to-[#07090F] border border-blue-500/30 rounded-2xl p-6 shadow-2xl text-left glow-accent space-y-4.5">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#1E2638]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 shadow-sm shadow-blue-950/50">
                    <Bot className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-100 font-mono">Customer Support & Order Assistant</div>
                    <div className="text-[11px] font-mono text-slate-400">trace_live_942 • GPT-4o & Groq Llama 3.3</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold shadow-sm shadow-emerald-950/40">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>SECURITY: 100% SAFE (GRADE A+)</span>
                  </span>
                </div>
              </div>

              {/* Simple Step-by-Step Flow */}
              <div className="space-y-2.5 font-mono text-xs">
                {/* Step 1 */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#090D17] border border-[#1C2538] hover:border-blue-500/40 transition-colors">
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <User className="w-4 h-4 text-blue-400 shrink-0" />
                    <span><strong className="text-blue-300 font-bold">1. User Query:</strong> "Where is my order #8491 and what is your refund policy?"</span>
                  </div>
                  <span className="text-emerald-400 font-bold ml-2 shrink-0">✓ 120ms</span>
                </div>

                {/* Step 2 */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#090D17] border border-[#1C2538] ml-4 hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong className="text-amber-300 font-bold">2. Tool Called:</strong> lookup_order_status(order_id="8491")</span>
                  </div>
                  <span className="text-emerald-400 font-bold ml-2 shrink-0">✓ 410ms</span>
                </div>

                {/* Step 3 */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/25 border border-purple-500/35 ml-4 shadow-sm shadow-purple-950/30">
                  <div className="flex items-center gap-2.5 text-purple-200">
                    <Crosshair className="w-4 h-4 text-purple-400 shrink-0" />
                    <span><strong className="text-purple-300 font-bold">3. Security Check:</strong> Prompt Injection & Secret Leak Probe</span>
                  </div>
                  <span className="text-emerald-400 font-bold ml-2 shrink-0">✓ 0 Leaks / Safe</span>
                </div>

                {/* Step 4 */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#090D17] border border-[#1C2538] ml-4 hover:border-cyan-500/40 transition-colors">
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Brain className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span><strong className="text-cyan-300 font-bold">4. Final Answer:</strong> "Your package is arriving today by 4 PM! Refunds valid for 30 days."</span>
                  </div>
                  <span className="text-emerald-400 font-bold ml-2 shrink-0">✓ 890ms</span>
                </div>
              </div>

              {/* Metrics Bar */}
              <div className="pt-3.5 border-t border-[#1E2638] grid grid-cols-4 gap-2.5 text-center font-mono text-xs">
                <div className="bg-[#090C16] p-2.5 rounded-xl border border-indigo-500/25">
                  <div className="text-[10px] text-indigo-300/80 uppercase font-semibold">Total Speed</div>
                  <div className="text-sm font-bold text-indigo-200 mt-0.5">1.42s</div>
                </div>
                <div className="bg-[#090C16] p-2.5 rounded-xl border border-emerald-500/25">
                  <div className="text-[10px] text-emerald-300/80 uppercase font-semibold">Exact Cost</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">$0.0018</div>
                </div>
                <div className="bg-[#090C16] p-2.5 rounded-xl border border-purple-500/25">
                  <div className="text-[10px] text-purple-300/80 uppercase font-semibold">Accuracy Score</div>
                  <div className="text-sm font-bold text-purple-300 mt-0.5">98.5 / 100</div>
                </div>
                <div className="bg-[#090C16] p-2.5 rounded-xl border border-cyan-500/25">
                  <div className="text-[10px] text-cyan-300/80 uppercase font-semibold">Security Status</div>
                  <div className="text-sm font-bold text-cyan-300 mt-0.5">Protected</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: THE REAL PROBLEM (VIBRANT GLOWING CARDS) */}
      <section id="failures" className="py-24 px-6 border-t border-[#1A2234]/80 bg-[#080B12] relative overflow-hidden">
        {/* Decorative Grid and Glows */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none opacity-40" />
        <div className="absolute top-1/2 left-10 w-96 h-96 bg-rose-600/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 right-10 w-96 h-96 bg-amber-600/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto space-y-14 relative z-10">
          <div className="text-center space-y-3.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400 uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>What Goes Wrong in Production</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
              Why running AI agents without monitoring is dangerous
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
              When AI agents talk to real customers and execute real tools, 4 major silent problems happen:
            </p>
          </div>

          {/* 4 Themed Glowing Problem Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Problem 1: Prompt Injections & Jailbreaks (CRIMSON RED GLOW) */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-[#2E0812]/90 via-[#0F101A]/95 to-[#080A12] border border-rose-500/40 hover:border-rose-400/80 space-y-4 shadow-xl shadow-rose-950/30 hover:shadow-rose-950/60 transition-all duration-300 hover:scale-[1.015]">
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-rose-500 via-rose-400 to-transparent" />
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 w-fit shadow-md shadow-rose-950/50">
                <Terminal className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>1. Prompt Injections & Jailbreaks</span>
              </h3>
              <p className="text-xs text-slate-300/90 leading-relaxed font-mono">
                Users type <em className="text-rose-300 not-italic font-bold">"Ignore all previous rules"</em> to bypass your safety filters, hijack the bot, or steal your private system prompt instructions.
              </p>
            </div>

            {/* Problem 2: Leaking API Keys & Secrets (AMBER GOLD GLOW) */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-[#2E1805]/90 via-[#0F101A]/95 to-[#080A12] border border-amber-500/40 hover:border-amber-400/80 space-y-4 shadow-xl shadow-amber-950/30 hover:shadow-amber-950/60 transition-all duration-300 hover:scale-[1.015]">
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-amber-500 via-amber-400 to-transparent" />
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-300 w-fit shadow-md shadow-amber-950/50">
                <Key className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>2. Leaking API Keys & Passwords</span>
              </h3>
              <p className="text-xs text-slate-300/90 leading-relaxed font-mono">
                Chatbots can accidentally spit out your secret API keys (<code className="text-amber-300 font-bold bg-black/40 px-1.5 py-0.5 rounded border border-amber-500/30">gsk_...</code> / <code className="text-amber-300 font-bold bg-black/40 px-1.5 py-0.5 rounded border border-amber-500/30">sk-...</code>), database passwords, or customer private data in their answers.
              </p>
            </div>

            {/* Problem 3: Infinite Tool Loops & Cost Burn (ELECTRIC BLUE GLOW) */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-[#091A36]/90 via-[#0F101A]/95 to-[#080A12] border border-blue-500/40 hover:border-blue-400/80 space-y-4 shadow-xl shadow-blue-950/30 hover:shadow-blue-950/60 transition-all duration-300 hover:scale-[1.015]">
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-blue-400 to-transparent" />
              <div className="p-3 rounded-2xl bg-blue-500/15 border border-blue-500/35 text-blue-300 w-fit shadow-md shadow-blue-950/50">
                <Repeat className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>3. Endless Loops & Wasted Money</span>
              </h3>
              <p className="text-xs text-slate-300/90 leading-relaxed font-mono">
                If a tool API fails, the agent repeats the same tool call in an endless loop, freezing the user's screen and wasting thousands of dollars on tokens.
              </p>
            </div>

            {/* Problem 4: Fake Answers & Hallucinations (PURPLE / VIOLET GLOW) */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-[#240A33]/90 via-[#0F101A]/95 to-[#080A12] border border-purple-500/40 hover:border-purple-400/80 space-y-4 shadow-xl shadow-purple-950/30 hover:shadow-purple-950/60 transition-all duration-300 hover:scale-[1.015]">
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-purple-500 via-purple-400 to-transparent" />
              <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/35 text-purple-300 w-fit shadow-md shadow-purple-950/50">
                <AlertTriangle className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>4. Fake Answers & Hallucinations</span>
              </h3>
              <p className="text-xs text-slate-300/90 leading-relaxed font-mono">
                The AI invents fake refund policies, discounts, or incorrect numbers with 100% confidence, misleading your real customers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE SOLUTION (HOW AGENTOPS SOLVES IT) */}
      <section id="product" className="py-24 px-6 border-t border-[#1A2234]/80 relative bg-[#07090E]">
        <div className="max-w-5xl mx-auto space-y-14 relative z-10">
          <div className="text-center space-y-3.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Full-Stack Agent Defense</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
              How AgentOps Protects and Monitors Your Bot
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
              We give you complete security testing, step-by-step visibility, and cost tracking in one clean dashboard:
            </p>
          </div>

          {/* 4 Solution Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Solution 1 */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-[#120D26]/90 via-[#0B0F1B] to-[#070910] border border-purple-500/35 hover:border-purple-400/70 transition-all duration-200 hover:scale-[1.01] space-y-3.5 shadow-lg shadow-purple-950/20">
              <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 w-fit">
                <Crosshair className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                1. Security & Prompt Injection Testing (Red-Team)
              </h3>
              <p className="text-xs text-slate-300/85 leading-relaxed font-mono">
                Our automated testing engine fires real prompt injections, jailbreaks, and secret-theft attacks at your agent to verify its defenses before real users can hack it.
              </p>
              <div className="pt-2 text-[11px] font-mono text-purple-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>5 Concurrent Attacks in &lt;1.0s + 1-Click Markdown Reports</span>
              </div>
            </div>

            {/* Solution 2 */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-[#0B152A]/90 via-[#0B0F1B] to-[#070910] border border-indigo-500/35 hover:border-indigo-400/70 transition-all duration-200 hover:scale-[1.01] space-y-3.5 shadow-lg shadow-indigo-950/20">
              <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 w-fit">
                <Layers className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                2. Live Step-by-Step Observability (Call Tree)
              </h3>
              <p className="text-xs text-slate-300/85 leading-relaxed font-mono">
                See exactly what the agent thought, which tools it called, what parameters it passed, and how many milliseconds each step took in a clean visual tree.
              </p>
              <div className="pt-2 text-[11px] font-mono text-indigo-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Compatible with LangGraph, CrewAI, AutoGen & custom Python</span>
              </div>
            </div>

            {/* Solution 3 */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-[#061F2E]/90 via-[#0B0F1B] to-[#070910] border border-cyan-500/35 hover:border-cyan-400/70 transition-all duration-200 hover:scale-[1.01] space-y-3.5 shadow-lg shadow-cyan-950/20">
              <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 w-fit">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                3. Stop Infinite Loops & Latency Bottlenecks
              </h3>
              <p className="text-xs text-slate-300/85 leading-relaxed font-mono">
                Detect tool loops instantly and stop runaway retries. Track slow queries so you know exactly which API call is slowing down your agent.
              </p>
              <div className="pt-2 text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Automated Cycle Detection & Ready-to-Paste Code Patches</span>
              </div>
            </div>

            {/* Solution 4 */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-[#062418]/90 via-[#0B0F1B] to-[#070910] border border-emerald-500/35 hover:border-emerald-400/70 transition-all duration-200 hover:scale-[1.01] space-y-3.5 shadow-lg shadow-emerald-950/20">
              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 w-fit">
                <Coins className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                4. Token Costs & Multi-LLM Failover
              </h3>
              <p className="text-xs text-slate-300/85 leading-relaxed font-mono">
                Track exact dollar costs per run across Groq, Gemini, GPT-4o, and Claude. Built-in automatic backup keys prevent downtime when rate limits happen.
              </p>
              <div className="pt-2 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>4-Tier Automatic LLM Fallback (Groq ➔ Gemini ➔ Local)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: 2-LINE CODE INTEGRATION */}
      <section id="how-it-works" className="py-24 px-6 border-t border-[#1A2234]/80 bg-[#080B12]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
              Connect in 2 Lines of Code
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto font-normal">
              Add one lightweight decorator to your agent function. Zero complicated setup.
            </p>
          </div>

          <div className="bg-gradient-to-b from-[#0B0F1A] to-[#07090F] border border-blue-500/30 rounded-2xl p-5 text-left font-mono text-xs text-slate-200 overflow-hidden shadow-2xl max-w-2xl mx-auto relative glow-accent">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E2638] text-slate-400 text-xs">
              <span className="flex items-center gap-2 text-slate-200 font-semibold">
                <Code2 className="w-4 h-4 text-blue-400" />
                <span>your_agent.py</span>
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-[#141A28] hover:bg-[#1C2438] border border-[#263148] px-3 py-1 rounded-xl transition-all shadow-sm"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                <span>{copiedCode ? 'Copied to Clipboard' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="text-slate-300 leading-relaxed text-xs p-1 select-all font-mono">
              <span className="text-blue-400">from</span> sdk <span className="text-blue-400">import</span> track_agent{'\n\n'}
              <span className="text-cyan-400">@track_agent</span>(<span className="text-emerald-300">"Customer Support Agent"</span>){'\n'}
              <span className="text-blue-400">def</span> <span className="text-indigo-300 font-bold">my_agent_node</span>(state):{'\n'}
              {'    '}<span className="text-slate-500"># Traces steps, tool calls, costs, and security automatically</span>{'\n'}
              {'    '}response = llm.invoke(state[<span className="text-emerald-300">"messages"</span>]){'\n'}
              {'    '}<span className="text-blue-400">return</span> {'{'}<span className="text-emerald-300">"messages"</span>: [response]{'}'}
            </pre>
          </div>

          <div className="pt-2">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-blue-600/30 hover:scale-[1.02]"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-6 border-t border-[#1A2234]/80 bg-[#06080D]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo size="sm" />
          <div className="text-xs text-slate-500 font-mono">
            © 2026 AgentOps • Universal AI Agent Observability, Security & Cost Dashboard.
          </div>
        </div>
      </footer>
    </div>
  );
};
