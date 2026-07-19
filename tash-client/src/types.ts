/** Domain types — mirror the backend MVP schema (B2). */

export type AppointmentStatus =
  | 'booked' // Band qilindi
  | 'confirmed' // Tasdiqlandi
  | 'completed' // Bajarildi
  | 'no_show' // Kelmadi
  | 'cancelled' // Bekor qilindi

export interface Salon {
  id: string
  name: string
  tagline?: string
  logo?: string | null
  cover?: string | null
  address: string
  lat?: number
  lng?: number
  phone?: string
  instagram?: string
  isOpen: boolean
  workingToday?: string // "10:00–21:00"
  distanceKm?: number
  weeklyHours?: { day: string; hours: string; dayOff?: boolean }[]
}

export interface Master {
  id: string
  name: string
  avatar?: string | null
  specialty: string
  rating?: number
  isActive: boolean
  nextAvailable?: string
  serviceIds?: string[] // which services this master performs
}

export interface ServiceCategory {
  id: string
  name: string
  sortOrder: number
}

export interface Service {
  id: string
  name: string
  categoryId: string
  durationMin: number
  priceSoum: number
  isActive: boolean
}

export interface Product {
  id: string
  title: string
  description?: string
  priceSoum: number
  imageUrl?: string | null
}

export interface SalonSettings {
  depositRequired: boolean
  depositAmount: number // integer so'm (already resolved from fixed/percent)
  cancelWindowHours: number
}

export interface AvailabilitySlot {
  time: string // "14:30"
  masterIds?: string[] // for "any" master — who is free at this slot
}

export interface BookingDraft {
  serviceIds: string[]
  masterId: string // master id or 'any'
  date: string // "2026-07-20"
  time: string // "14:30"
  note?: string
}

export interface Appointment {
  id: string
  salonName: string
  masterName: string
  services: { name: string; durationMin: number; priceSoum: number }[]
  startAt: string // ISO tz-aware
  endAt: string
  durationMin: number
  priceTotal: number
  status: AppointmentStatus
  note?: string
  depositAmount?: number | null
}
