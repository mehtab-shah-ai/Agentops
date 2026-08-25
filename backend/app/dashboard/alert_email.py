import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from app.config import settings

logger = logging.getLogger("agentops.alerts.email")


def _send_smtp_sync(
    recipient: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
) -> bool:
    """Synchronous SMTP email delivery."""
    if not settings.SMTP_ENABLED or not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.info(
            f"[SMTP Simulated] Alert email to '{recipient}': {subject}\nContent: {body_text}"
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[AgentOps Alert] {subject}"
        msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
        msg["To"] = recipient

        msg.attach(MIMEText(body_text, "plain"))
        if body_html:
            msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Successfully sent alert email to {recipient}")
        return True
    except Exception as e:
        logger.error(f"Failed to send alert email to {recipient}: {e}")
        return False


async def send_alert_email_async(
    recipient: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
) -> bool:
    """Non-blocking asynchronous wrapper for SMTP email dispatch."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        _send_smtp_sync,
        recipient,
        subject,
        body_text,
        body_html,
    )
