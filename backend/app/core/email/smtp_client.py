"""
SMTP Client — Direct email dispatch using Python standard smtplib.
Works seamlessly with Gmail SMTP (App Passwords) and any standard SMTP server.
100% Free with zero domain verification required.
"""
import smtplib
import logging
import traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.email.models import EmailPayload, EmailResult

logger = logging.getLogger(__name__)


class SMTPClient:
    """
    Standard SMTP Client matching the send(payload: EmailPayload) -> EmailResult interface.
    """

    def __init__(self, host: str, port: int, user: str, password: str, use_tls: bool = True) -> None:
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.use_tls = use_tls
        logger.info("[SMTP] Client initialized | host=%s | port=%d | user=%s | use_tls=%s", host, port, user, use_tls)

    def send(self, payload: EmailPayload) -> EmailResult:
        recipients = payload.to if isinstance(payload.to, list) else [payload.to]
        logger.info("[SMTP] Attempting to send email | to=%s | subject='%s' via %s:%d", recipients, payload.subject, self.host, self.port)
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = payload.subject
            from_header = payload.from_address or (f"TrustPool <{self.user}>" if self.user else "TrustPool <noreply@trustpool.io>")
            msg["From"] = from_header
            msg["To"] = ", ".join(recipients)
            if payload.reply_to:
                msg["Reply-To"] = payload.reply_to

            # Attach HTML content
            part = MIMEText(payload.html, "html", "utf-8")
            msg.attach(part)

            sender = self.user if (self.user and "@" in self.user) else from_header
            # Clean spaces (e.g. Google App Password often copied with spaces)
            clean_pwd = self.password.replace(" ", "") if self.password else ""

            if self.port == 465:
                # SSL Direct Connection
                with smtplib.SMTP_SSL(self.host, self.port, timeout=15) as server:
                    if self.user and clean_pwd:
                        server.login(self.user, clean_pwd)
                    server.sendmail(sender, recipients, msg.as_string())
            else:
                # STARTTLS (Port 587 or standard 25)
                with smtplib.SMTP(self.host, self.port, timeout=15) as server:
                    if self.use_tls:
                        server.starttls()
                    if self.user and clean_pwd:
                        server.login(self.user, clean_pwd)
                    server.sendmail(sender, recipients, msg.as_string())

            logger.info("[SMTP SUCCESS] Email sent successfully | to=%s | subject='%s'", recipients, payload.subject)
            print(f"[SMTP SUCCESS] Email envoye avec succes a {recipients} (Sujet: '{payload.subject}')")
            return EmailResult(success=True, message_id="smtp-delivered")

        except smtplib.SMTPAuthenticationError as auth_err:
            error_msg = f"SMTP Authentication failed (verifiez identifiant/mot de passe d'application) : {auth_err}"
            logger.error("[SMTP AUTH ERROR] %s", error_msg)
            print(f"[SMTP AUTH ERROR] {error_msg}")
            return EmailResult(success=False, error=error_msg)
        except smtplib.SMTPException as smtp_err:
            error_msg = f"SMTP Protocol Error: {smtp_err}"
            logger.error("[SMTP ERROR] %s\n%s", error_msg, traceback.format_exc())
            print(f"[SMTP ERROR] {error_msg}")
            return EmailResult(success=False, error=error_msg)
        except Exception as e:
            error_msg = f"Unexpected SMTP Error: {e}"
            logger.error("[SMTP UNEXPECTED] %s\n%s", error_msg, traceback.format_exc())
            print(f"[SMTP UNEXPECTED] {error_msg}")
            return EmailResult(success=False, error=error_msg)
