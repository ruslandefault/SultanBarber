from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbDep, _default_salon_id
from app.core.errors import NotFoundError
from app.models.master import Master, MasterService
from app.models.product import Product
from app.models.salon import Salon
from app.models.service import Service, ServiceCategory
from app.schemas.catalog import (
    CategoryOut,
    MasterOut,
    SalonOut,
    SalonProfileOut,
    ServiceOut,
)
from app.schemas.product import ProductOut

router = APIRouter(tags=["salon"])


@router.get("/salon", response_model=SalonProfileOut)
async def get_salon(db: DbDep) -> SalonProfileOut:
    salon_id = await _default_salon_id(db)
    salon = await db.get(Salon, salon_id)
    if salon is None:
        raise NotFoundError("Salon topilmadi", code="salon_not_found")

    categories = (
        await db.execute(
            select(ServiceCategory)
            .where(
                ServiceCategory.salon_id == salon_id,
                ServiceCategory.is_active.is_(True),
            )
            .order_by(ServiceCategory.sort_order, ServiceCategory.id)
            .options(selectinload(ServiceCategory.services))
        )
    ).scalars().all()

    cat_out: list[CategoryOut] = []
    for c in categories:
        active_services = sorted(
            [s for s in c.services if s.is_active],
            key=lambda s: (s.sort_order, s.id),
        )
        cat_out.append(
            CategoryOut(
                id=c.id,
                name=c.name,
                sort_order=c.sort_order,
                is_active=c.is_active,
                services=[ServiceOut.model_validate(s) for s in active_services],
            )
        )

    masters = (
        await db.execute(
            select(Master)
            .where(Master.salon_id == salon_id, Master.is_active.is_(True))
            .order_by(Master.sort_order, Master.id)
        )
    ).scalars().all()

    # Which services each master performs — so the client only offers a master
    # for services they actually do (matches the availability rules).
    ms_rows = (
        await db.execute(
            select(MasterService.master_id, MasterService.service_id).where(
                MasterService.master_id.in_([m.id for m in masters]) if masters else False
            )
        )
    ).all()
    svc_by_master: dict[int, list[int]] = {}
    for mid, sid in ms_rows:
        svc_by_master.setdefault(mid, []).append(sid)

    master_out: list[MasterOut] = []
    for m in masters:
        mo = MasterOut.model_validate(m)
        mo.service_ids = svc_by_master.get(m.id, [])
        master_out.append(mo)

    return SalonProfileOut(
        salon=SalonOut.model_validate(salon),
        categories=cat_out,
        masters=master_out,
    )


@router.get("/products", response_model=list[ProductOut])
async def list_public_products(db: DbDep) -> list[ProductOut]:
    """Public product catalogue for the client Mini App."""
    salon_id = await _default_salon_id(db)
    rows = (
        await db.execute(
            select(Product)
            .where(Product.salon_id == salon_id, Product.is_active.is_(True))
            .order_by(Product.sort_order, Product.id)
        )
    ).scalars().all()
    return [ProductOut.model_validate(p) for p in rows]
