import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AppointmentView,
  Client,
  Master,
  Salon,
  Service,
} from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { AppointmentTicketCompact } from '@/components/AppointmentTicket'
import {
  AppointmentSheet,
  type SheetPrefill,
} from '@/components/AppointmentSheet'
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconCalendar,
} from '@/components/icons'
import { api } from '@/lib/api'
import {
  addDays,
  combineDateTime,
  formatDateLong,
  isoWeekday,
  minutesOfDay,
  pad,
  sameDay,
  startOfDay,
  toYmd,
  weekdayShort,
} from '@/lib/format'
import { mediaUrl } from '@/lib/http'
import { cn } from '@/lib/cn'

type ViewMode = 'day' | 'week'

const ROW_MIN = 60 // soatlik qatorlar (1 soat oralig'i)
const ROW_PX = 64 // px per 1-soat qator

export function Journal() {
  const [view, setView] = useState<ViewMode>('day')
  const [cursor, setCursor] = useState<Date>(startOfDay(new Date()))
  const [loading, setLoading] = useState(true)
  const [appts, setAppts] = useState<AppointmentView[]>([])

  const [salon, setSalon] = useState<Salon | null>(null)
  const [masters, setMasters] = useState<Master[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [activeMasterId, setActiveMasterId] = useState<string>('')

  // sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<AppointmentView | null>(null)
  const [prefill, setPrefill] = useState<SheetPrefill | null>(null)

  // static data once
  useEffect(() => {
    void Promise.all([
      api.getSalon(),
      api.getMasters(),
      api.getClients(),
      api.getServices(),
    ]).then(([s, m, c, srv]) => {
      // Jadvalda faqat faol ustalar ustun sifatida ko'rsatiladi.
      const activeMasters = m.filter((x) => x.isActive)
      setSalon(s)
      setMasters(activeMasters)
      setClients(c)
      setServices(srv)
      setActiveMasterId(activeMasters[0]?.id ?? '')
    })
  }, [])

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    const rangeStart =
      view === 'day' ? cursor : startOfDay(addDays(cursor, -isoWeekday(cursor)))
    const rangeEnd = view === 'day' ? addDays(cursor, 1) : addDays(rangeStart, 7)
    const data = await api.getAppointments(rangeStart, rangeEnd)
    setAppts(data)
    setLoading(false)
  }, [cursor, view])

  useEffect(() => {
    void loadAppointments()
  }, [loadAppointments])

  // reload clients too (new client may have been created in the sheet)
  const refreshAll = useCallback(async () => {
    const [c] = await Promise.all([api.getClients()])
    setClients(c)
    await loadAppointments()
  }, [loadAppointments])

  // working-hour span for the current day (from salon)
  const dayHours = useMemo(() => {
    const wd = isoWeekday(cursor)
    const wh = salon?.workingHours?.find((w) => w.weekday === wd)
    const from = wh?.from ?? '09:00'
    const to = wh?.to ?? '21:00'
    const fromMin = Number(from.split(':')[0]) * 60 + Number(from.split(':')[1])
    const toMin = Number(to.split(':')[0]) * 60 + Number(to.split(':')[1])
    return { fromMin, toMin, open: wh?.open ?? true }
  }, [salon, cursor])

  function openCreate(pf?: SheetPrefill) {
    setEditing(null)
    setPrefill(pf ?? null)
    setSheetOpen(true)
  }
  function openEdit(a: AppointmentView) {
    setEditing(a)
    setPrefill(null)
    setSheetOpen(true)
  }

  const header = (
    <PageHeader
      title="Jadval"
      subtitle={view === 'day' ? formatDateLong(cursor) : 'Haftalik ko‘rinish'}
      actions={
        <>
          <Segmented
            options={[
              { value: 'day', label: 'Kun' },
              { value: 'week', label: 'Hafta' },
            ]}
            value={view}
            onChange={(v) => setView(v)}
          />
          <Button variant="brass" onClick={() => openCreate()}>
            <IconPlus width={18} height={18} />
            <span className="hidden sm:inline">Yangi bandlov</span>
          </Button>
        </>
      }
    />
  )

  const dateNav = (
    <div className="flex items-center justify-between gap-2 px-4 py-3 md:px-8">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          aria-label="Oldingi"
          onClick={() =>
            setCursor((d) => addDays(d, view === 'day' ? -1 : -7))
          }
        >
          <IconChevronLeft width={18} height={18} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCursor(startOfDay(new Date()))}
        >
          Bugun
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label="Keyingi"
          onClick={() => setCursor((d) => addDays(d, view === 'day' ? 1 : 7))}
        >
          <IconChevronRight width={18} height={18} />
        </Button>
      </div>
      <p className="tabular text-xs text-stone">{toYmd(cursor)}</p>
    </div>
  )

  return (
    <div>
      {header}
      {dateNav}

      {view === 'day' && (
        <>
          {/* mobile master switcher */}
          {masters.length > 1 && (
            <div className="scroll-thin -mt-1 flex gap-2 overflow-x-auto px-4 pb-2 md:hidden">
              {masters.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMasterId(m.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-xs',
                    activeMasterId === m.id
                      ? 'border-brass bg-brass/10 text-graphite'
                      : 'border-hairline-light text-stone',
                  )}
                >
                  <Avatar name={m.name} color={m.color} src={mediaUrl(m.avatarUrl)} size="sm" className="h-6 w-6 text-[9px]" />
                  {m.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <GridSkeleton />
          ) : !dayHours.open ? (
            <EmptyState label="Bugun salon dam olish kunida" />
          ) : (
            <DayGrid
              masters={masters}
              activeMasterId={activeMasterId}
              appts={appts}
              dayHours={dayHours}
              cursor={cursor}
              onEmptyClick={(masterId, startIso) =>
                openCreate({ masterId, start: startIso })
              }
              onApptClick={openEdit}
            />
          )}
        </>
      )}

      {view === 'week' && (
        <>
          {loading ? (
            <GridSkeleton />
          ) : (
            <WeekGrid cursor={cursor} appts={appts} onApptClick={openEdit} />
          )}
        </>
      )}

      <AppointmentSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={refreshAll}
        clients={clients}
        masters={masters}
        services={services}
        editing={editing}
        prefill={prefill}
      />
    </div>
  )
}

