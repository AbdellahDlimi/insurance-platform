"""
Service de parsing PDF pour le système RAG.
Utilise PyMuPDF (fitz) pour extraire le texte structuré des documents PDF.

Fonctionnalités :
- Extraction page par page avec nettoyage
- Détection de chapitres et sections
- Métadonnées du document (titre, auteur, pages)
- Support du texte français et arabe
"""
import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional

import pymupdf as fitz

logger = logging.getLogger(__name__)


@dataclass
class ParsedSection:
    """Une section logique extraite du PDF."""
    titre: str
    contenu: str
    page_debut: int
    page_fin: int
    metadata: dict = field(default_factory=dict)


@dataclass
class ParsedDocument:
    """Résultat complet du parsing d'un PDF."""
    titre: str
    texte_complet: str
    sections: List[ParsedSection]
    nb_pages: int
    nb_caracteres: int
    langue: str
    metadata: dict = field(default_factory=dict)


class PDFParser:
    """
    Extracteur de texte PDF structuré.
    Découpe le contenu par chapitres/sections pour un meilleur chunking RAG.
    """

    # Patterns pour détecter les titres de chapitres/sections
    _CHAPTER_PATTERNS = [
        r"^(\d+)\.\s+(.+)$",                    # "1. Vision et positionnement"
        r"^(\d+\.\d+)\s+(.+)$",                 # "1.1 Résumé exécutif"
        r"^CHAPITRE\s+(\d+)[.\s]+(.+)$",        # "CHAPITRE 1. ..."
        r"^(#{1,3})\s+(.+)$",                   # Markdown headings
        r"^(Article\s+\d+)\s*[—–-]\s*(.+)$",    # "Article 1 — Objet"
    ]

    def parse_file(self, filepath: str) -> ParsedDocument:
        """Parse un PDF depuis un chemin de fichier."""
        doc = fitz.open(filepath)
        return self._parse_document(doc, filepath)

    def parse_bytes(self, data: bytes, filename: str = "document.pdf") -> ParsedDocument:
        """Parse un PDF depuis des bytes."""
        doc = fitz.open(stream=data, filetype="pdf")
        return self._parse_document(doc, filename)

    def _parse_document(self, doc: fitz.Document, source: str) -> ParsedDocument:
        """Logique principale de parsing."""
        # Extraction du texte page par page
        pages_text = []
        for page in doc:
            text = page.get_text()
            cleaned = self._clean_page_text(text)
            if cleaned.strip():
                pages_text.append((page.number + 1, cleaned))

        # Texte complet
        full_text = "\n\n".join(text for _, text in pages_text)

        # Découpage en sections logiques
        sections = self._extract_sections(pages_text)

        # Métadonnées du document
        meta = doc.metadata or {}
        titre = meta.get("title", "") or self._extract_title(pages_text)

        # Détection de la langue
        langue = self._detect_langue(full_text)

        parsed = ParsedDocument(
            titre=titre,
            texte_complet=full_text,
            sections=sections,
            nb_pages=len(doc),
            nb_caracteres=len(full_text),
            langue=langue,
            metadata={
                "source": source,
                "auteur": meta.get("author", ""),
                "nb_sections": len(sections),
            },
        )

        doc.close()
        logger.info(
            f"📄 PDF parsé: {parsed.titre} — {parsed.nb_pages} pages, "
            f"{len(sections)} sections, {parsed.nb_caracteres} chars [{langue}]"
        )
        return parsed

    def _clean_page_text(self, text: str) -> str:
        """Nettoie le texte d'une page."""
        # Supprimer les numéros de page isolés
        text = re.sub(r"^\d+\s*$", "", text, flags=re.MULTILINE)
        # Supprimer les headers/footers récurrents (ex: "TrustPool — Document de référence approfondi")
        text = re.sub(
            r"TrustPool\s*—\s*Document de référence approfondi\s*",
            "",
            text,
        )
        # Normaliser les espaces multiples
        text = re.sub(r" {3,}", "  ", text)
        # Supprimer les lignes vides en excès
        text = re.sub(r"\n{4,}", "\n\n\n", text)
        return text.strip()

    def _extract_title(self, pages_text: list) -> str:
        """Extrait le titre de la première page."""
        if not pages_text:
            return "Document sans titre"
        first_page = pages_text[0][1]
        lines = [l.strip() for l in first_page.split("\n") if l.strip()]
        return lines[0] if lines else "Document sans titre"

    def _detect_langue(self, text: str) -> str:
        """Détection simple de la langue dominante."""
        if not text:
            return "fr"
        arabic_chars = sum(1 for c in text if "\u0600" <= c <= "\u06FF")
        ratio = arabic_chars / max(len(text), 1)
        return "ar" if ratio > 0.15 else "fr"

    def _extract_sections(self, pages_text: list) -> List[ParsedSection]:
        """
        Découpe le texte en sections logiques basées sur les titres de chapitres.
        Chaque section = un chapitre ou sous-chapitre cohérent.
        """
        sections: List[ParsedSection] = []
        current_title = "Introduction"
        current_content: List[str] = []
        current_page_start = 1

        for page_num, text in pages_text:
            for line in text.split("\n"):
                stripped = line.strip()
                if not stripped:
                    current_content.append("")
                    continue

                # Tester si c'est un titre de section
                is_heading = False
                for pattern in self._CHAPTER_PATTERNS:
                    match = re.match(pattern, stripped, re.IGNORECASE)
                    if match:
                        # Sauvegarder la section précédente
                        content_text = "\n".join(current_content).strip()
                        if content_text and len(content_text) > 50:
                            sections.append(ParsedSection(
                                titre=current_title,
                                contenu=content_text,
                                page_debut=current_page_start,
                                page_fin=page_num,
                            ))

                        # Démarrer une nouvelle section
                        groups = match.groups()
                        current_title = stripped
                        current_content = []
                        current_page_start = page_num
                        is_heading = True
                        break

                if not is_heading:
                    current_content.append(stripped)

        # Dernière section
        content_text = "\n".join(current_content).strip()
        if content_text and len(content_text) > 50:
            sections.append(ParsedSection(
                titre=current_title,
                contenu=content_text,
                page_debut=current_page_start,
                page_fin=pages_text[-1][0] if pages_text else 1,
            ))

        return sections
