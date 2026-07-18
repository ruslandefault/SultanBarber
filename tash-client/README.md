# TASH — Client (Telegram Mini App)

Premium barbershop / beauty booking · Toshkent · **Brass + dark-forward**.
Bu — mijoz tomoni (Telegram Mini App). Admin panel va backend alohida.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (CSS-first `@theme` konfiguratsiya)
- react-router-dom v7
- `@telegram-apps/sdk-react` v3 (Telegram Mini Apps SDK)
- Self-hosted shriftlar: Clash Display, Satoshi (Fontshare), Space Mono (Google) — `font-display: swap`

## Ishga tushirish

```bash
npm install
npm run dev      # http://localhost:5173  → / dan /style ga yo‘naltiradi
npm run build    # tsc -b && vite build
```

## Dizayn tizimi

- Ranglar: `graphite` `slate` `bone` `stone` `brass` `sage` `clay` (Tailwind: `bg-brass`, `text-bone`, hairline = `border-hairline`).
- Shriftlar: `font-display` (Clash), `font-body` (Satoshi), `font-mono` (Space Mono — faqat vaqt va narxlar, tabular figures).
- Radiuslar: kartalar 14px, input/tugma 10px, chip full-round.
- **Style tile:** `/style` — palitra, shrift shkalasi, barcha komponentlar va `AppointmentTicket` (barcha statuslar).

## Tuzilma

```
src/
  telegram/     TelegramProvider + hooklar (useMainButton, useBackButton, useHaptics, useTheme, useInitData)
  components/
    ui/         Button, Input, Select, Chip/Tag, Card, BottomSheet, Avatar, StatusChip, Skeleton, AppointmentTicket
    AppShell.tsx
  routes/       Style.tsx  (F1–F8 ekranlari shu yerga qo‘shiladi)
  lib/          api.ts (stub, initData ni backendga forward qiladi), cn.ts, format.ts
  types.ts
public/fonts/   woff2 fayllar
```

## Telegram integratsiyasi

- Yuklanishda: `ready()` + `expand()`; header/fon = graphite; safe-area hurmat qilinadi.
- Har ekranning asosiy amali = native Telegram **MainButton** (brass). Brauzerda test uchun pastki fallback tugma ko‘rsatiladi.
- BackButton router navigatsiyaga ulangan; haptics: tanlashda `selection`, tasdiqlashda `success`.
- Brend qorong‘i saqlanadi (foydalanuvchining yorug‘ Telegram temasiga ergashmaydi).
- `initDataRaw` backendga `Authorization: tma <...>` orqali forward qilinadi (HMAC ni backend tekshiradi).

## Telegramda lokal sinash

Telegram Mini App HTTPS talab qiladi (`localhost` ishlamaydi):

1. `@BotFather` da bot yarat → `/newapp` yoki Menu Button orqali Mini App URL o‘rnat.
2. `cloudflared tunnel --url http://localhost:5173` (yoki `ngrok http 5173`) → HTTPS URL ni BotFather'ga ber.
3. `eruda` dev'da avtomatik yoqiladi (webview ichida konsol).
4. iOS va Android da alohida sina — safe-area, MainButton, klaviatura farq qiladi.

## Keyingi qadam

`TASH_BUILD_PROMPTS.md` bo‘yicha: **F1 — Salon Home** ekrani, so‘ng backend `B1`+`B2`+`B3` va ekranlarni API'ga ulash.
