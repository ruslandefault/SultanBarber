import type { AppointmentStatus } from '@/types'

const THIN_SPACE = ' '

// 120000 -> "120 000" (thin-space grouping)
export function formatSom(value: number): string {
  const sign = value < 0 ? '-' : ''
  const digits = Math.abs(Math.round(value)).toString()
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE)
  return `${sign}${grouped}`
}

// full price label with unit
export function formatMoney(value: number): string {
  return `${formatSom(value)}${THIN_SPACE}so'm`
}

// "09:30"
export function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

// "45 daq" / "1 soat 15 daq"
export function formatDuration(min: number): string {
  if (min < 60) return `${min} daq`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} soat` : `${h} soat ${m} daq`
}

const MONTHS_UZ = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
]

const WEEKDAYS_UZ = [
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
  'Yakshanba',
]

const WEEKDAYS_SHORT_UZ = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya']

export function weekdayName(weekday: number): string {
  return WEEKDAYS_UZ[weekday] ?? ''
}

export function weekdayShort(weekday: number): string {
  return WEEKDAYS_SHORT_UZ[weekday] ?? ''
}

// JS getDay() is 0=Sun..6=Sat -> convert to 0=Mon..6=Sun
export function isoWeekday(date: Date): number {
  return (date.getDay() + 6) % 7
}

// "18 iyul, Juma"
export function formatDateLong(date: Date): string {
  return `${date.getDate()} ${MONTHS_UZ[date.getMonth()]}, ${
    WEEKDAYS_UZ[isoWeekday(date)]
  }`
}

// "18 iyul"
export function formatDateShort(dateOrIso: Date | string): string {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso
  return `${d.getDate()} ${MONTHS_UZ[d.getMonth()]}`
}

// "18.07.2026"
export function formatDateDot(dateOrIso: Date | string | null): string {
  if (!dateOrIso) return '—'
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

// "3 kun oldin", "Bugun", "2 hafta oldin"
export function relativeDays(iso: string | null): string {
  if (!iso) return 'Hali tashrif yo‘q'
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor(
    (startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000,
  )
  if (days === 0) return 'Bugun'
  if (days === 1) return 'Kecha'
  if (days < 7) return `${days} kun oldin`
  if (days < 30) return `${Math.floor(days / 7)} hafta oldin`
  if (days < 365) return `${Math.floor(days / 30)} oy oldin`
  return `${Math.floor(days / 365)} yil oldin`
}

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function addMinutes(iso: string, min: number): string {
  return new Date(new Date(iso).getTime() + min * 60000).toISOString()
}

// minutes since midnight for a given iso datetime (local)
export function minutesOfDay(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

// build an ISO datetime from a local date + "HH:mm"
export function combineDateTime(dateYmd: string, hhmm: string): string {
  const [y, m, d] = dateYmd.split('-').map(Number)
  const [hh, mm] = hhmm.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString()
}

// "2026-07-18" (local)
export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`
}

export function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

// ---- status metadata ----

export interface StatusMeta {
  label: string
  // tailwind-ish token name used by components
  token: 'stone' | 'brass' | 'sage' | 'clay' | 'clay-muted'
}

export const STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  booked: { label: 'Band qilindi', token: 'stone' },
  confirmed: { label: 'Tasdiqlandi', token: 'brass' },
  completed: { label: 'Bajarildi', token: 'sage' },
  no_show: { label: 'Kelmadi', token: 'clay' },
  cancelled: { label: 'Bekor qilindi', token: 'clay-muted' },
}

export const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Naqd',
  payme: 'Payme',
  click: 'Click',
}

export function monogram(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
