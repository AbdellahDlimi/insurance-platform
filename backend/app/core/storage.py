"""
Module de stockage d'objets (S3 / MinIO) pour la plateforme d'assurance.
Gère les documents sensibles (KYC, cartes nationales, passeports, attestations de sinistre).
Compatible avec MinIO (local / on-premise) et AWS S3 / Cloudflare R2 en production.
"""
import io
import os
import mimetypes
import logging
from typing import Optional, Tuple
from fastapi import UploadFile

logger = logging.getLogger("app.core.storage")

# Configuration depuis les variables d'environnement
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "miniopassword")
MINIO_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "insurance-documents")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() in ("true", "1", "yes")

_s3_client = None


def get_s3_client():
    """
    Initialise ou retourne le client Boto3 configuré pour MinIO / S3.
    """
    global _s3_client
    if _s3_client is not None:
        return _s3_client

    try:
        import boto3
        from botocore.client import Config

        # Construire l'URL complète de l'endpoint
        protocol = "https" if MINIO_SECURE else "http"
        endpoint_url = MINIO_ENDPOINT
        if not endpoint_url.startswith("http://") and not endpoint_url.startswith("https://"):
            endpoint_url = f"{protocol}://{endpoint_url}"

        _s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=MINIO_ACCESS_KEY,
            aws_secret_access_key=MINIO_SECRET_KEY,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
                connect_timeout=1,
                read_timeout=2,
                retries={"max_attempts": 1}
            ),
            region_name="us-east-1",
        )
        return _s3_client
    except Exception as e:
        logger.warning(f"[Storage] Impossible d'initialiser boto3 S3 client: {e}")
        return None


def init_storage(bucket_name: str = MINIO_BUCKET_NAME) -> bool:
    """
    Vérifie l'existence du bucket privé sur MinIO et le crée s'il n'existe pas.
    """
    client = get_s3_client()
    if not client:
        logger.info("[Storage] Mode fallback local actif (S3 client indisponible).")
        return False

    try:
        # Vérifier si le bucket existe
        client.head_bucket(Bucket=bucket_name)
        logger.info(f"[Storage] Bucket S3 '{bucket_name}' prêt.")
        return True
    except Exception:
        try:
            client.create_bucket(Bucket=bucket_name)
            logger.info(f"[Storage] Bucket S3 '{bucket_name}' créé avec succès.")
            return True
        except Exception as e:
            logger.warning(f"[Storage] Erreur lors de la création du bucket '{bucket_name}': {e}")
            return False


def upload_bytes(
    file_bytes: bytes,
    object_name: str,
    content_type: Optional[str] = None,
    bucket_name: str = MINIO_BUCKET_NAME,
) -> str:
    """
    Upload un flux de bytes vers MinIO/S3.
    En cas d'indisponibilité du serveur S3, effectue un fallback local dans le dossier uploads/.
    Retourne la clé / chemin d'accès.
    """
    if not content_type:
        content_type, _ = mimetypes.guess_type(object_name)
        content_type = content_type or "application/octet-stream"

    client = get_s3_client()
    if client:
        try:
            init_storage(bucket_name)
            client.put_object(
                Bucket=bucket_name,
                Key=object_name,
                Body=file_bytes,
                ContentType=content_type,
            )
            logger.info(f"[Storage] Fichier uploadé vers S3 : {bucket_name}/{object_name}")
            return object_name
        except Exception as e:
            logger.warning(f"[Storage] Échec upload S3 ({e}), bascule sur stockage local.")

    # Fallback local
    local_path = os.path.join("uploads", object_name)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    with open(local_path, "wb") as f:
        f.write(file_bytes)
    logger.info(f"[Storage] Fichier sauvegardé localement : {local_path}")
    return local_path


def upload_file(
    file: UploadFile,
    object_name: str,
    bucket_name: str = MINIO_BUCKET_NAME,
) -> str:
    """
    Upload un UploadFile FastAPI vers MinIO/S3.
    """
    file.file.seek(0)
    file_bytes = file.file.read()
    file.file.seek(0)
    return upload_bytes(
        file_bytes=file_bytes,
        object_name=object_name,
        content_type=file.content_type,
        bucket_name=bucket_name,
    )


def get_file_bytes(
    object_name: str,
    bucket_name: str = MINIO_BUCKET_NAME,
) -> Tuple[Optional[bytes], Optional[str]]:
    """
    Récupère le contenu brut (bytes) et le MIME type d'un document depuis MinIO/S3 ou local.
    """
    # 1. Tenter depuis MinIO S3
    client = get_s3_client()
    if client:
        try:
            response = client.get_object(Bucket=bucket_name, Key=object_name)
            content_type = response.get("ContentType", "application/octet-stream")
            file_bytes = response["Body"].read()
            return file_bytes, content_type
        except Exception:
            pass

    # 2. Tenter depuis le système de fichiers local
    local_candidates = [
        object_name,
        os.path.join("uploads", object_name),
    ]
    for path in local_candidates:
        if os.path.exists(path) and os.path.isfile(path):
            content_type, _ = mimetypes.guess_type(path)
            with open(path, "rb") as f:
                return f.read(), content_type or "application/octet-stream"

    return None, None


def generate_presigned_url(
    object_name: str,
    expires_in: int = 900,
    bucket_name: str = MINIO_BUCKET_NAME,
) -> Optional[str]:
    """
    Génère une URL présignée temporaire (valable par défaut 15 minutes = 900s)
    permettant à l'utilisateur ou à l'agent de consulter le document de manière sécurisée.
    """
    client = get_s3_client()
    if not client:
        return None

    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket_name, "Key": object_name},
            ExpiresIn=expires_in,
        )
        return url
    except Exception as e:
        logger.error(f"[Storage] Erreur lors de la génération de l'URL présignée: {e}")
        return None


def delete_file(
    object_name: str,
    bucket_name: str = MINIO_BUCKET_NAME,
) -> bool:
    """
    Supprime un objet de MinIO/S3 ou du disque local.
    """
    deleted = False
    client = get_s3_client()
    if client:
        try:
            client.delete_object(Bucket=bucket_name, Key=object_name)
            deleted = True
        except Exception:
            pass

    local_candidates = [
        object_name,
        os.path.join("uploads", object_name),
    ]
    for path in local_candidates:
        if os.path.exists(path) and os.path.isfile(path):
            try:
                os.remove(path)
                deleted = True
            except Exception:
                pass

    return deleted

