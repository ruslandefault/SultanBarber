/**
 * Mock API implementation (dev fallback).
 *
 * Enabled when `VITE_USE_MOCK=true` — lets the app run in a plain browser
 * without Telegram/`initData` or a live backend. The exported `mockApi`
 * object mirrors the real `api` surface in `api.ts` exactly (same method
 * names, argument shapes, and RETURN shapes from `@/types`).
 */
import type {
  Appointment,
  AvailabilitySlot,
  BookingDraft,
  Master,
  Product,
  Salon,
  SalonSettings,
  Service,
  ServiceCategory,
} from '@/types'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── Mock API surface ───────────────────────────────────────────
export const mockApi = {
  async getSalon(): Promise<{
    salon: Salon
    categories: ServiceCategory[]
    services: Service[]
    masters: Master[]
    settings: SalonSettings
  }> {
    await delay(400)
    return mock.salonBundle
  },

  async getAvailability(params: {
    masterId: string
    serviceIds: string[]
    date: string
  }): Promise<{ slots: AvailabilitySlot[] }> {
    await delay(350)
    return { slots: mockSlots(params.date, params.masterId) }
  },

  async getMyAppointments(): Promise<{ upcoming: Appointment[]; past: Appointment[] }> {
    await delay(400)
    return { upcoming: mock.upcoming, past: mock.past }
  },

  async createAppointment(draft: BookingDraft): Promise<Appointment> {
    await delay(600)
    const appt = buildAppointment(draft)
    mock.upcoming = [appt, ...mock.upcoming]
    return appt
  },

  async cancelAppointment(id: string): Promise<void> {
    await delay(400)
    const appt = mock.upcoming.find((a) => a.id === id)
    if (appt) appt.status = 'cancelled'
  },

  async getProducts(): Promise<Product[]> {
    await delay(300)
    return [
      { id: 'p1', title: 'Soch uchun pomada', description: 'Kuchli fiksatsiya, mat effekt', priceSoum: 85000, imageUrl: null },
      { id: 'p2', title: 'Soqol moyi', description: 'Yumshatuvchi va parvarish', priceSoum: 65000, imageUrl: null },
    ]
  },
}

// ── Mock helpers ───────────────────────────────────────────────
function mockSlots(date: string, _masterId: string): AvailabilitySlot[] {
  // Deterministic "busy" set derived from the date so results are stable.
  const seed = [...date].reduce((n, c) => n + c.charCodeAt(0), 0)
  const slots: AvailabilitySlot[] = []
  for (let h = 10; h < 21; h++) {
    for (const m of [0, 30]) {
      const idx = h * 2 + m / 30
      const busy = (idx * 7 + seed) % 5 === 0
      if (!busy) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        slots.push({ time })
      }
    }
  }
  return slots
}

function buildAppointment(draft: BookingDraft): Appointment {
  const b = mock.salonBundle
  const chosen = draft.serviceIds
    .map((id) => b.services.find((s) => s.id === id))
    .filter((s): s is Service => !!s)
  const durationMin = chosen.reduce((n, s) => n + s.durationMin, 0)
  const priceTotal = chosen.reduce((n, s) => n + s.priceSoum, 0)
  const master =
    draft.masterId === 'any' ? b.masters[0] : b.masters.find((m) => m.id === draft.masterId) ?? b.masters[0]
  const startAt = `${draft.date}T${draft.time}:00+05:00`
  const endAt = addMinutesIso(startAt, durationMin)
  return {
    id: `a-${draft.date}-${draft.time}`,
    salonName: b.salon.name,
    masterName: master.name,
    services: chosen.map((s) => ({ name: s.name, durationMin: s.durationMin, priceSoum: s.priceSoum })),
    startAt,
    endAt,
    durationMin,
    priceTotal,
    status: 'booked',
    note: draft.note,
  }
}

function addMinutesIso(iso: string, minutes: number): string {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() + minutes)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:00+05:00`
}

// ── Mock data (dev only) ───────────────────────────────────────
const mock = {
  salonBundle: {
    salon: {
      id: 's1',
      name: 'TASH Studio',
      tagline: 'Klassik va zamonaviy soch olish',
      cover: null,
      logo: null,
      address: 'Toshkent, Amir Temur ko‘chasi 12',
      isOpen: true,
      workingToday: '10:00–21:00',
      distanceKm: 1.2,
      phone: '+998 90 123 45 67',
      instagram: 'tash.studio',
      lat: 41.311081,
      lng: 69.279737,
      weeklyHours: [
        { day: 'Dushanba', hours: '10:00–21:00' },
        { day: 'Seshanba', hours: '10:00–21:00' },
        { day: 'Chorshanba', hours: '10:00–21:00' },
        { day: 'Payshanba', hours: '10:00–21:00' },
        { day: 'Juma', hours: '10:00–21:00' },
        { day: 'Shanba', hours: '10:00–22:00' },
        { day: 'Yakshanba', hours: 'Dam olish', dayOff: true },
      ],
    } as Salon,
    categories: [
      { id: 'c1', name: 'Soch', sortOrder: 1 },
      { id: 'c2', name: 'Soqol', sortOrder: 2 },
      { id: 'c3', name: 'Kompleks', sortOrder: 3 },
    ] as ServiceCategory[],
    services: [
      { id: 'sv1', name: 'Soch olish', categoryId: 'c1', durationMin: 45, priceSoum: 120000, isActive: true },
      { id: 'sv2', name: 'Bolalar soch olish', categoryId: 'c1', durationMin: 30, priceSoum: 90000, isActive: true },
      { id: 'sv3', name: 'Soqol tuzatish', categoryId: 'c2', durationMin: 30, priceSoum: 70000, isActive: true },
      { id: 'sv4', name: 'Soch + soqol', categoryId: 'c3', durationMin: 75, priceSoum: 170000, isActive: true },
    ] as Service[],
    masters: [
      { id: 'm1', name: 'Bekzod', specialty: 'Klassik', rating: 4.9, isActive: true, nextAvailable: 'Bugun 15:30', avatar: null },
      { id: 'm2', name: 'Sardor', specialty: 'Fade', rating: 4.8, isActive: true, nextAvailable: 'Bugun 16:00', avatar: null },
      { id: 'm3', name: 'Jasur', specialty: 'Soqol', rating: 4.7, isActive: true, nextAvailable: 'Ertaga 10:00', avatar: null },
    ] as Master[],
    settings: {
      depositRequired: false,
      depositAmount: 50000,
      cancelWindowHours: 3,
    } as SalonSettings,
  },
  upcoming: [
    {
      id: 'a1',
      salonName: 'TASH Studio',
      masterName: 'Bekzod',
      services: [{ name: 'Soch olish', durationMin: 45, priceSoum: 120000 }],
      startAt: '2026-07-20T14:30:00+05:00',
      endAt: '2026-07-20T15:15:00+05:00',
      durationMin: 45,
      priceTotal: 120000,
      status: 'confirmed',
    },
  ] as Appointment[],
  past: [
    {
      id: 'a0',
      salonName: 'TASH Studio',
      masterName: 'Sardor',
      services: [{ name: 'Soch + soqol', durationMin: 75, priceSoum: 170000 }],
      startAt: '2026-06-28T11:00:00+05:00',
      endAt: '2026-06-28T12:15:00+05:00',
      durationMin: 75,
      priceTotal: 170000,
      status: 'completed',
    },
  ] as Appointment[],
}
