"""
🧪 Script de test — Génère un JWT + teste le PDF + teste l'email
Exécutable SANS la base de données et SANS Kafka.

Usage :
    cd backend
    source venv/bin/activate
    python -m app.tests.test_email_pdf

Ce script :
  1. Génère un token JWT valide (pour tester les endpoints API)
  2. Génère un PDF de sinistre de test (vérifie que fpdf2 marche)
  3. Envoie un email de test (si SMTP est configuré dans .env)
"""
import os
import sys

# Charger les variables d'environnement depuis .env
from dotenv import load_dotenv
load_dotenv()


def test_jwt():
    """
    Génère un JWT de test pour utiliser dans Swagger/Postman.
    Pas besoin de la BDD ni du module utilisateurs de ton collègue.
    """
    print("\n" + "=" * 60)
    print("🔐 TEST 1 — Génération de JWT")
    print("=" * 60)

    from app.core.auth import TokenPayload, create_access_token
    from uuid import uuid4

    # --- Token MEMBRE ---
    membre_payload = TokenPayload(
        user_id=str(uuid4()),
        role="membre",
        group_ids=[str(uuid4())],  # Un groupe fictif
    )
    membre_token = create_access_token(membre_payload)

    print("\n✅ Token MEMBRE généré :")
    print(f"   user_id  : {membre_payload.user_id}")
    print(f"   role     : {membre_payload.role}")
    print(f"   group_ids: {membre_payload.group_ids}")
    print(f"\n   🔑 Token : {membre_token}")
    print(f"\n   📋 Pour Swagger : Bearer {membre_token}")

    # --- Token ADMIN GROUPE ---
    admin_payload = TokenPayload(
        user_id=str(uuid4()),
        role="admin_groupe",
        group_ids=[membre_payload.group_ids[0]],  # Même groupe
    )
    admin_token = create_access_token(admin_payload)

    print("\n" + "-" * 40)
    print("\n✅ Token ADMIN GROUPE généré :")
    print(f"   user_id  : {admin_payload.user_id}")
    print(f"   role     : {admin_payload.role}")
    print(f"   group_ids: {admin_payload.group_ids}")
    print(f"\n   🔑 Token : {admin_token}")
    print(f"\n   📋 Pour Swagger : Bearer {admin_token}")

    # --- Token EQUIPE CONFORMITE ---
    conformite_payload = TokenPayload(
        user_id=str(uuid4()),
        role="equipe_conformite",
        group_ids=[],
    )
    conformite_token = create_access_token(conformite_payload)

    print("\n" + "-" * 40)
    print("\n✅ Token EQUIPE CONFORMITE généré :")
    print(f"   user_id  : {conformite_payload.user_id}")
    print(f"   role     : {conformite_payload.role}")
    print(f"\n   🔑 Token : {conformite_token}")
    print(f"\n   📋 Pour Swagger : Bearer {conformite_token}")

    return membre_payload, admin_payload


def test_pdf(membre_payload=None):
    """
    Génère un PDF de test et le sauvegarde sur le disque.
    """
    print("\n" + "=" * 60)
    print("📄 TEST 2 — Génération de PDF")
    print("=" * 60)

    try:
        from app.modules.notifications.pdf_generator import generate_sinistre_pdf
    except ImportError:
        print("\n❌ fpdf2 n'est pas installé. Installe-le avec :")
        print("   pip install fpdf2")
        return None

    from uuid import uuid4

    # Données de test simulant un payload Kafka enrichi
    payload = {
        "sinistre_id": str(uuid4()),
        "adhesion_id": str(uuid4()),
        "groupe_id": str(uuid4()),
        "utilisateur_id": membre_payload.user_id if membre_payload else str(uuid4()),
        "nom_groupe": "Groupe Les Bons Amis",
        "nom_emetteur": "Ilyass Dlimi",
        "montant_declare": 1500.00,
        "description": (
            "Dégât des eaux dans l'appartement suite à une fuite du voisin du dessus. "
            "Le plafond de la cuisine et du salon sont endommagés. "
            "Les murs présentent des traces d'humidité importantes. "
            "Intervention d'un plombier déjà effectuée pour stopper la fuite."
        ),
    }

    print(f"\n📦 Payload de test :")
    for key, value in payload.items():
        display = f"{str(value)[:50]}..." if len(str(value)) > 50 else value
        print(f"   {key}: {display}")

    # Générer le PDF
    pdf_bytes = generate_sinistre_pdf(payload)

    # Sauvegarder sur le disque
    output_path = os.path.join(os.path.dirname(__file__), "..", "..", "test_sinistre.pdf")
    output_path = os.path.abspath(output_path)
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)

    print(f"\n✅ PDF généré avec succès !")
    print(f"   Taille  : {len(pdf_bytes)} bytes")
    print(f"   Fichier : {output_path}")
    print(f"\n   📂 Ouvre ce fichier pour vérifier le rendu du PDF.")

    return pdf_bytes, payload


