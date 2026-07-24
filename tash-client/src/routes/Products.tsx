import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, mediaUrl } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import { formatSoum } from '@/lib/format'
import { useBackButton, useMainButton } from '@/telegram/hooks'
import { Skeleton } from '@/components/ui'

export default function Products() {
  const navigate = useNavigate()
  const { data, loading, error } = useAsync(() => api.getProducts(), [])

  const goHome = useCallback(() => navigate('/'), [navigate])
  useBackButton(goHome)
  useMainButton(null)

  return (
    <div className="px-5 pb-6 pt-3">
      <h1 className="mb-4 font-display text-2xl text-bone">Mahsulotlar</h1>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-52 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-stone">Mahsulotlarni yuklab bo‘lmadi</p>
      ) : !data || data.length === 0 ? (
        <p className="py-16 text-center text-sm text-stone">Hozircha mahsulot yo‘q</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {data.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/products/${p.id}`)}
              className="overflow-hidden rounded-[14px] border border-hairline bg-slate text-left active:scale-[0.98]"
            >
              <div className="aspect-square w-full bg-graphite/60">
                {p.imageUrl ? (
                  <img
                    src={mediaUrl(p.imageUrl)}
                    alt={p.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-stone">
                    <BagIcon />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-bone">{p.title}</p>
                {p.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-stone">{p.description}</p>
                )}
                <p className="mt-1.5 font-mono text-sm text-brass">{formatSoum(p.priceSoum)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M6 8h12l-.8 11.2A1.5 1.5 0 0 1 15.7 20.6H8.3a1.5 1.5 0 0 1-1.5-1.4L6 8Z" strokeLinejoin="round" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" strokeLinecap="round" />
    </svg>
  )
}
