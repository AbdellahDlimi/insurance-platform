"""
Chunker de documents pour le RAG.
Stratégie : découpage récursif par paragraphes puis phrases,
avec overlap pour préserver le contexte inter-chunks.

Supporte le texte français et arabe.
"""
import re
from typing import List
from dataclasses import dataclass, field

import app.config as cfg


@dataclass
class DocumentChunk:
    """Un fragment de document prêt à être embedé et indexé."""
    contenu: str
    index: int          # Position du chunk dans le document d'origine
    titre: str = ""
    metadata: dict = field(default_factory=dict)


class RecursiveChunker:
    """
    Découpage récursif de texte avec overlap.
    Priorité : paragraphes → phrases → mots.
    Fonctionne aussi avec l'arabe (séparateurs adaptés).
    """

    # Séparateurs par ordre de priorité
    _SEPARATORS = [
        "\n\n",           # Double saut de ligne (paragraphes)
        "\n",             # Saut de ligne simple
        ". ",             # Fin de phrase (FR/EN)
        ".\n",
        "؟ ",             # Point d'interrogation arabe
        "! ",
        "، ",             # Virgule arabe
        ", ",
        " ",              # Espace (dernier recours)
    ]

    def __init__(
        self,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
    ):
        self.chunk_size = chunk_size or cfg.RAG_CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or cfg.RAG_CHUNK_OVERLAP

    def _split_text(self, text: str) -> List[str]:
        """Split récursif sur les séparateurs."""
        for sep in self._SEPARATORS:
            if sep in text:
                parts = text.split(sep)
                chunks = []
                current = ""

                for part in parts:
                    candidate = (current + sep + part).strip() if current else part.strip()

                    if len(candidate) <= self.chunk_size:
                        current = candidate
                    else:
                        if current:
                            chunks.append(current)
                        # Si le part seul est trop grand → récursion
                        if len(part) > self.chunk_size:
                            chunks.extend(self._split_text(part))
                            current = ""
                        else:
                            current = part.strip()

                if current:
                    chunks.append(current)

                return [c for c in chunks if c.strip()]

        # Aucun séparateur trouvé → découpage brut par taille
        return [
            text[i: i + self.chunk_size]
            for i in range(0, len(text), self.chunk_size)
        ]

    def _add_overlap(self, chunks: List[str]) -> List[str]:
        """
        Ajoute du contexte chevauchant entre chunks consécutifs.
        Le début de chunk[i] inclut la fin de chunk[i-1].
        """
        if len(chunks) <= 1:
            return chunks

        result = [chunks[0]]
        for i in range(1, len(chunks)):
            prev_tail = chunks[i - 1][-self.chunk_overlap:]
            result.append(prev_tail + " " + chunks[i])

        return result

    def chunk_document(
        self,
        contenu: str,
        titre: str = "",
        metadata: dict | None = None,
    ) -> List[DocumentChunk]:
        """
        Découpe un document en chunks prêts pour l'embedding.

        Args:
            contenu : Texte brut du document
            titre   : Titre du document (sera préfixé à chaque chunk)
            metadata: Informations additionnelles (groupe_id, source, etc.)

        Returns:
            Liste de DocumentChunk ordonnés
        """
        if not contenu or not contenu.strip():
            return []

        metadata = metadata or {}

        # Nettoyage léger
        text = re.sub(r"\s{3,}", "\n\n", contenu.strip())

        raw_chunks = self._split_text(text)
        overlapped = self._add_overlap(raw_chunks)

        chunks = []
        for i, chunk_text in enumerate(overlapped):
            if not chunk_text.strip():
                continue

            # Préfixer le titre pour donner du contexte à l'embedding
            full_content = f"{titre}\n{chunk_text}" if titre else chunk_text

            chunks.append(DocumentChunk(
                contenu=full_content.strip(),
                index=i,
                titre=titre,
                metadata={**metadata, "chunk_index": i, "total_chunks": len(overlapped)},
            ))

        return chunks
