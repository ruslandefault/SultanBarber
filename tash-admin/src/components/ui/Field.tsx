import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

const controlBase =
  'w-full rounded-[10px] border bg-white px-3.5 text-base text-graphite placeholder:text-stone transition-colors duration-150 focus:border-brass'

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-medium text-graphite"
    >
      {children}
    </label>
  )
}

interface FieldProps {
  label?: string
  error?: string
  children: ReactNode
  hint?: string
}

export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1 text-2xs text-stone">{hint}</p>}
      {error && <p className="mt-1 text-2xs text-clay">{error}</p>}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ className, invalid, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        controlBase,
        'h-11',
        invalid ? 'border-clay' : 'border-hairline-light',
        className,
      )}
      {...rest}
    />
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ className, invalid, ...rest }: TextareaProps) {
  return (
    <textarea
      className={cn(
        controlBase,
        'py-2.5 min-h-[80px] resize-y',
        invalid ? 'border-clay' : 'border-hairline-light',
        className,
      )}
      {...rest}
    />
  )
}
