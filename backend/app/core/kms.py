"""
Chiffrement/déchiffrement des données sensibles (KYC).

Interface stable : encrypt() / decrypt().
Le reste du code (module Utilisateurs/KYC côté A, module Audit côté B pour
la levée d'anonymat) n'appelle QUE ces deux fonctions — jamais la lib
cryptography directement. Ainsi, si un jour vous basculez sur AWS KMS/
LocalStack en prod, seul ce fichier change.

Implémentation actuelle : Fernet (gratuite, locale) — décision actée pour
le développement. Voir le PDF de cadrage pour les limites de cette
alternative (rotation de clé, stockage de la clé elle-même).
"""
import os

from cryptography.fernet import Fernet

_FERNET_KEY = os.environ.get("FERNET_KEY")
if not _FERNET_KEY:
    raise RuntimeError(
        "FERNET_KEY manquante dans les variables d'environnement. "
        "Générez-en une avec: python -c \"from cryptography.fernet import Fernet; "
        "print(Fernet.generate_key().decode())\" puis mettez-la dans votre .env "
        "(jamais commitée sur Git)."
    )

_fernet = Fernet(_FERNET_KEY)


def encrypt(data: bytes) -> bytes:
    """Chiffre des données brutes (ex: JSON des infos KYC encodé en bytes)."""
    return _fernet.encrypt(data)


def decrypt(data: bytes) -> bytes:
    """Déchiffre des données précédemment chiffrées avec encrypt()."""
    return _fernet.decrypt(data)
