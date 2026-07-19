from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Media(Base):
    """Uploaded media (product/master/salon images) stored in the DB.

    Kept in Postgres (not on local disk) so images survive backend restarts and
    redeploys on ephemeral-filesystem hosts — zero extra cost, no object store.
    """

    __tablename__ = "media"

    name: Mapped[str] = mapped_column(String(128), primary_key=True)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
