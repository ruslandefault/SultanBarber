import { forwardRef, type InputHTMLAttributes, useId } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm text-stone">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={cn(
          'h-11 w-full rounded-[10px] bg-slate px-3.5 text-base text-bone placeholder:text-stone/60',
          'border border-hairline transition-colors duration-150',
          'focus:border-brass focus-visible:outline-none',
          error && 'border-clay/60',
          className,
        )}
        {...props}
      />
      {(error || hint) && (
        <span className={cn('text-xs', error ? 'text-clay' : 'text-stone')}>{error ?? hint}</span>
      )}
    </div>
  )
})
