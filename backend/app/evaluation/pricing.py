"""
AgentOps Universal Model Pricing & Token Engine
Accurately maps input/output tokens to official provider pricing ($ per token)
across OpenAI, Anthropic Claude, Google Gemini, Groq, DeepSeek, Mistral, Meta Llama, and Local models.
"""

from typing import Tuple, Dict

# Official 2026 Per-Token Pricing Rates (Input Cost / Token, Output Cost / Token)
# Standardized to $/token
MODEL_PRICING_CATALOG: Dict[str, Tuple[float, float]] = {
    # --------------------------------------------------------------------------
    # OpenAI Models
    # --------------------------------------------------------------------------
    "gpt-4o": (2.50 / 1_000_000, 10.00 / 1_000_000),             # $2.50 / $10.00 per MTok
    "gpt-4o-mini": (0.15 / 1_000_000, 0.60 / 1_000_000),         # $0.15 / $0.60 per MTok
    "gpt-4o-2024-08-06": (2.50 / 1_000_000, 10.00 / 1_000_000),
    "o1-preview": (15.00 / 1_000_000, 60.00 / 1_000_000),        # $15.00 / $60.00 per MTok
    "o1-mini": (3.00 / 1_000_000, 12.00 / 1_000_000),            # $3.00 / $12.00 per MTok
    "o1": (15.00 / 1_000_000, 60.00 / 1_000_000),
    "o3-mini": (1.10 / 1_000_000, 4.40 / 1_000_000),            # $1.10 / $4.40 per MTok
    "gpt-4-turbo": (10.00 / 1_000_000, 30.00 / 1_000_000),
    "gpt-3.5-turbo": (0.50 / 1_000_000, 1.50 / 1_000_000),

    # --------------------------------------------------------------------------
    # Anthropic Claude Models
    # --------------------------------------------------------------------------
    "claude-3-5-sonnet": (3.00 / 1_000_000, 15.00 / 1_000_000),   # $3.00 / $15.00 per MTok
    "claude-3-5-haiku": (0.80 / 1_000_000, 4.00 / 1_000_000),     # $0.80 / $4.00 per MTok
    "claude-3-opus": (15.00 / 1_000_000, 75.00 / 1_000_000),     # $15.00 / $75.00 per MTok
    "claude-3-sonnet": (3.00 / 1_000_000, 15.00 / 1_000_000),
    "claude-3-haiku": (0.25 / 1_000_000, 1.25 / 1_000_000),

    # --------------------------------------------------------------------------
    # DeepSeek Models
    # --------------------------------------------------------------------------
    "deepseek-reasoner": (0.55 / 1_000_000, 2.19 / 1_000_000),    # $0.55 / $2.19 per MTok (R1)
    "deepseek-r1": (0.55 / 1_000_000, 2.19 / 1_000_000),
    "deepseek-chat": (0.14 / 1_000_000, 0.28 / 1_000_000),        # $0.14 / $0.28 per MTok (V3)
    "deepseek-v3": (0.14 / 1_000_000, 0.28 / 1_000_000),

    # --------------------------------------------------------------------------
    # Google Gemini Models
    # --------------------------------------------------------------------------
    "gemini-2.0-flash": (0.10 / 1_000_000, 0.40 / 1_000_000),     # $0.10 / $0.40 per MTok
    "gemini-1.5-flash": (0.075 / 1_000_000, 0.30 / 1_000_000),    # $0.075 / $0.30 per MTok
    "gemini-1.5-pro": (1.25 / 1_000_000, 5.00 / 1_000_000),       # $1.25 / $5.00 per MTok
    "gemini-pro": (0.50 / 1_000_000, 1.50 / 1_000_000),

    # --------------------------------------------------------------------------
    # Groq Cloud LPUs
    # --------------------------------------------------------------------------
    "llama-3.3-70b-versatile": (0.59 / 1_000_000, 0.79 / 1_000_000), # $0.59 / $0.79 per MTok
    "llama-3.3-70b": (0.59 / 1_000_000, 0.79 / 1_000_000),
    "llama-3.1-70b": (0.59 / 1_000_000, 0.79 / 1_000_000),
    "llama-3.1-8b-instant": (0.05 / 1_000_000, 0.08 / 1_000_000),  # $0.05 / $0.08 per MTok
    "llama-3.1-8b": (0.05 / 1_000_000, 0.08 / 1_000_000),
    "mixtral-8x7b-32768": (0.24 / 1_000_000, 0.24 / 1_000_000),
    "gemma2-9b-it": (0.20 / 1_000_000, 0.20 / 1_000_000),

    # --------------------------------------------------------------------------
    # Mistral AI
    # --------------------------------------------------------------------------
    "mistral-large": (2.00 / 1_000_000, 6.00 / 1_000_000),
    "mistral-small": (0.20 / 1_000_000, 0.60 / 1_000_000),
    "codestral": (0.20 / 1_000_000, 0.60 / 1_000_000),
    "mistral-nemo": (0.15 / 1_000_000, 0.15 / 1_000_000),

    # --------------------------------------------------------------------------
    # Cohere
    # --------------------------------------------------------------------------
    "command-r-plus": (2.50 / 1_000_000, 10.00 / 1_000_000),
    "command-r": (0.15 / 1_000_000, 0.60 / 1_000_000),

    # --------------------------------------------------------------------------
    # Local & Self-Hosted Models (Ollama, vLLM, LM Studio, Localhost)
    # --------------------------------------------------------------------------
    "ollama": (0.0, 0.0),
    "local": (0.0, 0.0),
    "vllm": (0.0, 0.0),
    "lmstudio": (0.0, 0.0),
}


