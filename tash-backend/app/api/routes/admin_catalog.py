from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app.api.deps import DbDep, OwnerDep
from app.core.errors import NotFoundError
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
async def list_categories(db: DbDep, owner: OwnerDep):
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
async def list_services(db: DbDep, owner: OwnerDep, include_inactive: bool = True):
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


@router.delete("/services/{service_id}", response_model=ServiceOut)
async def deactivate_service(service_id: int, db: DbDep, owner: OwnerDep):
    """Soft-deactivate a service (never hard-deleted to preserve history)."""
    s = await db.get(Service, service_id)
    if s is None or s.salon_id != owner.salon_id:
        raise NotFoundError("Xizmat topilmadi", code="service_not_found")
    s.is_active = False
    await db.commit()
    await db.refresh(s)
    return ServiceOut.model_validate(s)


# ---- Masters + working hours + service assignment ---------------------------

async def _master_detail(db, master: Master) -> MasterDetailOut:
    wh = (
        await db.execute(
            select(WorkingHours)
            .where(WorkingHours.master_id == master.id)
            .order_by(WorkingHours.weekday)
        )
    ).scalars().all()
    svc_ids = (
        await db.execute(
            select(MasterService.service_id).where(MasterService.master_id == master.id)
        )
    ).scalars().all()
    # Build from scalar columns only — never touch ORM relationships here, or
    # pydantic will trigger an async lazy-load outside the greenlet (MissingGreenlet 500).
    return MasterDetailOut(
        **MasterOut.model_validate(master).model_dump(),
        working_hours=[WorkingHoursOut.model_validate(w) for w in wh],
        service_ids=list(svc_ids),
    )


@router.get("/masters", response_model=list[MasterOut])
async def list_masters(db: DbDep, owner: OwnerDep):
    rows = (
        await db.execute(
            select(Master).where(Master.salon_id == owner.salon_id).order_by(Master.sort_order)
        )
    ).scalars().all()
    return [MasterOut.model_validate(m) for m in rows]


@router.get("/masters/{master_id}", response_model=MasterDetailOut)
async def get_master(master_id: int, db: DbDep, owner: OwnerDep):
    m = await db.get(Master, master_id)
    if m is None or m.salon_id != owner.salon_id:
        raise NotFoundError("Usta topilmadi", code="master_not_found")
    return await _master_detail(db, m)


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
    return await _master_detail(db, m)


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
    return await _master_detail(db, m)


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
    return await _master_detail(db, m)