// ============================================================
// DAY GRID
// ============================================================
type Win = { off: boolean; fromMin: number; toMin: number }

function masterWindow(m: Master, weekday: number): Win {
  const d = m.schedule.find((s) => s.weekday === weekday)
  if (!d || !d.works) return { off: true, fromMin: 0, toMin: 0 }
  const [fh, fm] = d.from.split(':').map(Number)
  const [th, tm] = d.to.split(':').map(Number)
  return { off: false, fromMin: fh * 60 + fm, toMin: th * 60 + tm }
}

function DayGrid({
  masters,
  activeMasterId,
  appts,
  dayHours,
  cursor,
  onEmptyClick,
  onApptClick,
}: {
  masters: Master[]
  activeMasterId: string
  appts: AppointmentView[]
  dayHours: { fromMin: number; toMin: number }
  cursor: Date
  onEmptyClick: (masterId: string, startIso: string) => void
  onApptClick: (a: AppointmentView) => void
}) {
  // Grid range = union of the masters' working windows for this weekday
  // (falls back to the salon hours). Each master column greys out the hours
  // outside their own schedule.
  const wd = isoWeekday(cursor)
  const windows = masters.map((m) => masterWindow(m, wd))
  const openWins = windows.filter((w) => !w.off)
  const fromMin = openWins.length ? Math.min(...openWins.map((w) => w.fromMin)) : dayHours.fromMin
  const toMin = openWins.length ? Math.max(...openWins.map((w) => w.toMin)) : dayHours.toMin
  const rows: number[] = []
  for (let m = fromMin; m < toMin; m += ROW_MIN) rows.push(m)
  const gridHeight = ((toMin - fromMin) / ROW_MIN) * ROW_PX

  // now line
  const nowRef = useRef<HTMLDivElement>(null)
  const isToday = sameDay(cursor, new Date())
  const nowMin = minutesOfDay(new Date().toISOString())
  const showNow = isToday && nowMin >= fromMin && nowMin <= toMin
  const nowTop = ((nowMin - fromMin) / ROW_MIN) * ROW_PX
  const nowLabel = `${pad(Math.floor(nowMin / 60))}:${pad(nowMin % 60)}`

  useEffect(() => {
    if (showNow && nowRef.current) {
      nowRef.current.scrollIntoView({ block: 'center', behavior: 'auto' })
    }
  }, [showNow])

  const dayHasAny = appts.some((a) => a.status !== 'cancelled')

  const hourLabel = (min: number) =>
    min % 60 === 0 ? `${pad(Math.floor(min / 60))}:00` : ''

  return (
    <div className="scroll-thin max-h-[calc(100dvh-13rem)] overflow-auto px-4 pb-24 md:px-8">
      {!dayHasAny && (
        <div className="mb-3 rounded-[10px] border border-dashed border-hairline-light bg-white/60 px-4 py-3 text-center text-xs text-stone">
          Bugun bandlov yo‘q — bo‘sh katakni bosib qo‘shing.
        </div>
      )}
      <div className="relative flex min-w-fit">
        {/* time gutter */}
        <div className="sticky left-0 z-10 w-12 shrink-0 bg-bone">
          <div className="h-12" />
          <div style={{ height: gridHeight }} className="relative">
            {rows.map((m, i) => (
              <div
                key={m}
                className="tabular absolute -translate-y-1/2 pr-2 text-right text-2xs text-stone"
                style={{ top: i * ROW_PX, right: 0 }}
              >
                {hourLabel(m)}
              </div>
            ))}
          </div>
        </div>

        {/* master columns */}
        {masters.map((master, mi) => {
          const hiddenOnMobile = master.id !== activeMasterId
          const col = appts.filter((a) => a.masterId === master.id)
          const win = windows[mi]
          return (
            <div
              key={master.id}
              className={cn(
                'w-[220px] shrink-0 border-l border-hairline-light md:w-[240px]',
                hiddenOnMobile && 'hidden md:block',
              )}
            >
              {/* column header */}
              <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-hairline-light bg-bone px-3">
                <Avatar name={master.name} color={master.color} src={mediaUrl(master.avatarUrl)} size="sm" className="h-7 w-7 text-[10px]" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-graphite">
                    {master.name}
                  </p>
                  <p className="truncate text-2xs text-stone">
                    {master.specialty}
                  </p>
                </div>
              </div>

              {/* slots */}
              <div className="relative" style={{ height: gridHeight }}>
                {/* clickable empty rows (hour lines); off-hours are greyed + disabled */}
                {rows.map((m, i) => {
                  const inWin = !win.off && m >= win.fromMin && m < win.toMin
                  const hhmm = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={!inWin}
                      aria-label={inWin ? `${hhmm} bo‘sh` : `${hhmm} ish vaqti emas`}
                      onClick={() => onEmptyClick(master.id, combineDateTime(toYmd(cursor), hhmm))}
                      className={cn(
                        'absolute left-0 right-0 border-t',
                        m % 60 === 0 ? 'border-hairline-light' : 'border-hairline-light/40',
                        inWin
                          ? 'hover:bg-brass/[0.06]'
                          : 'cursor-not-allowed bg-[repeating-linear-gradient(45deg,rgba(28,31,34,0.03),rgba(28,31,34,0.03)_6px,transparent_6px,transparent_12px)]',
                      )}
                      style={{ top: i * ROW_PX, height: ROW_PX }}
                    />
                  )
                })}

                {/* TODO(drag-to-move): make these blocks draggable; on drop
                    compute new master/start, call api.isSlotFree + saveAppointment. */}
                {col.map((a) => {
                  const top = ((minutesOfDay(a.start) - fromMin) / ROW_MIN) * ROW_PX
                  const height = Math.max((a.durationMin / ROW_MIN) * ROW_PX - 3, 34)
                  return (
                    <div
                      key={a.id}
                      className="absolute left-1 right-1"
                      style={{ top: top + 1.5, height }}
                    >
                      <AppointmentTicketCompact
                        appt={a}
                        onClick={() => onApptClick(a)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Hozirgi vaqt — butun grid bo'ylab yagona yashil gorizontal chiziq */}
        {showNow && (
          <div
            ref={nowRef}
            className="pointer-events-none absolute left-0 right-0 z-30"
            style={{ top: 48 + nowTop }}
          >
            <div className="relative border-t-2 border-[#22c55e]">
              <span className="absolute -top-[7px] left-0 flex items-center gap-1">
                <span className="h-3 w-3 rounded-full border-2 border-white bg-[#22c55e] shadow" />
                <span className="tabular rounded bg-[#22c55e] px-1 py-0.5 text-[10px] font-bold leading-none text-white">
                  {nowLabel}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// WEEK GRID (condensed)
// ============================================================
function WeekGrid({
  cursor,
  appts,
  onApptClick,
}: {
  cursor: Date
  appts: AppointmentView[]
  onApptClick: (a: AppointmentView) => void
}) {
  const weekStart = startOfDay(addDays(cursor, -isoWeekday(cursor)))
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  return (
    <div className="scroll-thin overflow-x-auto px-4 pb-24 md:px-8">
      <div className="grid min-w-[860px] grid-cols-7 gap-2">
        {days.map((day) => {
          const dayAppts = appts
            .filter((a) => sameDay(new Date(a.start), day))
            .sort(
              (a, b) =>
                new Date(a.start).getTime() - new Date(b.start).getTime(),
            )
          const isToday = sameDay(day, today)
          return (
            <div key={day.toISOString()} className="min-w-0">
              <div
                className={cn(
                  'mb-2 rounded-[10px] px-2 py-1.5 text-center',
                  isToday ? 'bg-brass/15' : 'bg-graphite/[0.04]',
                )}
              >
                <p className="text-2xs text-stone">
                  {weekdayShort(isoWeekday(day))}
                </p>
                <p
                  className={cn(
                    'tabular text-base font-bold',
                    isToday ? 'text-[#9a7a2e]' : 'text-graphite',
                  )}
                >
                  {day.getDate()}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                {dayAppts.map((a) => (
                  <div key={a.id} className="h-14">
                    <AppointmentTicketCompact
                      appt={a}
                      onClick={() => onApptClick(a)}
                    />
                  </div>
                ))}
                {dayAppts.length === 0 && (
                  <p className="px-1 py-3 text-center text-2xs text-stone/70">
                    —
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// states
// ============================================================
function GridSkeleton() {
  return (
    <div className="px-4 pb-24 md:px-8">
      <div className="flex gap-2">
        <div className="w-12 shrink-0" />
        {Array.from({ length: 4 }).map((_, c) => (
          <div key={c} className="flex-1">
            <Skeleton className="mb-2 h-10 w-full" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((__, r) => (
                <Skeleton
                  key={r}
                  className="w-full"
                  style={{ height: 40 + ((r * c) % 3) * 20 }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-graphite/[0.05] text-stone">
        <IconCalendar width={26} height={26} />
      </span>
      <p className="text-base font-medium text-graphite">{label}</p>
      <p className="text-xs text-stone">
        Sana yoki ko‘rinishni o‘zgartirib ko‘ring.
      </p>
    </div>
  )
}
