from datetime import datetime, timedelta, timezone
import logging
from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.dashboard.alert_email import send_alert_email_async
from app.models import AlertHistory, AlertRule, Evaluation, Trace
from app.websocket import ws_manager

logger = logging.getLogger("agentops.alert_rules")


class AlertEvaluator:
    """
    Evaluates configured alert rules against live telemetry data and dispatches notifications.
    """

    @classmethod
    async def evaluate_user_alerts(
        cls,
        db: AsyncSession,
        user_id: str,
    ) -> List[AlertHistory]:
        triggered_alerts: List[AlertHistory] = []

        # 1. Fetch active rules
        stmt = select(AlertRule).where(AlertRule.user_id == user_id, AlertRule.is_active == True)
        result = await db.execute(stmt)
        rules = result.scalars().all()

        if not rules:
            return []

        now = datetime.now(timezone.utc)

        for rule in rules:
            window_start = now - timedelta(minutes=rule.window_minutes)

            # --- Check Hallucination Rate Metric ---
            if rule.metric == "hallucination_rate":
                eval_stmt = (
                    select(func.avg(Evaluation.hallucination_score))
                    .where(
                        Evaluation.user_id == user_id,
                        Evaluation.created_at >= window_start,
                    )
                )
                avg_val = (await db.execute(eval_stmt)).scalar()
                current_rate = float(avg_val or 0.0)

                if current_rate > rule.threshold:
                    msg = (
                        f"Alert [{rule.name}]: Hallucination score ({current_rate:.2f}) "
                        f"exceeded threshold ({rule.threshold:.2f}) over the last {rule.window_minutes} minutes."
                    )
                    history = await cls._trigger_alert(
                        db, rule, current_rate, msg, user_id
                    )
                    triggered_alerts.append(history)

            # --- Check Error Rate Metric ---
            elif rule.metric == "error_rate":
                total_stmt = select(func.count(Trace.id)).where(
                    Trace.user_id == user_id,
                    Trace.created_at >= window_start,
                )
                failed_stmt = select(func.count(Trace.id)).where(
                    Trace.user_id == user_id,
                    Trace.status == "failed",
                    Trace.created_at >= window_start,
                )
                total_calls = (await db.execute(total_stmt)).scalar() or 0
                failed_calls = (await db.execute(failed_stmt)).scalar() or 0

                if total_calls >= 5:
                    error_rate = (failed_calls / total_calls) * 100.0
                    if error_rate > rule.threshold:
                        msg = (
                            f"Alert [{rule.name}]: Agent error rate ({error_rate:.1f}%) "
                            f"exceeded threshold ({rule.threshold:.1f}%) over the last {rule.window_minutes} minutes."
                        )
                        history = await cls._trigger_alert(
                            db, rule, error_rate, msg, user_id
                        )
                        triggered_alerts.append(history)

            # --- Check Cost Threshold Metric ---
            elif rule.metric == "cost_threshold":
                cost_stmt = select(func.sum(Trace.cost_usd)).where(
                    Trace.user_id == user_id,
                    Trace.created_at >= window_start,
                )
                total_cost = float((await db.execute(cost_stmt)).scalar() or 0.0)

                if total_cost > rule.threshold:
                    msg = (
                        f"Alert [{rule.name}]: Cumulative agent cost (${total_cost:.4f}) "
                        f"exceeded budget threshold (${rule.threshold:.4f}) over the last {rule.window_minutes} minutes."
                    )
                    history = await cls._trigger_alert(
                        db, rule, total_cost, msg, user_id
                    )
                    triggered_alerts.append(history)

        return triggered_alerts

    @classmethod
    async def _trigger_alert(
        cls,
        db: AsyncSession,
        rule: AlertRule,
        triggered_val: float,
        message: str,
        user_id: str,
    ) -> AlertHistory:
        # Avoid duplicate alerts within recent 15 minutes for the same rule
        recent_cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
        check_stmt = select(AlertHistory).where(
            AlertHistory.rule_id == rule.id,
            AlertHistory.created_at >= recent_cutoff,
        )
        recent_alert = (await db.execute(check_stmt)).first()
        if recent_alert:
            logger.info(f"Suppressed duplicate alert for rule {rule.id} (alerted in last 15 mins)")
            return recent_alert[0]

        history = AlertHistory(
            user_id=user_id,
            rule_id=rule.id,
            metric=rule.metric,
            triggered_value=triggered_val,
            threshold=rule.threshold,
            message=message,
            sent_to=rule.target_email,
            status="sent",
        )
        db.add(history)
        await db.flush()

        # Send email asynchronously
        await send_alert_email_async(
            recipient=rule.target_email,
            subject=f"AgentOps Alert: {rule.name}",
            body_text=message,
        )

        # Broadcast via WebSocket to dashboard
        await ws_manager.broadcast_to_user(
            user_id=user_id,
            event_type="alert_triggered",
            data={
                "rule_name": rule.name,
                "metric": rule.metric,
                "value": triggered_val,
                "threshold": rule.threshold,
                "message": message,
            },
        )

        return history
