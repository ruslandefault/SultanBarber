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

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
}
