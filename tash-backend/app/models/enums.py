from __future__ import annotations

from enum import StrEnum


class UserRole(StrEnum):
    owner = "owner"
    master = "master"


class AppointmentStatus(StrEnum):
    booked = "booked"
    confirmed = "confirmed"
    completed = "completed"
    no_show = "no_show"
    cancelled = "cancelled"


class CreatedVia(StrEnum):
    telegram = "telegram"
    admin = "admin"


class PaymentMethod(StrEnum):
    cash = "cash"
    payme = "payme"
    click = "click"


class PaymentKind(StrEnum):
    deposit = "deposit"
    full = "full"


class PaymentStatus(StrEnum):
    pending = "pending"
    paid = "paid"
    cancelled = "cancelled"


class DepositType(StrEnum):
    fixed = "fixed"
    percent = "percent"


# Statuses that still occupy a master's time (used by the double-booking guard).
ACTIVE_APPOINTMENT_STATUSES = (
    AppointmentStatus.booked,
    AppointmentStatus.confirmed,
    AppointmentStatus.completed,
)
