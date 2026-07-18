# TASH — Booking backend (Toshkent barbershop/beauty)

FastAPI + SQLAlchemy 2.0 (async, asyncpg) + Alembic + PostgreSQL 16 asosidagi
band qilish (booking) backendi. Telegram Mini App mijozlari, egasi/usta admin
paneli, eslatmalar (Telegram) va to'lovlar (Payme + Click) qo'llab-quvvatlanadi.

> Pul **butun son so'm**da saqlanadi (float ishlatilmaydi). Vaqt zonasi
> `Asia/Tashkent`, ma'lumotlar bazasida esa tz-aware UTC.

## Talablar
- Python 3.14 (loyiha shu versiyada tekshirilgan)
- Docker (PostgreSQL uchun) yoki mahalliy PostgreSQL 16 (`btree_gist` bilan)

## Modul tuzilishi
```
app/
  api/        # FastAPI routerlar + dependency (auth) lar
  core/       # config, security (JWT/bcrypt), telegram initData HMAC, errors
  db/         # engine/session, Base, seed
  models/     # SQLAlchemy 2.0 modellar
  schemas/    # Pydantic v2 sxemalar
  services/   # availability (pure), booking, notifications, scheduler, payments/
  tests/      # DB talab qilmaydigan unit-testlar
alembic/      # migratsiyalar (0001_initial: schema + btree_gist + EXCLUDE)
```

## 1. O'rnatish (venv + kutubxonalar)
```bash
cd tash-backend
python -m venv .venv
source .venv/Scripts/activate      # Windows Git Bash
# yoki: .venv\Scripts\activate      # Windows PowerShell/CMD
pip install -r requirements.txt
cp .env.example .env                # .env ni to'ldiring (BOT_TOKEN, JWT_SECRET, ...)
```

## 2. PostgreSQL ni ko'tarish (docker-compose)
```bash
docker compose up -d db
# holatini tekshirish:
docker compose ps
```
`postgres:16` obrazi `btree_gist` kengaytmasi bilan keladi; migratsiya uni
`CREATE EXTENSION IF NOT EXISTS btree_gist` orqali yoqadi.

## 3. Migratsiya + seed
```bash
alembic upgrade head            # schema + EXCLUDE constraint
python -m app.db.seed           # 1 salon, 2 usta, xizmatlar, ish vaqti, sozlamalar
```
Seed quyidagi admin loginlarni yaratadi (production'da o'zgartiring):
- Egasi:  `owner@tash.uz` / `owner12345`
- Usta:   `master@tash.uz` / `master12345`

Migratsiya SQL'ini DB'siz ko'rish (tekshiruv uchun):
```bash
alembic upgrade head --sql
```

## 4. Serverni ishga tushirish
```bash
uvicorn app.main:app --reload
# OpenAPI hujjatlari: http://localhost:8000/docs
# Sog'liq: http://localhost:8000/health
```
Eslatma scheduler (APScheduler) server bilan birga ishga tushadi. Uni o'chirish
uchun `DISABLE_SCHEDULER=1` env o'rnating (masalan testlarda).

## 5. Testlar
```bash
pytest                          # barcha unit-testlar (DB talab qilmaydi)
```
Qamrab olinadi:
- **Slot algoritmi** (`test_availability.py`): dam kuni, to'la band, xizmat
  qolgan oynadan uzun, aniq ketma-ket (back-to-back) slotlar, `any`-usta birlashmasi,
  o'tgan vaqt filtri.
- **Telegram HMAC** (`test_telegram_hmac.py`): to'g'ri imzo, buzilgan hash, noto'g'ri
  bot token, eskirgan `auth_date`.
- **To'lov imzolari** (`test_payments.py`): Payme Basic-auth, Click md5 (prepare/complete),
  so'm↔tiyin.

