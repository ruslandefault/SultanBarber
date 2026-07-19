from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DbDep, OwnerDep
from app.core.errors import NotFoundError
from app.models.salon import Salon, SalonSettings
from app.schemas.admin import SettingsOut, SettingsUpdate
from app.schemas.catalog import SalonOut, SalonProfileUpdate

router = APIRouter(prefix="/admin", tags=["admin:settings"])


async def _salon(db, salon_id: int) -> Salon:
    salon = await db.get(Salon, salon_id)
    if salon is None:
        raise NotFoundError("Salon topilmadi", code="salon_missing")
    return salon


@router.get("/salon", response_model=SalonOut)
async def get_salon_profile(db: DbDep, owner: OwnerDep):
    return SalonOut.model_validate(await _salon(db, owner.salon_id))


@router.put("/salon", response_model=SalonOut)
async def update_salon_profile(data: SalonProfileUpdate, db: DbDep, owner: OwnerDep):
    salon = await _salon(db, owner.salon_id)
    payload = data.model_dump(exclude_unset=True, exclude={"working_hours"})
    for k, v in payload.items():
        setattr(salon, k, v)
    if data.working_hours is not None:
        salon.working_hours = [
            {"weekday": h.weekday, "open": h.open, "from": h.from_, "to": h.to}
            for h in data.working_hours
        ]
    await db.commit()
    await db.refresh(salon)
    return SalonOut.model_validate(salon)


async def _settings(db, salon_id: int) -> SalonSettings:
    s = (
        await db.execute(select(SalonSettings).where(SalonSettings.salon_id == salon_id))
    ).scalar_one_or_none()
    if s is None:
        raise NotFoundError("Sozlamalar topilmadi", code="settings_missing")
    return s


@router.get("/settings", response_model=SettingsOut)
async def get_settings(db: DbDep, owner: OwnerDep):
    return SettingsOut.model_validate(await _settings(db, owner.salon_id))


@router.put("/settings", response_model=SettingsOut)
async def update_settings(data: SettingsUpdate, db: DbDep, owner: OwnerDep):
    s = await _settings(db, owner.salon_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    await db.commit()
    await db.refresh(s)
    return SettingsOut.model_validate(s)
