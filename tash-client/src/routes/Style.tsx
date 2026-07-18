import { useCallback, useState } from 'react'
import type { Appointment, AppointmentStatus } from '@/types'
import {
  AppointmentTicket,
  Avatar,
  BottomSheet,
  Button,
  Card,
  Chip,
  Input,
  Select,
  Skeleton,
  StatusChip,
  Tag,
} from '@/components/ui'
import { useHaptics, useMainButton } from '@/telegram/hooks'
import { formatSoum } from '@/lib/format'

const COLORS: { name: string; token: string; hex: string; className: string; text?: string }[] = [
  { name: 'graphite', token: 'bg-graphite', hex: '#1C1F22', className: 'bg-graphite border border-hairline' },
  { name: 'slate', token: 'bg-slate', hex: '#26292E', className: 'bg-slate border border-hairline' },
  { name: 'bone', token: 'bg-bone', hex: '#F4F3EF', className: 'bg-bone', text: 'text-graphite' },
  { name: 'stone', token: 'bg-stone', hex: '#9A948A', className: 'bg-stone', text: 'text-graphite' },
  { name: 'brass', token: 'bg-brass', hex: '#C9A24B', className: 'bg-brass', text: 'text-graphite' },
  { name: 'sage', token: 'bg-sage', hex: '#5B8A6A', className: 'bg-sage', text: 'text-graphite' },
  { name: 'clay', token: 'bg-clay', hex: '#C25436', className: 'bg-clay', text: 'text-bone' },
]

const TYPE_SCALE = [
  { px: 40, cls: 'text-3xl', label: 'Display 40' },
  { px: 28, cls: 'text-2xl', label: 'Heading 28' },
  { px: 20, cls: 'text-lg', label: 'Title 20' },
  { px: 16, cls: 'text-base', label: 'Body 16' },
  { px: 14, cls: 'text-sm', label: 'Small 14' },
  { px: 12, cls: 'text-xs', label: 'Caption 12' },
]

const STATUSES: AppointmentStatus[] = ['booked', 'confirmed', 'completed', 'no_show', 'cancelled']

function makeAppointment(status: AppointmentStatus): Appointment {
  return {
    id: status,
    salonName: 'TASH Studio',
    masterName: 'Bekzod',
    services: [{ name: 'Soch + soqol', durationMin: 75, priceSoum: 170000 }],
    startAt: '2026-07-20T14:30:00+05:00',
    endAt: '2026-07-20T15:45:00+05:00',
    durationMin: 75,
    priceTotal: 170000,
    status,
  }
}

export default function Style() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedChip, setSelectedChip] = useState('Soch')
  const haptics = useHaptics()

  const onMain = useCallback(() => haptics.success(), [haptics])
  useMainButton({ text: 'Band qilish', onClick: onMain })

  return (
    <div className="px-5 py-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-bone">TASH</h1>
        <p className="mt-1 text-sm text-stone">Dizayn tizimi — style tile</p>
      </header>

      {/* Palette */}
      <Section title="Ranglar">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLORS.map((c) => (
            <div key={c.name} className="overflow-hidden rounded-[14px] border border-hairline">
              <div className={`flex h-16 items-end p-2 ${c.className}`}>
                <span className={`text-xs ${c.text ?? 'text-bone'}`}>{c.name}</span>
              </div>
              <div className="bg-slate px-2 py-1.5">
                <span className="font-mono text-[11px] text-stone">{c.hex}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Type scale */}
      <Section title="Shriftlar">
        <div className="space-y-3">
          {TYPE_SCALE.map((t) => (
            <div key={t.label} className="flex items-baseline justify-between gap-4">
              <span className={`font-display ${t.cls} text-bone`}>Ag</span>
              <span className="text-xs text-stone">{t.label}</span>
            </div>
          ))}
          <div className="mt-4 space-y-1 border-t border-hairline pt-4">
            <p className="font-display text-lg text-bone">Clash Display — sarlavhalar</p>
            <p className="font-body text-base text-bone">Satoshi — barcha UI va matn</p>
            <p className="font-mono text-base text-brass">Space Mono — {formatSoum(120000)} · 14:30</p>
          </div>
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Tugmalar">
        <div className="flex flex-wrap gap-3">
          <Button>Band qilish</Button>
          <Button variant="secondary">Ikkilamchi</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Bekor qilish</Button>
          <Button loading>Yuklanmoqda</Button>
          <Button disabled>O‘chirilgan</Button>
        </div>
      </Section>

      {/* Inputs */}
      <Section title="Kiritish maydonlari">
        <div className="space-y-4">
          <Input label="Ism" placeholder="Ismingiz" />
          <Input label="Telefon" placeholder="+998" hint="Telegram orqali olinadi" />
          <Input label="Izoh" placeholder="Xato holat" error="Bu maydon to‘ldirilishi shart" />
          <Select label="Usta" defaultValue="">
            <option value="" disabled>
              Tanlang
            </option>
            <option>Bekzod</option>
            <option>Sardor</option>
            <option>Jasur</option>
          </Select>
        </div>
      </Section>

      {/* Chips & tags */}
      <Section title="Chip va teglar">
        <div className="flex flex-wrap gap-2">
          {['Soch', 'Soqol', 'Kompleks'].map((c) => (
            <Chip key={c} selected={selectedChip === c} onClick={() => setSelectedChip(c)}>
              {c}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Tag>Hozir ochiq</Tag>
          <Tag>10:00–21:00</Tag>
          <Tag>1.2 km</Tag>
        </div>
      </Section>

      {/* Status chips */}
      <Section title="Status chiplari">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <StatusChip key={s} status={s} />
          ))}
        </div>
      </Section>

      {/* Avatars */}
      <Section title="Avatar / monogramma">
        <div className="flex items-center gap-3">
          <Avatar name="Bekzod Karimov" size="sm" />
          <Avatar name="Sardor" size="md" />
          <Avatar name="Jasur Aliyev" size="lg" />
        </div>
      </Section>

      {/* Card + sheet */}
      <Section title="Karta va BottomSheet">
        <Card className="p-4">
          <p className="text-sm text-bone">Bu — ko‘tarilgan sirt (slate + hairline).</p>
          <Button className="mt-3" variant="secondary" onClick={() => setSheetOpen(true)}>
            BottomSheet ochish
          </Button>
        </Card>
      </Section>

      {/* Skeletons */}
      <Section title="Skeleton (yuklanish)">
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </Section>

      {/* Signature ticket — full */}
      <Section title="AppointmentTicket — to‘liq">
        <AppointmentTicket appointment={makeAppointment('confirmed')} />
      </Section>

      {/* Signature ticket — compact, every status */}
      <Section title="AppointmentTicket — compact (barcha statuslar)">
        <div className="space-y-2">
          {STATUSES.map((s) => (
            <AppointmentTicket key={s} appointment={makeAppointment(s)} variant="compact" onClick={() => {}} />
          ))}
        </div>
      </Section>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Bandlovni bekor qilasizmi?"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setSheetOpen(false)}>
              Yo‘q
            </Button>
            <Button variant="destructive" fullWidth onClick={() => setSheetOpen(false)}>
              Ha, bekor qilish
            </Button>
          </div>
        }
      >
        <p className="text-sm text-stone">
          Bu amalni ortga qaytarib bo‘lmaydi. Bandlovingiz bekor qilinadi va vaqt bo‘shatiladi.
        </p>
      </BottomSheet>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-stone">{title}</h2>
      {children}
    </section>
  )
}
