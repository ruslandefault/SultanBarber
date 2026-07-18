# TASH — UI Build Prompts

Barbershop / beauty booking · Uzbekistan (Toshkent) · **Brass + dark-forward**
Client = Telegram Mini App · Admin = responsive web panel

---

## Qanday ishlatiladi (3 daraja)

- **Daraja 1 — Poydevor:** bir marta ishlatiladigan kickoff prompti. Claude Code'da yangi loyiha ochib, **birinchi shuni** ber. U scaffold qiladi, dizayn tizimini quradi, Telegram Mini App shell'ini o'rnatadi va `/style` preview beradi.
- **Daraja 2 — Ekranlar (UI):** F1–F8 ekran promptlari. Daraja 1 tugab, `/style` ni ko'rgandan keyin, tartib bilan **birma-bir** ber (har birini alohida turnda), toki Claude oldingi ekranni tugatib bo'lsin.
- **Daraja 3 — Backend:** B1–B6 promptlari (FastAPI + Postgres). Alohida loyiha (yoki monorepo). UI kickoff API'ni stub qilgani uchun frontend'ni backend'ni kutmasdan boshlash mumkin; lekin haqiqiy booking uchun B1–B3 kerak.

**Tavsiya etilgan tartib (uch daraja bo'ylab):**
`Daraja 1` (frontend shell) → `B1` + `B2` (backend poydevor + data model) → `B3` (booking/slot API) → `F1` `F2` `F3` ni API'ga ulash (client tayyor) → `B4` (admin API) → `F4` `F5` `F7` `F6` `F8` (admin tayyor) → `B5` (eslatmalar) → `B6` (to'lovlar).

> Eslatma: frontend'ni mock data bilan Daraja 1 dan boshlab, backend B1–B3 tayyor bo'lgach ulash — solo builder uchun eng silliq yo'l.

---

## Qulflangan dizayn qarorlari

**Ohang:** "premium grooming studio" — qorong'i, aniq, ishonchli. Generic SaaS ko'kdan qochamiz.

**Rang tokenlari (dark-forward, urg'u = Brass):**

| Token | Hex | Ishlatilishi |
|---|---|---|
| graphite | `#1C1F22` | asosiy qorong'i sirt (app fon, header, admin sidebar) |
| slate | `#26292E` | ko'tarilgan sirt (qorong'ida kartalar) |
| bone | `#F4F3EF` | asosiy matn qorong'ida; yorug' sirtlar |
| stone | `#9A948A` | ikkilamchi matn; hairline chegara `rgba(244,243,239,0.08)` |
| brass | `#C9A24B` | urg'u, CTA, tanlangan/faol holat, focus ring |
| sage | `#5B8A6A` | muvaffaqiyat / "Tasdiqlandi" |
| clay | `#C25436` | bekor qilish / "Kelmadi" |

**Shriftlar (Fontshare/Google, bepul, self-host):**
- **Clash Display** 500/600 — sarlavhalar, salon nomi (kam ishlatiladi)
- **Satoshi** 400/500/700 — barcha UI/matn
- **Space Mono** 400/700 — faqat vaqt slotlari va narxlar (tabular figures)
- Type scale: 12 / 14 / 16 / 20 / 28 / 40, display line-height tor

**Signature komponent — `AppointmentTicket`:** barber chek talonchasi kabi karta — katta Space Mono vaqt, guruch chiziq, tirnoqli (notch) chekka, salon/usta/xizmat/davomiylik/narx + status chip. Full + compact variantlar. Statuslar: `Band qilindi` (stone) / `Tasdiqlandi` (brass) / `Bajarildi` (sage) / `Kelmadi` (clay). Bu confirmation'da to'liq, jadvalda compact ishlatiladi.

**Shakl/motion:** kartalar 14px, input/tugma 10px, chip full-round; qorong'ida elevation = slate sirt + hairline (og'ir shadow emas); animatsiya 150–180ms ease-out; tanlangan slot = brass fill + ozgina scale; `prefers-reduced-motion` hurmat qilinadi.

