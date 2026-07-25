"""
Configuration centrale de l'application, lue depuis les variables
d'environnement (.env). Ne jamais mettre de secret en dur ici.
"""
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
KAFKA_BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS")
FERNET_KEY = os.environ.get("FERNET_KEY")
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
