from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SentReminder(Base):
    """Idempotency ledger for outgoing reminders.

    A unique (appointment_id, offset_min) pair guarantees each reminder is sent
    at most once even if the scheduler fires repeatedly or overlaps.
    """

    __tablename__ = "sent_reminders"

    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(
        ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # offset in minutes this reminder corresponds to; special values below for
    # non-offset notifications (confirmation/cancel/reschedule).
    offset_min: Mapped[int] = mapped_column(Integer, nullable=False)
    kind: Mapped[str] = mapped_column(String(32), default="reminder", nullable=False)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("appointment_id", "offset_min", "kind", name="reminder_once"),
    )
