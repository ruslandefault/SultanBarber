import { cn } from '@/lib/cn'

interface Option<T extends string> {
  value: T
  label: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex rounded-[10px] bg-graphite/[0.06] p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-[7px] font-medium transition-colors duration-150 ease-out whitespace-nowrap',
              size === 'sm' ? 'px-3 py-1 text-2xs' : 'px-3.5 py-1.5 text-xs',
              active
                ? 'bg-white text-graphite shadow-sm'
                : 'text-stone hover:text-graphite',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
