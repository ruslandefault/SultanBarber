from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app.api.deps import DbDep, OwnerDep, UserDep
from app.core.errors import NotFoundError
from app.models.appointment import Appointment
from app.models.master import Master, MasterService
from app.models.salon import WorkingHours
from app.models.service import Service, ServiceCategory
from app.schemas.catalog import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    MasterCreate,
    MasterDetailOut,
    MasterOut,
    MasterUpdate,
    ServiceCreate,
    ServiceOut,
    ServiceUpdate,
    WorkingHoursIn,
    WorkingHoursOut,
)

router = APIRouter(prefix="/admin", tags=["admin:catalog"])


# ---- Categories -------------------------------------------------------------

@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: DbDep, owner: UserDep):
    rows = (
        await db.execute(
            select(ServiceCategory)
            .where(ServiceCategory.salon_id == owner.salon_id)
            .order_by(ServiceCategory.sort_order, ServiceCategory.id)
            .options(selectinload(ServiceCategory.services))
        )
    ).scalars().all()
    return [CategoryOut.model_validate(c) for c in rows]


@router.post("/categories", response_model=CategoryOut, status_code=201)
async def create_category(data: CategoryCreate, db: DbDep, owner: OwnerDep):
    c = ServiceCategory(salon_id=owner.salon_id, **data.model_dump())
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return CategoryOut.model_validate(c)