**Til:** barcha end-user matni **o'zbek (lotin)**, sentence case, aktiv fe'llar. Tizim atamalari foydalanuvchiga ko'rsatilmaydi.

---

## DARAJA 1 — Poydevor (Claude Code kickoff)

```
Start a new project: "TASH" — the CLIENT side (Telegram Mini App) of a premium barbershop/beauty booking product for Uzbekistan (Tashkent). Build the foundation only in this first pass: project scaffold + design system + Telegram integration shell + a style-tile preview route. Do NOT build feature screens yet — I'll provide those next.

STACK (verify latest versions on npm before installing):
- Vite + React + TypeScript
- Tailwind CSS
- react-router-dom (for the step-based flow)
- The current Telegram Mini Apps SDK: @telegram-apps/sdk-react (fallback @twa-dev/sdk if issues)
- Self-hosted fonts: Clash Display + Satoshi (Fontshare), Space Mono (Google). Use font-display: swap.

DESIGN TOKENS (dark-forward, accent = Brass):
Colors:
  graphite #1C1F22 (app bg, header, primary dark surface)
  slate    #26292E (elevated cards)
  bone     #F4F3EF (primary text; light surfaces)
  stone    #9A948A (secondary text; hairline borders via rgba(244,243,239,0.08))
  brass    #C9A24B (accent, CTA, selected/active, focus ring)
  sage     #5B8A6A (success / "Tasdiqlandi")
  clay     #C25436 (destructive / "Bekor" / "Kelmadi")
Type:
  display "Clash Display" 500/600 — headings, salon name (restraint)
  body    "Satoshi" 400/500/700 — all UI
  mono    "Space Mono" 400/700 — ONLY appointment times & prices, tabular figures
  scale: 12/14/16/20/28/40, tight display line-height
Shape: cards 14px, inputs/buttons 10px, chips full-round. Elevation on dark = slate surface + hairline border, not heavy shadows.
Motion: 150–180ms ease-out; selected time-slot = brass fill + slight scale; respect prefers-reduced-motion.

TELEGRAM MINI APP REQUIREMENTS (critical — this must feel native and comfortable inside Telegram):
- On load: call ready() and expand(). Set header + background color to graphite (#1C1F22).
- Layout uses viewportStableHeight; respect top safe-area (under Telegram header) and bottom safe-area.
- Provide a TelegramProvider + hooks wrapping the SDK: useMainButton, useBackButton, useHaptics, useTheme, useInitData.
- Primary action on each screen = the native Telegram MainButton (brass color), shown/enabled per validation — NOT a custom fixed bottom bar.
- BackButton wired to router navigation.
- Haptics: selectionChanged on option/slot select; notificationOccurred('success') on booking confirm.
- Read themeParams but KEEP the brand dark (do not follow the user's light Telegram theme); ensure AA contrast regardless.
- Forward initDataRaw to the backend for auth (backend validates the HMAC — frontend only forwards). Stub the API layer.
- Disable vertical swipe-to-close during scroll if the SDK supports it (avoid accidental closes).

PERFORMANCE (non-negotiable — target users are on mid/low-end Android in Uzbekistan):
- Keep the bundle small; lazy-load routes; self-host fonts; optimize/lazy images. Fast first paint. Test mentally on a slow Android webview.

DELIVER IN THIS PASS:
1. Scaffold + tailwind.config.ts with tokens + global CSS with @font-face and CSS variables.
2. TelegramProvider and the hooks above.
3. Base components (shadcn/ui-compatible style, custom-branded — NOT telegram-ui, since we want our own premium look): Button (primary/brass, ghost, destructive), Input, Select, Chip/Tag, Card, BottomSheet, Avatar/Monogram, StatusChip, and the SIGNATURE component AppointmentTicket.
   AppointmentTicket = a barber ticket-stub card: large Space Mono time, brass horizontal rule, a notched/perforated edge detail, then salon/master/service/duration/price + a StatusChip. Provide full + compact variants. Statuses: "Band qilindi"(stone) / "Tasdiqlandi"(brass) / "Bajarildi"(sage) / "Kelmadi"(clay).
4. App shell wired to Telegram (graphite bg, safe areas, MainButton region).
5. A /style route: style tile preview — palette, type scale, all components, AppointmentTicket in every status.

COPY / LANGUAGE: all end-user text in UZBEK (Latin), sentence case, plain active-voice verbs. Examples: "Band qilish", "Tasdiqlash", "Bekor qilish", "so'm". Never expose system terms.

QUALITY FLOOR: responsive to 360px, visible keyboard focus (brass ring), reduced-motion respected.

After you finish, show me the /style route result and the file tree, then wait — I'll send the first screen prompt (Salon Home).
```

