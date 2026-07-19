// ============================================================
// TASH admin — real API layer.
// Bridges the admin (frontend) contract [string ids, camelCase,
// composed view models] to the live FastAPI backend [int ids,
// snake_case]. Screens import ONLY the `api` export from here; the
// method signatures + return shapes are identical to the mock so no
// screen changes are required.
//
// Escape hatch: set VITE_USE_MOCK=true to use the in-memory mock
// (src/lib/api.mock.ts) instead of the backend.
//
// ---- Known backend contract gaps (filled with sane defaults) ----
//  * Salon-level workingHours: backend has NO salon-level schedule
//    (only per-master). Defaulted to Mon–Sat 09:00–21:00, Sun closed.
//    updateSalon cannot persist these (no endpoint) — UI value only.
//  * Salon name/address/phone: no admin salon-profile update endpoint;
//    read from public GET /salon, but updateSalon cannot persist them.
//  * Salon.instagram / coverUrl: no backend field -> '' / null.
//  * Prepayment methods (payme/click/cash): SettingsOut has no such
//    field -> defaulted to ['payme','click']; updateSalon ignores it.
//  * Master.color: no backend field -> deterministic palette by id.
//  * Master.schedule + serviceIds via GET /admin/masters (list) are
//    unavailable (the /admin/masters/{id} detail endpoint currently
//    500s on the backend), so getMasters() returns a DEFAULT schedule
//    and EMPTY serviceIds. saveMaster still PERSISTS both server-side
//    (via PUT master + PUT working-hours); they just cannot be read
//    back until the detail endpoint is fixed.
//  * Client.tagIds + tags: backend has no tag concept -> [] / [].
//  * Client.createdAt: not exposed by ClientOut -> '' (renders as —).
//  * Appointment.payment: not exposed on appointment reads -> null.
//  * ClientStats / ClientHistory: intended source is the client-detail
//    endpoint, which currently 500s on the backend; getClientStats /
//    getClientHistory attempt it and fall back to empty on failure.
// ============================================================

import type {
  Appointment,
  AppointmentStatus,
  AppointmentView,
  Category,
  Client,
  ClientStats,
  ClientTag,
  Master,
  MasterSchedule,
  PaymentMethod,
  Product,
  Salon,
  Service,
  WorkingHours,
} from '@/types'
import { http, ApiError } from '@/lib/http'
import { toYmd } from '@/lib/format'
import { api as mockApi } from '@/lib/api.mock'

// ============================================================
// backend (snake_case) response shapes
// ============================================================
interface BServiceOut {
  id: number
  category_id: number | null
  name: string
  duration_min: number
  price: number
  sort_order: number
  is_active: boolean
}
interface BProductOut {
  id: number
  title: string
  description: string | null
  price: number
  image_url: string | null
  sort_order: number
  is_active: boolean
}
interface BCategoryOut {
  id: number
  name: string
  sort_order: number
  is_active: boolean
  services?: BServiceOut[]
}
interface BMasterOut {
  id: number
  name: string
  specialty: string | null
  photo_url: string | null
  bio: string | null
  sort_order: number
  is_active: boolean
}
interface BWorkingHour {
  weekday: number
  start_time: string | null
  end_time: string | null
  is_day_off: boolean
}
interface BMasterDetailOut extends BMasterOut {
  working_hours: BWorkingHour[]
  service_ids: number[]
}
interface BSalonOut {
  id: number
  name: string
  description: string | null
  address: string | null
  phone: string | null
  instagram: string | null
  photo_url: string | null
  cover_url: string | null
  timezone: string
  is_active: boolean
  working_hours: { weekday: number; open: boolean; from: string; to: string }[] | null
}
interface BSalonProfileOut {
  salon: BSalonOut
  categories: BCategoryOut[]
  masters: BMasterOut[]
}
interface BSettingsOut {
  reminder_telegram: boolean
  reminder_offsets: number[]
  confirmation_msg: boolean
  deposit_required: boolean
  deposit_type: string
  deposit_value: number
  cancel_window_hours: number
}
interface BClientOut {
  id: number
  telegram_id: number | null
  full_name: string
  phone: string | null
  username: string | null
  birthday: string | null
  notes: string | null
}
interface BClientStats {
  total_visits: number
  total_spend: number
  avg_check: number
  last_visit_at: string | null
}
interface BApptServiceOut {
  service_id: number
  name: string
  price: number
  duration_min: number
}
interface BAdminAppointmentOut {
  id: number
  salon_id: number
  master_id: number
  client_id: number
  status: string
  created_via: string
  start_at: string
  end_at: string
  price_total: number
  deposit_amount: number | null
  notes: string | null
  services: BApptServiceOut[]
}
interface BJournalOut {
  view: string
  date_from: string
  date_to: string
  appointments: BAdminAppointmentOut[]
}
interface BClientDetailOut extends BClientOut {
  stats: BClientStats
  history: BAdminAppointmentOut[]
}

