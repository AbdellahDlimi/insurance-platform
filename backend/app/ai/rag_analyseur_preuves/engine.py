"""
Moteur d'analyse IA de pièces justificatives et calcul de score de fraude.
Utilise PyMuPDF (fitz) pour l'extraction de texte et Google Gemini 2.0 Flash
pour l'évaluation de cohérence (montant, date, descriptions, anomalies).
Fournit également un moteur de règles robuste en cas de mode démo / hors-ligne.
"""
import io
import os
import re
import json
import logging
from typing import Optional, List, Tuple

import pymupdf as fitz
from app.ai.rag_analyseur_preuves.schemas import ProofAnalysisResult
from app.ai.rag_common.llm_service import _get_client
import app.config as cfg

logger = logging.getLogger(__name__)


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """
    Extrait le texte d'un fichier (PDF, TXT, etc.).
    """
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == ".pdf":
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            pages_text = []
            for page in doc:
                text = page.get_text("text")
                if text:
                    pages_text.append(text.strip())
            return "\n\n".join(pages_text) if pages_text else "Document PDF sans texte sélectionnable (image numérisée)."
        except Exception as e:
            logger.error(f"Erreur extraction PDF {filename}: {e}")
            return f"Erreur lors de la lecture du fichier PDF: {str(e)}"
    
    elif ext in [".txt", ".csv", ".json", ".md"]:
        try:
            return file_bytes.decode("utf-8", errors="replace")
        except Exception as e:
            return f"Fichier texte non lisible: {str(e)}"
    
    elif ext in [".jpg", ".jpeg", ".png", ".webp"]:
        # Si c'est une image directe, on renvoie une indication pour l'analyse visuelle
        return f"[Image Justificative: {filename}] (Reçu/Attestation visuelle soumise)"
    
    return f"[Fichier Justificatif: {filename}]"


def _extract_amounts_from_text(text: str) -> List[float]:
    """
    Détecte les montants numériques (ex: 450.00 €, 1 200,50 EUR, 300 MAD, $500).
    """
    amounts = []
    patterns = [
        r"(?:total|montant|ttc|ht|solde|prix|cout|devis|facture)?\s*[:=]?\s*(\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{1,2})?)\s*(?:€|eur|euros|mad|dh|\$)",
        r"(?:€|eur|\$)\s*(\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{1,2})?)",
        r"\b(\d{2,6}(?:[.,]\d{1,2})?)\s*(?:€|eur|euros)",
    ]
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for m in matches:
            raw_val = m.group(1).replace(" ", "").replace(",", ".")
            try:
                val = float(raw_val)
                if 1.0 <= val <= 500000.0:
                    amounts.append(val)
            except ValueError:
                continue
    return sorted(list(set(amounts)), reverse=True)


def _heuristic_analysis(
    text: str,
    description: str,
    montant_declare: float,
    filename: str,
) -> ProofAnalysisResult:
    """
    Moteur de règles heuristiques déterministe (utilisé en secours ou mode sans clé).
    """
    anomalies = []
    score_fraude = 0.05
    severite = "faible"
    is_fraud = False

    amounts_found = _extract_amounts_from_text(text)
    montant_detecte = amounts_found[0] if amounts_found else None

    # 1. Vérification de cohérence du montant
    if montant_detecte is not None:
        diff_pct = abs(montant_declare - montant_detecte) / max(montant_detecte, 1.0)
        if diff_pct > 0.35 and abs(montant_declare - montant_detecte) > 50:
            anomalies.append(
                f"Écart significatif de montant : Montant déclaré ({montant_declare:.2f} €) vs Montant figurant sur le justificatif ({montant_detecte:.2f} €)."
            )
            score_fraude += 0.50
        elif diff_pct > 0.15:
            anomalies.append(
                f"Léger écart de montant : Déclaré {montant_declare:.2f} € vs {montant_detecte:.2f} € sur la pièce."
            )
            score_fraude += 0.20

    # 2. Vérification de la description et mots-clés
    desc_clean = description.lower()
    keywords_legit = [
        "accident", "vol", "casse", "panne", "dommage", "chute", "reparation",
        "facture", "devis", "constat", "police", "hopital", "medecin", "degat",
        "remplacement", "sinistre", "bris", "fuite", "incendie"
    ]
    has_keywords = any(kw in desc_clean for kw in keywords_legit) or any(kw in text.lower() for kw in keywords_legit)
    
    if len(description) < 20:
        anomalies.append("Description très brève et peu détaillée.")
        score_fraude += 0.15

    if not has_keywords and "[Image" not in text:
        anomalies.append("Terminologie inhabituelle : les mots-clés typiques d'un sinistre sont absents du justificatif.")
        score_fraude += 0.15

    # 3. Montant anormalement élevé
    if montant_declare > 3000.0:
        score_fraude += 0.10
        anomalies.append(f"Montant élevé ({montant_declare:.2f} €) nécessitant une revue attentive par l'administrateur.")

    score_fraude = min(1.0, max(0.02, score_fraude))

    if score_fraude >= 0.55:
        severite = "critique" if score_fraude >= 0.75 else "eleve"
        is_fraud = True
    elif score_fraude >= 0.25:
        severite = "moyen"
        is_fraud = False
    else:
        severite = "faible"
        is_fraud = False

    if is_fraud or anomalies:
        explication_ia = "Anomalies relevées : " + " ; ".join(anomalies)
    else:
        explication_ia = f"Dossier conforme. Le justificatif fourni ({filename}) concorde avec le montant déclaré de {montant_declare:.2f} € et la description de l'incident."

    resume_ia = (
        f"Sinistre de {montant_declare:.2f} € déclaré avec la pièce '{filename}'. "
        f"Objet : {description[:120]}{'...' if len(description) > 120 else ''}. "
        f"Statut d'analyse : Risque {severite.upper()} (score: {score_fraude:.2f})."
    )

    return ProofAnalysisResult(
        texte_extrait=text[:3000],
        resume_ia=resume_ia,
        score_fraude=round(score_fraude, 4),
        is_fraud_suspected=is_fraud,
        niveau_severite=severite,
        explication_ia=explication_ia,
        montant_detecte=montant_detecte,
        anomalies=anomalies,
        confiance_ia=0.88,
    )