---

## DARAJA 2 — Ekran promptlari

### Client (Telegram Mini App)

#### F1 — Salon Home

```
Using the established TASH design system (dark-forward, Brass, Clash/Satoshi/Space Mono, Telegram Mini App shell already built), build the client Salon Home screen.

CONTEXT: A client opens the salon's Telegram Mini App (from the salon's Instagram bio link or Telegram). Goal of this screen: understand the salon and tap "Band qilish".

LAYOUT (mobile, single column, graphite bg):
[ Hero: salon cover image with dark gradient overlay; salon logo/name in Clash Display; short tagline ]
[ Primary action: Telegram MainButton "Band qilish" (brass) ]
[ Info row (chips): open/closed status, working hours, distance ]
[ "Xizmatlar" — horizontal category chips (Soch, Soqol, Kompleks...) → tapping filters the service preview ]
[ Featured masters: horizontal scroll of master cards (avatar, name, specialty, rating) ]
[ "Manzil" — static map thumbnail + address; tap opens map ]
[ Footer: working hours per day ]

BEHAVIOR: "Band qilish" starts the booking flow (F2). Master card tap starts booking pre-filtered to that master. Use the Telegram MainButton as the sticky primary CTA.
STATES: loading skeleton for hero/masters; graceful fallback if salon has no photo (brass monogram).
COPY: Uzbek — "Hozir ochiq", "Bugun 10:00–21:00", "Band qilish".
```

#### F2 — Band qilish oqimi (4 qadam + ticket)

```
Using the TASH design system, build the client Booking Flow as a 4-step mobile flow inside the Telegram Mini App. Use the Telegram MainButton for each step's primary action and the BackButton for going back. Subtle step indicator (1/4) at top with brass progress.

STEP 1 — Xizmatni tanlang:
Services grouped by category. Each row: service name, duration ("45 daq"), price in Space Mono ("120 000 so'm"). Multi-select allowed (combos); running total shown. MainButton: "Davom etish".

STEP 2 — Ustani tanlang:
List of masters (avatar, name, rating, next-available hint). A "Farqi yo'q" (any master) option at top. Selected = brass ring. MainButton: "Davom etish".

STEP 3 — Sana va vaqt:
Horizontal date strip (next 14 days; today highlighted). Below: available time slots as pill chips in Space Mono ("14:30"). Unavailable = disabled/stone. Selected = brass fill + slight scale. Empty state: "Bu kunga bo'sh vaqt yo'q" + nudge to next available day. MainButton: "Davom etish".

STEP 4 — Tasdiqlash:
Summary card: service(s), master, date/time, duration, total price. If the salon requires a deposit, show "Oldindan to'lov" section with amount and a "To'lash (Payme / Click)" button (mock the payment handoff). One-line "Izoh (ixtiyoriy)" input. MainButton: "Band qilish" (or "To'lab band qilish" if deposit).

ON SUCCESS: render the signature AppointmentTicket full-screen (Space Mono time, brass rule, notched edge, status "Band qilindi") with actions "Mening bandlovlarim" and a "Telegramga eslatma qo'shildi" confirmation line. Fire Telegram haptic success.

CONSTRAINTS: no client sign-up — use Telegram identity; only ask phone if not available via Telegram. All copy Uzbek. One clear decision per step.
```

