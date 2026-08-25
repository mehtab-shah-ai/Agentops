import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    organization_name = Column(String(255), nullable=True, default="Default Organization")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    traces = relationship("Trace", back_populates="user", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="user", cascade="all, delete-orphan")
    alert_rules = relationship("AlertRule", back_populates="user", cascade="all, delete-orphan")
    alert_history = relationship("AlertHistory", back_populates="user", cascade="all, delete-orphan")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    key_hash = Column(String(255), unique=True, nullable=False, index=True)
    key_prefix = Column(String(32), nullable=False)  # e.g., "ag_live_abcd..."
    name = Column(String(100), nullable=False, default="Default API Key")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="api_keys")


class Trace(Base):
    __tablename__ = "traces"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    trace_id = Column(String(64), nullable=False, index=True)  # Root workflow ID
    span_id = Column(String(64), nullable=False, index=True)   # Current step ID
    parent_span_id = Column(String(64), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    agent_name = Column(String(100), nullable=False, index=True, default="agent")
    task_type = Column(String(100), nullable=False, index=True, default="general")
    model_name = Column(String(100), nullable=False, index=True, default="unknown")

    input_query = Column(Text, nullable=False)
    context = Column(Text, nullable=True)
    output_result = Column(Text, nullable=False)

    latency_ms = Column(Float, nullable=False, default=0.0)
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    cost_usd = Column(Float, nullable=False, default=0.0)

    status = Column(String(32), nullable=False, default="success", index=True)  # "success" or "failed"
    failure_reasons = Column(JSON, nullable=True, default=list)  # ["loop_detected", "schema_validation_error", etc.]

    step_index = Column(Integer, nullable=True, default=0)
    metadata_json = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    user = relationship("User", back_populates="traces")
    evaluation = relationship("Evaluation", back_populates="trace", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_traces_user_created", "user_id", "created_at"),
        Index("ix_traces_user_task_model", "user_id", "task_type", "model_name"),
    )


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    trace_record_id = Column(String(36), ForeignKey("traces.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    hallucination_score = Column(Float, nullable=False, default=0.0)  # 0.0 = grounded/clean, 1.0 = heavy hallucination
    faithfulness_score = Column(Float, nullable=False, default=1.0)   # 1.0 = perfectly grounded, 0.0 = ungrounded
    relevance_score = Column(Float, nullable=False, default=1.0)      # 1.0 = fully addresses query, 0.0 = irrelevant

    claims_extracted = Column(JSON, nullable=True, default=list)
    verdict = Column(String(32), nullable=False, default="PASS")       # PASS, FLAGGED, CRITICAL
    eval_status = Column(String(32), nullable=False, default="completed", index=True) # completed, pending, failed
    judge_model = Column(String(100), nullable=True)
    eval_latency_ms = Column(Float, nullable=True, default=0.0)
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    user = relationship("User", back_populates="evaluations")
    trace = relationship("Trace", back_populates="evaluation")


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    metric = Column(String(64), nullable=False)  # "hallucination_rate", "error_rate", "cost_threshold"
    threshold = Column(Float, nullable=False)
    window_minutes = Column(Integer, nullable=False, default=60)
    target_email = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="alert_rules")


class AlertHistory(Base):
    __tablename__ = "alert_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_id = Column(String(36), ForeignKey("alert_rules.id", ondelete="SET NULL"), nullable=True)
    metric = Column(String(64), nullable=False)
    triggered_value = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    message = Column(Text, nullable=False)
    sent_to = Column(String(255), nullable=False)
    status = Column(String(32), nullable=False, default="sent")  # sent, failed, simulated
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    user = relationship("User", back_populates="alert_history")
