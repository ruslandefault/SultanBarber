from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import PaymentKind, PaymentMethod, PaymentStatus

if TYPE_CHECKING:
    from app.models.appointment import Appointment


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    salon_id: Mapped[int] = mapped_column(
        ForeignKey("salons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    appointment_id: Mapped[int] = mapped_column(
        ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # amount in integer so'm
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(String(16), nullable=False)
    kind: Mapped[PaymentKind] = mapped_column(String(16), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        String(16), default=PaymentStatus.pending, nullable=False
    )

    # provider transaction id (Payme/Click). Unique when present.
    provider_txn_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # --- provider bookkeeping (nullable; used by Payme/Click state machines) ---
    # Payme create/perform/cancel timestamps are epoch-millis integers.
    provider_create_time: Mapped[int | None] = mapped_column(BigInteger)
    provider_perform_time: Mapped[int | None] = mapped_column(BigInteger)
    provider_cancel_time: Mapped[int | None] = mapped_column(BigInteger)
    provider_state: Mapped[int | None] = mapped_column(Integer)
    provider_reason: Mapped[int | None] = mapped_column(Integer)

    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    appointment: Mapped["Appointment"] = relationship(back_populates="payments")

    __table_args__ = (
        UniqueConstraint("provider_txn_id", name="provider_txn_unique"),
        CheckConstraint("amount >= 0", name="amount_non_negative"),
    )
