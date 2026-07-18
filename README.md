# TASH — Barbershop / beauty booking (Toshkent)

Premium barbershop/beauty booking mahsuloti. Uch qismdan iborat:

| Loyiha | Nima | Stack | Port |
|---|---|---|---|
| **`tash-client`** | Mijoz — Telegram Mini App | Vite + React 19 + TS + Tailwind v4 + @telegram-apps/sdk-react | 5173 |
| **`tash-admin`** | Salon egasi/usta — web panel | Vite + React 19 + TS + Tailwind v4 | 5174 |
| **`tash-backend`** | API | FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL | 8000 |

Dizayn: dark-forward, urg'u = **Brass**. Shriftlar: Clash Display / Satoshi / Space Mono (self-host, `font-display: swap`). Barcha end-user matni **o'zbek (lotin)**. Pul = **integer so'm**. TZ: `TASH_BUILD_PROMPTS.md`.

---

## Tez ishga tushirish

### 1. Backend (`tash-backend`)
```bash
cd tash-backend
docker compose up -d                 # Postgres 16 (btree_gist bilan)
python -m venv .venv && ./.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env                 # BOT_TOKEN, JWT_SECRET ni to'ldiring
alembic upgrade head                 # 15 jadval + EXCLUDE double-booking guard
python -m app.db.seed                # 1 salon, 2 usta, xizmatlar, admin loginlar
uvicorn app.main:app --reload        # http://localhost:8000/docs
pytest                               # 20 test (slot algoritmi, HMAC, to'lov imzolari)
```
Seed admin loginlari: `owner@tash.uz / owner12345`, `master@tash.uz / master12345` (productiondan oldin o'zgartiring).

### 2. Client (`tash-client`) — Telegram Mini App
```bash
cd tash-client
npm install
npm run dev                          # http://localhost:5173
```
- Hozircha **MOCK data** bilan ishlaydi (`src/lib/api.ts`, `MOCK=true`). Backendga ulash uchun `MOCK=false` va `.env` da `VITE_API_URL=http://localhost:8000` (yoki tunnel URL).
- Telegramda sinash HTTPS talab qiladi: `ngrok http 5173` → URL ni `@BotFather` da Mini App sifatida o'rnating. `vite.config.ts` da ngrok/cloudflare hostlariga ruxsat berilgan.

### 3. Admin (`tash-admin`) — web panel
```bash
cd tash-admin
npm install
npm run dev                          # http://localhost:5174
```
- Hozircha MOCK data. Backend admin API (B4) tayyor — ulash uchun `src/lib/api.ts` dagi fetch qatlamini yoqing.

---

## Holat

| Qism | Ekranlar / modullar | Holat |
|---|---|---|
| Client | Dizayn tizimi, `/style`, F1 Salon Home, F2 Band qilish (4 qadam), F3 Mening bandlovlarim | ✅ build o'tadi |
| Admin | F4 Jadval, F5 Bandlov sheet, F6 Mijozlar, F7 Xizmatlar/Ustalar, F8 Sozlamalar | ✅ build o'tadi |
| Backend | B1 auth, B2 model+migration, B3 booking/slot, B4 admin API, B5 eslatmalar, B6 to'lovlar | ✅ import + 20 test |

## Keyingi qadamlar (integratsiya)
1. Client va admin da `MOCK` ni o'chirib, real backend API ga ulash (endpointlar mos: `/salon`, `/availability`, `/appointments`, `/admin/*`).
2. `BOT_TOKEN` bilan Telegram Mini App URL o'rnatish va `initData` HMAC oqimini jonli sinash.
3. Payme/Click sandbox credentiallari bilan to'lov webhooklarini sinash (aniq error kod/imzo formatlarini rasmiy docs bilan tasdiqlash).
4. Jonli Postgres da `alembic upgrade head` + seed (bu muhitda Docker yo'q edi).
