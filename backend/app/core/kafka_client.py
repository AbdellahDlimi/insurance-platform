"""
Client Kafka partagé — un seul producteur, réutilisé par tous les modules.
Le format exact de chaque event est défini dans infra/kafka/events.md.
"""
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from kafka import KafkaProducer

KAFKA_BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
)


def publish_event(topic: str, payload: dict[str, Any], version: str = "1.0") -> None:
    """
    Publie un event sur Kafka en respectant l'enveloppe commune définie
    dans infra/kafka/events.md. Exemple :

        publish_event("claim.created", {"sinistre_id": "...", ...})
    """
    envelope = {
        "event_id": str(uuid.uuid4()),
        "event_type": topic,
        "version": version,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }
    producer.send(topic, value=envelope)
    producer.flush()


# TODO: ajouter une fonction consume_events(topic, group_id, handler) générique
# une fois le premier consommateur (module Notifications) mis en place.
