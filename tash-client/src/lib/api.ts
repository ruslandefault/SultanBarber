/**
 * API layer — bridges the client (frontend) contract to the live TASH
 * FastAPI backend.
 *
 * The Telegram `initDataRaw` string is forwarded to the backend on every
 * request via the `Authorization: tma <initDataRaw>` header — the backend
 * validates the HMAC (`get_current_client`). The frontend only forwards it.
 *
 * Set `VITE_USE_MOCK=true` to swap in the in-memory mock (see `api.mock.ts`)
 * so the app runs in a plain browser without Telegram/`initData`. Default is
 * the real backend.
 *
 * The public `api` surface (method names, args, RETURN shapes from `@/types`)
 * is stable; the real branch TRANSFORMS backend JSON (int ids, snake_case)
 * into the client shapes (string ids, camelCase).
 */
import type {
  Appointment,
  AppointmentStatus,
  AvailabilitySlot,
  BookingDraft,
  Master,
  Salon,
  SalonSettings,
  Service,
  ServiceCategory,
} from '@/types'
import { mockApi } from './api.mock'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

let initDataRaw = ''
/** Set by TelegramProvider once the SDK is ready. */
export function setInitData(raw: string): void {
  initDataRaw = raw
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(initDataRaw ? { Authorization: `tma ${initDataRaw}` } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    let message = 'Xatolik yuz berdi'
    try {
      const body = (await res.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status)
  }
  // 204 / empty body tolerance
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// ── Backend JSON shapes (source of truth: app/schemas/*.py) ─────
interface BeSalon {
  id: number
  name: string
  description: string | null
  address: string | null
  phone: string | null
  photo_url: string | null
  timezone: string
  is_active: boolean
}
interface BeService {
  id: number
  category_id: number | null
  name: string
  duration_min: number
  price: number
  sort_order: number
  is_active: boolean
}
interface BeCategory {
  id: number
  name: string
  sort_order: number
  is_active: boolean
  services: BeService[]
}
interface BeMaster {
  id: number
  name: string
  specialty: string | null
  photo_url: string | null
  bio: string | null
  sort_order: number
  is_active: boolean
}
interface BeSalonProfile {
  salon: BeSalon
  categories: BeCategory[]
  masters: BeMaster[]
}
interface BeSlot {
  start_at: string
  end_at: string
  master_ids: number[]
}
interface BeAvailability {
  date: string
  total_duration_min: number
  slots: BeSlot[]
}
interface BeAppointmentService {
  service_id: number
  name: string
  price: number
  duration_min: number
}
interface BeAppointment {
  id: number
  master_id: number
  client_id: number
  status: string
  created_via: string
  start_at: string
  end_at: string
  price_total: number
  deposit_amount: number | null
  notes: string | null
  services: BeAppointmentService[]
}
interface BeAppointmentCreateOut {
  appointment: BeAppointment
  payment: { amount: number } | null
  requires_deposit: boolean
}
interface BeMyAppointments {
  upcoming: BeAppointment[]
  past: BeAppointment[]
}

// ── Enrichment cache ────────────────────────────────────────────
// The backend `AppointmentOut` carries neither the salon name nor the master
// name (only `master_id`). We cache them from the most recent `/salon` load so
// appointment transforms can resolve human-readable names. Falls back to '' if
// `/salon` hasn't been fetched yet in this session.
let salonName = ''
const masterNames = new Map<string, string>()

/** Extract "HH:MM" local time from a tz-aware ISO string (e.g. ...T14:30:00+05:00). */
function isoToHm(iso: string): string {
  const m = /T(\d{2}:\d{2})/.exec(iso)
  return m ? m[1] : ''
}

// ── Transforms: backend JSON → client types ─────────────────────
function toSalon(s: BeSalon): Salon {
  return {
    id: String(s.id),
    name: s.name,
    tagline: s.description ?? undefined, // backend `description` → client `tagline`
    logo: s.photo_url, // backend `photo_url` → client `logo`
    cover: null, // backend has no cover image → default null
    address: s.address ?? '', // client `address` is required
    phone: s.phone ?? undefined,
    // backend does not expose lat/lng, instagram, working hours, distance, or a
    // live open/closed flag; `is_active` (salon enabled) is the best proxy.
    isOpen: s.is_active,
  }
}

function toService(s: BeService, fallbackCategoryId: number | null): Service {
  const catId = s.category_id ?? fallbackCategoryId
  return {
    id: String(s.id),
    name: s.name,
    categoryId: catId != null ? String(catId) : '', // client `categoryId` required
    durationMin: s.duration_min,
    priceSoum: s.price,
    isActive: s.is_active,
  }
}

function toCategory(c: BeCategory): ServiceCategory {
  return { id: String(c.id), name: c.name, sortOrder: c.sort_order }
}

function toMaster(m: BeMaster): Master {
  return {
    id: String(m.id),
    name: m.name,
    avatar: m.photo_url, // backend `photo_url` → client `avatar`
    specialty: m.specialty ?? '', // client `specialty` required
    isActive: m.is_active,
    // backend has no rating / nextAvailable → omitted (optional on client type)
  }
}

function toAppointment(a: BeAppointment): Appointment {
  const services = a.services.map((s) => ({
    name: s.name,
    durationMin: s.duration_min,
    priceSoum: s.price,
  }))
  // backend has no total duration field → derive from the service snapshot
  const durationMin = services.reduce((n, s) => n + s.durationMin, 0)
  return {
    id: String(a.id),
    salonName, // enriched from cached /salon load (default '')
    masterName: masterNames.get(String(a.master_id)) ?? '', // enriched from cache
    services,
    startAt: a.start_at,
    endAt: a.end_at,
    durationMin,
    priceTotal: a.price_total,
    status: a.status as AppointmentStatus, // backend enum values match client union
    note: a.notes ?? undefined,
    depositAmount: a.deposit_amount,
  }
}

// ── Real API surface ────────────────────────────────────────────
const realApi = {
  async getSalon(): Promise<{
    salon: Salon
    categories: ServiceCategory[]
    services: Service[]
    masters: Master[]
    settings: SalonSettings
  }> {
    const data = await http<BeSalonProfile>('/salon')

    const categories = data.categories.map(toCategory)
    // Backend nests active services under each category; the client wants a flat
    // `services[]` plus a separate `categories[]`.
    const services = data.categories.flatMap((c) => c.services.map((s) => toService(s, c.id)))
    const masters = data.masters.map(toMaster)
    const salon = toSalon(data.salon)

    // Populate the enrichment cache for appointment transforms.
    salonName = salon.name
    masterNames.clear()
    for (const m of masters) masterNames.set(m.id, m.name)

    // The `/salon` response has NO settings block (SalonProfileOut = salon +
    // categories + masters only). Default to no-deposit; `cancelWindowHours`
    // mirrors the backend's typical default. These are display-only hints — the
    // backend enforces the real deposit/cancel rules on write.
    const settings: SalonSettings = {
      depositRequired: false,
      depositAmount: 0,
      cancelWindowHours: 3,
    }

    return { salon, categories, services, masters, settings }
  },

  async getAvailability(params: {
    masterId: string
    serviceIds: string[]
    date: string
  }): Promise<{ slots: AvailabilitySlot[] }> {
    const q = new URLSearchParams({
      master_id: params.masterId, // backend accepts a numeric id or the literal 'any'
      service_ids: params.serviceIds.join(','),
      date: params.date,
    })
    const data = await http<BeAvailability>(`/availability?${q.toString()}`)
    const slots: AvailabilitySlot[] = data.slots.map((s) => ({
      time: isoToHm(s.start_at),
      masterIds: s.master_ids.map(String),
    }))
    return { slots }
  },

  async getMyAppointments(): Promise<{ upcoming: Appointment[]; past: Appointment[] }> {
    const data = await http<BeMyAppointments>('/appointments/my')
    return {
      upcoming: data.upcoming.map(toAppointment),
      past: data.past.map(toAppointment),
    }
  },

  async createAppointment(draft: BookingDraft): Promise<Appointment> {
    // Backend `POST /appointments` requires a concrete integer `master_id`
    // (AppointmentCreate.master_id: int). When the user picked "any", resolve it
    // to a real master free at the chosen slot by reading availability.
    let masterId: number
    if (draft.masterId === 'any') {
      const { slots } = await realApi.getAvailability({
        masterId: 'any',
        serviceIds: draft.serviceIds,
        date: draft.date,
      })
      const slot = slots.find((s) => s.time === draft.time)
      const first = slot?.masterIds?.[0]
      if (!first) throw new ApiError('Bu vaqt uchun bo‘sh usta topilmadi', 409)
      masterId = Number(first)
    } else {
      masterId = Number(draft.masterId)
    }

    const body = {
      master_id: masterId,
      service_ids: draft.serviceIds.map(Number),
      // Compose a tz-aware ISO instant in Tashkent time (+05:00).
      start_at: `${draft.date}T${draft.time}:00+05:00`,
      notes: draft.note ?? null,
    }
    const out = await http<BeAppointmentCreateOut>('/appointments', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return toAppointment(out.appointment)
  },

  async cancelAppointment(id: string): Promise<void> {
    await http(`/appointments/${id}/cancel`, { method: 'POST' })
  },
}

// ── API surface ────────────────────────────────────────────────
export const api = MOCK ? mockApi : realApi
