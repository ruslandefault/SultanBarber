from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class SlotOut(BaseModel):
    start_at: datetime
    end_at: datetime
    # masters free for this slot (for master_id="any"); single-element for a
    # specific master query.
    master_ids: list[int]


class AvailabilityOut(BaseModel):
    date: str
    total_duration_min: int
    slots: list[SlotOut]


class AppointmentServiceOut(ORMModel):
    service_id: int
    name: str
    price: int
    duration_min: int


class PaymentInfoOut(ORMModel):
    id: int
    amount: int
    method: str
    kind: str
    status: str


class AppointmentOut(ORMModel):
    id: int
    master_id: int
    client_id: int
    status: str
    created_via: str
    start_at: datetime
    end_at: datetime
    price_total: int
    deposit_amount: int | None
    notes: str | None
    services: list[AppointmentServiceOut] = []


class AppointmentCreateOut(BaseModel):
    appointment: AppointmentOut
    # present only when a deposit is required and a pending payment was created
    payment: PaymentInfoOut | None = None
    requires_deposit: bool = False


class AppointmentCreate(BaseModel):
    master_id: int
    service_ids: list[int] = Field(min_length=1)
    start_at: datetime
    notes: str | None = None


class AppointmentReschedule(BaseModel):
    start_at: datetime
    master_id: int | None = None


class MyAppointmentsOut(BaseModel):
    upcoming: list[AppointmentOut]
    past: list[AppointmentOut]
