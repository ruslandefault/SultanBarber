import { createContext } from 'react'
import type { User } from '@telegram-apps/sdk'

export type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
export type NotificationType = 'success' | 'warning' | 'error'

export interface Haptics {
  selection(): void
  impact(style?: ImpactStyle): void
  notify(type: NotificationType): void
  success(): void
  warning(): void
  error(): void
}

export interface MainButtonConfig {
  text: string
  onClick: () => void
  visible?: boolean
  enabled?: boolean
  loading?: boolean
}

export interface TelegramContextValue {
  /** True when running inside a real Telegram client. */
  isTelegram: boolean
  /** SDK finished its boot attempt (success or graceful fallback). */
  ready: boolean
  /** Raw initData string forwarded to the backend for HMAC validation. */
  initDataRaw: string
  user: User | null
  haptics: Haptics
  /** Drive the primary action button (native in Telegram, fallback bar in browser). */
  setMainButton: (config: MainButtonConfig | null) => void
  /** Show/hide the back button and wire its click. Pass null to hide. */
  setBackButton: (onClick: (() => void) | null) => void
  /** Current fallback main-button state (used by AppShell when not in Telegram). */
  fallbackMainButton: MainButtonConfig | null
}

export const noopHaptics: Haptics = {
  selection() {},
  impact() {},
  notify() {},
  success() {},
  warning() {},
  error() {},
}

export const TelegramContext = createContext<TelegramContextValue | null>(null)
