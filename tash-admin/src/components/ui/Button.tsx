import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'brass' | 'ghost' | 'outline' | 'clay' | 'dark'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const variants: Record<Variant, string> = {
  brass:
    'bg-brass text-graphite font-bold hover:brightness-105 active:brightness-95 shadow-sm',
  dark: 'bg-graphite text-bone font-medium hover:bg-slate active:brightness-95',
  ghost: 'bg-transparent text-graphite hover:bg-graphite/5',
  outline:
    'bg-white text-graphite border border-hairline-light hover:bg-graphite/[0.03]',
  clay: 'bg-clay text-bone font-bold hover:brightness-105 active:brightness-95',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs gap-1.5',
  md: 'h-11 px-4 text-xs gap-2',
  lg: 'h-12 px-5 text-base gap-2',
}

export function Button({
  variant = 'outline',
  size = 'md',
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-[10px] transition-[filter,background-color] duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none select-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