@router.put("/categories/{category_id}", response_model=CategoryOut)
async def update_category(category_id: int, data: CategoryUpdate, db: DbDep, owner: OwnerDep):
    c = await db.get(ServiceCategory, category_id)
    if c is None or c.salon_id != owner.salon_id:
        raise NotFoundError("Kategoriya topilmadi", code="category_not_found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    await db.commit()
    await db.refresh(c)
    return CategoryOut.model_validate(c)


# ---- Services (soft-deactivate) --------------------------------------------

@router.get("/services", response_model=list[ServiceOut])
async def list_services(db: DbDep, owner: UserDep, include_inactive: bool = True):
    q = select(Service).where(Service.salon_id == owner.salon_id)
    if not include_inactive:
        q = q.where(Service.is_active.is_(True))
    rows = (await db.execute(q.order_by(Service.sort_order, Service.id))).scalars().all()
    return [ServiceOut.model_validate(s) for s in rows]


@router.post("/services", response_model=ServiceOut, status_code=201)
async def create_service(data: ServiceCreate, db: DbDep, owner: OwnerDep):
    s = Service(salon_id=owner.salon_id, **data.model_dump())
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return ServiceOut.model_validate(s)


@router.put("/services/{service_id}", response_model=ServiceOut)
async def update_service(service_id: int, data: ServiceUpdate, db: DbDep, owner: OwnerDep):
    s = await db.get(Service, service_id)
    if s is None or s.salon_id != owner.salon_id:
        raise NotFoundError("Xizmat topilmadi", code="service_not_found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    await db.commit()
    await db.refresh(s)
    return ServiceOut.model_validate(s)


@router.delete("/services/{service_id}", status_code=204)
async def delete_service(service_id: int, db: DbDep, owner: OwnerDep) -> None:
    """Hard-delete a service. Master links (master_services) cascade; past
    appointment snapshots keep their name/price and get service_id = NULL."""
    s = await db.get(Service, service_id)
    if s is None or s.salon_id != owner.salon_id:
        raise NotFoundError("Xizmat topilmadi", code="service_not_found")
    await db.delete(s)
    await db.commit()


# ---- Masters + working hours + service assignment ---------------------------

async def _master_detail(db, master_id: int) -> MasterDetailOut:
    # Column-level SELECTs return plain Row tuples (not ORM objects), so reading
    # their fields can never trigger an async lazy-load after a commit
    # (which would raise MissingGreenlet). This is the safe way to build a
    # detail response right after writing.
    mrow = (
        await db.execute(
            select(
                Master.id,
                Master.name,
                Master.specialty,
                Master.photo_url,
                Master.bio,
                Master.sort_order,
                Master.is_active,
            ).where(Master.id == master_id)
        )
    ).one()
    wh = (
        await db.execute(
            select(
                WorkingHours.weekday,
                WorkingHours.start_time,
                WorkingHours.end_time,
                WorkingHours.is_day_off,
            )
            .where(WorkingHours.master_id == master_id)
            .order_by(WorkingHours.weekday)
        )
    ).all()
    svc_ids = (
        await db.execute(
            select(MasterService.service_id).where(MasterService.master_id == master_id)
        )
    ).scalars().all()
    return MasterDetailOut(
        id=mrow.id,
        name=mrow.name,
        specialty=mrow.specialty,
        photo_url=mrow.photo_url,
        bio=mrow.bio,
        sort_order=mrow.sort_order,
        is_active=mrow.is_active,
        working_hours=[
            WorkingHoursOut(
                weekday=r.weekday,
                start_time=r.start_time,
                end_time=r.end_time,
                is_day_off=r.is_day_off,
            )
            for r in wh
        ],
        service_ids=list(svc_ids),
    )


@router.get("/masters", response_model=list[MasterOut])
async def list_masters(db: DbDep, owner: UserDep):
    rows = (
        await db.execute(
            select(Master).where(Master.salon_id == owner.salon_id).order_by(Master.sort_order)
        )
    ).scalars().all()
    return [MasterOut.model_validate(m) for m in rows]


@router.get("/masters/{master_id}", response_model=MasterDetailOut)
async def get_master(master_id: int, db: DbDep, owner: UserDep):
    m = await db.get(Master, master_id)
    if m is None or m.salon_id != owner.salon_id:
        raise NotFoundError("Usta topilmadi", code="master_not_found")
    return await _master_detail(db, m.id)


@router.post("/masters", response_model=MasterDetailOut, status_code=201)
async def create_master(data: MasterCreate, db: DbDep, owner: OwnerDep):
    payload = data.model_dump(exclude={"service_ids"})
    m = Master(salon_id=owner.salon_id, **payload)
    db.add(m)
    await db.flush()
    for sid in data.service_ids:
        db.add(MasterService(master_id=m.id, service_id=sid))
    await db.commit()
    await db.refresh(m)
    return await _master_detail(db, m.id)


@router.put("/masters/{master_id}", response_model=MasterDetailOut)
async def update_master(master_id: int, data: MasterUpdate, db: DbDep, owner: OwnerDep):
    m = await db.get(Master, master_id)
    if m is None or m.salon_id != owner.salon_id:
        raise NotFoundError("Usta topilmadi", code="master_not_found")
    payload = data.model_dump(exclude_unset=True, exclude={"service_ids"})
    for k, v in payload.items():
        setattr(m, k, v)
    if data.service_ids is not None:
        await db.execute(delete(MasterService).where(MasterService.master_id == m.id))
        for sid in data.service_ids:
            db.add(MasterService(master_id=m.id, service_id=sid))
    await db.commit()
    await db.refresh(m)
    return await _master_detail(db, m.id)


@router.put("/masters/{master_id}/working-hours", response_model=MasterDetailOut)
async def set_working_hours(
    master_id: int, hours: list[WorkingHoursIn], db: DbDep, owner: OwnerDep
):
    m = await db.get(Master, master_id)
    if m is None or m.salon_id != owner.salon_id:
        raise NotFoundError("Usta topilmadi", code="master_not_found")
    await db.execute(delete(WorkingHours).where(WorkingHours.master_id == master_id))
    for h in hours:
        db.add(WorkingHours(master_id=master_id, **h.model_dump()))
    await db.commit()
    await db.refresh(m)
    return await _master_detail(db, m.id)


@router.delete("/masters/{master_id}", status_code=204)
async def delete_master(master_id: int, db: DbDep, owner: OwnerDep) -> None:
    """Hard-delete a master, including their appointments.

    appointments.master_id is RESTRICT, so remove the master's appointments
    first (their services/payments/reminders cascade). working_hours and
    master_services cascade on the master delete itself.
    """
    m = await db.get(Master, master_id)
    if m is None or m.salon_id != owner.salon_id:
        raise NotFoundError("Usta topilmadi", code="master_not_found")
    await db.execute(delete(Appointment).where(Appointment.master_id == master_id))
    await db.delete(m)
    await db.commit()
