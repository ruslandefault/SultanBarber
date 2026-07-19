import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Service } from '@/types'
import { api } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import { formatDuration, formatSoum } from '@/lib/format'
import { useBackButton, useHaptics, useMainButton } from '@/telegram/hooks'
import { Avatar, Chip, Skeleton } from '@/components/ui'
import { MasterCard } from '@/components/MasterCard'

const ALL = '__all__'

export default function SalonHome() {
  const navigate = useNavigate()
  const haptics = useHaptics()
  const { data, loading, error } = useAsync(() => api.getSalon(), [])
  const [category, setCategory] = useState(ALL)

  const startBooking = useCallback(
    (masterId?: string) => {
      haptics.selection()
      navigate('/booking', masterId ? { state: { masterId } } : undefined)
    },
    [haptics, navigate],
  )

  const onMain = useCallback(() => startBooking(), [startBooking])
  useMainButton({ text: 'Band qilish', onClick: onMain })
  useBackButton(null) // home = no back button

  const services = useMemo<Service[]>(() => {
    if (!data) return []
    return data.services.filter((s) => s.isActive && (category === ALL || s.categoryId === category))
  }, [data, category])

  if (error) return <ErrorState message={error} />

  return (
    <div className="pb-6">
      {/* Hero */}
      {loading || !data ? (
        <Skeleton className="h-52 w-full rounded-none" />
      ) : (
        <Hero
          name={data.salon.name}
          tagline={data.salon.tagline}
          cover={data.salon.cover}
        />
      )}

      <div className="space-y-8 px-5 pt-5">
        {/* Info chips */}
        {!loading && data && (
          <div className="-mt-1 flex flex-wrap gap-2">
            <InfoChip
              icon={<DotIcon className={data.salon.isOpen ? 'fill-sage' : 'fill-clay'} />}
              text={data.salon.isOpen ? 'Hozir ochiq' : 'Yopiq'}
            />
            {data.salon.workingToday && <InfoChip icon={<ClockIcon />} text={`Bugun ${data.salon.workingToday}`} />}
            {data.salon.distanceKm != null && <InfoChip icon={<PinIcon />} text={`${data.salon.distanceKm} km`} />}
          </div>
        )}

        {/* Services */}
        <Section
          title="Xizmatlar"
          action={
            <button
              type="button"
              onClick={() => {
                haptics.selection()
                navigate('/products')
              }}
              className="inline-flex items-center gap-1 rounded-full border border-hairline bg-slate px-3 py-1 text-xs text-brass active:scale-[0.97]"
            >
              Mahsulotlar
              <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M7 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          }
        >
          {loading || !data ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : (
            <>
              <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
                <Chip selected={category === ALL} onClick={() => setCategory(ALL)}>
                  Hammasi
                </Chip>
                {data.categories.map((c) => (
                  <Chip key={c.id} selected={category === c.id} onClick={() => setCategory(c.id)}>
                    {c.name}
                  </Chip>
                ))}
              </div>
              <div className="space-y-2">
                {services.map((s) => (
                  <ServiceRow key={s.id} service={s} onClick={() => startBooking()} />
                ))}
                {services.length === 0 && (
                  <p className="py-4 text-center text-sm text-stone">Bu turkumda xizmat yo‘q</p>
                )}
              </div>
            </>
          )}
        </Section>

        {/* Masters */}
        <Section title="Ustalar">
          {loading || !data ? (
            <div className="flex gap-3">
              <Skeleton className="h-40 w-32" />
              <Skeleton className="h-40 w-32" />
              <Skeleton className="h-40 w-32" />
            </div>
          ) : (
            <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
              {data.masters
                .filter((m) => m.isActive)
                .map((m) => (
                  <MasterCard key={m.id} master={m} onClick={() => startBooking(m.id)} />
                ))}
            </div>
          )}
        </Section>

        {/* Address / map */}
        {!loading && data && (
          <Section title="Manzil">
            <MapCard
              address={data.salon.address}
              lat={data.salon.lat}
              lng={data.salon.lng}
            />
          </Section>
        )}

        {/* Weekly hours */}
        {!loading && data?.salon.weeklyHours && (
          <Section title="Ish vaqti">
            <ul className="overflow-hidden rounded-[14px] border border-hairline bg-slate">
              {data.salon.weeklyHours.map((w) => (
                <li
                  key={w.day}
                  className="flex items-center justify-between border-b border-hairline px-4 py-2.5 last:border-b-0"
                >
                  <span className="text-sm text-bone">{w.day}</span>
                  <span className={`font-mono text-sm ${w.dayOff ? 'text-stone' : 'text-bone'}`}>{w.hours}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────
function Hero({ name, tagline, cover }: { name: string; tagline?: string; cover?: string | null }) {
  return (
    <div className="relative h-52 w-full overflow-hidden">
      {cover ? (
        <img src={cover} alt={name} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate to-graphite">
          <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_30%_20%,rgba(201,162,75,0.25),transparent_55%)]" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-graphite via-graphite/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-5">
        <Avatar name={name} size="lg" className="ring-1 ring-hairline" />
        <div className="pb-1">
          <h1 className="font-display text-2xl leading-tight text-bone">{name}</h1>
          {tagline && <p className="mt-0.5 text-sm text-stone">{tagline}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Map ───────────────────────────────────────────────────────
function MapCard({ address, lat, lng }: { address: string; lat?: number; lng?: number }) {
  const href =
    lat != null && lng != null
      ? `https://yandex.uz/maps/?pt=${lng},${lat}&z=16&l=map`
      : `https://yandex.uz/maps/?text=${encodeURIComponent(address)}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-[14px] border border-hairline bg-slate"
    >
      <div className="relative h-28 bg-graphite">
        {/* Stylized map placeholder */}
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(var(--color-hairline)_1px,transparent_1px),linear-gradient(90deg,var(--color-hairline)_1px,transparent_1px)] [background-size:22px_22px]" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <PinIcon className="size-7 fill-brass" />
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm text-bone">{address}</span>
        <span className="shrink-0 text-xs text-brass">Xaritada ochish</span>
      </div>
    </a>
  )
}

// ── Small pieces ──────────────────────────────────────────────
function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-stone">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function ServiceRow({ service, onClick }: { service: Service; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-[14px] border border-hairline bg-slate p-3.5 text-left transition-[border-color,transform] duration-150 ease-[var(--ease-out-soft)] hover:border-stone/30 active:scale-[0.99]"
    >
      <div className="min-w-0">
        <p className="truncate text-base text-bone">{service.name}</p>
        <p className="text-sm text-stone">{formatDuration(service.durationMin)}</p>
      </div>
      <span className="shrink-0 font-mono text-sm text-brass">{formatSoum(service.priceSoum)}</span>
    </button>
  )
}

function InfoChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-slate px-3 py-1 text-xs text-stone">
      {icon}
      {text}
    </span>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-app flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="font-display text-lg text-bone">Salonni yuklab bo‘lmadi</p>
      <p className="text-sm text-stone">{message}</p>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────
function DotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 8" className={`size-2 ${className ?? ''}`} aria-hidden>
      <circle cx="4" cy="4" r="4" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-3.5 stroke-stone" fill="none" strokeWidth="1.6" aria-hidden>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4l2.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'size-3.5 fill-stone'} aria-hidden>
      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  )
}
