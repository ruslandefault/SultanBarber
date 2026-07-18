import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Appointment } from '@/types'
import { api } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import { useBackButton, useHaptics, useMainButton } from '@/telegram/hooks'
import { AppointmentTicket, BottomSheet, Button, Skeleton } from '@/components/ui'

type Segment = 'upcoming' | 'past'
const CANCEL_WINDOW_HOURS = 3

export default function MyBookings() {
  const navigate = useNavigate()
  const haptics = useHaptics()
  const [segment, setSegment] = useState<Segment>('upcoming')
  const [reload, setReload] = useState(0)
  const [toCancel, setToCancel] = useState<Appointment | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const { data, loading } = useAsync(() => api.getMyAppointments(), [reload])

  const goBook = useCallback(() => navigate('/'), [navigate])
  useMainButton(null)
  useBackButton(goBook)

  const confirmCancel = useCallback(async () => {
    if (!toCancel) return
    setCancelling(true)
    try {
      await api.cancelAppointment(toCancel.id)
      haptics.success()
      setToCancel(null)
      setReload((n) => n + 1)
    } catch {
      haptics.error()
    } finally {
      setCancelling(false)
    }
  }, [toCancel, haptics])

  const upcoming = (data?.upcoming ?? []).filter((a) => a.status !== 'cancelled')
  const past = data?.past ?? []
  const list = segment === 'upcoming' ? upcoming : past

  return (
    <div className="px-5 pb-6 pt-3">
      <h1 className="mb-4 font-display text-2xl text-bone">Mening bandlovlarim</h1>

      <Segmented
        value={segment}
        onChange={(s) => {
          haptics.selection()
          setSegment(s)
        }}
        upcomingCount={upcoming.length}
      />

      <div className="mt-5 space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : list.length === 0 ? (
          <EmptyState segment={segment} onBook={goBook} />
        ) : segment === 'upcoming' ? (
          upcoming.map((a) => (
            <UpcomingItem
              key={a.id}
              appointment={a}
              onCancel={() => setToCancel(a)}
              onReschedule={() => navigate('/booking')}
            />
          ))
        ) : (
          past.map((a) => (
            <PastItem key={a.id} appointment={a} onRebook={() => navigate('/booking')} />
          ))
        )}
      </div>

      <BottomSheet
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        title="Bandlovni bekor qilasizmi?"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setToCancel(null)}>
              Yo‘q
            </Button>
            <Button variant="destructive" fullWidth loading={cancelling} onClick={confirmCancel}>
              Ha, bekor qilish
            </Button>
          </div>
        }
      >
        <p className="text-sm text-stone">
          Bandlov bekor qilinadi va vaqt bo‘shatiladi. Bu amalni ortga qaytarib bo‘lmaydi.
        </p>
      </BottomSheet>
    </div>
  )
}

// ── Segmented control ─────────────────────────────────────────
function Segmented({
  value,
  onChange,
  upcomingCount,
}: {
  value: Segment
  onChange: (s: Segment) => void
  upcomingCount: number
}) {
  const tabs: { id: Segment; label: string }[] = [
    { id: 'upcoming', label: `Kelgusi${upcomingCount ? ` (${upcomingCount})` : ''}` },
    { id: 'past', label: 'O‘tgan' },
  ]
  return (
    <div className="flex gap-1 rounded-full border border-hairline bg-slate p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          aria-pressed={value === t.id}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors duration-150 ${
            value === t.id ? 'bg-brass text-graphite' : 'text-stone'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Upcoming item ─────────────────────────────────────────────
function UpcomingItem({
  appointment,
  onCancel,
  onReschedule,
}: {
  appointment: Appointment
  onCancel: () => void
  onReschedule: () => void
}) {
  const hoursUntil = (new Date(appointment.startAt).getTime() - Date.now()) / 3_600_000
  const canCancel = hoursUntil >= CANCEL_WINDOW_HOURS

  return (
    <div className="space-y-2">
      <AppointmentTicket appointment={appointment} variant="compact" />
      <div className="flex gap-2">
        <Button variant="secondary" fullWidth onClick={onReschedule}>
          Boshqa vaqtga
        </Button>
        <Button variant="destructive" fullWidth onClick={onCancel} disabled={!canCancel}>
          Bekor qilish
        </Button>
      </div>
      {!canCancel && (
        <p className="text-xs text-stone">
          Bekor qilish kamida {CANCEL_WINDOW_HOURS} soat oldin mumkin edi.
        </p>
      )}
    </div>
  )
}

// ── Past item ─────────────────────────────────────────────────
function PastItem({ appointment, onRebook }: { appointment: Appointment; onRebook: () => void }) {
  return (
    <div className="space-y-2">
      <AppointmentTicket appointment={appointment} variant="compact" />
      <Button variant="secondary" fullWidth onClick={onRebook}>
        Yana band qilish
      </Button>
    </div>
  )
}

// ── Empty ─────────────────────────────────────────────────────
function EmptyState({ segment, onBook }: { segment: Segment; onBook: () => void }) {
  if (segment === 'past') {
    return <p className="py-16 text-center text-sm text-stone">Hali o‘tgan bandlovlar yo‘q</p>
  }
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm text-stone">Hali bandlovingiz yo‘q</p>
      <Button onClick={onBook}>Band qilish</Button>
    </div>
  )
}
