"""Provider-agnostic payment abstractions.

Both Payme and Click ultimately mutate a ``Payment`` row and, on success, confirm
the linked ``Appointment`` (booked -> confirmed). That shared logic lives here so
providers only implement protocol translation + signature/auth verification.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus, PaymentStatus
from app.models.payment import Payment

# Money conversion: providers work in tiyin (1 so'm = 100 tiyin), we store so'm.
TIYIN_PER_SOUM = 100


def soum_to_tiyin(soum: int) -> int:
    return soum * TIYIN_PER_SOUM


def tiyin_to_soum(tiyin: int) -> int:
    # amounts from providers are exact multiples of 100 for so'm-priced services
    return tiyin // TIYIN_PER_SOUM


class PaymentProvider(ABC):
    """Interface every payment provider implements."""

    name: str

    @abstractmethod
    async def handle_webhook(self, db: AsyncSession, payload: dict, headers: dict) -> dict:
        """Process an inbound provider webhook and return the provider's response body."""
        ...


async def mark_paid_and_confirm(
    db: AsyncSession, payment: Payment, *, provider_txn_id: str | None = None
) -> None:
    """Idempotently mark a deposit paid and confirm its appointment.

    NEVER confirms an appointment without a verified paid deposit — this is the
    single choke point both providers funnel through.
    """
    if payment.status == PaymentStatus.paid:
        return  # already applied — idempotent
    payment.status = PaymentStatus.paid
    payment.paid_at = datetime.now(timezone.utc)
    if provider_txn_id:
        payment.provider_txn_id = provider_txn_id

    appt = await db.get(Appointment, payment.appointment_id)
    if appt is not None and appt.status == AppointmentStatus.booked:
        appt.status = AppointmentStatus.confirmed
    await db.flush()


async def mark_cancelled(db: AsyncSession, payment: Payment) -> None:
    if payment.status == PaymentStatus.cancelled:
        return
    payment.status = PaymentStatus.cancelled
    await db.flush()