def calculate_llm_cost(
    model_name: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    query: str = "",
    output: str = "",
) -> float:
    """
    Calculates exact inference cost ($ USD) for any arbitrary LLM model.
    1. Extracts or estimates token counts.
    2. Fuzzy-matches model name against official provider rates.
    3. Multiplies input_tokens * in_rate + output_tokens * out_rate.
    """
    # 1. Token count resolution
    in_tok = input_tokens if input_tokens > 0 else max(1, len(query) // 4)
    out_tok = output_tokens if output_tokens > 0 else max(1, len(output) // 4)

    # 2. Rate lookup
    clean_model = (model_name or "general").lower().strip()

    # Local model detection
    if any(loc in clean_model for loc in ["ollama", "local", "localhost", "vllm", "lmstudio"]):
        return 0.0

    in_rate, out_rate = (0.59 / 1_000_000, 0.79 / 1_000_000)  # Default base rate ($0.59 / MTok)

    # Exact or prefix match
    matched = False
    for catalog_model, (ir, or_) in MODEL_PRICING_CATALOG.items():
        if catalog_model in clean_model:
            in_rate, out_rate = ir, or_
            matched = True
            break

    if not matched:
        # Generic family heuristics
        if "gpt-4" in clean_model or "o1" in clean_model:
            in_rate, out_rate = (2.50 / 1_000_000, 10.00 / 1_000_000)
        elif "claude" in clean_model or "sonnet" in clean_model:
            in_rate, out_rate = (3.00 / 1_000_000, 15.00 / 1_000_000)
        elif "gemini" in clean_model:
            in_rate, out_rate = (0.075 / 1_000_000, 0.30 / 1_000_000)
        elif "deepseek" in clean_model or "r1" in clean_model:
            in_rate, out_rate = (0.55 / 1_000_000, 2.19 / 1_000_000)
        elif "8b" in clean_model:
            in_rate, out_rate = (0.05 / 1_000_000, 0.08 / 1_000_000)
        elif "70b" in clean_model or "llama" in clean_model:
            in_rate, out_rate = (0.59 / 1_000_000, 0.79 / 1_000_000)

    total_cost = (in_tok * in_rate) + (out_tok * out_rate)
    return round(total_cost, 6)
