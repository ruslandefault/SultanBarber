from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# Managed Postgres (Render/Neon) requires TLS; asyncpg takes it via connect_args
# (not the ?sslmode= URL param, which we strip in config).
_connect_args = {"ssl": True} if settings.db_is_remote else {}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    # NOTE: pool_pre_ping on the asyncpg pool can raise MissingGreenlet on
    # checkout (the ping runs outside the request greenlet). Use pool_recycle
    # instead to avoid stale connections.
    pool_recycle=1800,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
