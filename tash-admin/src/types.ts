// ============================================================
// TASH admin — domain types (mirror backend MVP schema)
// Money is always integer so'm.
// ============================================================

export type AppointmentStatus =
  | 'booked'
  | 'confirmed'
  | 'completed'
  | 'no_show'
  | 'cancelled'

export type PaymentMethod = 'cash' | 'payme' | 'click'

export interface Salon {
  id: string
  name: string
  address: string
  phone: string
  instagram: string
  logoUrl: string | null
  coverUrl: string | null
  // working hours per weekday (0 = Monday ... 6 = Sunday)
  workingHours: WorkingHours[]
  notifications: NotificationSettings
  prepayment: PrepaymentSettings
  cancellation: CancellationSettings
}

export interface WorkingHours {
  // 0 = Dushanba (Mon) ... 6 = Yakshanba (Sun)
  weekday: number
  open: boolean
  from: string // "09:00"
  to: string // "21:00"
}

export interface NotificationSettings {
  telegramReminder: boolean
  reminderTimings: number[] // hours before, e.g. [24, 2]
  confirmationMessage: boolean
}

export interface PrepaymentSettings {
  required: boolean
  kind: 'amount' | 'percent'
  value: number // so'm or percent
  methods: PaymentMethod[]
}

export interface CancellationSettings {
  minHoursBefore: number
}

export interface Category {
  id: string
  name: string
  order: number
}

export interface Service {
  id: string
  name: string
  categoryId: string
  durationMin: number
  price: number // so'm
  active: boolean
  order: number
}

export interface MasterSchedule {
  weekday: number // 0..6
  works: boolean
  from: string
  to: string
}

export interface Master {
  id: string
  name: string
  specialty: string
  avatarUrl: string | null
  color: string // accent used in the journal column
  schedule: MasterSchedule[]
  serviceIds: string[]
}

export interface ClientTag {
  id: string
  label: string
}

export interface Client {
  id: string
  name: string
  phone: string
  birthday: string | null // ISO date "1996-04-12"
  note: string
  tagIds: string[]
  createdAt: string
}

export interface Payment {
  amount: number
  method: PaymentMethod
}

export interface Appointment {
  id: string
  clientId: string
  masterId: string
  serviceIds: string[]
  // ISO datetime of the start
  start: string
  // minutes (sum of service durations, may be overridden)
  durationMin: number
  status: AppointmentStatus
  note: string
  payment: Payment | null
}

// ---- derived view models (composed in the API layer) ----

export interface AppointmentView extends Appointment {
  client: Client
  master: Master
  services: Service[]
  end: string
  totalPrice: number
}

export interface ClientStats {
  visits: number
  totalSpent: number
  averageCheck: number
  lastVisit: string | null
}
