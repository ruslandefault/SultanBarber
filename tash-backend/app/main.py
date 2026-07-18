from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    admin_appointments,
    admin_catalog,
    admin_clients,
    admin_settings,
    auth,
    booking,
    health,
    payments,
    salon,
)
from app.core.config import settings
from app.core.errors import register_exception_handlers

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tash")

# Ensure model metadata is registered (imported for Alembic + relationships).
import app.models  # noqa: E402,F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = None
    # The reminder scheduler needs a live DB; skip it during tests / when disabled.
    if os.getenv("DISABLE_SCHEDULER") != "1":
        try:
            from app.services.scheduler import shutdown_scheduler, start_scheduler

            scheduler = start_scheduler()
        except Exception:  # noqa: BLE001
            logger.exception("Scheduler failed to start; continuing without it")
    yield
    if scheduler is not None:
        from app.services.scheduler import shutdown_scheduler

        shutdown_scheduler()


app = FastAPI(
    title="TASH Booking API",
    version="1.0.0",
    description="Barbershop/beauty booking backend for Tashkent.",
    lifespan=lifespan,
)

register_exception_handlers(app)

# CORS — admin panel (5174) va client (5173) hamda tunnel origin'laridan so'rovlar.
# Bearer token ishlatilgani uchun credentials shart emas; dev uchun barcha origin'ga ruxsat.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public / client (Telegram) routes
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(salon.router)
app.include_router(booking.router)
app.include_router(payments.router)

# Admin (owner/master JWT) routes
app.include_router(admin_catalog.router)
app.include_router(admin_clients.router)
app.include_router(admin_appointments.router)
app.include_router(admin_settings.router)


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"app": "TASH Booking API", "docs": "/docs", "tz": settings.APP_TZ}