// ============================================================
// helpers
// ============================================================
const toInt = (id: string): number => Number.parseInt(id, 10)

// Deterministic accent color for a master column (no backend field).
const MASTER_COLORS = ['#C9A24B', '#5B8A6A', '#C25436', '#9A948A', '#a8674f', '#26292e']
const masterColor = (id: number): string => MASTER_COLORS[id % MASTER_COLORS.length]

// Default per-master weekly schedule (backend detail endpoint unavailable).
function defaultSchedule(): MasterSchedule[] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    works: weekday !== 6, // Sunday off
    from: '09:00',
    to: '21:00',
  }))
}

// Default salon-level working hours (no backend salon schedule).
function defaultWorkingHours(): WorkingHours[] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    open: weekday !== 6,
    from: '09:00',
    to: '21:00',
  }))
}

// Swallow the backend's known 500 on master write responses (the row
// commits fine; only the response serialization fails). Re-throw
// anything else so genuine validation/auth errors still surface.
function isBackend500(err: unknown): boolean {
  return err instanceof ApiError && err.status === 500
}

// ---- mappers: backend -> admin ----
function mapService(s: BServiceOut): Service {
  return {
    id: String(s.id),
    name: s.name,
    categoryId: s.category_id != null ? String(s.category_id) : '',
    durationMin: s.duration_min,
    price: s.price,
    active: s.is_active,
    order: s.sort_order,
  }
}

function mapProduct(p: BProductOut): Product {
  return {
    id: String(p.id),
    title: p.title,
    description: p.description ?? '',
    price: p.price,
    imageUrl: p.image_url,
    order: p.sort_order,
    active: p.is_active,
  }
}

function mapCategory(c: BCategoryOut): Category {
  return { id: String(c.id), name: c.name, order: c.sort_order }
}

function mapMaster(m: BMasterOut): Master {
  return {
    id: String(m.id),
    name: m.name,
    specialty: m.specialty ?? '',
    avatarUrl: m.photo_url,
    color: masterColor(m.id),
    isActive: m.is_active,
    schedule: defaultSchedule(), // fallback if detail fetch fails
    serviceIds: [],
  }
}

function mapMasterDetail(d: BMasterDetailOut): Master {
  const schedule = Array.from({ length: 7 }, (_, wd) => {
    const wh = d.working_hours.find((w) => w.weekday === wd)
    return {
      weekday: wd,
      works: wh ? !wh.is_day_off : false,
      from: wh?.start_time?.slice(0, 5) ?? '09:00',
      to: wh?.end_time?.slice(0, 5) ?? '21:00',
    }
  })
  return {
    id: String(d.id),
    name: d.name,
    specialty: d.specialty ?? '',
    avatarUrl: d.photo_url,
    color: masterColor(d.id),
    isActive: d.is_active,
    schedule,
    serviceIds: d.service_ids.map(String),
  }
}

function mapClient(c: BClientOut): Client {
  return {
    id: String(c.id),
    name: c.full_name,
    phone: c.phone ?? '',
    birthday: c.birthday ?? null,
    note: c.notes ?? '',
    tagIds: [], // gap: no backend tag concept
    createdAt: '', // gap: not exposed by ClientOut (renders as —)
  }
}

function mapAppointment(a: BAdminAppointmentOut): Appointment {
  const durationMin = Math.round(
    (new Date(a.end_at).getTime() - new Date(a.start_at).getTime()) / 60000,
  )
  return {
    id: String(a.id),
    clientId: String(a.client_id),
    masterId: String(a.master_id),
    serviceIds: a.services.map((s) => String(s.service_id)),
    start: a.start_at,
    durationMin,
    status: a.status as AppointmentStatus,
    note: a.notes ?? '',
    payment: null, // gap: payment not exposed on appointment reads
  }
}

