"""
Service d'envoi d'emails avec pièce jointe PDF.
Utilise smtplib (bibliothèque standard Python — rien à installer).

Les paramètres SMTP sont lus depuis les variables d'environnement.
Pour le développement, utiliser Mailtrap (https://mailtrap.io) ou
un compte Gmail avec un mot de passe d'application.
"""
import logging
import os
import smtplib
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

# ── Configuration SMTP depuis les variables d'environnement ──────────────────

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "noreply@insurance-platform.com")
SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "true").lower() == "true"


def send_email_with_pdf(
    to_email: str,
    subject: str,
    body_html: str,
    pdf_bytes: bytes,
    pdf_filename: str = "declaration_sinistre.pdf",
) -> bool:
    """
    Envoie un email HTML avec un PDF en pièce jointe.

    Args:
        to_email: Adresse email du destinataire (admin du groupe).
        subject: Objet de l'email.
        body_html: Corps de l'email en HTML.
        pdf_bytes: Contenu du PDF généré (bytes).
        pdf_filename: Nom du fichier PDF en pièce jointe.

    Returns:
        True si l'email a été envoyé avec succès, False sinon.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(
            "SMTP_USER ou SMTP_PASSWORD non configuré — email non envoyé. "
            "Ajoutez ces variables dans le fichier .env."
        )
        return False

    # ── Construction du message ──────────────────────────────────────────
    msg = MIMEMultipart()
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = subject

    # Corps HTML
    msg.attach(MIMEText(body_html, "html", "utf-8"))

    # Pièce jointe PDF
    attachment = MIMEBase("application", "pdf")
    attachment.set_payload(pdf_bytes)
    encoders.encode_base64(attachment)
    attachment.add_header(
        "Content-Disposition", f"attachment; filename=\"{pdf_filename}\""
    )
    msg.attach(attachment)

    # ── Envoi ────────────────────────────────────────────────────────────
    try:
        if SMTP_USE_TLS:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)

        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()

        logger.info("Email envoyé avec succès à %s — sujet : %s", to_email, subject)
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error(
            "Erreur d'authentification SMTP. Vérifiez SMTP_USER et SMTP_PASSWORD "
            "dans le fichier .env."
        )
        return False
    except smtplib.SMTPException as e:
        logger.error("Erreur SMTP lors de l'envoi de l'email : %s", e)
        return False
    except Exception:
        logger.exception("Erreur inattendue lors de l'envoi de l'email")
        return False


def build_claim_email_body(payload: dict) -> str:
    """
    Construit le corps HTML de l'email de notification de sinistre.

    Args:
        payload: Données du sinistre issues de l'event Kafka.

    Returns:
        Le contenu HTML de l'email.
    """
    sinistre_id = payload.get("sinistre_id", "N/A")
    montant = payload.get("montant_declare", 0)
    description = payload.get("description", "Aucune description")

    return f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f5f7fa; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden;">

            <!-- En-tête -->
            <div style="background: linear-gradient(135deg, #2962ff, #448aff); padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
                    🚨 Nouveau Sinistre Déclaré
                </h1>
            </div>

            <!-- Contenu -->
            <div style="padding: 24px;">
                <p style="color: #333; font-size: 15px; line-height: 1.6;">
                    Bonjour,<br><br>
                    Un nouveau sinistre a été déclaré dans votre groupe et nécessite votre attention.
                </p>

                <!-- Carte résumé -->
                <div style="background: #f0f4ff; border-left: 4px solid #2962ff;
                            border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; color: #666; font-size: 13px;">Référence</td>
                            <td style="padding: 6px 0; color: #333; font-weight: bold; font-size: 13px;
                                       text-align: right; word-break: break-all;">{sinistre_id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #666; font-size: 13px;">Montant déclaré</td>
                            <td style="padding: 6px 0; color: #d32f2f; font-weight: bold; font-size: 16px;
                                       text-align: right;">{montant:.2f} €</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #666; font-size: 13px;">Statut</td>
                            <td style="padding: 6px 0; text-align: right;">
                                <span style="background: #fff3e0; color: #e65100; padding: 3px 10px;
                                             border-radius: 12px; font-size: 12px; font-weight: bold;">
                                    En attente
                                </span>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Description -->
                <div style="margin-top: 16px;">
                    <p style="color: #666; font-size: 13px; margin-bottom: 4px;">Description :</p>
                    <p style="color: #333; font-size: 14px; background: #fafafa; padding: 12px;
                              border-radius: 6px; line-height: 1.5;">
                        {description}
                    </p>
                </div>

                <!-- CTA -->
                <div style="text-align: center; margin-top: 24px;">
                    <p style="color: #888; font-size: 13px;">
                        📎 Le PDF de déclaration est joint à cet email.
                    </p>
                </div>
            </div>

            <!-- Pied de page -->
            <div style="background: #f5f7fa; padding: 16px; text-align: center;
                        border-top: 1px solid #e8e8e8;">
                <p style="color: #aaa; font-size: 11px; margin: 0;">
                    Cet email a été envoyé automatiquement par la Plateforme Assurance P2P.
                    <br>Ne pas répondre à cet email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
