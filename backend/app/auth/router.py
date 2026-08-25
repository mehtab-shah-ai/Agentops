from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependencies import get_current_user
from app.auth.jwt_handler import (
    create_access_token,
    generate_api_key,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models import ApiKey, User
from app.schemas import (
    ApiKeyCreatedResponse,
    ApiKeyCreateRequest,
    ApiKeyOut,
    TokenResponse,
    UserLoginRequest,
    UserOut,
    UserRegisterRequest,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register_user(
    request: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    # Check if email is already taken
    stmt = select(User).where(User.email == request.email.lower().strip())
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    new_user = User(
        email=request.email.lower().strip(),
        hashed_password=hash_password(request.password),
        organization_name=request.organization_name or "Default Organization",
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token = create_access_token({"sub": new_user.id, "email": new_user.email})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(new_user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate with email & password to obtain JWT",
)
async def login_user(
    request: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.email == request.email.lower().strip())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found. Please click 'Create Account' to register first.",
        )

    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please verify your credentials.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Please contact support.",
        )

    token = create_access_token({"sub": user.id, "email": user.email})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get details of currently authenticated user",
)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post(
    "/keys",
    response_model=ApiKeyCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a new API Key for SDK / programmatic ingestion",
)
async def create_new_api_key(
    request: ApiKeyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raw_key, key_hash, key_prefix = generate_api_key()

    new_api_key = ApiKey(
        user_id=current_user.id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=request.name.strip() or "API Key",
    )
    db.add(new_api_key)
    await db.flush()

    return ApiKeyCreatedResponse(
        id=new_api_key.id,
        key_prefix=new_api_key.key_prefix,
        name=new_api_key.name,
        is_active=new_api_key.is_active,
        created_at=new_api_key.created_at,
        last_used_at=new_api_key.last_used_at,
        api_key=raw_key,
    )


@router.get(
    "/keys",
    response_model=List[ApiKeyOut],
    summary="List all API keys belonging to the current user",
)
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id)
        .order_by(ApiKey.created_at.desc())
    )
    result = await db.execute(stmt)
    keys = result.scalars().all()
    return [ApiKeyOut.model_validate(k) for k in keys]


@router.delete(
    "/keys/{key_id}",
    status_code=status.HTTP_200_OK,
    summary="Revoke/delete an API Key",
)
async def delete_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == current_user.id)
    result = await db.execute(stmt)
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API Key not found",
        )

    await db.delete(api_key)
    return {"message": "API key revoked successfully", "key_id": key_id}


@router.delete(
    "/account",
    status_code=status.HTTP_200_OK,
    summary="Permanently delete user account and all workspace data",
)
async def delete_user_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently deletes the authenticated user account along with all API keys,
    traces, evaluations, and alerts via cascading database constraints.
    """
    try:
        await db.delete(current_user)
        await db.commit()
        return {"status": "success", "message": "Account and all associated telemetry permanently deleted."}
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account: {str(e)}",
        )
