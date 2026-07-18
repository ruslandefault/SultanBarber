/** Money is stored as integer so'm. Format with thin spaces: 120000 → "120 000 so'm". */
export function formatSoum(amount: number, withUnit = true): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') // thin space
  return withUnit ? `${grouped} so'm` : grouped
}

/** Duration in minutes → "45 daq" / "1 soat 30 daq". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} daq`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} soat` : `${h} soat ${m} daq`
}

/** ISO / Date → "14:30" in Asia/Tashkent. */
export function formatTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tashkent',
  }).format(d)
}

/** Local Date → "2026-07-20" key. */
export function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "2026-07-20" → "Dush", "Chor"... short weekday. */
export function weekdayShort(d: Date): string {
  return new Intl.DateTimeFormat('uz-UZ', { weekday: 'short' }).format(d)
}

/** ISO/Date → "20-iyul, dushanba". */
export function formatDateLong(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('uz-UZ', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    timeZone: 'Asia/Tashkent',
  }).format(d)
}

/** Next `n` days starting today (local). */
export function nextDays(n: number): Date[] {
  const out: Date[] = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = 0; i < n; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    out.push(d)
  }
  return out
}