#### F3 — Mening bandlovlarim

```
Using the TASH design system, build the client "Mening bandlovlarim" screen (Telegram Mini App).

LAYOUT: two segments — "Kelgusi" and "O'tgan".
- Kelgusi: compact AppointmentTicket list (time, salon, master, service, status chip). Each has actions "Boshqa vaqtga ko'chirish" and "Bekor qilish" (clay; confirm bottom-sheet: "Bandlovni bekor qilasizmi?").
- O'tgan: read-only tickets with "Yana band qilish" (rebook → prefilled F2).
EMPTY STATE: "Hali bandlovingiz yo'q" + "Band qilish" button.
BEHAVIOR: cancel only within salon's allowed window; outside it, disable cancel and explain. All copy Uzbek, active voice.
```

---

### Admin (responsive web panel — NOT Telegram)

#### F4 — Jadval / Journal (core)

```
Using the TASH design system (dark graphite sidebar + bone content cards, Brass accents, responsive web — NOT Telegram), build the admin Journal — the core screen owners use daily.

SHELL: left dark sidebar (graphite) with nav icons+labels: Jadval, Mijozlar, Xizmatlar, Ustalar, Sozlamalar; salon name/logo top; collapses to a bottom bar on mobile.

JOURNAL VIEW:
- Top bar: date navigation (‹ Bugun ›), view toggle "Kun / Hafta", and a "+ Yangi bandlov" brass button.
- Day view: vertical time grid (working hours, 15-min rows, Space Mono time gutter). Columns = masters (header: avatar + name). Appointments render as compact AppointmentTicket blocks colored by status (stone/brass/sage/clay), sized by duration. Empty slots are tappable to create a booking at that time+master.
- Week view: columns = days, condensed.
- "Now" line across the grid in brass.
INTERACTIONS: click empty slot → open create-appointment sheet (F5) prefilled. Click a booking → open its detail (F5). (Drag-to-move: leave a TODO hook, not required in v1.)
STATES: loading skeleton grid; empty day ("Bugun bandlov yo'q").
RESPONSIVE: on mobile, single master column with a master switcher; horizontal day scroll.
COPY: Uzbek.
```

#### F5 — Bandlov detali / yaratish-tahrirlash

```
Using the TASH design system (admin web), build the Appointment create/edit panel as a right-side sheet (desktop) / full sheet (mobile).

FIELDS:
- Mijoz: searchable select over existing clients + "Yangi mijoz" inline (ism, telefon).
- Xizmat(lar): multi-select with duration+price (Space Mono total).
- Usta: select.
- Sana va vaqt: date + start time; end auto-computed from duration.
- Status: segmented control — Band qilindi / Tasdiqlandi / Bajarildi / Kelmadi (colors stone/brass/sage/clay).
- Izoh: textarea.
ACTIONS: "Saqlash" (brass). If editing: "Bekor qilish" (clay, confirm). If status → Bajarildi, reveal an optional "To'lov" line (amount + method: Naqd / Payme / Click) to record payment.
VALIDATION: prevent double-booking a master/slot; inline error in the interface's voice ("Bu vaqt band"). Active-voice buttons; the action name stays consistent through toasts ("Saqlandi", "Bekor qilindi").
COPY: Uzbek.
```

#### F6 — Mijozlar (mini-CRM)

```
Using the TASH design system (admin web), build the Clients screen.

LIST: searchable, sortable — ism, telefon, oxirgi tashrif, tashriflar soni, jami sarflagan (Space Mono, so'm). Filter row: "Uzoq vaqt kelmagan", "Tez-tez keladigan", "Tug'ilgan kuni yaqin". Row tap → client card.
CLIENT CARD (drawer or page):
- Header: avatar/monogram, ism, telefon, quick "Band qilish" button.
- Ma'lumot: teglar (chips), tug'ilgan sana, izoh.
- Tashriflar tarixi: compact AppointmentTickets (past + upcoming).
- Statistika: jami tashrif, jami sarf, o'rtacha chek.
EMPTY STATE: "Hali mijoz yo'q — birinchi bandlov avtomatik qo'shiladi."
Include an "Import (Excel)" affordance (stub). COPY: Uzbek.
```

