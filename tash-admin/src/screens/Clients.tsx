import { useEffect, useMemo, useState } from 'react'
import type {
  AppointmentView,
  Client,
  ClientStats,
  ClientTag,
  Master,
  Service,
} from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Avatar } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { Sheet } from '@/components/ui/Sheet'
import { AppointmentTicketCompact } from '@/components/AppointmentTicket'
import { AppointmentSheet } from '@/components/AppointmentSheet'
import {
  IconSearch,
  IconUpload,
  IconUsers,
  IconPhone,
  IconCake,
  IconPlus,
} from '@/components/icons'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import {
  formatMoney,
  formatDateDot,
  relativeDays,
  monogram,
} from '@/lib/format'
import { cn } from '@/lib/cn'

type SortKey = 'name' | 'lastVisit' | 'visits' | 'spent'
type FilterKey = 'all' | 'lapsed' | 'frequent' | 'birthday'

interface Row {
  client: Client
  stats: ClientStats
}

export function Clients() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [tags, setTags] = useState<ClientTag[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [services, setServices] = useState<Service[]>([])

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('lastVisit')
  const [filter, setFilter] = useState<FilterKey>('all')

  const [selected, setSelected] = useState<Client | null>(null)
  const [bookingFor, setBookingFor] = useState<Client | null>(null)

  async function load() {
    setLoading(true)
    const [clients, t, m, srv] = await Promise.all([
      api.getClients(),
      api.getClientTags(),
      api.getMasters(),
      api.getServices(),
    ])
    const withStats = await Promise.all(
      clients.map(async (c) => ({
        client: c,
        stats: await api.getClientStats(c.id),
      })),
    )
    setRows(withStats)
    setTags(t)
    setMasters(m)
    setServices(srv)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const clientsList = useMemo(() => rows.map((r) => r.client), [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const now = new Date()
    let list = rows.filter((r) => {
      if (!q) return true
      return (
        r.client.name.toLowerCase().includes(q) ||
        r.client.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
      )
    })

    if (filter === 'lapsed') {
      list = list.filter((r) => {
        if (!r.stats.lastVisit) return true
        const days =
          (now.getTime() - new Date(r.stats.lastVisit).getTime()) / 86400000
        return days > 45
      })
    } else if (filter === 'frequent') {
      list = list.filter((r) => r.stats.visits >= 3)
    } else if (filter === 'birthday') {
      list = list.filter((r) => {
        if (!r.client.birthday) return false
        const b = new Date(r.client.birthday)
        const next = new Date(now.getFullYear(), b.getMonth(), b.getDate())
        const diff = (next.getTime() - now.getTime()) / 86400000
        return diff >= -1 && diff <= 30
      })
    }

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.client.name.localeCompare(b.client.name)
        case 'visits':
          return b.stats.visits - a.stats.visits
        case 'spent':
          return b.stats.totalSpent - a.stats.totalSpent
        case 'lastVisit':
        default:
          return (
            new Date(b.stats.lastVisit ?? 0).getTime() -
            new Date(a.stats.lastVisit ?? 0).getTime()
          )
      }
    })
    return list
  }, [rows, query, sort, filter])

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Barchasi' },
    { key: 'lapsed', label: 'Uzoq vaqt kelmagan' },
    { key: 'frequent', label: 'Tez-tez keladigan' },
    { key: 'birthday', label: 'Tug‘ilgan kuni yaqin' },
  ]

  const sortChips: { key: SortKey; label: string }[] = [
    { key: 'lastVisit', label: 'Oxirgi tashrif' },
    { key: 'name', label: 'Ism' },
    { key: 'visits', label: 'Tashriflar soni' },
    { key: 'spent', label: 'Jami sarf' },
  ]

  return (
    <div>
      <PageHeader
        title="Mijozlar"
        subtitle={`${rows.length} ta mijoz`}
        actions={
          <Button
            variant="outline"
            onClick={() => toast('Import (Excel) — tez orada')}
          >
            <IconUpload width={18} height={18} />
            <span className="hidden sm:inline">Import (Excel)</span>
          </Button>
        }
      />

      <div className="px-4 py-4 md:px-8">
        {/* search */}
        <div className="relative mb-3 max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone">
            <IconSearch width={18} height={18} />
          </span>
          <Input
            className="pl-10"
            placeholder="Ism yoki telefon bo‘yicha qidiring"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* filters */}
        <div className="mb-2 flex flex-wrap gap-2">
          {filterChips.map((f) => (
            <Chip
              key={f.key}
              active={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Chip>
          ))}
        </div>
        {/* sort */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-2xs text-stone">Saralash:</span>
          {sortChips.map((s) => (
            <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
              {s.label}
            </Chip>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyClients />
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-xs text-stone">
            Tanlangan filtrga mos mijoz topilmadi.
          </p>
        ) : (
          <Card className="overflow-hidden">
            {/* table header (desktop) */}
            <div className="hidden grid-cols-[2fr_1.3fr_1fr_0.8fr_1fr] gap-4 border-b border-hairline-light px-4 py-2.5 text-2xs font-medium text-stone md:grid">
              <span>Mijoz</span>
              <span>Telefon</span>
              <span>Oxirgi tashrif</span>
              <span className="text-right">Tashrif</span>
              <span className="text-right">Jami sarf</span>
            </div>
            <ul>
              {filtered.map((r) => (
                <li key={r.client.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(r.client)}
                    className="grid w-full grid-cols-1 gap-1 border-b border-hairline-light px-4 py-3 text-left last:border-0 hover:bg-graphite/[0.02] md:grid-cols-[2fr_1.3fr_1fr_0.8fr_1fr] md:items-center md:gap-4"
                  >
                    <span className="flex items-center gap-3">
                      <Avatar name={r.client.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-base font-medium text-graphite">
                          {r.client.name}
                        </span>
                        <span className="tabular block text-2xs text-stone md:hidden">
                          {r.client.phone}
                        </span>
                      </span>
                    </span>
                    <span className="tabular hidden text-xs text-graphite md:block">
                      {r.client.phone}
                    </span>
                    <span className="hidden text-xs text-stone md:block">
                      {relativeDays(r.stats.lastVisit)}
                    </span>
                    <span className="tabular hidden text-right text-xs text-graphite md:block">
                      {r.stats.visits}
                    </span>
                    <span className="tabular flex items-center justify-between text-right text-xs font-bold text-graphite md:block">
                      <span className="text-2xs font-normal text-stone md:hidden">
                        {relativeDays(r.stats.lastVisit)} · {r.stats.visits} tashrif
                      </span>
                      {formatMoney(r.stats.totalSpent)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* client card drawer */}
      <ClientCard
        client={selected}
        tags={tags}
        onClose={() => setSelected(null)}
        onBook={(c) => {
          setSelected(null)
          setBookingFor(c)
        }}
      />

      {/* quick booking */}
      <AppointmentSheet
        open={Boolean(bookingFor)}
        onClose={() => setBookingFor(null)}
        onSaved={() => {
          void load()
        }}
        clients={clientsList}
        masters={masters}
        services={services}
        editing={null}
        prefill={null}
        key={bookingFor?.id ?? 'none'}
      />
    </div>
  )
}

// ============================================================
// Client card drawer
// ============================================================
function ClientCard({
  client,
  tags,
  onClose,
  onBook,
}: {
  client: Client | null
  tags: ClientTag[]
  onClose: () => void
  onBook: (c: Client) => void
}) {
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [history, setHistory] = useState<AppointmentView[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!client) return
    setLoading(true)
    void Promise.all([
      api.getClientStats(client.id),
      api.getClientHistory(client.id),
    ]).then(([s, h]) => {
      setStats(s)
      setHistory(h)
      setLoading(false)
    })
  }, [client])

  if (!client) return null
  const clientTags = tags.filter((t) => client.tagIds.includes(t.id))

  return (
    <Sheet
      open={Boolean(client)}
      onClose={onClose}
      title={client.name}
      subtitle={client.phone}
      footer={
        <Button variant="brass" className="w-full" onClick={() => onBook(client)}>
          <IconPlus width={18} height={18} />
          Band qilish
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {/* header */}
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-graphite text-lg font-bold text-bone">
            {monogram(client.name)}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-medium text-graphite">{client.name}</p>
            <p className="tabular flex items-center gap-1.5 text-xs text-stone">
              <IconPhone width={14} height={14} />
              {client.phone}
            </p>
          </div>
        </div>

        {/* tags */}
        {clientTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {clientTags.map((t) => (
              <span
                key={t.id}
                className="rounded-full bg-brass/15 px-2.5 py-0.5 text-2xs font-medium text-[#9a7a2e]"
              >
                {t.label}
              </span>
            ))}
          </div>
        )}

        {/* meta */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[10px] bg-white p-3">
            <p className="mb-0.5 flex items-center gap-1 text-2xs text-stone">
              <IconCake width={14} height={14} />
              Tug‘ilgan sana
            </p>
            <p className="tabular text-xs text-graphite">
              {formatDateDot(client.birthday)}
            </p>
          </div>
          <div className="rounded-[10px] bg-white p-3">
            <p className="mb-0.5 text-2xs text-stone">Izoh</p>
            <p className="text-xs text-graphite">
              {client.note || '—'}
            </p>
          </div>
        </div>

        {/* stats */}
        {loading || !stats ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Jami tashrif" value={String(stats.visits)} />
            <StatBox label="Jami sarf" value={formatMoney(stats.totalSpent)} mono />
            <StatBox label="O‘rtacha chek" value={formatMoney(stats.averageCheck)} mono />
          </div>
        )}

        {/* history */}
        <div>
          <p className="mb-2 text-xs font-medium text-graphite">
            Tashriflar tarixi
          </p>
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-stone">Hali tashrif yo‘q.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((a) => (
                <div key={a.id} className="h-16">
                  <AppointmentTicketCompact appt={a} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}

function StatBox({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-[10px] bg-graphite/[0.04] p-3 text-center">
      <p className={cn('font-bold text-graphite', mono ? 'tabular text-xs' : 'text-lg')}>
        {value}
      </p>
      <p className="mt-0.5 text-2xs text-stone">{label}</p>
    </div>
  )
}

function EmptyClients() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-graphite/[0.05] text-stone">
        <IconUsers width={26} height={26} />
      </span>
      <p className="text-base font-medium text-graphite">Hali mijoz yo‘q</p>
      <p className="max-w-xs text-xs text-stone">
        Birinchi bandlov avtomatik qo‘shiladi. Yoki Excel’dan import qiling.
      </p>
    </div>
  )
}
