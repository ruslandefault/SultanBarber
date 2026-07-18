import type { AppointmentStatus } from '@/types'
import { STATUS_META } from '@/lib/format'
import { cn } from '@/lib/cn'

const tokenClasses: Record<string, string> = {
  stone: 'bg-stone/15 text-stone border-stone/30',
  brass: 'bg-brass/15 text-[#9a7a2e] border-brass/40',
  sage: 'bg-sage/15 text-sage border-sage/40',
  clay: 'bg-clay/15 text-clay border-clay/40',
  'clay-muted': 'bg-clay-muted/12 text-clay-muted border-clay-muted/30',
}

export function StatusChip({
  status,
  className,
}: {
  status: AppointmentStatus
  className?: string
}) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-medium whitespace-nowrap',
        tokenClasses[meta.token],
        className,
      )}
    >
      {meta.label}
    </span>
  )
}
