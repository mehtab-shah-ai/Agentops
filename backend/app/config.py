import json
import os
from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_FILE = (BASE_DIR / "agentops.db").as_posix()


class Settings(BaseSettings):
    # App config
    APP_NAME: str = "AgentOps"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # Security & Auth
    SECRET_KEY: str = "agentops_dev_secret_key_change_in_production_32charsmin!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DEFAULT_DB_FILE}"
    DB_BUSY_TIMEOUT: int = 5000

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    # LLM Providers for Judge / Evaluation
    GROQ_API_KEY: str = ""
    GROQ_API_KEY_SECONDARY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    GEMINI_API_KEY: str = ""
    GEMINI_API_KEY_SECONDARY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Live Web Search & Grounding
    TAVILY_API_KEY: str = ""
    SERPER_API_KEY: str = ""
    SERPER_API_KEY_SECONDARY: str = ""
    ENABLE_LIVE_WEB_SEARCH: bool = True

    # Alerts & SMTP
    SMTP_ENABLED: bool = False
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "alerts@agentops.dev"
    SMTP_USE_TLS: bool = True

    # Ingestion Rate Limiting
    RATE_LIMIT_REQUESTS: int = 120
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("DATABASE_URL", mode="after")
    def resolve_db_url(cls, v):
        if v and "sqlite" in v:
            return f"sqlite+aiosqlite:///{DEFAULT_DB_FILE}"
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
