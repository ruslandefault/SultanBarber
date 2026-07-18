// ============================================================
// TASH admin — mock API layer (preserved escape hatch).
// Enabled when VITE_USE_MOCK === 'true'. See src/lib/api.ts.
// All screens talk to the `api` export in src/lib/api.ts; this
// module provides the in-memory implementation.
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
  Salon,
  Service,
} from '@/types'
import { addMinutes, startOfDay } from '@/lib/format'

// ---------- tiny helpers ----------
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`
const wait = (ms = 220) => new Promise((r) => setTimeout(r, ms))

function at(dayOffset: number, hh: number, mm: number): string {
  const d = startOfDay(new Date())
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}

// full-week default schedule generator
function week(from: string, to: string, offDays: number[] = []): Master['schedule'] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    works: !offDays.includes(weekday),
    from,
    to,
  }))
}

// ---------- seed: salon ----------
const salon: Salon = {
  id: 'salon_1',
  name: 'Sultan Barber',
  address: 'Toshkent, Chilonzor tumani, Bunyodkor ko‘chasi 12',
  phone: '+998 90 123 45 67',
  instagram: '@sultan.barber',
  logoUrl: null,
  coverUrl: null,
  workingHours: Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    open: weekday !== 6,
    from: '09:00',
    to: '21:00',
  })),
  notifications: {
    telegramReminder: true,
    reminderTimings: [24, 2],
    confirmationMessage: true,
  },
  prepayment: {
    required: false,
    kind: 'percent',
    value: 30,
    methods: ['payme', 'click'],
  },
  cancellation: {
    minHoursBefore: 3,
  },
}

// ---------- seed: categories ----------
const categories: Category[] = [
  { id: 'cat_soch', name: 'Soch', order: 0 },
  { id: 'cat_soqol', name: 'Soqol', order: 1 },
  { id: 'cat_kompleks', name: 'Kompleks', order: 2 },
  { id: 'cat_parvarish', name: 'Parvarish', order: 3 },
]

// ---------- seed: services ----------
const services: Service[] = [
  { id: 'srv_1', name: 'Klassik soch olish', categoryId: 'cat_soch', durationMin: 45, price: 80000, active: true, order: 0 },
  { id: 'srv_2', name: 'Mashina bilan olish', categoryId: 'cat_soch', durationMin: 30, price: 50000, active: true, order: 1 },
  { id: 'srv_3', name: 'Bolalar sochi', categoryId: 'cat_soch', durationMin: 30, price: 60000, active: true, order: 2 },
  { id: 'srv_4', name: 'Soqol tuzatish', categoryId: 'cat_soqol', durationMin: 30, price: 45000, active: true, order: 0 },
  { id: 'srv_5', name: 'Ustara bilan soqol', categoryId: 'cat_soqol', durationMin: 45, price: 70000, active: true, order: 1 },
  { id: 'srv_6', name: 'Soch + soqol', categoryId: 'cat_kompleks', durationMin: 75, price: 130000, active: true, order: 0 },
  { id: 'srv_7', name: 'To‘liq parvarish', categoryId: 'cat_kompleks', durationMin: 90, price: 180000, active: true, order: 1 },
  { id: 'srv_8', name: 'Yuz niqobi', categoryId: 'cat_parvarish', durationMin: 30, price: 55000, active: true, order: 0 },
  { id: 'srv_9', name: 'Qosh tuzatish', categoryId: 'cat_parvarish', durationMin: 15, price: 30000, active: false, order: 1 },
]

// ---------- seed: masters ----------
const masters: Master[] = [
  {
    id: 'mst_1',
    name: 'Jasur Karimov',
    specialty: 'Katta usta',
    avatarUrl: null,
    color: '#C9A24B',
    schedule: week('09:00', '21:00', [6]),
    serviceIds: ['srv_1', 'srv_2', 'srv_4', 'srv_5', 'srv_6', 'srv_7'],
  },
  {
    id: 'mst_2',
    name: 'Bekzod Toshev',
    specialty: 'Barber',
    avatarUrl: null,
    color: '#5B8A6A',
    schedule: week('10:00', '20:00', [0]),
    serviceIds: ['srv_1', 'srv_2', 'srv_3', 'srv_4', 'srv_6'],
  },
  {
    id: 'mst_3',
    name: 'Sardor Aliyev',
    specialty: 'Barber',
    avatarUrl: null,
    color: '#C25436',
    schedule: week('09:00', '18:00', [5, 6]),
    serviceIds: ['srv_1', 'srv_2', 'srv_3', 'srv_8'],
  },
  {
    id: 'mst_4',
    name: 'Aziz Yusupov',
    specialty: 'Kichik usta',
    avatarUrl: null,
    color: '#9A948A',
    schedule: week('12:00', '21:00', [3]),
    serviceIds: ['srv_2', 'srv_3', 'srv_4', 'srv_8'],
  },
]

// ---------- seed: client tags ----------
const clientTags: ClientTag[] = [
  { id: 'tag_vip', label: 'VIP' },
  { id: 'tag_doim', label: 'Doimiy' },
  { id: 'tag_yangi', label: 'Yangi' },
  { id: 'tag_naqd', label: 'Naqd to‘lovchi' },
]

// ---------- seed: clients ----------
const clients: Client[] = [
  { id: 'cl_1', name: 'Otabek Rahimov', phone: '+998 90 111 22 33', birthday: '1994-07-22', note: 'Yon tomonni kalta oldiradi.', tagIds: ['tag_doim', 'tag_vip'], createdAt: at(-240, 10, 0) },
  { id: 'cl_2', name: 'Dilshod Ergashev', phone: '+998 91 222 33 44', birthday: '1990-03-15', note: '', tagIds: ['tag_doim'], createdAt: at(-200, 11, 0) },
  { id: 'cl_3', name: 'Sanjar Umarov', phone: '+998 93 333 44 55', birthday: null, note: 'Ustara bilan soqolni yaxshi ko‘radi.', tagIds: ['tag_vip'], createdAt: at(-180, 12, 0) },
  { id: 'cl_4', name: 'Kamron Yodgorov', phone: '+998 94 444 55 66', birthday: '1998-07-25', note: '', tagIds: ['tag_yangi'], createdAt: at(-9, 15, 0) },
  { id: 'cl_5', name: 'Ravshan Nazarov', phone: '+998 95 555 66 77', birthday: '1985-11-02', note: 'Doim naqd to‘laydi.', tagIds: ['tag_doim', 'tag_naqd'], createdAt: at(-150, 9, 0) },
  { id: 'cl_6', name: 'Ulug‘bek Salimov', phone: '+998 97 666 77 88', birthday: '1992-01-30', note: '', tagIds: [], createdAt: at(-120, 16, 0) },
  { id: 'cl_7', name: 'Shohruh Qodirov', phone: '+998 90 777 88 99', birthday: '1996-07-20', note: 'Bolasi bilan keladi.', tagIds: ['tag_doim'], createdAt: at(-100, 14, 0) },
  { id: 'cl_8', name: 'Farrux Islomov', phone: '+998 99 888 99 00', birthday: null, note: '', tagIds: ['tag_yangi'], createdAt: at(-5, 13, 0) },
  { id: 'cl_9', name: 'Jahongir Berdiyev', phone: '+998 88 999 00 11', birthday: '1988-09-12', note: '', tagIds: [], createdAt: at(-300, 10, 0) },
  { id: 'cl_10', name: 'Doston Xolmatov', phone: '+998 90 000 11 22', birthday: '1993-05-18', note: 'Sekin qirqishni so‘raydi.', tagIds: ['tag_doim'], createdAt: at(-90, 17, 0) },
]

// ---------- seed: appointments ----------
// Build a lively "today" plus history for stats.
const appointments: Appointment[] = []

function seedAppt(
  clientId: string,
  masterId: string,
  serviceIds: string[],
  start: string,
  status: AppointmentStatus,
  paid?: boolean,
) {
  const dur = serviceIds.reduce(
    (s, id) => s + (services.find((x) => x.id === id)?.durationMin ?? 0),
    0,
  )
  const total = serviceIds.reduce(
    (s, id) => s + (services.find((x) => x.id === id)?.price ?? 0),
    0,
  )
  appointments.push({
    id: uid('appt'),
    clientId,
    masterId,
    serviceIds,
    start,
    durationMin: dur,
    status,
    note: '',
    payment: paid ? { amount: total, method: 'cash' } : null,
  })
}

// today
seedAppt('cl_1', 'mst_1', ['srv_6'], at(0, 9, 30), 'completed', true)
seedAppt('cl_2', 'mst_1', ['srv_1'], at(0, 11, 0), 'confirmed')
seedAppt('cl_3', 'mst_1', ['srv_5'], at(0, 14, 0), 'booked')
seedAppt('cl_5', 'mst_2', ['srv_1', 'srv_4'], at(0, 10, 0), 'completed', true)
seedAppt('cl_7', 'mst_2', ['srv_3'], at(0, 12, 30), 'confirmed')
seedAppt('cl_6', 'mst_2', ['srv_2'], at(0, 16, 0), 'booked')
seedAppt('cl_9', 'mst_3', ['srv_1'], at(0, 9, 0), 'no_show')
seedAppt('cl_10', 'mst_3', ['srv_8'], at(0, 11, 30), 'confirmed')
seedAppt('cl_4', 'mst_4', ['srv_2'], at(0, 13, 0), 'booked')
seedAppt('cl_8', 'mst_4', ['srv_4'], at(0, 15, 30), 'cancelled')

// tomorrow
seedAppt('cl_1', 'mst_1', ['srv_1'], at(1, 10, 0), 'booked')
seedAppt('cl_5', 'mst_2', ['srv_6'], at(1, 12, 0), 'confirmed')
seedAppt('cl_3', 'mst_1', ['srv_7'], at(1, 15, 0), 'booked')

// history (for client stats) — spread across the past
const historyPlan: Array<[string, string, string[], number]> = [
  ['cl_1', 'mst_1', ['srv_6'], -7],
  ['cl_1', 'mst_1', ['srv_1'], -21],
  ['cl_1', 'mst_1', ['srv_6'], -45],
  ['cl_2', 'mst_2', ['srv_1'], -14],
  ['cl_2', 'mst_1', ['srv_1'], -40],
  ['cl_3', 'mst_1', ['srv_5'], -10],
  ['cl_3', 'mst_1', ['srv_7'], -33],
  ['cl_5', 'mst_2', ['srv_1', 'srv_4'], -12],
  ['cl_5', 'mst_2', ['srv_1'], -30],
  ['cl_7', 'mst_2', ['srv_3'], -18],
  ['cl_9', 'mst_3', ['srv_1'], -95],
  ['cl_9', 'mst_3', ['srv_1'], -140],
  ['cl_10', 'mst_3', ['srv_8'], -22],
  ['cl_6', 'mst_2', ['srv_2'], -60],
]
for (const [c, m, s, off] of historyPlan) {
  seedAppt(c, m, s, at(off, 10 + Math.floor(Math.random() * 6), 0), 'completed', true)
}

// ============================================================
// composition helpers
// ============================================================
function composeView(a: Appointment): AppointmentView {
  const client = clients.find((c) => c.id === a.clientId)!
  const master = masters.find((m) => m.id === a.masterId)!
  const svc = a.serviceIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s))
  const totalPrice = svc.reduce((s, x) => s + x.price, 0)
  return {
    ...a,
    client,
    master,
    services: svc,
    end: addMinutes(a.start, a.durationMin),
    totalPrice,
  }
}

// ============================================================
// public API (async, fetch-swappable)
// ============================================================

export const api = {
  async getSalon(): Promise<Salon> {
    await wait(120)
    return structuredClone(salon)
  },

  async updateSalon(patch: Partial<Salon>): Promise<Salon> {
    await wait(150)
    Object.assign(salon, patch)
    return structuredClone(salon)
  },

  async getCategories(): Promise<Category[]> {
    await wait(100)
    return structuredClone(categories).sort((a, b) => a.order - b.order)
  },

  async getServices(): Promise<Service[]> {
    await wait(120)
    return structuredClone(services).sort((a, b) => a.order - b.order)
  },

  async saveService(input: Omit<Service, 'id' | 'order'> & { id?: string }): Promise<Service> {
    await wait(150)
    if (input.id) {
      const idx = services.findIndex((s) => s.id === input.id)
      services[idx] = { ...services[idx], ...input, id: input.id }
      return structuredClone(services[idx])
    }
    const order = services.filter((s) => s.categoryId === input.categoryId).length
    const created: Service = { ...input, id: uid('srv'), order }
    services.push(created)
    return structuredClone(created)
  },

  async toggleService(id: string, active: boolean): Promise<void> {
    await wait(90)
    const s = services.find((x) => x.id === id)
    if (s) s.active = active
  },

  async getMasters(): Promise<Master[]> {
    await wait(120)
    return structuredClone(masters)
  },

  async saveMaster(input: Omit<Master, 'id'> & { id?: string }): Promise<Master> {
    await wait(160)
    if (input.id) {
      const idx = masters.findIndex((m) => m.id === input.id)
      masters[idx] = { ...masters[idx], ...input, id: input.id }
      return structuredClone(masters[idx])
    }
    const created: Master = { ...input, id: uid('mst') }
    masters.push(created)
    return structuredClone(created)
  },

  async getClients(): Promise<Client[]> {
    await wait(140)
    return structuredClone(clients)
  },

  async getClientTags(): Promise<ClientTag[]> {
    await wait(80)
    return structuredClone(clientTags)
  },

  async saveClient(input: Omit<Client, 'id' | 'createdAt'> & { id?: string }): Promise<Client> {
    await wait(150)
    if (input.id) {
      const idx = clients.findIndex((c) => c.id === input.id)
      clients[idx] = { ...clients[idx], ...input, id: input.id }
      return structuredClone(clients[idx])
    }
    const created: Client = {
      ...input,
      id: uid('cl'),
      createdAt: new Date().toISOString(),
    }
    clients.push(created)
    return structuredClone(created)
  },

  async getClientStats(clientId: string): Promise<ClientStats> {
    await wait(100)
    const done = appointments.filter(
      (a) => a.clientId === clientId && a.status === 'completed',
    )
    const totalSpent = done.reduce(
      (s, a) => s + (a.payment?.amount ?? composeView(a).totalPrice),
      0,
    )
    const sorted = [...done].sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
    )
    return {
      visits: done.length,
      totalSpent,
      averageCheck: done.length ? Math.round(totalSpent / done.length) : 0,
      lastVisit: sorted[0]?.start ?? null,
    }
  },

  async getClientHistory(clientId: string): Promise<AppointmentView[]> {
    await wait(120)
    return appointments
      .filter((a) => a.clientId === clientId)
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
      .map(composeView)
  },

  // all appointments overlapping [dayStart, dayEnd)
  async getAppointments(rangeStart: Date, rangeEnd: Date): Promise<AppointmentView[]> {
    await wait(160)
    const s = rangeStart.getTime()
    const e = rangeEnd.getTime()
    return appointments
      .filter((a) => {
        const t = new Date(a.start).getTime()
        return t >= s && t < e
      })
      .map(composeView)
  },

  // returns true when the [start, start+dur) slot for masterId is free
  async isSlotFree(
    masterId: string,
    start: string,
    durationMin: number,
    ignoreId?: string,
  ): Promise<boolean> {
    await wait(60)
    const s = new Date(start).getTime()
    const e = s + durationMin * 60000
    return !appointments.some((a) => {
      if (a.id === ignoreId) return false
      if (a.masterId !== masterId) return false
      if (a.status === 'cancelled') return false
      const as = new Date(a.start).getTime()
      const ae = as + a.durationMin * 60000
      return s < ae && as < e
    })
  },

  async saveAppointment(
    input: Omit<Appointment, 'id'> & { id?: string },
  ): Promise<AppointmentView> {
    await wait(180)
    if (input.id) {
      const idx = appointments.findIndex((a) => a.id === input.id)
      appointments[idx] = { ...appointments[idx], ...input, id: input.id }
      return composeView(appointments[idx])
    }
    const created: Appointment = { ...input, id: uid('appt') }
    appointments.push(created)
    return composeView(created)
  },

  async cancelAppointment(id: string): Promise<void> {
    await wait(140)
    const a = appointments.find((x) => x.id === id)
    if (a) a.status = 'cancelled'
  },
}
