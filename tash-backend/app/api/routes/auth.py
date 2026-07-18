from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import ClientDep, DbDep, UserDep
from app.core.errors import AuthError
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import ClientMe, LoginIn, TokenOut, UserMe

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=TokenOut)
async def login(data: LoginIn, db: DbDep) -> TokenOut:
    user = (
        await db.execute(select(User).where(User.email == data.email.lower()))
    ).scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(data.password, user.password_hash):
        raise AuthError("Email yoki parol noto'g'ri", code="bad_credentials")
    token = create_access_token(user_id=user.id, role=user.role, salon_id=user.salon_id)
    return TokenOut(access_token=token, role=user.role, salon_id=user.salon_id)


@router.get("/me", response_model=UserMe)
async def me_user(user: UserDep) -> User:
    """Owner/master identity (Bearer JWT)."""
    return user


@router.get("/me/client", response_model=ClientMe)
async def me_client(client: ClientDep):
    """Telegram client identity (tma initData)."""
    return client
