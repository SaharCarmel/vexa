"""Fernet encrypt/decrypt helpers for OAuth tokens."""

from cryptography.fernet import Fernet, InvalidToken
from .config import CALENDAR_ENCRYPTION_KEY
import logging

logger = logging.getLogger(__name__)

_fernet = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        if not CALENDAR_ENCRYPTION_KEY:
            raise RuntimeError(
                "CALENDAR_ENCRYPTION_KEY is not set. "
                "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        _fernet = Fernet(CALENDAR_ENCRYPTION_KEY.encode())
    return _fernet


def encrypt_token(plaintext: str) -> str:
    """Encrypt a token string, returning a base64-encoded ciphertext."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a base64-encoded ciphertext, returning the original token string."""
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        logger.error("Failed to decrypt token — key may have changed")
        raise
