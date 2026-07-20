"""Telegram guruh chat_id ni topish uchun yordamchi.

Foydalanish:
  1. Telegram'da guruh oching.
  2. Botni (Sultan Barber) guruhga qo'shing.
  3. Guruhda istalgan xabar yozing (yoki /start@BotUsername).
  4. Shu skriptni ishga tushiring:  python get_chat_id.py
  5. Chiqqan manfiy sonni (masalan -1001234567890) TELEGRAM_NOTIFY_CHAT_ID
     sifatida Render env va lokal .env ga qo'ying.

BOT_TOKEN backend .env dan olinadi (settings orqali).
"""

from __future__ import annotations

import httpx

from app.core.config import settings


def main() -> None:
    token = settings.BOT_TOKEN
    if not token or token == "123456:TEST":
        raise SystemExit("BOT_TOKEN topilmadi (.env ni tekshiring).")

    url = f"https://api.telegram.org/bot{token}/getUpdates"
    resp = httpx.get(url, timeout=15)
    data = resp.json()
    if not data.get("ok"):
        raise SystemExit(f"Telegram xatosi: {data}")

    seen: dict[int, str] = {}
    for upd in data.get("result", []):
        # Guruhga qo'shilganda my_chat_member, xabar yozilganda message keladi.
        chat = None
        for key in ("message", "my_chat_member", "channel_post", "edited_message"):
            if key in upd and "chat" in upd[key]:
                chat = upd[key]["chat"]
                break
        if chat:
            seen[chat["id"]] = f"{chat.get('type')} — {chat.get('title') or chat.get('username') or ''}"

    if not seen:
        print("Hech qanday chat topilmadi.")
        print("Botni guruhga qo'shib, guruhda bir xabar yozing, keyin qayta ishga tushiring.")
        return

    print("Topilgan chatlar:\n")
    for cid, label in seen.items():
        marker = "  ← GURUH (shuni ishlating)" if cid < 0 else ""
        print(f"  chat_id = {cid}   [{label}]{marker}")


if __name__ == "__main__":
    main()
