import json
import logging
from typing import Any, Dict, List, Optional
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage
from langchain_core.runnables import Runnable
from app.config import settings

logger = logging.getLogger("agentguard.llm_clients")


class LLMClientManager:
    """
    Manages primary (ChatGroq), secondary (ChatGroq Secondary Key), and fallback (ChatGoogleGenerativeAI) instances.
    Provides robust multi-provider execution with automatic fallback switching on errors or rate limits.
    """

    def __init__(self):
        self._groq_model: Optional[BaseChatModel] = None
        self._groq_secondary_model: Optional[BaseChatModel] = None
        self._gemini_model: Optional[BaseChatModel] = None
        self._init_models()

    def _init_models(self):
        # 1. Initialize Primary Groq Client
        if settings.GROQ_API_KEY:
            try:
                from langchain_groq import ChatGroq

                self._groq_model = ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model_name=settings.GROQ_MODEL,
                    temperature=0.0,
                    max_retries=1,
                    timeout=4.0,
                )
                logger.info(f"Initialized primary Groq model: {settings.GROQ_MODEL}")
            except Exception as e:
                logger.warning(f"Could not initialize primary ChatGroq: {e}")
                self._groq_model = None

        # 2. Initialize Secondary Groq Client
        if settings.GROQ_API_KEY_SECONDARY:
            try:
                from langchain_groq import ChatGroq

                self._groq_secondary_model = ChatGroq(
                    api_key=settings.GROQ_API_KEY_SECONDARY,
                    model_name=settings.GROQ_MODEL,
                    temperature=0.0,
                    max_retries=1,
                    timeout=4.0,
                )
                logger.info(f"Initialized secondary Groq model with backup API key.")
            except Exception as e:
                logger.warning(f"Could not initialize secondary ChatGroq: {e}")
                self._groq_secondary_model = None

        # 3. Initialize Fallback Gemini Client
        if settings.GEMINI_API_KEY:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI

                self._gemini_model = ChatGoogleGenerativeAI(
                    api_key=settings.GEMINI_API_KEY,
                    model=settings.GEMINI_MODEL,
                    temperature=0.0,
                    max_retries=1,
                    timeout=5.0,
                )
                logger.info(f"Initialized fallback Gemini model: {settings.GEMINI_MODEL}")
            except Exception as e:
                logger.warning(f"Could not initialize ChatGoogleGenerativeAI: {e}")
                self._gemini_model = None

        # 4. Initialize Secondary Fallback Gemini Client (if configured)
        self._gemini_secondary_model = None
        if settings.GEMINI_API_KEY_SECONDARY:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI

                self._gemini_secondary_model = ChatGoogleGenerativeAI(
                    api_key=settings.GEMINI_API_KEY_SECONDARY,
                    model=settings.GEMINI_MODEL,
                    temperature=0.0,
                    max_retries=1,
                    timeout=5.0,
                )
                logger.info("Initialized secondary fallback Gemini model.")
            except Exception as e:
                logger.warning(f"Could not initialize secondary ChatGoogleGenerativeAI: {e}")
                self._gemini_secondary_model = None

    def get_primary_model(self) -> Optional[BaseChatModel]:
        return self._groq_model

    def get_fallback_model(self) -> Optional[BaseChatModel]:
        return self._gemini_model

    def get_runnable_with_fallback(self) -> Optional[Runnable]:
        """Creates a LangChain Runnable with native with_fallbacks support."""
        fallbacks = []
        if self._groq_secondary_model:
            fallbacks.append(self._groq_secondary_model)
        if self._gemini_model:
            fallbacks.append(self._gemini_model)

        if self._groq_model and fallbacks:
            return self._groq_model.with_fallbacks(fallbacks)
        elif self._groq_model:
            return self._groq_model
        elif self._gemini_model:
            return self._gemini_model
        return None

    async def ainvoke_with_fallback(
        self,
        messages: List[BaseMessage],
    ) -> tuple[str, str]:
        """
        Asynchronously invoke LLM with explicit multi-tier fallback:
        Groq Primary -> Groq Secondary -> Gemini Fallback
        Returns tuple: (content_str, provider_model_used)
        """
        errors = []

        # Attempt 1: Primary Groq
        if self._groq_model:
            try:
                response = await self._groq_model.ainvoke(messages)
                content = response.content if hasattr(response, "content") else str(response)
                return str(content), f"groq:{settings.GROQ_MODEL}"
            except Exception as exc:
                err_msg = f"Groq primary invocation failed: {str(exc)}"
                logger.warning(err_msg)
                errors.append(err_msg)

        # Attempt 2: Secondary Groq (if configured)
        if self._groq_secondary_model:
            try:
                logger.info("Executing failover to secondary Groq key...")
                response = await self._groq_secondary_model.ainvoke(messages)
                content = response.content if hasattr(response, "content") else str(response)
                return str(content), f"groq-backup:{settings.GROQ_MODEL}"
            except Exception as exc:
                err_msg = f"Groq secondary invocation failed: {str(exc)}"
                logger.warning(err_msg)
                errors.append(err_msg)

        # Attempt 3: Fallback Gemini
        if self._gemini_model:
            try:
                logger.info("Executing failover to Gemini fallback model...")
                response = await self._gemini_model.ainvoke(messages)
                content = response.content if hasattr(response, "content") else str(response)
                return str(content), f"gemini:{settings.GEMINI_MODEL}"
            except Exception as exc:
                err_msg = f"Gemini fallback invocation failed: {str(exc)}"
                logger.warning(err_msg)
                errors.append(err_msg)

        # Attempt 4: Secondary Gemini Backup (if configured)
        if self._gemini_secondary_model:
            try:
                logger.info("Executing failover to secondary Gemini backup model...")
                response = await self._gemini_secondary_model.ainvoke(messages)
                content = response.content if hasattr(response, "content") else str(response)
                return str(content), f"gemini-backup:{settings.GEMINI_MODEL}"
            except Exception as exc:
                err_msg = f"Secondary Gemini fallback invocation failed: {str(exc)}"
                logger.error(err_msg)
                errors.append(err_msg)

        # If no client configured or all failed, raise descriptive error
        error_summary = " | ".join(errors) if errors else "No active LLM providers configured"
        raise RuntimeError(f"All LLM execution attempts (Groq Primary, Groq Secondary, Gemini Primary, Gemini Secondary) failed: {error_summary}")


# Singleton client instance
llm_manager = LLMClientManager()
