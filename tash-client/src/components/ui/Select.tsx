import { forwardRef, type SelectHTMLAttributes, useId } from 'react'
import { cn } from '@/lib/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, children, ...props },
  ref,
) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm text-stone">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-11 w-full appearance-none rounded-[10px] bg-slate pl-3.5 pr-9 text-base text-bone',
            'border border-hairline transition-colors duration-150',
            'focus:border-brass focus-visible:outline-none',
            error && 'border-clay/60',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-stone"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {(error || hint) && (
        <span className={cn('text-xs', error ? 'text-clay' : 'text-stone')}>{error ?? hint}</span>
      )}
    </div>
  )
})
