import type { Appointment } from '@/types'
import { cn } from '@/lib/cn'
import { formatDuration, formatSoum, formatTime } from '@/lib/format'
import { StatusChip } from './StatusChip'

export interface AppointmentTicketProps {
  appointment: Appointment
  variant?: 'full' | 'compact'
  onClick?: () => void
  className?: string
}

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('uz-UZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Tashkent',
  }).format(new Date(iso))
}

/**
 * Signature component — a barber ticket-stub card.
 * Large Space Mono time, brass rule, notched edge, then details + status.
 */
export function AppointmentTicket({
  appointment: a,
  variant = 'full',
  onClick,
  className,
}: AppointmentTicketProps) {
  const serviceNames = a.services.map((s) => s.name).join(', ')

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-[14px] border border-hairline bg-slate p-3 text-left',
          onClick &&
            'transition-[border-color,transform] duration-150 ease-[var(--ease-out-soft)] hover:border-stone/30 active:scale-[0.99]',
          className,
        )}
      >
        <div className="flex flex-col items-center rounded-[10px] bg-graphite px-3 py-2">
          <span className="font-mono text-lg leading-none text-bone">{formatTime(a.startAt)}</span>
          <span className="mt-1 font-mono text-[10px] leading-none text-stone">
            {formatDuration(a.durationMin)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-bone">{serviceNames}</p>
          <p className="truncate text-xs text-stone">{a.masterName}</p>
        </div>
        <StatusChip status={a.status} />
      </button>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-[14px] border border-hairline bg-slate',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {/* Header: time + status */}
      <div className="flex items-start justify-between px-5 pt-5">
        <div>
          <p className="font-mono text-3xl leading-none tracking-tight text-bone">
            {formatTime(a.startAt)}
            <span className="text-stone"> – </span>
            <span className="text-2xl text-stone">{formatTime(a.endAt)}</span>
          </p>
          <p className="mt-2 text-sm text-stone">{formatDay(a.startAt)}</p>
        </div>
        <StatusChip status={a.status} />
      </div>

      {/* Brass rule with notched (perforated) edge */}
      <div className="relative my-4">
        <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-graphite" />
        <span className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-graphite" />
        <div className="mx-5 border-t-2 border-dashed border-brass/50" />
      </div>

      {/* Details */}
      <div className="space-y-3 px-5 pb-5">
        <Row label="Salon" value={a.salonName} />
        <Row label="Usta" value={a.masterName} />
        <Row label="Xizmat" value={serviceNames} />
        <Row label="Davomiylik" value={formatDuration(a.durationMin)} mono />
        <div className="flex items-baseline justify-between border-t border-hairline pt-3">
          <span className="text-sm text-stone">Jami</span>
          <span className="font-mono text-lg text-brass">{formatSoum(a.priceTotal)}</span>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-sm text-stone">{label}</span>
      <span className={cn('text-right text-sm text-bone', mono && 'font-mono')}>{value}</span>
    </div>
  )
}
