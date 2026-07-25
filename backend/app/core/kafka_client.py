"""
Client Kafka partagé — un seul producteur, réutilisé par tous les modules.
Le format exact de chaque event est défini dans infra/kafka/events.md.
"""
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from kafka import KafkaProducer

logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9094")

_producer = None

def get_producer() -> KafkaProducer | None:
    global _producer
    if _producer is None:
        try:
            _producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                request_timeout_ms=3000,
            )
        except Exception as e:
            logger.warning(
                f"Kafka non disponible sur {KAFKA_BOOTSTRAP_SERVERS} ({e}). "
                "L'application continue, mais les événements Kafka ne seront pas publiés."
            )
            return None
    return _producer


class _ProducerProxy:
    def __getattr__(self, name: str) -> Any:
        p = get_producer()
        if p is None:
            raise RuntimeError(f"Kafka producer non disponible sur {KAFKA_BOOTSTRAP_SERVERS}")
        return getattr(p, name)


producer = _ProducerProxy()


def publish_event(topic: str, payload: dict[str, Any], version: str = "1.0") -> None:
    """
    Publie un event sur Kafka en respectant l'enveloppe commune définie
    dans infra/kafka/events.md. Exemple :

        publish_event("claim.created", {"sinistre_id": "...", ...})
    """
    p = get_producer()
    if p is None:
        logger.warning(f"Événement '{topic}' ignoré : Kafka non disponible.")
        return
    try:
        envelope = {
            "event_id": str(uuid.uuid4()),
            "event_type": topic,
            "version": version,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }
        p.send(topic, value=envelope)
        p.flush()
    except Exception as e:
        logger.error(f"Erreur lors de la publication de l'événement '{topic}': {e}")


# TODO: ajouter une fonction consume_events(topic, group_id, handler) générique
# une fois le premier consommateur (module Notifications) mis en place.

