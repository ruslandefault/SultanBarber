from __future__ import annotations

from datetime import time

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


# ---- Services & categories --------------------------------------------------

class ServiceOut(ORMModel):
    id: int
    category_id: int | None
    name: str
    duration_min: int
    price: int
    sort_order: int
    is_active: bool


class ServiceCreate(BaseModel):
    category_id: int | None = None
    name: str = Field(min_length=1, max_length=200)
    duration_min: int = Field(gt=0)
    price: int = Field(ge=0)
    sort_order: int = 0


class ServiceUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=200)
    duration_min: int | None = Field(default=None, gt=0)
    price: int | None = Field(default=None, ge=0)
    sort_order: int | None = None
    is_active: bool | None = None


class CategoryOut(ORMModel):
    id: int
    name: str
    sort_order: int
    is_active: bool
    services: list[ServiceOut] = []


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    sort_order: int | None = None
    is_active: bool | None = None


# ---- Masters & working hours ------------------------------------------------

class WorkingHoursIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start_time: time | None = None
    end_time: time | None = None
    is_day_off: bool = False


class WorkingHoursOut(ORMModel):
    weekday: int
    start_time: time | None
    end_time: time | None
    is_day_off: bool


class MasterOut(ORMModel):
    id: int
    name: str
    specialty: str | None
    photo_url: str | None
    bio: str | None
    sort_order: int
    is_active: bool


class MasterDetailOut(MasterOut):
    working_hours: list[WorkingHoursOut] = []
    service_ids: list[int] = []


class MasterCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    specialty: str | None = None
    photo_url: str | None = None
    bio: str | None = None
    sort_order: int = 0
    service_ids: list[int] = []


class MasterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    specialty: str | None = None
    photo_url: str | None = None
    bio: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    service_ids: list[int] | None = None


class SalonHour(BaseModel):
    weekday: int
    open: bool = True
    from_: str = Field(default="09:00", alias="from")
    to: str = "21:00"

    model_config = {"populate_by_name": True}


class SalonOut(ORMModel):
    id: int
    name: str
    description: str | None
    address: str | None
    phone: str | None
    instagram: str | None = None
    photo_url: str | None
    cover_url: str | None = None
    timezone: str
    is_active: bool
    working_hours: list[SalonHour] | None = None


class SalonProfileOut(BaseModel):
    salon: SalonOut
    categories: list[CategoryOut]
    masters: list[MasterOut]


class SalonProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    instagram: str | None = None
    photo_url: str | None = None
    cover_url: str | None = None
    working_hours: list[SalonHour] | None = None
