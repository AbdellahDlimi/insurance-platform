"""
Production et consommation d'events Kafka du module users_kyc.
"""
import uuid
import json
import threading
import logging
from datetime import datetime, timezone
from kafka import KafkaConsumer

from app.core.kafka_client import publish_event, KAFKA_BOOTSTRAP_SERVERS

logger = logging.getLogger(__name__)


def produce_kyc_verified(utilisateur_id: uuid.UUID, statut: str, verifie_le: datetime) -> None:
    """
    Publie l'événement user.kyc_verified.
    """
    payload = {
        "utilisateur_id": str(utilisateur_id),
        "statut": statut,
        "verifie_le": verifie_le.isoformat(),
    }
    publish_event("user.kyc_verified", payload)
    logger.info(f"Événement user.kyc_verified publié pour l'utilisateur {utilisateur_id}")


def consume_anonymity_lift_approved(db_session_factory) -> None:
    """
    Démarre le consommateur pour l'événement anonymity.lift.approved dans un thread d'arrière-plan.
    """
    def run():
        consumer = None
        try:
            consumer = KafkaConsumer(
                "anonymity.lift.approved",
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                group_id="users_kyc_anonymity_group",
                value_deserializer=lambda x: json.loads(x.decode("utf-8")),
                auto_offset_reset="earliest",
            )
            logger.info("Consommateur Kafka pour 'anonymity.lift.approved' démarré avec succès.")
            for message in consumer:
                try:
                    event = message.value
                    payload = event.get("payload", {})
                    
                    # Traiter l'événement en appelant le service
                    from app.modules.users_kyc.service import process_anonymity_lift_approved
                    db = db_session_factory()
                    try:
                        process_anonymity_lift_approved(db, payload)
                    finally:
                        db.close()
                except Exception as e:
                    logger.error(f"Erreur lors du traitement de l'événement anonymity.lift.approved: {e}")
        except Exception as e:
            logger.error(f"Erreur d'initialisation du consommateur anonymity.lift.approved: {e}")
        finally:
            if consumer:
                consumer.close()

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
