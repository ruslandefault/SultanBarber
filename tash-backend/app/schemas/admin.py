from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


# ---- Clients ----------------------------------------------------------------

class ClientOut(ORMModel):
    id: int
    telegram_id: int | None
    full_name: str
    phone: str | None
    username: str | None
    birthday: date | None
    notes: str | None


class ClientCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    phone: str | None = None
    birthday: date | None = None
    notes: str | None = None
    telegram_id: int | None = None


class ClientUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    phone: str | None = None
    birthday: date | None = None
    notes: str | None = None


class ClientStats(BaseModel):
    total_visits: int
    total_spend: int
    avg_check: int
    last_visit_at: datetime | None


class ClientDetailOut(ClientOut):
    stats: ClientStats
    history: list["AdminAppointmentOut"] = []


class ClientImportResult(BaseModel):
    created: int
    updated: int
    skipped: int
    errors: list[str] = []


# ---- Appointments (admin) ---------------------------------------------------

class AdminAppointmentServiceOut(ORMModel):
    service_id: int
    name: str
    price: int
    duration_min: int


class AdminAppointmentOut(ORMModel):
    id: int
    salon_id: int
    master_id: int
    client_id: int
    status: str
    created_via: str
    start_at: datetime
    end_at: datetime
    price_total: int
    deposit_amount: int | None
    notes: str | None
    services: list[AdminAppointmentServiceOut] = []


class AdminAppointmentCreate(BaseModel):
    master_id: int
    client_id: int
    service_ids: list[int] = Field(min_length=1)
    start_at: datetime
    notes: str | None = None


class AdminAppointmentUpdate(BaseModel):
    master_id: int | None = None
    service_ids: list[int] | None = None
    start_at: datetime | None = None
    notes: str | None = None


class StatusChangeIn(BaseModel):
    status: str
    # optional payment recorded when marking completed
    payment_amount: int | None = None
    payment_method: str | None = None  # cash|payme|click


class JournalOut(BaseModel):
    view: str
    date_from: datetime
    date_to: datetime
    appointments: list[AdminAppointmentOut]


# ---- Salon settings ---------------------------------------------------------

class SettingsOut(ORMModel):
    reminder_telegram: bool
    reminder_offsets: list[int]
    confirmation_msg: bool
    deposit_required: bool
    deposit_type: str
    deposit_value: int
    cancel_window_hours: int


class SettingsUpdate(BaseModel):
    reminder_telegram: bool | None = None
    reminder_offsets: list[int] | None = None
    confirmation_msg: bool | None = None
    deposit_required: bool | None = None
    deposit_type: str | None = None
    deposit_value: int | None = Field(default=None, ge=0)
    cancel_window_hours: int | None = Field(default=None, ge=0)


ClientDetailOut.model_rebuild()