def test_email(pdf_bytes=None, payload=None):
    """
    Teste la construction de l'email et le sauvegarde dans un fichier local
    pour que tu puisses vérifier le résultat sans configurer de serveur SMTP.
    """
    print("\n" + "=" * 60)
    print("📧 TEST 3 — Envoi d'email (Mode Local)")
    print("=" * 60)

    from app.modules.notifications.email_service import build_claim_email_body
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders

    if not pdf_bytes or not payload:
        print("\n⚠️  Pas de PDF à joindre — génère d'abord le PDF (test 2).")
        return

    # Construire le corps HTML de l'email
    body_html = build_claim_email_body(payload)
    sinistre_id = payload.get("sinistre_id", "test")

    print(f"\n⚙️ Construction de l'email...")

    # Simuler le message qui serait envoyé par SMTP
    msg = MIMEMultipart()
    msg["From"] = "noreply@insurance-platform.com"
    msg["To"] = "admin@groupe.com"
    msg["Subject"] = f"🚨 Nouveau sinistre déclaré — Réf. SIN-{sinistre_id[:8].upper()}"

    # Corps HTML
    msg.attach(MIMEText(body_html, "html", "utf-8"))

    # Pièce jointe PDF
    attachment = MIMEBase("application", "pdf")
    attachment.set_payload(pdf_bytes)
    encoders.encode_base64(attachment)
    attachment.add_header("Content-Disposition", f"attachment; filename=\"sinistre_SIN-{sinistre_id[:8].upper()}.pdf\"")
    msg.attach(attachment)

    # Sauvegarder l'email complet dans un fichier
    output_path = os.path.join(os.path.dirname(__file__), "..", "..", "email_test_result.eml")
    output_path = os.path.abspath(output_path)
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(msg.as_string())

    print("\n✅ Email généré avec succès (Mode Dev) !")
    print("   L'email complet avec le code HTML et le PDF joint a été sauvegardé dans :")
    print(f"   📂 {output_path}")
    print("\n   💡 Astuce : Tu peux l'ouvrir avec un client mail (Thunderbird, Outlook, Mail) ")
    print("      ou simplement changer l'extension en .html pour voir le design dans ton navigateur.")


def print_usage_guide(membre_payload, admin_payload):
    """Affiche un guide d'utilisation des tokens."""
    print("\n" + "=" * 60)
    print("📖 GUIDE — Comment utiliser ces tokens")
    print("=" * 60)

    print("""
    1. Lance le serveur FastAPI :
       uvicorn app.main:app --reload

    2. Va sur http://localhost:8000/docs (Swagger UI)

    3. Clique sur le bouton 🔒 "Authorize" en haut à droite

    4. Dans le champ "Value", entre :
       Bearer <colle_le_token_ici>

    5. Clique "Authorize" → tous les endpoints sont débloqués !

    OU utilise curl :
    """)

    if membre_payload:
        from app.core.auth import create_access_token
        token = create_access_token(membre_payload)
        print(f"""    # Créer un sinistre (en tant que membre) :
    curl -X POST http://localhost:8000/claims/ \\
      -H "Authorization: Bearer {token}" \\
      -H "Content-Type: application/json" \\
      -d '{{
        "adhesion_id": "{membre_payload.group_ids[0] if membre_payload.group_ids else "uuid"}",
        "groupe_id": "{membre_payload.group_ids[0] if membre_payload.group_ids else "uuid"}",
        "description": "Test de sinistre - dégât des eaux",
        "montant_declare": 1500.00
      }}'
    """)

    print("""    OU utilise l'endpoint /dev/token :
    
    # Générer un token directement depuis l'API :
    curl http://localhost:8000/dev/token?role=admin_groupe
    """)


if __name__ == "__main__":
    print("🧪 Script de test — Email + PDF + JWT")
    print("=" * 60)

    # Test 1 : JWT
    membre, admin = test_jwt()

    # Test 2 : PDF
    result = test_pdf(membre)
    pdf_bytes, payload = result if result else (None, None)

    # Test 3 : Email
    test_email(pdf_bytes, payload)

    # Guide d'utilisation
    print_usage_guide(membre, admin)

    print("\n✨ Tests terminés !")
