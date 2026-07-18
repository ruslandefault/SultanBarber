"""APScheduler-based reminder runner.

Runs a periodic job that scans upcoming appointments and dispatches due reminders
through the NotificationService (idempotent via the sent_reminders ledger).
"""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.services.notifications import NotificationService

logger = logging.getLogger("tash.scheduler")

_scheduler: AsyncIOScheduler | None = None


async def _reminder_tick() -> None:
    try:
        async with AsyncSessionLocal() as db:
            sent = await NotificationService().send_due_reminders(db)
            if sent:
                logger.info("Dispatched %s reminder(s)", sent)
    except Exception:  # noqa: BLE001
        logger.exception("Reminder tick failed")


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    scheduler = AsyncIOScheduler(timezone=settings.APP_TZ)
    # every minute is fine; work is idempotent and cheap
    scheduler.add_job(_reminder_tick, "interval", minutes=1, id="reminders", max_instances=1)
    scheduler.start()
    _scheduler = scheduler
    logger.info("Reminder scheduler started (tz=%s)", settings.APP_TZ)
    return scheduler


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