#### F7 — Xizmatlar va Ustalar (katalog)

```
Using the TASH design system (admin web), build two setup screens sharing one layout with tabs: "Xizmatlar" and "Ustalar". These directly drive what the client booking flow (F2) can show.

XIZMATLAR:
- Grouped by category (Soch, Soqol, Kompleks...). Each service: nom, davomiyligi (daq), narx (so'm), kategoriya, faol/nofaol toggle.
- "+ Yangi xizmat" opens a sheet with those fields. Reorder within category.

USTALAR:
- Master cards: avatar, ism, mutaxassislik, ish vaqti (weekly schedule editor: days + hours, days off), "qaysi xizmatlarni bajaradi" multi-select.
- "+ Yangi usta" sheet.
Validation + active-voice buttons ("Saqlash" → "Saqlandi"). COPY: Uzbek.
```

#### F8 — Sozlamalar

```
Using the TASH design system (admin web), build the Settings screen with sections:

1. Salon profili: nom, logo/cover, manzil (+map pin), telefon, Instagram.
2. Ish vaqti: per-day open/close, dam olish kunlari.
3. Bildirishnomalar: toggle "Telegram eslatma", timing chips ("24 soat oldin", "2 soat oldin"), toggle "Tasdiqlash xabari". (Frame everything the way a person controls it — reminders, not "webhook config".)
4. Oldindan to'lov: toggle "Depozit talab qilinsin", amount or % field, allowed methods (Payme / Click). Explain in plain Uzbek what the client will see.
5. Bekor qilish siyosati: "necha soat oldin bekor qilish mumkin" field.
Clean section cards on bone, brass primary actions. COPY: Uzbek, plain and specific.
```

---

## Telegramda lokal sinash (dev)

Telegram Mini App **HTTPS** talab qiladi — `localhost` ishlamaydi.

1. `@BotFather` da bot yarat → `/newapp` (yoki Menu Button) orqali Mini App URL o'rnat.
2. Lokalda `cloudflared tunnel --url http://localhost:5173` (yoki `ngrok http 5173`) bilan HTTPS tunnel och → URL'ni BotFather'ga ber.
3. Dev'da `eruda` yoqib qo'y (Telegram webview ichida konsol ko'rish uchun).
4. **iOS va Android Telegram** da alohida sinab ko'r — safe-area, MainButton, klaviatura xatti-harakati farq qiladi.

---

## DARAJA 3 — Backend (FastAPI + PostgreSQL)

Bu sening sohang. Stack: FastAPI (async), SQLAlchemy 2.0 + asyncpg + Alembic, Pydantic v2, PostgreSQL, Telegram Bot API. Client auth = Telegram `initData` HMAC; owner/master auth = JWT. Timezone = `Asia/Tashkent`, saqlash tz-aware UTC. Pulni **integer so'm** sifatida saqla (float yo'q).

### B1 — Backend poydevor (scaffold + auth)

```
Start the backend for TASH — a barbershop/beauty booking API. This first pass: project scaffold + config + auth only. No business endpoints yet.

STACK (verify latest on PyPI):
- FastAPI + Uvicorn
- SQLAlchemy 2.0 async (asyncpg) + Alembic
- Pydantic v2 + pydantic-settings
- PostgreSQL
- httpx (or python-telegram-bot) for Bot API
- Structure: app/{api,core,db,models,schemas,services}. Async everywhere.

TELEGRAM CLIENT AUTH (critical, get this exactly right):
- Dependency get_current_client that validates Mini App initData:
  - Parse initDataRaw; verify HMAC-SHA256 signature with secret = HMAC_SHA256(key="WebAppData", msg=BOT_TOKEN); compare to the `hash` field; reject if invalid or auth_date older than N hours.
  - Extract the Telegram user; upsert into clients; return the Client.

OWNER/MASTER AUTH:
- Separate email+password (bcrypt) login issuing a JWT. Dependency get_current_user with role ∈ {owner, master}. (Telegram-based owner auth can come later.)

CONFIG (env): DATABASE_URL, BOT_TOKEN, JWT_SECRET, APP_TZ=Asia/Tashkent, MINIAPP_URL.

DELIVER: scaffold, settings, async session, Alembic init, both auth dependencies, /health, and stub /me for each auth type. Consistent JSON error shape with UI-friendly messages.
```

