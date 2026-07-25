"""
Génération automatique de PDF pour les déclarations de sinistres.
Utilise FPDF2 (pur Python, zéro dépendance système).

Installation : pip install fpdf2
"""
from datetime import datetime
from typing import Any

from fpdf import FPDF


def _safe_text(text: str) -> str:
    """Remplace les caractères non supportés par les polices core PDF."""
    return text.replace("€", "EUR").replace("→", "->").replace("—", "-")


class SinistrePDF(FPDF):
    """PDF personnalisé avec en-tête et pied de page pour la plateforme."""

    BRAND_COLOR = (41, 98, 255)  # Bleu plateforme

    def header(self):
        # ── Bande de couleur en haut ──
        self.set_fill_color(*self.BRAND_COLOR)
        self.rect(0, 0, 210, 25, "F")

        # ── Titre ──
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(255, 255, 255)
        self.set_y(7)
        self.cell(0, 10, "Plateforme Assurance P2P", align="C", ln=True)

        self.ln(10)

    def footer(self):
        self.set_y(-20)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(140, 140, 140)
        self.cell(
            0, 10,
            _safe_text(
                f"Document genere automatiquement le {datetime.now().strftime('%d/%m/%Y a %H:%M')} - "
                f"Page {self.page_no()}/{{nb}}"
            ),
            align="C",
        )


def generate_sinistre_pdf(payload: dict[str, Any]) -> bytes:
    """
    Génère un PDF de déclaration de sinistre à partir du payload enrichi.

    Args:
        payload: Dictionnaire contenant les données enrichies du sinistre.
                 Clés attendues (enrichies par _enrich_payload dans events.py) :
                 - sinistre_id       (UUID)
                 - nom_groupe        (str) — nom lisible du groupe
                 - nom_emetteur      (str) — nom/prénom de l'émetteur
                 - montant_declare   (float)
                 - description       (str)
                 - date_declaration  (str, optionnel)

    Returns:
        Le contenu du PDF sous forme de bytes, prêt à être envoyé par email.
    """
    pdf = SinistrePDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=25)

    # ── Titre du document ────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 12, "Declaration de Sinistre", ln=True, align="C")
    pdf.ln(3)

    # ── Sous-titre avec la référence ─────────────────────────────────────
    sinistre_id = str(payload.get("sinistre_id", ""))
    ref_courte = sinistre_id[:8].upper() if sinistre_id else "N/A"
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(130, 130, 130)
    pdf.cell(0, 6, f"Reference : SIN-{ref_courte}", ln=True, align="C")
    pdf.ln(3)

    # ── Ligne de séparation ──────────────────────────────────────────────
    pdf.set_draw_color(*SinistrePDF.BRAND_COLOR)
    pdf.set_line_width(0.8)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(10)

    # ── Informations principales ─────────────────────────────────────────
    _add_section_title(pdf, "Informations principales")

    nom_groupe = str(payload.get("nom_groupe", "Non renseigne"))
    nom_emetteur = str(payload.get("nom_emetteur", "Non renseigne"))
    montant = payload.get("montant_declare", 0)
    date_decl = payload.get(
        "date_declaration",
        datetime.now().strftime("%d/%m/%Y a %H:%M"),
    )

    info_rows = [
        ("Groupe", nom_groupe),
        ("Declare par", nom_emetteur),
        ("Montant declare", f"{float(montant):,.2f} EUR"),
        ("Date", str(date_decl)),
        ("Statut", "En attente de traitement"),
    ]

    for label, value in info_rows:
        _add_info_row(pdf, label, value)

    pdf.ln(10)

    # ── Description du sinistre ──────────────────────────────────────────
    _add_section_title(pdf, "Description du sinistre")

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(50, 50, 50)
    description = _safe_text(
        str(payload.get("description", "Aucune description fournie."))
    )
    pdf.multi_cell(0, 7, description)
    pdf.ln(10)

    # ── Encadré d'avertissement ──────────────────────────────────────────
    _add_warning_box(
        pdf,
        "Ce sinistre est en attente de validation par l'administrateur du groupe. "
        "Veuillez verifier les informations et pieces justificatives associees "
        "avant de prendre une decision.",
    )

    return pdf.output()


# ── Fonctions utilitaires de mise en forme ───────────────────────────────────

def _add_section_title(pdf: FPDF, title: str) -> None:
    """Ajoute un titre de section stylisé."""
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(*SinistrePDF.BRAND_COLOR)
    pdf.cell(0, 10, _safe_text(title), ln=True)
    pdf.set_text_color(30, 30, 30)


def _add_info_row(pdf: FPDF, label: str, value: str) -> None:
    """Ajoute une ligne label:valeur avec alternance de fond."""
    row_height = 9
    col_label_width = 50
    col_value_width = 140

    # Fond alterné
    if int(pdf.get_y()) % 2 == 0:
        pdf.set_fill_color(245, 247, 250)
    else:
        pdf.set_fill_color(255, 255, 255)

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(col_label_width, row_height, _safe_text(label), fill=True)

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(col_value_width, row_height, _safe_text(value), fill=True, ln=True)


def _add_warning_box(pdf: FPDF, message: str) -> None:
    """Ajoute un encadré d'avertissement orange."""
    pdf.set_fill_color(255, 243, 224)
    pdf.set_draw_color(255, 152, 0)
    pdf.set_line_width(0.4)

    x = pdf.get_x()
    y = pdf.get_y()

    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(230, 126, 0)
    pdf.set_xy(x + 2, y + 2)
    pdf.cell(0, 6, "Action requise", ln=True)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(120, 80, 0)
    pdf.set_x(x + 2)
    pdf.multi_cell(170, 5, _safe_text(message))

    box_height = pdf.get_y() - y + 2
    pdf.rect(x, y, 175, box_height, "D")
