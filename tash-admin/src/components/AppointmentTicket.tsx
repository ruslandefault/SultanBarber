import type { AppointmentView } from '@/types'
import { StatusChip } from '@/components/ui/StatusChip'
import { formatTime, formatDuration, formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'

// Brass dashed rule with notched edges — the barber ticket-stub signature.
function NotchedRule() {
  return (
    <div className="relative my-3 h-px">
      <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-bone" />
      <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-bone" />
      <div className="mx-1 h-px border-t border-dashed border-brass/60" />
    </div>
  )
}

// ---------- FULL variant ----------
export function AppointmentTicket({
  appt,
  onClick,
}: {
  appt: AppointmentView
  onClick?: () => void
}) {
  const service = appt.services.map((s) => s.name).join(' + ')
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'block w-full overflow-hidden rounded-[14px] border border-hairline-light bg-white text-left transition-shadow duration-150 hover:shadow-md',
        onClick && 'cursor-pointer',
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <div className="tabular text-xl font-bold leading-none text-graphite">
            {formatTime(appt.start)}
          </div>
          <div className="tabular mt-1 text-2xs text-stone">
            {formatTime(appt.end)} · {formatDuration(appt.durationMin)}
          </div>
        </div>
        <StatusChip status={appt.status} />
      </div>

      <div className="px-4">
        <NotchedRule />
      </div>

      <div className="px-4 pb-4">
        <p className="text-base font-medium text-graphite">{appt.client.name}</p>
        <p className="mt-0.5 text-xs text-stone">{service}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-2xs text-stone">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: appt.master.color }}
            />
            {appt.master.name}
          </span>
          <span className="tabular text-xs font-bold text-graphite">
            {formatMoney(appt.totalPrice)}
          </span>
        </div>
      </div>
    </button>
  )
}

// ---------- COMPACT variant (journal grid + history lists) ----------
const statusBar: Record<string, string> = {
  booked: 'before:bg-stone',
  confirmed: 'before:bg-brass',
  completed: 'before:bg-sage',
  no_show: 'before:bg-clay',
  cancelled: 'before:bg-clay-muted',
}

const statusTint: Record<string, string> = {
  booked: 'bg-stone/[0.08]',
  confirmed: 'bg-brass/[0.10]',
  completed: 'bg-sage/[0.10]',
  no_show: 'bg-clay/[0.10]',
  cancelled: 'bg-clay-muted/[0.08]',
}

export function AppointmentTicketCompact({
  appt,
  onClick,
  className,
  style,
}: {
  appt: AppointmentView
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}) {
  const service = appt.services.map((s) => s.name).join(' + ')
  const cancelled = appt.status === 'cancelled'
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        'relative block h-full w-full overflow-hidden rounded-[10px] border border-hairline-light px-2.5 py-1.5 text-left',
        'before:absolute before:left-0 before:top-0 before:h-full before:w-1',
        statusBar[appt.status],
        statusTint[appt.status],
        'transition-shadow duration-150 hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-1 pl-1.5">
        <span
          className={cn(
            'tabular text-2xs font-bold text-graphite',
            cancelled && 'line-through',
          )}
        >
          {formatTime(appt.start)}
        </span>
        <span className="tabular text-2xs text-stone">
          {formatDuration(appt.durationMin)}
        </span>
      </div>
      <p
        className={cn(
          'truncate pl-1.5 text-xs font-medium text-graphite',
          cancelled && 'line-through text-stone',
        )}
      >
        {appt.client.name}
      </p>
      <p className="truncate pl-1.5 text-2xs text-stone">{service}</p>
    </button>
  )
}