### B2 — Ma'lumotlar modeli (MVP schema)

```
Add the MVP data model to the TASH backend: SQLAlchemy 2.0 models + Alembic migration + Pydantic schemas. This is a booking core simplified from a full beauty-ERP.

ENTITIES:
- Salon (name, logo, cover, address, lat, lng, phone, instagram, tz default Asia/Tashkent).
- User (owner/master: email, password_hash, role {owner,master}, master_id nullable, salon_id).
- Master (name, avatar, specialty, is_active, salon_id).
- WorkingHours (master_id, weekday 0-6, start_time, end_time, is_day_off) — drives availability.
- ServiceCategory (name, sort_order, salon_id).
- Service (name, category_id, duration_min, price int_soum, is_active, salon_id).
- MasterService (M:N master↔service).
- Client (telegram_id unique nullable, name, phone, birthday nullable, note, salon_id).
- ClientTag + ClientTagLink (M:N, for segmentation).
- Appointment (salon_id, client_id, master_id, start_at tz-aware, end_at, status {booked,confirmed,completed,no_show,cancelled}, note, created_via {telegram,admin}, deposit_amount nullable, price_total int).
- AppointmentService (M:N appointment↔service; SNAPSHOT price+duration at booking time).
- Payment (appointment_id, amount int, method {cash,payme,click}, kind {deposit,full}, status {pending,paid,cancelled}, provider_txn_id nullable, created_at).
- SalonSettings (reminder_telegram bool, reminder_offsets int[] minutes e.g. {1440,120}, confirmation_msg bool, deposit_required bool, deposit_type {fixed,percent}, deposit_value, cancel_window_hours).

CONSTRAINTS / INDEXES:
- Money = integer so'm.
- Indexes: appointments(master_id, start_at), (salon_id, start_at), (client_id).
- DOUBLE-BOOKING GUARD at the DB level: enable btree_gist; add an EXCLUDE constraint on appointments preventing overlapping tstzrange(start_at,end_at) for the same master WHERE status NOT IN ('cancelled','no_show'). Provide this in the migration.
- Deactivating a service must NOT orphan past appointments (snapshots live in AppointmentService).

DELIVER: models, Alembic migration (incl. btree_gist + EXCLUDE), Pydantic read/create/update schemas, and a seed script (1 salon, 2 masters, a few categories/services) for local testing.
```

### B3 — Booking API (slot hisoblash — yadro)

```
Implement the Booking API for TASH — the hardest part: availability computation and race-safe booking. Client endpoints use Telegram auth.

- GET /salon → profile + categories + active services + active masters (feeds F1).
- GET /availability?master_id=&service_ids=&date= → free start-slots for that day:
  - total_duration = sum of requested service durations.
  - Load the master's WorkingHours for that weekday (skip if is_day_off).
  - Subtract existing non-cancelled/non-no_show appointments (start_at..end_at).
  - Granularity 15 min; a slot is valid only if [slot, slot+total_duration] fits fully inside working hours and overlaps no busy interval.
  - master_id="any" → union across all masters performing ALL requested services; return which master(s) are free per slot.
  - All time math in salon tz (Asia/Tashkent); return tz-aware.
- POST /appointments → create booking. client_id from auth. Server RECOMPUTES end_at and price_total from current service data (never trust client-sent price). Re-check availability inside a transaction; rely on the DB EXCLUDE constraint to reject race double-bookings → clean 409 "Bu vaqt band". If settings.deposit_required → create Payment(kind=deposit,status=pending) and return payment info; DO NOT confirm yet (confirmation happens after payment, see B6).
- GET /appointments/my → client upcoming + past (feeds F3).
- POST /appointments/{id}/cancel → only within cancel_window_hours; else 422 with reason.
- POST /appointments/{id}/reschedule → re-validate availability, move.

Consistent error shape with Uzbek-ready messages. Unit-test the slot algorithm: day off, fully booked, service longer than remaining window, exact back-to-back slots, any-master union.
```