def analyser_preuve(
    file_bytes: bytes,
    filename: str,
    description: str,
    montant_declare: float,
    date_declaration: str = "",
) -> ProofAnalysisResult:
    """
    Point d'entrée principal pour analyser une pièce justificative de sinistre.
    """
    # 1. Extraction du texte
    texte_extrait = extract_text_from_file(file_bytes, filename)

    # 2. Tentative avec LLM Gemini 2.0 Flash si client configuré
    client = _get_client()
    if client:
        try:
            prompt = f"""
Tu es un expert anti-fraude en assurance collaborative (TrustPool).
Tu dois évaluer la conformité et le risque de fraude d'une déclaration de sinistre en comparant la déclaration du membre et la pièce justificative fournie.

DÉCLARATION DU MEMBRE :
- Montant réclamé : {montant_declare:.2f} €
- Description de l'incident : {description}
- Date : {date_declaration}
- Nom du fichier : {filename}

TEXTE EXTRAIT DE LA PIÈCE JUSTIFICATIVE :
---
{texte_extrait[:4000]}
---

TÂCHE :
Analyse la cohérence entre la pièce justificative et la déclaration :
1. Le montant déclaré correspond-il aux factures/devis/attestations du document ?
2. La description de l'incident est-elle corroborée par le document ?
3. Y a-t-il des signes de fraude, d'incohérence temporelle, de falsification ou de contradiction ?

RÉPONDS STRICTEMENT AU FORMAT JSON SUIVANT (sans balises markdown supplémentaires) :
{{
  "resume_ia": "Résumé synthétique clair en 2-3 phrases de l'incident et du document pour l'administrateur",
  "score_fraude": 0.05,
  "is_fraud_suspected": false,
  "niveau_severite": "faible",
  "explication_ia": "Explication détaillée pour motiver la décision d'approbation ou de vigilance",
  "montant_detecte": {montant_declare},
  "anomalies": ["anomalie 1 si présente"]
}}
Note pour score_fraude :
- 0.01 à 0.15 : Dossier parfaitement conforme, aucune anomalie.
- 0.16 à 0.40 : Faible anomalie ou manque de précision mineur.
- 0.41 à 0.70 : Divergence notable (ex: montant réclamé plus élevé que sur facture, dates divergentes).
- 0.71 à 1.00 : Fraude évidente ou falsification flagrante.
"""
            response = client.models.generate_content(
                model=cfg.GEMINI_LLM_MODEL,
                contents=prompt,
            )
            raw_json = response.text.strip()
            # Nettoyer d'éventuels ```json ... ```
            if raw_json.startswith("```"):
                raw_json = re.sub(r"^```(?:json)?\n?", "", raw_json)
                raw_json = re.sub(r"\n?```$", "", raw_json)
            
            data = json.loads(raw_json)
            return ProofAnalysisResult(
                texte_extrait=texte_extrait[:3000],
                resume_ia=data.get("resume_ia", f"Sinistre de {montant_declare} €"),
                score_fraude=float(data.get("score_fraude", 0.10)),
                is_fraud_suspected=bool(data.get("is_fraud_suspected", False)),
                niveau_severite=data.get("niveau_severite", "faible"),
                explication_ia=data.get("explication_ia", "Analyse Gemini effectuée."),
                montant_detecte=data.get("montant_detecte"),
                anomalies=data.get("anomalies", []),
                confiance_ia=0.95,
            )
        except Exception as e:
            logger.warning(f"Fallback vers analyse heuristique suite à erreur LLM: {e}")

    # Fallback heuristique robuste
    return _heuristic_analysis(texte_extrait, description, montant_declare, filename)
