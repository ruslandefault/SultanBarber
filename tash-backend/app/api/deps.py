from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AuthError, ForbiddenError, NotFoundError
from app.core.security import decode_access_token
from app.core.telegram_auth import (
    TelegramAuthError,
    parse_user,
    verify_init_data,
)
from app.db.session import get_db
from app.models.client import Client
from app.models.enums import UserRole
from app.models.salon import Salon
from app.models.user import User

DbDep = Annotated[AsyncSession, Depends(get_db)]


async def _default_salon_id(db: AsyncSession) -> int:
    """MVP is single-salon; resolve the (first) active salon for client requests."""
    salon = (
        await db.execute(select(Salon).where(Salon.is_active.is_(True)).order_by(Salon.id))
    ).scalars().first()
    if salon is None:
        raise NotFoundError("Salon topilmadi", code="salon_not_found")
    return salon.id


async def get_current_client(
    db: DbDep,
    authorization: Annotated[str | None, Header()] = None,
) -> Client:
    """Authenticate a Telegram Mini App client from ``Authorization: tma <initDataRaw>``.

    Verifies the initData HMAC + auth_date freshness, then upserts the client.
    """
    if not authorization or not authorization.lower().startswith("tma "):
        raise AuthError("Telegram avtorizatsiyasi talab qilinadi", code="tma_required")
    init_data_raw = authorization[4:].strip()

    try:
        parsed = verify_init_data(
            init_data_raw,
            settings.BOT_TOKEN,
            max_age_seconds=settings.TELEGRAM_AUTH_MAX_AGE_HOURS * 3600,
        )
        tg_user = parse_user(parsed)
    except TelegramAuthError as exc:
        raise AuthError(str(exc), code="tma_invalid") from exc

    salon_id = await _default_salon_id(db)

    client = (
        await db.execute(select(Client).where(Client.telegram_id == tg_user.id))
    ).scalar_one_or_none()

    full_name = " ".join(
        p for p in [tg_user.first_name, tg_user.last_name] if p
    ) or (tg_user.username or f"tg{tg_user.id}")

    if client is None:
        client = Client(
            salon_id=salon_id,
            telegram_id=tg_user.id,
            full_name=full_name,
            username=tg_user.username,
            language_code=tg_user.language_code,
        )
        db.add(client)
        await db.commit()
        await db.refresh(client)
    else:
        # keep profile fields fresh
        changed = False
        if tg_user.username and client.username != tg_user.username:
            client.username = tg_user.username
            changed = True
        if full_name and client.full_name != full_name and not client.notes:
            client.full_name = full_name
            changed = True
        if changed:
            await db.commit()
            await db.refresh(client)

    return client


ClientDep = Annotated[Client, Depends(get_current_client)]


async def get_current_user(
    db: DbDep,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    """Authenticate an owner/master via ``Authorization: Bearer <jwt>``."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthError("Bearer token talab qilinadi", code="bearer_required")
    token = authorization[7:].strip()
    payload = decode_access_token(token)
    user_id = int(payload.get("sub", 0))
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise AuthError("Foydalanuvchi topilmadi", code="user_inactive")
    return user


UserDep = Annotated[User, Depends(get_current_user)]


async def require_owner(user: UserDep) -> User:
    if user.role != UserRole.owner:
        raise ForbiddenError("Faqat egasi uchun", code="owner_only")
    return user


OwnerDep = Annotated[User, Depends(require_owner)]
