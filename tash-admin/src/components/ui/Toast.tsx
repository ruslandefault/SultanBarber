import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { IconCheck } from '@/components/icons'
import { cn } from '@/lib/cn'

type ToastKind = 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

interface ToastCtx {
  toast: (message: string, kind?: ToastKind) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++seq.current
    setItems((prev) => [...prev, { id, message, kind }])
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 2600)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'animate-fade-in pointer-events-auto flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-xs font-medium text-bone shadow-lg',
              t.kind === 'success' ? 'bg-graphite' : 'bg-clay',
            )}
          >
            {t.kind === 'success' && (
              <span className="text-brass">
                <IconCheck width={16} height={16} />
              </span>
            )}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
