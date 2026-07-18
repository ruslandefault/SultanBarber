# TASH — Admin panel

Toshkentdagi sartaroshxona va go‘zallik salonlari uchun **bandlov boshqaruv paneli**.
Bu Telegram Mini App emas — salon egalari va ustalar uchun **responsiv veb-panel**
(kunduzgi ish stoli uchun yorug‘ interfeys).

> Hozircha barcha ma’lumotlar **mock (namunaviy)** — admin backend API alohida
> tayyorlanmoqda. Butun ilova `src/lib/api.ts` orqali ishlaydi; API tayyor bo‘lgach,
> shu fayldagi funksiya tanalarini `fetch(...)` chaqiruvlariga almashtirish kifoya.

## Texnologiyalar

- **Vite 8** + **React 19** + **TypeScript 6** (`verbatimModuleSyntax`, `erasableSyntaxOnly`)
- **Tailwind CSS v4** — CSS-first `@theme` (`src/index.css`), `@tailwindcss/vite` plagini
- **react-router-dom** — sahifalar (routing)
- `clsx` + `tailwind-merge` (`cn()` yordamchisi)
- `@/*` path alias → `src/*` (vite.config.ts + tsconfig.app.json)
- O‘z serveridan yuklangan shriftlar (woff2, `font-display: swap`):
  Clash Display (sarlavhalar), Satoshi (matn), Space Mono (faqat vaqt va narxlar)

## Ishga tushirish

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build  (xatosiz o‘tadi)
npm run preview  # build natijasini ko‘rish
```

## Dizayn tizimi (LOCKED)

Ranglar `@theme` da `--color-*` sifatida:
graphite `#1C1F22`, slate `#26292E`, bone `#F4F3EF`, stone `#9A948A`,
brass `#C9A24B`, sage `#5B8A6A`, clay `#C25436`.

Admin layout = **to‘q grafit sidebar + bone (yorug‘) kontent** kartalar bilan, brass urg‘u.
Shakl: kartalar 14px, tugma/inputlar 10px, chiplar to‘liq yumaloq.
Harakat 150–180ms ease-out; `prefers-reduced-motion` hurmat qilinadi.
Ko‘rinadigan brass fokus halqasi. 360px gacha responsiv.

Pul: butun son so‘m, ingichka probel bilan (`120 000 so‘m`), Space Mono shriftida.

Holat ranglari va yozuvlari:
`booked → Band qilindi` (stone), `confirmed → Tasdiqlandi` (brass),
`completed → Bajarildi` (sage), `no_show → Kelmadi` (clay),
`cancelled → Bekor qilindi` (clay muted).

**Signature komponent:** `AppointmentTicket` — sartarosh cheki uslubidagi blok
(katta Space Mono vaqt, brass punktir chiziq, notch qirralar, holat chipi).
To‘liq va **compact** variantlari bor; compact variant jadval va tarixda ishlatiladi.

## Sahifalar (routes)

| Route         | Ekran | Tavsif |
|---------------|-------|--------|
| `/`           | **F4 — Jadval** | Kunlik/haftalik jadval. Vaqt to‘ri, ustalar ustunlari, holatga qarab ranglangan bandlovlar, brass "hozir" chizig‘i. Bo‘sh katakni bosib bandlov ochiladi; bandlovni bosib tahrirlanadi. Yuklash skeleti va bo‘sh holat. |
| `/mijozlar`   | **F6 — Mijozlar** | Mini-CRM: qidiruv, saralash, filtrlar ("Uzoq vaqt kelmagan", "Tez-tez keladigan", "Tug‘ilgan kuni yaqin"). Mijoz kartasi: statistika, teglar, tashriflar tarixi, tez "Band qilish". Excel import (stub). |
| `/xizmatlar`  | **F7 — Xizmatlar** | Kategoriyalar bo‘yicha guruhlangan xizmatlar; nom, davomiylik, narx, faol/nofaol toggle, kategoriya ichida tartiblash, "Yangi xizmat" sheet. |
| `/ustalar`    | **F7 — Ustalar** | Usta kartalari; haftalik ish vaqti muharriri, dam olish kunlari, bajaradigan xizmatlar tanlovi, "Yangi usta" sheet. |
| `/sozlamalar` | **F8 — Sozlamalar** | Salon profili, ish vaqti, bildirishnomalar (Telegram eslatma, timing chiplar), oldindan to‘lov (depozit), bekor qilish siyosati. |

F5 — Bandlov yaratish/tahrirlash alohida route emas, **o‘ng tomon sheet** sifatida
Jadval va Mijozlar ekranlaridan ochiladi (`src/components/AppointmentSheet.tsx`).
Ikki marta band qilishning oldi olinadi ("Bu vaqt band"), toastlar: "Saqlandi", "Bekor qilindi".

## Loyiha tuzilishi

```
src/
  types.ts                 # domen tiplari (backend MVP sxemasini aks ettiradi)
  lib/
    api.ts                 # mock API + namunaviy ma'lumotlar (fetch'ga almashtiriladi)
    format.ts              # pul, sana, vaqt, holat yozuvlari (Uzbek)
    cn.ts                  # clsx + tailwind-merge
  components/
    Shell.tsx              # sidebar (desktop) + pastki panel (mobil)
    AppointmentTicket.tsx  # signature komponent (full + compact)
    AppointmentSheet.tsx   # F5 — bandlov yaratish/tahrirlash sheet
    PageHeader.tsx
    icons.tsx              # inline SVG ikonalar
    ui/                    # Button, Card, Chip, Field, Sheet, Toast, Toggle, ...
  screens/
    Journal.tsx            # F4
    Clients.tsx            # F6
    Catalog.tsx            # F7 (Xizmatlar + Ustalar)
    Settings.tsx           # F8
public/fonts/              # o'z serveridagi woff2 shriftlar
```

## Backendga ulash

Barcha ma'lumot oqimi `src/lib/api.ts` dagi `api` obyektidan o‘tadi. Har bir metod
(`getAppointments`, `saveAppointment`, `getClients`, `updateSalon`, ...) `Promise`
qaytaradi va qaytish shakli backend REST endpointlariga mos. API tayyor bo‘lganda
faqat shu fayl o‘zgaradi — ekranlarga tegilmaydi.

## Cheklovlar / TODO

- Ma'lumotlar mock; sahifa yangilanganda o‘zgarishlar saqlanmaydi (xotirada).
- Drag-to-move (bandlovni sudrab ko‘chirish) — Jadval jadvalida `TODO` hook qoldirilgan.
- Excel import, logo/cover yuklash, xarita pin — hozircha stub (toast bildirishnoma).
- Shriftlar Fontshare va Google Fonts'dan muvaffaqiyatli yuklab olindi (woff2, o‘z serverida).
  Agar kelajakda yuklash imkoni bo‘lmasa, `@theme` dagi shrift steklari bir xil oilalar
  nomi bilan tizim shriftlariga tushadi.
