"""Seed script: 1 salon, 2 masters, categories/services, working hours,
default SalonSettings, and admin login accounts.

Run (with Postgres up + migrations applied):

    python -m app.db.seed
"""

from __future__ import annotations

import asyncio
from datetime import time

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.enums import DepositType, UserRole
from app.models.master import Master, MasterService
from app.models.salon import Salon, SalonSettings, WorkingHours
from app.models.service import Service, ServiceCategory
from app.models.user import User

# demo admin credentials — CHANGE in production
OWNER_EMAIL = "owner@tash.uz"
OWNER_PASSWORD = "owner12345"
MASTER_EMAIL = "master@tash.uz"
MASTER_PASSWORD = "master12345"


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        existing = (await db.execute(select(Salon))).scalars().first()
        if existing is not None:
            print("Seed skipped: a salon already exists (id=%s)." % existing.id)
            return

        salon = Salon(
            name="TASH Barbershop",
            description="Toshkentdagi zamonaviy barbershop",
            address="Toshkent sh., Amir Temur ko'chasi 1",
            phone="+998901234567",
            timezone="Asia/Tashkent",
        )
        db.add(salon)
        await db.flush()

        settings_row = SalonSettings(
            salon_id=salon.id,
            reminder_telegram=True,
            reminder_offsets=[1440, 120],  # 24h and 2h before
            confirmation_msg=True,
            deposit_required=False,
            deposit_type=DepositType.fixed,
            deposit_value=0,
            cancel_window_hours=3,
        )
        db.add(settings_row)

        # categories + services
        cat_hair = ServiceCategory(salon_id=salon.id, name="Soch", sort_order=1)
        cat_beard = ServiceCategory(salon_id=salon.id, name="Soqol", sort_order=2)
        db.add_all([cat_hair, cat_beard])
        await db.flush()

        svc_haircut = Service(
            salon_id=salon.id, category_id=cat_hair.id, name="Soch olish",
            duration_min=45, price=80_000, sort_order=1,
        )
        svc_kids = Service(
            salon_id=salon.id, category_id=cat_hair.id, name="Bolalar sochi",
            duration_min=30, price=60_000, sort_order=2,
        )
        svc_beard = Service(
            salon_id=salon.id, category_id=cat_beard.id, name="Soqol olish",
            duration_min=30, price=50_000, sort_order=1,
        )
        svc_combo = Service(
            salon_id=salon.id, category_id=cat_hair.id, name="Soch + Soqol",
            duration_min=75, price=120_000, sort_order=3,
        )
        db.add_all([svc_haircut, svc_kids, svc_beard, svc_combo])
        await db.flush()

        # masters
        m1 = Master(salon_id=salon.id, name="Aziz", specialty="Barber", sort_order=1)
        m2 = Master(salon_id=salon.id, name="Bekzod", specialty="Barber/Stylist", sort_order=2)
        db.add_all([m1, m2])
        await db.flush()

        # both masters do all services (simple MVP)
        for m in (m1, m2):
            for s in (svc_haircut, svc_kids, svc_beard, svc_combo):
                db.add(MasterService(master_id=m.id, service_id=s.id))

        # working hours: Mon-Sat 10:00-20:00, Sunday off (weekday 6)
        for m in (m1, m2):
            for wd in range(0, 6):
                db.add(WorkingHours(
                    master_id=m.id, weekday=wd,
                    start_time=time(10, 0), end_time=time(20, 0), is_day_off=False,
                ))
            db.add(WorkingHours(
                master_id=m.id, weekday=6, start_time=None, end_time=None, is_day_off=True
            ))

        # admin accounts
        owner = User(
            salon_id=salon.id, email=OWNER_EMAIL, password_hash=hash_password(OWNER_PASSWORD),
            full_name="Salon egasi", role=UserRole.owner,
        )
        db.add(owner)
        await db.flush()
        master_user = User(
            salon_id=salon.id, email=MASTER_EMAIL, password_hash=hash_password(MASTER_PASSWORD),
            full_name="Aziz (usta)", role=UserRole.master, master_id=m1.id,
        )
        db.add(master_user)

        await db.commit()

        print("Seed complete.")
        print(f"  Salon id: {salon.id}")
        print(f"  Owner login:  {OWNER_EMAIL} / {OWNER_PASSWORD}")
        print(f"  Master login: {MASTER_EMAIL} / {MASTER_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(seed())
