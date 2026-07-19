import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Appointment, AvailabilitySlot, Master, Service } from '@/types'
import { api } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import { dateKey, formatDateLong, formatDuration, formatSoum, nextDays, weekdayShort } from '@/lib/format'
import { useBackButton, useHaptics, useMainButton } from '@/telegram/hooks'
import { AppointmentTicket, Button, Input, Skeleton } from '@/components/ui'
import { MasterCard } from '@/components/MasterCard'

const ANY = 'any'
const TOTAL_STEPS = 4

interface NavState {
  masterId?: string
  serviceIds?: string[]
}

export default function Booking() {
  const navigate = useNavigate()
  const haptics = useHaptics()
  const { state } = useLocation() as { state: NavState | null }

  const { data, loading } = useAsync(() => api.getSalon(), [])

  const [step, setStep] = useState(1)
  const [serviceIds, setServiceIds] = useState<string[]>(state?.serviceIds ?? [])
  const [masterId, setMasterId] = useState<string>(state?.masterId ?? '')
  const [date, setDate] = useState<string>(dateKey(new Date()))
  const [time, setTime] = useState<string>('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Appointment | null>(null)

  const selectedServices = useMemo<Service[]>(
    () => (data ? data.services.filter((s) => serviceIds.includes(s.id)) : []),
    [data, serviceIds],
  )
  const totalDuration = selectedServices.reduce((n, s) => n + s.durationMin, 0)
  const totalPrice = selectedServices.reduce((n, s) => n + s.priceSoum, 0)
  const deposit = data?.settings.depositRequired ? data.settings.depositAmount : 0

  // Only masters who perform ALL selected services can take this booking.
  const eligibleMasters = useMemo<Master[]>(() => {
    if (!data) return []
    return data.masters.filter(
      (m) => m.isActive && serviceIds.every((sid) => (m.serviceIds ?? []).includes(sid)),
    )
  }, [data, serviceIds])

  // If the chosen master no longer performs the selected services, clear it.
  useEffect(() => {
    if (masterId && masterId !== ANY && !eligibleMasters.some((m) => m.id === masterId)) {
      setMasterId('')
    }
  }, [eligibleMasters, masterId])

  const selectedMaster: Master | null = useMemo(() => {
    if (!data) return null
    if (masterId === ANY) return null
    return data.masters.find((m) => m.id === masterId) ?? null
  }, [data, masterId])

  const canProceed =
    step === 1 ? serviceIds.length > 0 : step === 2 ? masterId !== '' : step === 3 ? time !== '' : true

  // ── Submit ──────────────────────────────────────────────────
  const submit = useCallback(async () => {
    setSubmitting(true)
    try {
      const appt = await api.createAppointment({ serviceIds, masterId, date, time, note })
      haptics.success()
      setResult(appt)
    } catch {
      haptics.error()
    } finally {
      setSubmitting(false)
    }
  }, [serviceIds, masterId, date, time, note, haptics])

  const onPrimary = useCallback(() => {
    haptics.selection()
    if (step < TOTAL_STEPS) setStep((s) => s + 1)
    else submit()
  }, [step, submit, haptics])

  const primaryText = step === TOTAL_STEPS ? (deposit ? 'To‘lab band qilish' : 'Band qilish') : 'Davom etish'

  useMainButton(
    result ? null : { text: primaryText, enabled: canProceed, loading: submitting, onClick: onPrimary },
  )

  // ── Back ────────────────────────────────────────────────────
  const onBack = useCallback(() => {
    if (result) {
      navigate('/')
      return
    }
    if (step > 1) setStep((s) => s - 1)
    else navigate('/')
  }, [result, step, navigate])
  useBackButton(onBack)

  if (result) return <SuccessView appointment={result} onDone={() => navigate('/appointments')} />

  return (
    <div className="px-5 pb-6 pt-3">
      <StepIndicator step={step} />

      {loading || !data ? (
        <StepSkeleton />
      ) : step === 1 ? (
        <Step1
          services={data.services}
          categories={data.categories.map((c) => ({ id: c.id, name: c.name }))}
          selected={serviceIds}
          onToggle={(id) => {
            haptics.selection()
            setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
          }}
          totalPrice={totalPrice}
          totalDuration={totalDuration}
        />
      ) : step === 2 ? (
        <Step2
          masters={eligibleMasters}
          selected={masterId}
          onSelect={(id) => {
            haptics.selection()
            setMasterId(id)
          }}
        />
      ) : step === 3 ? (
        <Step3
          date={date}
          time={time}
          masterId={masterId}
          serviceIds={serviceIds}
          onDate={(d) => {
            haptics.selection()
            setDate(d)
            setTime('')
          }}
          onTime={(t) => {
            haptics.selection()
            setTime(t)
          }}
        />
      ) : (
        <Step4
          services={selectedServices}
          masterName={selectedMaster?.name ?? 'Farqi yo‘q'}
          date={date}
          time={time}
          totalDuration={totalDuration}
          totalPrice={totalPrice}
          deposit={deposit}
          note={note}
          onNote={setNote}
        />
      )}
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-stone">
          Qadam {step} / {TOTAL_STEPS}
        </span>
        <span className="text-xs text-stone">{STEP_TITLES[step - 1]}</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-150 ${
              i < step ? 'bg-brass' : 'bg-slate'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
const STEP_TITLES = ['Xizmat', 'Usta', 'Sana va vaqt', 'Tasdiqlash']

// ── Step 1 — services ─────────────────────────────────────────
function Step1({
  services,
  categories,
  selected,
  onToggle,
  totalPrice,
  totalDuration,
}: {
  services: Service[]
  categories: { id: string; name: string }[]
  selected: string[]
  onToggle: (id: string) => void
  totalPrice: number
  totalDuration: number
}) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-bone">Xizmatni tanlang</h1>
      {categories.map((c) => {
        const list = services.filter((s) => s.categoryId === c.id && s.isActive)
        if (list.length === 0) return null
        return (
          <div key={c.id}>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-stone">{c.name}</h2>
            <div className="space-y-2">
              {list.map((s) => {
                const on = selected.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onToggle(s.id)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-3 rounded-[14px] border bg-slate p-3.5 text-left transition-[border-color,transform] duration-150 ease-[var(--ease-out-soft)] active:scale-[0.99] ${
                      on ? 'border-brass' : 'border-hairline'
                    }`}
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-md border ${
                        on ? 'border-brass bg-brass text-graphite' : 'border-stone/40'
                      }`}
                    >
                      {on && <CheckIcon />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base text-bone">{s.name}</span>
                      <span className="block text-sm text-stone">{formatDuration(s.durationMin)}</span>
                    </span>
                    <span className="shrink-0 font-mono text-sm text-brass">{formatSoum(s.priceSoum)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      {selected.length > 0 && (
        <div className="flex items-center justify-between rounded-[14px] border border-hairline bg-slate px-4 py-3">
          <span className="text-sm text-stone">{formatDuration(totalDuration)}</span>
          <span className="font-mono text-lg text-bone">{formatSoum(totalPrice)}</span>
        </div>
      )}
    </div>
  )
}

// ── Step 2 — master ───────────────────────────────────────────
function Step2({
  masters,
  selected,
  onSelect,
}: {
  masters: Master[]
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-bone">Ustani tanlang</h1>
      <button
        type="button"
        onClick={() => onSelect(ANY)}
        aria-pressed={selected === ANY}
        className={`flex w-full items-center gap-3 rounded-[14px] border bg-slate p-3.5 text-left transition-[border-color] duration-150 ${
          selected === ANY ? 'border-brass' : 'border-hairline'
        }`}
      >
        <span className="grid size-11 place-items-center rounded-full bg-brass/15 text-brass">
          <UsersIcon />
        </span>
        <span>
          <span className="block text-base font-medium text-bone">Farqi yo‘q</span>
          <span className="block text-sm text-stone">Eng yaqin bo‘sh usta</span>
        </span>
      </button>
      <div className="space-y-2">
        {masters.map((m) => (
          <MasterCard
            key={m.id}
            master={m}
            variant="row"
            selected={selected === m.id}
            onClick={() => onSelect(m.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Step 3 — date & time ──────────────────────────────────────
function Step3({
  date,
  time,
  masterId,
  serviceIds,
  onDate,
  onTime,
}: {
  date: string
  time: string
  masterId: string
  serviceIds: string[]
  onDate: (d: string) => void
  onTime: (t: string) => void
}) {
  const days = useMemo(() => nextDays(14), [])
  const { data, loading } = useAsync(
    () => api.getAvailability({ masterId, serviceIds, date }),
    [masterId, date, serviceIds.join(',')],
  )
  const slots: AvailabilitySlot[] = data?.slots ?? []

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-bone">Sana va vaqt</h1>

      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {days.map((d) => {
          const key = dateKey(d)
          const on = key === date
          const isToday = key === dateKey(new Date())
          return (
            <button
              key={key}
              type="button"
              onClick={() => onDate(key)}
              className={`flex w-14 shrink-0 flex-col items-center gap-1 rounded-[12px] border py-2.5 transition-[border-color,background-color] duration-150 ${
                on ? 'border-brass bg-brass/15' : 'border-hairline bg-slate'
              }`}
            >
              <span className={`text-xs ${on ? 'text-brass' : 'text-stone'}`}>{weekdayShort(d)}</span>
              <span className={`font-mono text-lg ${on ? 'text-brass' : 'text-bone'}`}>{d.getDate()}</span>
              {isToday && <span className="size-1 rounded-full bg-brass" />}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-[14px] border border-hairline bg-slate px-4 py-8 text-center">
          <p className="text-sm text-bone">Bu kunga bo‘sh vaqt yo‘q</p>
          <p className="mt-1 text-xs text-stone">Boshqa kunni tanlab ko‘ring</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {slots.map((s) => {
            const on = s.time === time
            return (
              <button
                key={s.time}
                type="button"
                onClick={() => onTime(s.time)}
                className={`rounded-full border py-2.5 font-mono text-sm transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out-soft)] ${
                  on
                    ? 'scale-[1.04] border-brass bg-brass text-graphite'
                    : 'border-hairline bg-slate text-bone active:scale-[0.97]'
                }`}
              >
                {s.time}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Step 4 — confirm ──────────────────────────────────────────
function Step4({
  services,
  masterName,
  date,
  time,
  totalDuration,
  totalPrice,
  deposit,
  note,
  onNote,
}: {
  services: Service[]
  masterName: string
  date: string
  time: string
  totalDuration: number
  totalPrice: number
  deposit: number
  note: string
  onNote: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-bone">Tasdiqlash</h1>

      <div className="space-y-3 rounded-[14px] border border-hairline bg-slate p-4">
        <SummaryRow label="Xizmat" value={services.map((s) => s.name).join(', ')} />
        <SummaryRow label="Usta" value={masterName} />
        <SummaryRow label="Sana" value={formatDateLong(`${date}T${time}:00+05:00`)} />
        <SummaryRow label="Vaqt" value={time} mono />
        <SummaryRow label="Davomiylik" value={formatDuration(totalDuration)} mono />
        <div className="flex items-baseline justify-between border-t border-hairline pt-3">
          <span className="text-sm text-stone">Jami</span>
          <span className="font-mono text-lg text-brass">{formatSoum(totalPrice)}</span>
        </div>
      </div>

      {deposit > 0 && (
        <div className="space-y-3 rounded-[14px] border border-brass/30 bg-brass/5 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-bone">Oldindan to‘lov</span>
            <span className="font-mono text-base text-brass">{formatSoum(deposit)}</span>
          </div>
          <p className="text-xs text-stone">
            Bandlovni tasdiqlash uchun oldindan to‘lov talab qilinadi. To‘lovdan so‘ng vaqtingiz kafolatlanadi.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth disabled>
              Payme
            </Button>
            <Button variant="secondary" fullWidth disabled>
              Click
            </Button>
          </div>
        </div>
      )}

      <Input
        label="Izoh (ixtiyoriy)"
        placeholder="Masalan: bo‘yni ham oling"
        value={note}
        onChange={(e) => onNote(e.target.value)}
      />
    </div>
  )
}

// ── Success ───────────────────────────────────────────────────
function SuccessView({ appointment, onDone }: { appointment: Appointment; onDone: () => void }) {
  const navigate = useNavigate()
  useMainButton(null)
  useBackButton(useCallback(() => navigate('/'), [navigate]))

  return (
    <div className="flex min-h-app flex-col px-5 pb-8 pt-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-sage/15 text-sage">
          <CheckIcon large />
        </div>
        <h1 className="font-display text-2xl text-bone">Band qilindi!</h1>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-stone">
          <BellIcon /> Telegramga eslatma qo‘shildi
        </p>
      </div>

      <AppointmentTicket appointment={appointment} />

      <div className="mt-auto space-y-2 pt-8">
        <Button fullWidth size="lg" onClick={onDone}>
          Mening bandlovlarim
        </Button>
        <Button variant="ghost" fullWidth onClick={() => navigate('/')}>
          Bosh sahifa
        </Button>
      </div>
    </div>
  )
}

// ── Bits ──────────────────────────────────────────────────────
function SummaryRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-sm text-stone">{label}</span>
      <span className={`text-right text-sm text-bone ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function StepSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

function CheckIcon({ large = false }: { large?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={large ? 'size-7' : 'size-3.5'} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" strokeLinecap="round" />
      <path d="M16 5.5a3 3 0 0 1 0 6M17.5 19c0-2-.8-3.7-2-4.8" strokeLinecap="round" />
    </svg>
  )
}
function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M6 8a4 4 0 0 1 8 0c0 4 1.5 5 1.5 5h-11S6 12 6 8z" strokeLinejoin="round" />
      <path d="M8.5 16a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
    </svg>
  )
}