function snapshotService(s: BApptServiceOut): Service {
  return {
    id: String(s.service_id),
    name: s.name,
    categoryId: '',
    durationMin: s.duration_min,
    price: s.price,
    active: true,
    order: 0,
  }
}

function fallbackClient(id: string): Client {
  return { id, name: 'Nomaʼlum mijoz', phone: '', birthday: null, note: '', tagIds: [], createdAt: '' }
}

function fallbackMaster(id: string): Master {
  return {
    id,
    name: 'Usta',
    specialty: '',
    avatarUrl: null,
    color: masterColor(Number(id) || 0),
    schedule: defaultSchedule(),
    serviceIds: [],
    isActive: true,
  }
}

function composeView(
  a: BAdminAppointmentOut,
  masterMap: Map<string, Master>,
  clientMap: Map<string, Client>,
  serviceMap: Map<string, Service>,
): AppointmentView {
  const base = mapAppointment(a)
  const client = clientMap.get(base.clientId) ?? fallbackClient(base.clientId)
  const master = masterMap.get(base.masterId) ?? fallbackMaster(base.masterId)
  const services = a.services.map(
    (s) => serviceMap.get(String(s.service_id)) ?? snapshotService(s),
  )
  return {
    ...base,
    client,
    master,
    services,
    end: a.end_at,
    totalPrice: a.price_total,
  }
}

