import { useState } from 'react'
import type { FormEvent } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { Journal } from '@/screens/Journal'
import { Clients } from '@/screens/Clients'
import { Catalog } from '@/screens/Catalog'
import { Products } from '@/screens/Products'
import { Settings } from '@/screens/Settings'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { isAuthed, login } from '@/lib/auth'
import { ApiError } from '@/lib/http'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Journal /> },
      { path: 'mijozlar', element: <Clients /> },
      { path: 'xizmatlar', element: <Catalog tab="services" /> },
      { path: 'ustalar', element: <Catalog tab="masters" /> },
      { path: 'mahsulotlar', element: <Products /> },
      { path: 'sozlamalar', element: <Settings /> },
      { path: '*', element: <Journal /> },
    ],
  },
])

function LoginGate({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Email va parolni kiriting.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
      onDone()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Kirishda xatolik yuz berdi.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bone px-4">
      <div className="w-full max-w-sm rounded-[14px] border border-hairline-light bg-white p-7 shadow-sm">
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[10px] bg-graphite text-lg font-bold text-brass"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            T
          </div>
          <h1
            className="text-lg font-semibold text-graphite"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            TASH boshqaruv paneli
          </h1>
          <p className="mt-1 text-xs text-stone">Davom etish uchun tizimga kiring</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              placeholder="owner@tash.uz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              invalid={Boolean(error)}
            />
          </Field>
          <Field label="Parol" error={error ?? undefined}>
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={Boolean(error)}
            />
          </Field>
          <Button type="submit" variant="brass" size="lg" disabled={busy}>
            {busy ? 'Kirilmoqda…' : 'Kirish'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export function App() {
  const [authed, setAuthed] = useState(isAuthed())
  if (!authed) return <LoginGate onDone={() => setAuthed(true)} />
  return <RouterProvider router={router} />
}
