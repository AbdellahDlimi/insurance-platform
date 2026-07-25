import uuid
import json
import threading
import logging
from kafka import KafkaConsumer

from app.core.kafka_client import publish_event, KAFKA_BOOTSTRAP_SERVERS

logger = logging.getLogger(__name__)


def produce_cotisation_recalculated(
    adhesion_id: uuid.UUID,
    utilisateur_id: uuid.UUID,
    groupe_id: uuid.UUID,
    ancien_coefficient: float,
    nouveau_coefficient: float,
    montant_final: float,
    periode: str
) -> None:
    """
    Publie l'événement cotisation.recalculated.
    """
    payload = {
        "adhesion_id": str(adhesion_id),
        "utilisateur_id": str(utilisateur_id),
        "groupe_id": str(groupe_id),
        "ancien_coefficient": float(ancien_coefficient),
        "nouveau_coefficient": float(nouveau_coefficient),
        "montant_final": float(montant_final),
        "periode": periode,
    }
    publish_event("cotisation.recalculated", payload)
    logger.info(f"Événement cotisation.recalculated publié pour l'adhésion {adhesion_id}")


def consume_claim_validated(db_session_factory) -> None:
    """
    Démarre le consommateur pour l'événement claim.validated dans un thread d'arrière-plan.
    """
    def run():
        consumer = None
        try:
            consumer = KafkaConsumer(
                "claim.validated",
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                group_id="cagnotte_claim_validation_group",
                value_deserializer=lambda x: json.loads(x.decode("utf-8")),
                auto_offset_reset="earliest",
            )
            logger.info("Consommateur Kafka pour 'claim.validated' démarré avec succès.")
            for message in consumer:
                try:
                    event = message.value
                    payload = event.get("payload", {})
                    
                    from app.modules.cagnotte.service import process_claim_validated
                    db = db_session_factory()
                    try:
                        process_claim_validated(db, payload)
                    finally:
                        db.close()
                except Exception as e:
                    logger.error(f"Erreur lors du traitement de l'événement claim.validated: {e}")
        except Exception as e:
            logger.error(f"Erreur d'initialisation du consommateur claim.validated: {e}")
        finally:
            if consumer:
                consumer.close()

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
