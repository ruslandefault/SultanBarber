import { NavLink, Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  IconCalendar,
  IconUsers,
  IconScissors,
  IconMaster,
  IconBag,
  IconSettings,
  IconLogout,
} from '@/components/icons'
import { logout } from '@/lib/auth'
import { cn } from '@/lib/cn'

function handleLogout() {
  logout()
  window.location.reload()
}

interface NavItem {
  to: string
  label: string
  icon: (p: { width?: number; height?: number }) => ReactNode
}

const NAV: NavItem[] = [
  { to: '/', label: 'Jadval', icon: IconCalendar },
  { to: '/mijozlar', label: 'Mijozlar', icon: IconUsers },
  { to: '/xizmatlar', label: 'Xizmatlar', icon: IconScissors },
  { to: '/ustalar', label: 'Ustalar', icon: IconMaster },
  { to: '/mahsulotlar', label: 'Mahsulotlar', icon: IconBag },
  { to: '/sozlamalar', label: 'Sozlamalar', icon: IconSettings },
]

const SALON_NAME = 'Sultan Barber'

export function Shell() {
  return (
    <div className="flex min-h-screen bg-bone">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-graphite md:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-brass font-display text-lg font-semibold text-graphite">
            SB
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-bone">
              {SALON_NAME}
            </p>
            <p className="text-2xs text-stone">Admin panel</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-xs font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-slate text-bone'
                    : 'text-stone hover:bg-slate/60 hover:text-bone',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-brass' : ''}>
                    <item.icon width={20} height={20} />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-hairline-dark px-3 py-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-xs font-medium text-stone transition-colors hover:bg-slate/60 hover:text-clay"
          >
            <IconLogout width={20} height={20} />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-hairline-dark bg-graphite md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-brass' : 'text-stone',
              )
            }
          >
            <item.icon width={22} height={22} />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-stone"
        >
          <IconLogout width={22} height={22} />
          Chiqish
        </button>
      </nav>
    </div>
  )
}
