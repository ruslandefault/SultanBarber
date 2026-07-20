// ============================================================
// TASH admin — tiny fetch wrapper around the live FastAPI backend.
// - base URL from VITE_API_URL (default http://localhost:8000)
// - attaches `Authorization: Bearer <token>` from localStorage
// - parses JSON, throws ApiError { status, message (Uzbek), code }
// - maps HTTP 409 -> "Bu vaqt band" (appointment slot conflict)
// ============================================================

export const TOKEN_KEY = 'tash_token'

const BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  code: string
  constructor(message: string, status: number, code = 'error') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

let redirecting = false
/** Token eskirganda: saqlangan sessiyani tozalab, login gate'ga qaytaramiz. */
function handleUnauthorized(): void {
  if (redirecting) return // bir vaqtda bir nechta 401 kelsa, faqat bir marta
  redirecting = true
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('tash_role')
  localStorage.removeItem('tash_salon_id')
  window.location.reload()
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { ...authHeaders() }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    // Token eskirgan/yaroqsiz (401) → sessiyani tozalab, login oynasiga
    // qaytaramiz. Aks holda sahifa cheksiz "loading"da qolib ketardi.
    if (res.status === 401 && !path.startsWith('/auth/login')) {
      handleUnauthorized()
    }
    let message = 'Xatolik yuz berdi'
    let code = 'error'
    try {
      const data = (await res.json()) as { message?: string; code?: string }
      if (data?.message) message = data.message
      if (data?.code) code = data.code
    } catch {
      // non-JSON error body (e.g. 500 "Internal Server Error") — keep default
    }
    // Appointment slot conflicts always surface a consistent Uzbek message.
    if (res.status === 409) message = 'Bu vaqt band'
    throw new ApiError(message, res.status, code)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

async function upload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(), // no Content-Type: browser sets multipart boundary
    body: form,
  })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    let message = 'Yuklashda xatolik'
    let code = 'error'
    try {
      const data = (await res.json()) as { message?: string; code?: string }
      if (data?.message) message = data.message
      if (data?.code) code = data.code
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status, code)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** Resolve a stored media path ("/uploads/x.jpg") to a URL the browser can load. */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//.test(path) || path.startsWith('data:')) return path
  return `${BASE_URL}${path}`
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
  upload,
}
