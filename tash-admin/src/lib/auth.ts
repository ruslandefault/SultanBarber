// ============================================================
// TASH admin — auth helpers (JWT bearer against the FastAPI backend).
// Token + identity are kept in localStorage; http.ts reads the token.
// ============================================================

import { http, TOKEN_KEY } from '@/lib/http'

const ROLE_KEY = 'tash_role'
const SALON_KEY = 'tash_salon_id'

interface TokenOut {
  access_token: string
  token_type: string
  role: string
  salon_id: number
}

export async function login(email: string, password: string): Promise<void> {
  const data = await http.post<TokenOut>('/auth/login', {
    email: email.trim(),
    password,
  })
  localStorage.setItem(TOKEN_KEY, data.access_token)
  localStorage.setItem(ROLE_KEY, data.role)
  localStorage.setItem(SALON_KEY, String(data.salon_id))
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(SALON_KEY)
}

export function isAuthed(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}

export function currentRole(): string | null {
  return localStorage.getItem(ROLE_KEY)
}
