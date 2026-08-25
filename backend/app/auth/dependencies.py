from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.jwt_handler import decode_access_token, hash_api_key
from app.database import get_db
from app.models import ApiKey, User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate JWT token and return authenticated User."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired or is invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
        )

    stmt = select(User).where(User.id == user_id, User.is_active == True)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


async def get_api_key_user(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, ApiKey]:
    """Validate API Key from Header or Bearer token, update last_used_at, and return (User, ApiKey)."""
    raw_key = None

    if x_api_key:
        raw_key = x_api_key.strip()
    elif credentials and credentials.credentials:
        token = credentials.credentials.strip()
        if token.startswith("ag_live_"):
            raw_key = token
        else:
            # Authenticated via user JWT session (e.g. from browser frontend Verify Connection probe)
            user = await get_current_user(credentials=credentials, db=db)
            # Find or get user's primary active API key
            key_stmt = (
                select(ApiKey)
                .where(ApiKey.user_id == user.id, ApiKey.is_active == True)
                .order_by(ApiKey.created_at.desc())
            )
            key_res = await db.execute(key_stmt)
            active_key = key_res.scalars().first()
            if not active_key:
                from app.auth.jwt_handler import generate_api_key
                raw_k, k_hash, prefix = generate_api_key()
                active_key = ApiKey(
                    user_id=user.id,
                    key_hash=k_hash,
                    key_prefix=prefix,
                    name="Default Ingestion Key",
                )
                db.add(active_key)
                await db.commit()
                await db.refresh(active_key)
            return user, active_key

    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key. Provide via X-API-Key header or Bearer ag_live_...",
        )

    key_hash = hash_api_key(raw_key)
    stmt = (
        select(ApiKey, User)
        .join(User, ApiKey.user_id == User.id)
        .where(ApiKey.key_hash == key_hash, ApiKey.is_active == True, User.is_active == True)
    )
    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or deactivated API Key",
        )

    api_key, user = row
    now = datetime.now(timezone.utc)
    # Throttle timestamp write to reduce SQLite write lock contention on high-frequency ingest
    if api_key.last_used_at is None or (now - api_key.last_used_at.replace(tzinfo=timezone.utc if api_key.last_used_at.tzinfo is None else api_key.last_used_at.tzinfo)).total_seconds() > 60:
        api_key.last_used_at = now
    return user, api_key


async def get_authenticated_user_flexible(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Flexible auth supporting either JWT login or API Key."""
    # First check API Key header
    if x_api_key:
        user, _ = await get_api_key_user(x_api_key=x_api_key, db=db)
        return user

    # Next check Bearer credential
    if credentials and credentials.credentials:
        token = credentials.credentials.strip()
        if token.startswith("ag_live_"):
            user, _ = await get_api_key_user(credentials=credentials, db=db)
            return user
        else:
            return await get_current_user(credentials=credentials, db=db)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required (provide JWT or X-API-Key)",
    )
