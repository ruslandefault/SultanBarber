import type { Master } from '@/types'
import { cn } from '@/lib/cn'
import { Avatar } from '@/components/ui'

export interface MasterCardProps {
  master: Master
  onClick?: () => void
  selected?: boolean
  /** 'tile' — vertical card for horizontal scroll (F1); 'row' — full-width row (F2). */
  variant?: 'tile' | 'row'
  className?: string
}

export function MasterCard({ master, onClick, selected = false, variant = 'tile', className }: MasterCardProps) {
  const ring = selected ? 'border-brass' : 'border-hairline'

  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={cn(
          'flex w-full items-center gap-3 rounded-[14px] border bg-slate p-3 text-left transition-[border-color,transform] duration-150 ease-[var(--ease-out-soft)] active:scale-[0.99]',
          ring,
          className,
        )}
      >
        <Avatar name={master.name} src={master.avatar} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-bone">{master.name}</p>
          <p className="truncate text-sm text-stone">{master.specialty}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {master.rating != null && <Rating value={master.rating} />}
          {master.nextAvailable && <span className="text-xs text-stone">{master.nextAvailable}</span>}
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-32 shrink-0 flex-col items-center gap-2 rounded-[14px] border bg-slate p-3 text-center transition-[border-color,transform] duration-150 ease-[var(--ease-out-soft)] active:scale-[0.98]',
        ring,
        className,
      )}
    >
      <Avatar name={master.name} src={master.avatar} size="lg" />
      <div className="w-full">
        <p className="truncate text-sm font-medium text-bone">{master.name}</p>
        <p className="truncate text-xs text-stone">{master.specialty}</p>
      </div>
      {master.rating != null && <Rating value={master.rating} />}
    </button>
  )
}

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs text-brass">
      <svg viewBox="0 0 20 20" className="size-3.5 fill-brass" aria-hidden>
        <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
      </svg>
      {value.toFixed(1)}
    </span>
  )
}
