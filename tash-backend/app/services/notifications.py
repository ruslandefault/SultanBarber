"""Notification service.

Sends Telegram messages for reminders / confirmations / cancellations. All copy
is in Uzbek. Designed behind an abstract ``NotificationChannel`` so an SMS channel
can be added later without touching call sites.

Idempotency for reminders is enforced by the ``sent_reminders`` table via a unique
(appointment_id, offset_min, kind) constraint.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import datetime
from html import escape as _esc

import httpx
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.appointment import Appointment
from app.models.client import Client
from app.models.master import Master
from app.models.notification import SentReminder

logger = logging.getLogger("tash.notifications")

# Sentinel offsets for non-reminder notifications so they share the ledger table.
KIND_REMINDER = "reminder"
KIND_CONFIRMATION = "confirmation"
KIND_CANCELLED = "cancelled"
KIND_RESCHEDULED = "rescheduled"


class NotificationChannel(ABC):
    """Abstraction so SMS / push can be added alongside Telegram later."""

    @abstractmethod
    async def send(self, *, recipient: str | int, text: str, reply_markup: dict | None = None) -> bool:
        ...


class TelegramChannel(NotificationChannel):
    API = "https://api.telegram.org"

    def __init__(self, bot_token: str | None = None) -> None:
        self._token = bot_token or settings.BOT_TOKEN

    async def send(
        self, *, recipient: str | int, text: str, reply_markup: dict | None = None
    ) -> bool:
        url = f"{self.API}/bot{self._token}/sendMessage"
        payload: dict = {"chat_id": recipient, "text": text, "parse_mode": "HTML"}
        if reply_markup:
            payload["reply_markup"] = reply_markup
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(url, json=payload)
            if resp.status_code == 200 and resp.json().get("ok"):
                return True
            # 403 = user blocked the bot; treat as a soft failure (don't retry).
            logger.warning(
                "Telegram send failed chat=%s status=%s body=%s",
                recipient, resp.status_code, resp.text[:200],
            )
            return False
        except httpx.HTTPError as exc:
            logger.warning("Telegram send error chat=%s err=%s", recipient, exc)
            return False


def _fmt_local(dt: datetime) -> str:
    return dt.astimezone(settings.tz).strftime("%d.%m.%Y %H:%M")


def _miniapp_button() -> dict:
    return {
        "inline_keyboard": [
            [{"text": "Ilovani ochish", "url": settings.MINIAPP_URL}]
        ]
    }


class NotificationService:
    def __init__(self, channel: NotificationChannel | None = None) -> None:
        self.channel = channel or TelegramChannel()

    # ---- message builders (Uzbek) -----------------------------------------

    @staticmethod
    def confirmation_text(appt: Appointment, services: list[str]) -> str:
        svc = ", ".join(services)
        return (
            "✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n"
            f"🗓 Sana: <b>{_fmt_local(appt.start_at)}</b>\n"
            f"💈 Xizmat: {svc}\n"
            f"💰 Summa: {appt.price_total:,} so'm\n\n"
            "Tashrifingizni kutamiz!"
        ).replace(",", " ")

    @staticmethod
    def reminder_text(appt: Appointment, services: list[str]) -> str:
        svc = ", ".join(services)
        return (
            "⏰ <b>Eslatma</b>\n\n"
            f"Sizda yaqinda tashrif bor:\n"
            f"🗓 {_fmt_local(appt.start_at)}\n"
            f"💈 {svc}\n\n"
            "Kelolmasangiz, iltimos bekor qiling."
        )

    @staticmethod
    def cancelled_text(appt: Appointment) -> str:
        return (
            "❌ <b>Tashrif bekor qilindi</b>\n\n"
            f"🗓 {_fmt_local(appt.start_at)}\n"
            "Yangi vaqtga yozilishingiz mumkin."
        )

    @staticmethod
    def rescheduled_text(appt: Appointment) -> str:
        return (
            "🔄 <b>Tashrif vaqti o'zgartirildi</b>\n\n"
            f"Yangi vaqt: <b>{_fmt_local(appt.start_at)}</b>"
        )

    # ---- helpers -----------------------------------------------------------

    async def _client_chat_id(self, db: AsyncSession, client_id: int) -> int | None:
        client = await db.get(Client, client_id)
        if client is None or client.telegram_id is None:
            return None
        return client.telegram_id

    async def _mark_sent(
        self, db: AsyncSession, appointment_id: int, offset_min: int, kind: str
    ) -> bool:
        """Insert a ledger row; returns False if already sent (unique clash).

        Uses a SAVEPOINT so a duplicate only rolls back the savepoint — a full
        session rollback would EXPIRE every loaded object (e.g. the appointment),
        and the next attribute access would trigger an async lazy-load outside the
        greenlet (MissingGreenlet).
        """
        try:
            async with db.begin_nested():
                db.add(
                    SentReminder(appointment_id=appointment_id, offset_min=offset_min, kind=kind)
                )
                await db.flush()
            return True
        except IntegrityError:
            return False

    async def _service_names(self, appt: Appointment) -> list[str]:
        return [s.name for s in appt.services]

    # ---- public API --------------------------------------------------------

    async def send_confirmation(self, db: AsyncSession, appt: Appointment) -> None:
        chat_id = await self._client_chat_id(db, appt.client_id)
        if chat_id is None:
            return
        if not await self._mark_sent(db, appt.id, -1, KIND_CONFIRMATION):
            return
        text = self.confirmation_text(appt, await self._service_names(appt))
        await self.channel.send(recipient=chat_id, text=text, reply_markup=_miniapp_button())
        await db.commit()  # persist the ledger row regardless of send outcome

    async def send_new_booking(
        self, db: AsyncSession, appt: Appointment, *, source: str = "bot"
    ) -> None:
        """Post a rich new-booking notification to the salon's Telegram group.

        No-op if TELEGRAM_NOTIFY_CHAT_ID is not configured. Never raises — a
        notification failure must not fail the booking itself.
        """
        chat_id = settings.TELEGRAM_NOTIFY_CHAT_ID
        if not chat_id:
            return
        try:
            client = await db.get(Client, appt.client_id)
            master = await db.get(Master, appt.master_id)
            services = ", ".join(_esc(s.name) for s in appt.services) or "—"
            total_min = sum(s.duration_min for s in appt.services)

            who = _esc(client.full_name) if client else "—"
            contact: list[str] = []
            if client and client.phone:
                contact.append(_esc(client.phone))
            if client and client.username:
                contact.append(f"@{_esc(client.username)}")
            src = {
                "bot": "🤖 Bot orqali",
                "admin": "🧑‍💼 Admin panel orqali",
            }.get(source, source)
            price = f"{appt.price_total:,}".replace(",", " ")

            lines = ["🔔 <b>Yangi bandlov</b>", "", f"👤 Mijoz: <b>{who}</b>"]
            if contact:
                lines.append(f"📞 {' · '.join(contact)}")
            lines += [
                f"✂️ Usta: <b>{_esc(master.name) if master else '—'}</b>",
                f"💈 Xizmat: {services}",
                f"🗓 Vaqt: <b>{_fmt_local(appt.start_at)}</b>",
                f"⏱ Davomiyligi: {total_min} daqiqa",
                f"💰 Summa: {price} so'm",
            ]
            if appt.notes:
                lines.append(f"📝 Izoh: {_esc(appt.notes)}")
            lines.append(f"\n{src}")
            await self.channel.send(recipient=chat_id, text="\n".join(lines))
        except Exception as exc:  # noqa: BLE001 — notifications are best-effort
            logger.warning("New-booking group notify failed: %s", exc)

    async def send_cancelled(self, db: AsyncSession, appt: Appointment) -> None:
        chat_id = await self._client_chat_id(db, appt.client_id)
        if chat_id is None:
            return
        await self.channel.send(recipient=chat_id, text=self.cancelled_text(appt))

    async def send_rescheduled(self, db: AsyncSession, appt: Appointment) -> None:
        chat_id = await self._client_chat_id(db, appt.client_id)
        if chat_id is None:
            return
        await self.channel.send(recipient=chat_id, text=self.rescheduled_text(appt))

    async def send_due_reminders(self, db: AsyncSession) -> int:
        """Scan upcoming appointments and send any reminders now due.

        Called periodically by the scheduler. Idempotent per (appointment, offset).
        Returns the number of reminders actually sent.
        """
        from datetime import timedelta

        from app.models.enums import ACTIVE_APPOINTMENT_STATUSES
        from app.models.salon import SalonSettings

        now = datetime.now(settings.tz)
        sent_count = 0

        # settings per salon
        settings_rows = (await db.execute(select(SalonSettings))).scalars().all()
        for s in settings_rows:
            if not s.reminder_telegram or not s.reminder_offsets:
                continue
            max_offset = max(s.reminder_offsets)
            horizon = now + timedelta(minutes=max_offset)
            appts = (
                await db.execute(
                    select(Appointment)
                    .where(
                        Appointment.salon_id == s.salon_id,
                        Appointment.status.in_(list(ACTIVE_APPOINTMENT_STATUSES)),
                        Appointment.start_at > now,
                        Appointment.start_at <= horizon,
                    )
                    .options(selectinload(Appointment.services))
                )
            ).scalars().all()

            for appt in appts:
                minutes_until = (appt.start_at.astimezone(settings.tz) - now).total_seconds() / 60
                for offset in s.reminder_offsets:
                    # fire when we are at or just past the offset threshold
                    if minutes_until <= offset:
                        chat_id = await self._client_chat_id(db, appt.client_id)
                        if chat_id is None:
                            continue
                        if not await self._mark_sent(db, appt.id, offset, KIND_REMINDER):
                            continue
                        text = self.reminder_text(appt, [x.name for x in appt.services])
                        await self.channel.send(recipient=chat_id, text=text)
                        await db.commit()
                        sent_count += 1
        return sent_count
