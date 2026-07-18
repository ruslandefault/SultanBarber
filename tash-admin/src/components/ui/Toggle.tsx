import { cn } from '@/lib/cn'

export function Toggle({
  checked,
  onChange,
  label,
  ariaLabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ease-out',
        checked ? 'bg-sage' : 'bg-stone/40',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ease-out',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}

export function ToggleRow({
  checked,
  onChange,
  title,
  desc,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  title: string
  desc?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-base font-medium text-graphite">{title}</p>
        {desc && <p className="mt-0.5 text-xs text-stone">{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} ariaLabel={title} />
    </div>
  )
}