### B4 — Admin API

```
Implement the Admin API for TASH (owner/master JWT auth).

- Services & categories: full CRUD (soft-deactivate services).
- Masters: CRUD + WorkingHours editor + MasterService assignment.
- Clients: list with search + filters (long-absent / frequent / birthday-soon); client detail with visit history + stats (total visits, total spend, avg check); Excel import (xlsx, upsert by phone).
- Journal: GET /admin/appointments?date=&view=day|week[&master_id=] → grouped for the grid (feeds F4).
- Appointment admin CRUD (F5): create/edit + status changes; on status=completed allow recording a Payment (cash/payme/click). Same DB EXCLUDE double-booking guard.
- SalonSettings GET/PUT (F8).

Role scoping: 'master' sees/edits mainly their own journal; 'owner' sees all. Consistent error shape.
```

### B5 — Bildirishnomalar (Telegram eslatmalar)

```
Implement notifications for TASH via the Telegram Bot API.

- Async scheduler (APScheduler, or a lightweight polling worker): based on SalonSettings.reminder_offsets (minutes before start_at), send reminders to the client's telegram_id for upcoming non-cancelled appointments. IDEMPOTENT — track sent reminders (table or Redis) so none sends twice.
- On booking confirmed: send a confirmation message (if confirmation_msg) with the appointment summary + a button/link back to the Mini App "Mening bandlovlarim".
- On cancel/reschedule: notify accordingly.
- All message copy in Uzbek, matching the app voice. Handle send failures gracefully (client blocked bot) and log.
- NotificationService abstraction so SMS can be added later without touching call sites. Bot token + Mini App URL from config.
```

### B6 — To'lovlar (Payme + Click)

```
Implement deposit/prepayment for TASH via Uzbekistan providers Payme and Click. Follow each provider's OFFICIAL merchant spec EXACTLY; use sandbox/test credentials first. Secrets from config only — never hardcode.

PAYME (Merchant API — JSON-RPC over a single webhook endpoint):
- Implement: CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction, CheckTransaction, GetStatement.
- Map a Payme transaction to our pending Payment(deposit). On PerformTransaction success → Payment.status=paid AND confirm the linked Appointment (booked→confirmed). Verify the merchant auth header; return Payme's exact numeric error codes on failure.

CLICK (SHOP-API — Prepare + Complete):
- Implement Prepare and Complete endpoints with md5 signature verification per Click spec. On successful Complete → Payment.status=paid, confirm Appointment.

SHARED:
- GET /payments/{id}/status for the frontend to poll.
- Amounts: convert so'm↔provider units (tiyin) where required.
- All money mutations idempotent + transactional; NEVER confirm an appointment without a verified paid deposit.
- Isolate provider logic behind a PaymentProvider interface. You may reference existing libs (e.g. aiopayme) but keep providers swappable.

NOTE: exact field names, error codes, and signature formats MUST come from the current Payme and Click merchant docs — implement against those, verified in sandbox.
```

### Backend ishga tushirish (dev)

1. Postgres'ni Docker'da ko'tar (`btree_gist` extension kerak).
2. `alembic upgrade head` → seed script'ni ishga tushir.
3. `uvicorn app.main:app --reload`.
4. Telegram bot webhook va to'lov (Payme/Click) webhook'lari uchun HTTPS tunnel (`cloudflared`/`ngrok`) — sandbox credentials bilan sina.
5. Slot algoritmi va to'lov confirm oqimini test bilan qamrab ol (bular eng ko'p xato chiqadigan joylar).
