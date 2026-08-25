import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import bcrypt
import jwt
from app.config import settings


def hash_password(password: str) -> str:
    """Hash plaintext password with bcrypt (ensuring max 72-byte truncation for safety)."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"iat": now, "exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None


def generate_api_key() -> tuple[str, str, str]:
    """
    Generate a secure random API key.
    Returns:
        tuple of (raw_plaintext_key, key_hash, key_prefix)
    """
    random_hex = secrets.token_hex(24)
    raw_key = f"ag_live_{random_hex}"
    key_prefix = f"ag_live_{random_hex[:8]}..."
    key_hash = hash_api_key(raw_key)
    return raw_key, key_hash, key_prefix


def hash_api_key(api_key: str) -> str:
    """Deterministic hash of API key for safe database storage and lookup."""
    salt = settings.SECRET_KEY
    return hashlib.sha256(f"{api_key}:{salt}".encode("utf-8")).hexdigest()