## API xaritasi (qisqacha)
Mijoz (Telegram Mini App — `Authorization: tma <initDataRaw>`):
- `GET  /salon` — profil + kategoriyalar + faol xizmatlar + faol ustalar
- `GET  /availability?master_id=&service_ids=&date=` — bo'sh slotlar (`master_id=any` ham)
- `POST /appointments` — band qilish (server narx/vaqtni qayta hisoblaydi)
- `GET  /appointments/my` — kelgusi + o'tgan
- `POST /appointments/{id}/cancel` — `cancel_window_hours` ichida
- `POST /appointments/{id}/reschedule` — qayta tekshirib ko'chirish
- `GET  /me/client`

Admin (egasi/usta — `Authorization: Bearer <jwt>`, `POST /auth/login`):
- Xizmat/kategoriya CRUD (`/admin/services`, `/admin/categories`) — soft-deactivate
- Usta CRUD + ish vaqti + xizmat biriktirish (`/admin/masters...`)
- Mijozlar (`/admin/clients`): qidiruv + filtrlar (`long_absent`/`frequent`/`birthday_soon`),
  batafsil + statistika, Excel import (`POST /admin/clients/import`)
- Jurnal (`GET /admin/appointments?date=&view=day|week[&master_id=]`)
- Uchrashuv CRUD + status o'zgartirish (`completed`da to'lov yozish)
- Sozlamalar (`GET/PUT /admin/settings`)
- Rol: `master` asosan o'z jadvalini, `owner` hammasini ko'radi.

To'lovlar:
- `POST /payments/payme` — Payme Merchant API (JSON-RPC bitta webhook)
- `POST /payments/click` — Click SHOP-API (Prepare + Complete)
- `GET  /payments/{id}/status` — frontend polling uchun

## Webhook'larni tashqariga ochish (sandbox)
Telegram bot va Payme/Click webhook'lari public HTTPS URL talab qiladi.
Lokal serverni ochish uchun **cloudflared** yoki **ngrok**:
```bash
# cloudflared (tavsiya etiladi, tekin)
cloudflared tunnel --url http://localhost:8000
# ngrok
ngrok http 8000
```
So'ng chiqqan HTTPS URL'ni sozlang:
- **Telegram**: `MINIAPP_URL` va (kerak bo'lsa) bot webhook manzili.
- **Payme kabineti**: to'lov endpoint = `https://<tunnel>/payments/payme`.
- **Click kabineti**: Prepare/Complete URL = `https://<tunnel>/payments/click`.

## Muhim texnik yechimlar
- **Ikki marta band qilishdan himoya (double-booking)**: PostgreSQL `EXCLUDE`
  constraint (`btree_gist`) — bir usta uchun `tstzrange(start_at,end_at)` kesishmaydi
  (`status NOT IN ('cancelled','no_show')`). Poyga (race) holatida toza `409 "Bu vaqt band"`.
- **Narx ishonchsizligi**: server har doim joriy xizmat ma'lumotidan `end_at` va
  `price_total`ni qayta hisoblaydi; `appointment_services` narx/davomiylikni **snapshot** qiladi.
- **Depozit**: `deposit_required` bo'lsa `Payment(kind=deposit, status=pending)` yaratiladi;
  uchrashuv faqat provider tomonidan **tasdiqlangan to'lov**dan keyin `confirmed` bo'ladi.
- **Idempotentlik**: eslatmalar `sent_reminders` jadvali orqali; to'lov PerformTransaction/
  Complete qayta kelsa ham holat bir marta o'zgaradi.
- **Xatolik formati**: barcha xatolar `{"message": "...", "code": "..."}` ko'rinishida (UI uchun).

## Xatoliklar / ishlab chiqarishga o'tishdan oldin
- `.env` dagi `BOT_TOKEN`, `JWT_SECRET`, `PAYME_MERCHANT_KEY`, `CLICK_*` — real qiymatlar bilan to'ldiring.
- Payme/Click **xato kodlari va imzo formati** kodda kommentlangan (`services/payments/`);
  ishlab chiqarishdan oldin joriy rasmiy hujjatlar bilan solishtiring.
- Demo admin parollarini almashtiring.
