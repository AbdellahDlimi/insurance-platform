"""
Tests unitaires pour le module de stockage MinIO S3 (app.core.storage).
"""
import pytest
from app.core import storage

def test_storage_upload_and_get_bytes():
    test_content = b"Contenu de test pour la CIN / justificatif d'assurance"
    object_key = "test/kyc/cin_test.jpg"
    
    # 1. Upload
    saved_key = storage.upload_bytes(test_content, object_key, content_type="image/jpeg")
    assert saved_key is not None
    
    # 2. Récupération
    retrieved_bytes, content_type = storage.get_file_bytes(saved_key)
    assert retrieved_bytes == test_content
    assert "image" in content_type or "octet-stream" in content_type

    # 3. Suppression de nettoyage
    storage.delete_file(saved_key)
    deleted_bytes, _ = storage.get_file_bytes(saved_key)
    assert deleted_bytes is None
