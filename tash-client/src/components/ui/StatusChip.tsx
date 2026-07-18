import type { AppointmentStatus } from '@/types'
import { cn } from '@/lib/cn'

interface Meta {
  label: string
  dot: string
  text: string
  ring: string
}

export const STATUS_META: Record<AppointmentStatus, Meta> = {
  booked: { label: 'Band qilindi', dot: 'bg-stone', text: 'text-stone', ring: 'border-stone/30' },
  confirmed: { label: 'Tasdiqlandi', dot: 'bg-brass', text: 'text-brass', ring: 'border-brass/40' },
  completed: { label: 'Bajarildi', dot: 'bg-sage', text: 'text-sage', ring: 'border-sage/40' },
  no_show: { label: 'Kelmadi', dot: 'bg-clay', text: 'text-clay', ring: 'border-clay/40' },
  cancelled: { label: 'Bekor qilindi', dot: 'bg-clay/60', text: 'text-clay/70', ring: 'border-clay/25' },
}

export function StatusChip({ status, className }: { status: AppointmentStatus; className?: string }) {
  const m = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-graphite/40 px-2.5 py-1 text-xs font-medium',
        m.ring,
        m.text,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  )
}