// ============================================================
// real API implementation
// ============================================================
const realApi = {
  // ---- salon + settings ----
  async getSalon(): Promise<Salon> {
    const [profile, settings] = await Promise.all([
      http.get<BSalonProfileOut>('/salon'),
      http.get<BSettingsOut>('/admin/settings'),
    ])
    const s = profile.salon
    return {
      id: String(s.id),
      name: s.name,
      address: s.address ?? '',
      phone: s.phone ?? '',
      instagram: s.instagram ?? '',
      logoUrl: s.photo_url,
      coverUrl: s.cover_url,
      workingHours:
        s.working_hours && s.working_hours.length > 0
          ? s.working_hours.map((w) => ({
              weekday: w.weekday,
              open: w.open,
              from: w.from,
              to: w.to,
            }))
          : defaultWorkingHours(),
      notifications: {
        telegramReminder: settings.reminder_telegram,
        // minutes → hours (keep fractions so 30 min = 0.5 survives the round-trip)
        reminderTimings: settings.reminder_offsets.map((m) => m / 60),
        confirmationMessage: settings.confirmation_msg,
      },
      prepayment: {
        required: settings.deposit_required,
        kind: settings.deposit_type === 'percent' ? 'percent' : 'amount',
        value: settings.deposit_value,
        methods: ['payme', 'click'] as PaymentMethod[], // gap: no backend field
      },
      cancellation: { minHoursBefore: settings.cancel_window_hours },
    }
  },

  async updateSalon(patch: Partial<Salon>): Promise<Salon> {
    // Settings (notifications / prepayment / cancellation) → PUT /admin/settings
    const body: Record<string, unknown> = {}
    if (patch.notifications) {
      body.reminder_telegram = patch.notifications.telegramReminder
      body.reminder_offsets = patch.notifications.reminderTimings.map((h) => h * 60)
      body.confirmation_msg = patch.notifications.confirmationMessage
    }
    if (patch.prepayment) {
      body.deposit_required = patch.prepayment.required
      body.deposit_type = patch.prepayment.kind === 'percent' ? 'percent' : 'fixed'
      body.deposit_value = patch.prepayment.value
    }
    if (patch.cancellation) {
      body.cancel_window_hours = patch.cancellation.minHoursBefore
    }
    if (Object.keys(body).length > 0) {
      await http.put<BSettingsOut>('/admin/settings', body)
    }

    // Salon profile (name/address/phone/instagram) + working hours → PUT /admin/salon
    const salonBody: Record<string, unknown> = {}
    if (patch.name !== undefined) salonBody.name = patch.name
    if (patch.address !== undefined) salonBody.address = patch.address
    if (patch.phone !== undefined) salonBody.phone = patch.phone
    if (patch.instagram !== undefined) salonBody.instagram = patch.instagram
    if (patch.logoUrl !== undefined) salonBody.photo_url = patch.logoUrl
    if (patch.coverUrl !== undefined) salonBody.cover_url = patch.coverUrl
    if (patch.workingHours !== undefined) {
      salonBody.working_hours = patch.workingHours.map((w) => ({
        weekday: w.weekday,
        open: w.open,
        from: w.from,
        to: w.to,
      }))
    }
    if (Object.keys(salonBody).length > 0) {
      await http.put<BSalonOut>('/admin/salon', salonBody)
    }

    return this.getSalon()
  },

  // ---- categories ----
  async getCategories(): Promise<Category[]> {
    const rows = await http.get<BCategoryOut[]>('/admin/categories')
    return rows.map(mapCategory).sort((a, b) => a.order - b.order)
  },

  // ---- services ----
  async getServices(): Promise<Service[]> {
    const rows = await http.get<BServiceOut[]>('/admin/services')
    return rows.map(mapService).sort((a, b) => a.order - b.order)
  },

  async saveService(
    input: Omit<Service, 'id' | 'order'> & { id?: string },
  ): Promise<Service> {
    if (input.id) {
      const resp = await http.put<BServiceOut>(`/admin/services/${input.id}`, {
        category_id: toInt(input.categoryId),
        name: input.name,
        duration_min: input.durationMin,
        price: input.price,
        is_active: input.active,
      })
      return mapService(resp)
    }
    let resp = await http.post<BServiceOut>('/admin/services', {
      category_id: toInt(input.categoryId),
      name: input.name,
      duration_min: input.durationMin,
      price: input.price,
    })
    // ServiceCreate has no is_active (defaults true); apply if needed.
    if (!input.active) {
      resp = await http.put<BServiceOut>(`/admin/services/${resp.id}`, {
        is_active: false,
      })
    }
    return mapService(resp)
  },

  async toggleService(id: string, active: boolean): Promise<void> {
    await http.put<BServiceOut>(`/admin/services/${id}`, { is_active: active })
  },

  // ---- products ----
  async getProducts(): Promise<Product[]> {
    const rows = await http.get<BProductOut[]>('/admin/products')
    return rows.map(mapProduct)
  },

  async saveProduct(
    input: Omit<Product, 'id' | 'active'> & { id?: string; active?: boolean },
  ): Promise<Product> {
    const body = {
      title: input.title,
      description: input.description || null,
      price: input.price,
      image_url: input.imageUrl,
      sort_order: input.order,
      ...(input.active !== undefined ? { is_active: input.active } : {}),
    }
    const out = input.id
      ? await http.put<BProductOut>(`/admin/products/${input.id}`, body)
      : await http.post<BProductOut>('/admin/products', body)
    return mapProduct(out)
  },

  async toggleProduct(id: string, active: boolean): Promise<void> {
    await http.put<BProductOut>(`/admin/products/${id}`, { is_active: active })
  },

  async deleteProduct(id: string): Promise<void> {
    await http.del(`/admin/products/${id}`)
  },

  async uploadImage(file: File): Promise<string> {
    const form = new FormData()
    form.append('file', file)
    const out = await http.upload<{ url: string }>('/admin/upload', form)
    return out.url
  },

  // ---- masters ----
  async getMasters(): Promise<Master[]> {
    // Return ALL masters (active + inactive) with real schedule/serviceIds from
    // the detail endpoint. Callers that only want active ones (journal columns,
    // booking) filter by `isActive` themselves.
    const rows = await http.get<BMasterOut[]>('/admin/masters')
    const details = await Promise.all(
      rows.map(async (m) => {
        try {
          return await http.get<BMasterDetailOut>(`/admin/masters/${m.id}`)
        } catch {
          return null
        }
      }),
    )
    return rows.map((m, i) => (details[i] ? mapMasterDetail(details[i]!) : mapMaster(m)))
  },

  async deleteMaster(id: string): Promise<void> {
    await http.del(`/admin/masters/${id}`)
  },

  async setMasterActive(id: string, active: boolean): Promise<void> {
    // The backend update response serializes fine now; is_active is a MasterUpdate field.
    await http.put<BMasterDetailOut>(`/admin/masters/${id}`, { is_active: active })
  },

  async saveMaster(input: Omit<Master, 'id' | 'isActive'> & { id?: string }): Promise<Master> {
    const workingHours = input.schedule.map((d) => ({
      weekday: d.weekday,
      start_time: d.from,
      end_time: d.to,
      is_day_off: !d.works,
    }))
    const masterBody = {
      name: input.name,
      specialty: input.specialty || null,
      photo_url: input.avatarUrl,
      service_ids: input.serviceIds.map(toInt),
    }

    let id: string
    if (input.id) {
      // The write commits server-side; the response serialization 500s
      // (backend bug) — swallow that specific error.
      try {
        await http.put<BMasterOut>(`/admin/masters/${input.id}`, masterBody)
      } catch (err) {
        if (!isBackend500(err)) throw err
      }
      id = input.id
    } else {
      const before = await http.get<BMasterOut[]>('/admin/masters')
      const beforeIds = new Set(before.map((m) => m.id))
      try {
        await http.post<BMasterOut>('/admin/masters', masterBody)
      } catch (err) {
        if (!isBackend500(err)) throw err
      }
      const after = await http.get<BMasterOut[]>('/admin/masters')
      const created = after.find((m) => !beforeIds.has(m.id))
      if (!created) throw new ApiError('Usta yaratilmadi', 500, 'master_create_failed')
      id = String(created.id)
    }

    try {
      await http.put<BMasterOut>(`/admin/masters/${id}/working-hours`, workingHours)
    } catch (err) {
      if (!isBackend500(err)) throw err
    }

    // Compose the return from the input (the backend can't echo schedule /
    // serviceIds via a working response) so the editor reflects the save.
    return {
      id,
      name: input.name,
      specialty: input.specialty,
      avatarUrl: input.avatarUrl,
      color: input.color,
      schedule: input.schedule,
      serviceIds: input.serviceIds,
      isActive: true,
    }
  },

  // ---- clients ----
  async getClients(): Promise<Client[]> {
    const rows = await http.get<BClientOut[]>('/admin/clients')
    return rows.map(mapClient)
  },

  async getClientTags(): Promise<ClientTag[]> {
    // gap: backend has no tag concept.
    return []
  },

  async saveClient(
    input: Omit<Client, 'id' | 'createdAt'> & { id?: string },
  ): Promise<Client> {
    const body = {
      full_name: input.name,
      phone: input.phone || null,
      birthday: input.birthday,
      notes: input.note || null,
    }
    const resp = input.id
      ? await http.put<BClientOut>(`/admin/clients/${input.id}`, body)
      : await http.post<BClientOut>('/admin/clients', body)
    return mapClient(resp)
  },

  async getClientStats(clientId: string): Promise<ClientStats> {
    // Intended source is the client-detail endpoint (currently 500s on
    // the backend); fall back to empty stats on any failure.
    try {
      const d = await http.get<BClientDetailOut>(`/admin/clients/${clientId}`)
      return {
        visits: d.stats.total_visits,
        totalSpent: d.stats.total_spend,
        averageCheck: d.stats.avg_check,
        lastVisit: d.stats.last_visit_at ?? null,
      }
    } catch {
      return { visits: 0, totalSpent: 0, averageCheck: 0, lastVisit: null }
    }
  },

  async getClientHistory(clientId: string): Promise<AppointmentView[]> {
    try {
      const [d, masters, clients, services] = await Promise.all([
        http.get<BClientDetailOut>(`/admin/clients/${clientId}`),
        this.getMasters(),
        this.getClients(),
        this.getServices(),
      ])
      const masterMap = new Map(masters.map((m) => [m.id, m]))
      const clientMap = new Map(clients.map((c) => [c.id, c]))
      const serviceMap = new Map(services.map((s) => [s.id, s]))
      return d.history.map((a) => composeView(a, masterMap, clientMap, serviceMap))
    } catch {
      return []
    }
  },

  // ---- appointments ----
  async getAppointments(rangeStart: Date, rangeEnd: Date): Promise<AppointmentView[]> {
    const days = Math.round(
      (rangeEnd.getTime() - rangeStart.getTime()) / 86400000,
    )
    const view = days > 1 ? 'week' : 'day'
    const date = toYmd(rangeStart)

    const [journal, masters, clients, services] = await Promise.all([
      http.get<BJournalOut>(`/admin/appointments?date=${date}&view=${view}`),
      this.getMasters(),
      this.getClients(),
      this.getServices(),
    ])
    const masterMap = new Map(masters.map((m) => [m.id, m]))
    const clientMap = new Map(clients.map((c) => [c.id, c]))
    const serviceMap = new Map(services.map((s) => [s.id, s]))

    const s = rangeStart.getTime()
    const e = rangeEnd.getTime()
    return journal.appointments
      .filter((a) => {
        const t = new Date(a.start_at).getTime()
        return t >= s && t < e
      })
      .map((a) => composeView(a, masterMap, clientMap, serviceMap))
  },

  async isSlotFree(
    masterId: string,
    start: string,
    durationMin: number,
    ignoreId?: string,
  ): Promise<boolean> {
    // Check overlap against the master's real journal for that day.
    try {
      const date = toYmd(new Date(start))
      const journal = await http.get<BJournalOut>(
        `/admin/appointments?date=${date}&view=day&master_id=${toInt(masterId)}`,
      )
      const s = new Date(start).getTime()
      const e = s + durationMin * 60000
      return !journal.appointments.some((a) => {
        if (String(a.id) === ignoreId) return false
        if (a.status === 'cancelled') return false
        const as = new Date(a.start_at).getTime()
        const ae = new Date(a.end_at).getTime()
        return s < ae && as < e
      })
    } catch {
      // If the check fails, don't block; the save call is the real guard.
      return true
    }
  },

  async saveAppointment(
    input: Omit<Appointment, 'id'> & { id?: string },
  ): Promise<AppointmentView> {
    const serviceIds = input.serviceIds.map(toInt)
    let result: BAdminAppointmentOut

    if (input.id) {
      // Look up current status (from the day's journal) to avoid
      // double-recording a payment when re-saving a completed booking.
      let currentStatus: string | undefined
      try {
        const date = toYmd(new Date(input.start))
        const j = await http.get<BJournalOut>(
          `/admin/appointments?date=${date}&view=day`,
        )
        currentStatus = j.appointments.find((a) => String(a.id) === input.id)?.status
      } catch {
        currentStatus = undefined
      }

      result = await http.put<BAdminAppointmentOut>(
        `/admin/appointments/${input.id}`,
        {
          master_id: toInt(input.masterId),
          service_ids: serviceIds,
          start_at: input.start,
          notes: input.note || null,
        },
      )

      if (input.status !== (currentStatus ?? result.status)) {
        const recordPayment =
          input.status === 'completed' &&
          currentStatus !== 'completed' &&
          input.payment != null
        result = await applyStatus(input.id, input.status, recordPayment ? input.payment : null)
      }
    } else {
      const created = await http.post<BAdminAppointmentOut>('/admin/appointments', {
        master_id: toInt(input.masterId),
        client_id: toInt(input.clientId),
        service_ids: serviceIds,
        start_at: input.start,
        notes: input.note || null,
      })
      result = created
      if (input.status !== created.status) {
        const recordPayment = input.status === 'completed' && input.payment != null
        result = await applyStatus(
          String(created.id),
          input.status,
          recordPayment ? input.payment : null,
        )
      }
    }

    // Compose the returned view (join master/client/service data).
    const [masters, clients, services] = await Promise.all([
      this.getMasters(),
      this.getClients(),
      this.getServices(),
    ])
    return composeView(
      result,
      new Map(masters.map((m) => [m.id, m])),
      new Map(clients.map((c) => [c.id, c])),
      new Map(services.map((s) => [s.id, s])),
    )
  },

  async deleteAppointment(id: string): Promise<void> {
    await http.del(`/admin/appointments/${id}`)
  },
}

async function applyStatus(
  id: string,
  status: AppointmentStatus,
  payment: Appointment['payment'],
): Promise<BAdminAppointmentOut> {
  const body: Record<string, unknown> = { status }
  if (status === 'completed' && payment) {
    body.payment_amount = payment.amount
    body.payment_method = payment.method
  }
  return http.post<BAdminAppointmentOut>(`/admin/appointments/${id}/status`, body)
}

// ============================================================
// export — real backend by default, mock behind VITE_USE_MOCK
// ============================================================
const useMock = import.meta.env.VITE_USE_MOCK === 'true'

export const api = useMock ? mockApi : realApi
