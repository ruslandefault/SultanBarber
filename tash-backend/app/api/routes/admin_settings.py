from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DbDep, OwnerDep
from app.core.errors import NotFoundError
from app.models.salon import SalonSettings
from app.schemas.admin import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/admin", tags=["admin:settings"])


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
