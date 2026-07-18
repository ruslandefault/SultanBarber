from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl


@dataclass(frozen=True)
class TelegramUser:
    id: int
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    language_code: str | None = None
    photo_url: str | None = None


class TelegramAuthError(Exception):
    """Raised when Mini App initData fails verification."""


def _secret_key(bot_token: str) -> bytes:
    """Telegram Mini App secret key = HMAC_SHA256(key="WebAppData", msg=bot_token)."""
    return hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()


def verify_init_data(
    init_data_raw: str,
    bot_token: str,
    *,
    max_age_seconds: int | None = None,
    now: float | None = None,
) -> dict[str, str]:
    """Verify a Telegram Mini App ``initDataRaw`` query string.

    Returns the parsed key/value dict (without the ``hash`` field) on success.
    Raises :class:`TelegramAuthError` on any failure.

    Algorithm (per Telegram docs):
      * parse the query string into key=value pairs
      * pull out ``hash``
      * build data_check_string = "\\n".join(sorted "key=value" for the rest)
      * secret = HMAC_SHA256(key="WebAppData", msg=bot_token)
      * expected = hex(HMAC_SHA256(key=secret, msg=data_check_string))
      * constant-time compare expected == hash
    """
    if not init_data_raw:
        raise TelegramAuthError("initData bo'sh")

    # keep_blank_values so empty fields still participate in the check string
    pairs = dict(parse_qsl(init_data_raw, keep_blank_values=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise TelegramAuthError("hash maydoni yo'q")

    data_check_string = "\n".join(
        f"{key}={pairs[key]}" for key in sorted(pairs.keys())
    )
    secret = _secret_key(bot_token)
    expected = hmac.new(
        secret, data_check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, received_hash):
        raise TelegramAuthError("Imzo (hash) mos kelmadi")

    if max_age_seconds is not None:
        auth_date = pairs.get("auth_date")
        if not auth_date:
            raise TelegramAuthError("auth_date yo'q")
        try:
            auth_ts = int(auth_date)
        except ValueError as exc:
            raise TelegramAuthError("auth_date noto'g'ri") from exc
        current = now if now is not None else time.time()
        if current - auth_ts > max_age_seconds:
            raise TelegramAuthError("initData muddati tugagan")

    return pairs


def parse_user(init_data: dict[str, str]) -> TelegramUser:
    """Extract the Telegram user object from verified initData."""
    raw_user = init_data.get("user")
    if not raw_user:
        raise TelegramAuthError("Foydalanuvchi ma'lumoti yo'q")
    try:
        data = json.loads(raw_user)
    except json.JSONDecodeError as exc:
        raise TelegramAuthError("Foydalanuvchi JSON noto'g'ri") from exc
    if "id" not in data:
        raise TelegramAuthError("Foydalanuvchi id yo'q")
    return TelegramUser(
        id=int(data["id"]),
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        username=data.get("username"),
        language_code=data.get("language_code"),
        photo_url=data.get("photo_url"),
    )


def build_init_data(bot_token: str, user: dict, *, auth_date: int | None = None) -> str:
    """Build a correctly-signed ``initDataRaw`` string. Used by tests / tooling."""
    from urllib.parse import urlencode

    if auth_date is None:
        auth_date = int(time.time())
    fields = {
        "user": json.dumps(user, separators=(",", ":"), ensure_ascii=False),
        "auth_date": str(auth_date),
        "query_id": "AAAA",
    }
    data_check_string = "\n".join(
        f"{k}={fields[k]}" for k in sorted(fields.keys())
    )
    secret = _secret_key(bot_token)
    sig = hmac.new(secret, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    fields["hash"] = sig
    return urlencode(fields)
