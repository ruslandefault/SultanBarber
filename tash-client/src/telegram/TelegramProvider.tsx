import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  init,
  isTMA,
  backButton,
  hapticFeedback,
  initData,
  mainButton,
  miniApp,
  retrieveRawInitData,
  swipeBehavior,
  themeParams,
  viewport,
} from '@telegram-apps/sdk-react'
import type { User } from '@telegram-apps/sdk'
import { setInitData } from '@/lib/api'
import {
  TelegramContext,
  noopHaptics,
  type Haptics,
  type MainButtonConfig,
  type TelegramContextValue,
} from './context'

const GRAPHITE = '#1c1f22'
const BRASS = '#c9a24b'

/** Run an SDK call, swallowing "unsupported/unavailable" errors. */
function safe(fn: () => void): void {
  try {
    fn()
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[tg]', err)
  }
}

function applyInsets(): void {
  const root = document.documentElement.style
  const top = num(() => viewport.safeAreaInsetTop()) + num(() => viewport.contentSafeAreaInsetTop())
  const bottom = num(() => viewport.safeAreaInsetBottom()) + num(() => viewport.contentSafeAreaInsetBottom())
  root.setProperty('--safe-top', `${top}px`)
  root.setProperty('--safe-bottom', `${bottom}px`)
  const stable = num(() => viewport.stableHeight())
  if (stable > 0) root.setProperty('--app-height', `${stable}px`)
}

function num(read: () => number | undefined): number {
  try {
    return read() ?? 0
  } catch {
    return 0
  }
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [isTelegram, setIsTelegram] = useState(false)
  const [ready, setReady] = useState(false)
  const [initDataRaw, setInitDataRaw] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [fallbackMainButton, setFallbackMainButton] = useState<MainButtonConfig | null>(null)

  const mainButtonRef = useRef<MainButtonConfig | null>(null)
  const backButtonRef = useRef<(() => void) | null>(null)

  // ── Boot the SDK ────────────────────────────────────────────
  useEffect(() => {
    let unsubs: Array<() => void> = []

    async function boot() {
      if (!isTMA()) {
        setReady(true)
        return
      }
      try {
        init()

        safe(() => miniApp.mountSync())
        safe(() => themeParams.mountSync())
        safe(() => backButton.mount())
        safe(() => mainButton.mount())
        safe(() => swipeBehavior.mount())

        if (viewport.mount.isAvailable()) {
          await viewport.mount()
        }
        safe(() => viewport.expand())

        // Keep the brand dark regardless of the user's Telegram theme.
        safe(() => miniApp.setHeaderColor(GRAPHITE))
        safe(() => miniApp.setBackgroundColor(GRAPHITE))
        safe(() => miniApp.setBottomBarColor(GRAPHITE))

        // Avoid accidental swipe-to-close while scrolling.
        safe(() => swipeBehavior.disableVertical())

        // Default main-button styling (brass on graphite).
        safe(() => mainButton.setParams({ backgroundColor: BRASS, textColor: GRAPHITE, isVisible: false }))

        applyInsets()
        unsubs = [
          safeSub(() => viewport.safeAreaInsets.sub(applyInsets)),
          safeSub(() => viewport.contentSafeAreaInsets.sub(applyInsets)),
          safeSub(() => viewport.stableHeight.sub(applyInsets)),
        ]

        safe(() => miniApp.ready())

        const raw = retrieveRawInitData() ?? ''
        setInitDataRaw(raw)
        setInitData(raw)
        safe(() => initData.restore())
        setUser(initData.user() ?? null)
        setIsTelegram(true)
      } catch (err) {
        console.warn('[tg] init failed, running in browser mode', err)
      } finally {
        setReady(true)
      }
    }

    boot()
    return () => unsubs.forEach((u) => u())
  }, [])

  // ── Drive the native main button from React state ───────────
  const setMainButton = useCallback(
    (config: MainButtonConfig | null) => {
      mainButtonRef.current = config
      setFallbackMainButton(config)
      if (!isTelegram) return

      if (!config || config.visible === false || !config.text) {
        safe(() => mainButton.setParams({ isVisible: false }))
        return
      }
      safe(() =>
        mainButton.setParams({
          text: config.text,
          isVisible: true,
          isEnabled: config.enabled !== false,
          isLoaderVisible: config.loading === true,
          backgroundColor: BRASS,
          textColor: GRAPHITE,
        }),
      )
    },
    [isTelegram],
  )

  // Register/deregister the native click handler when the config changes.
  useEffect(() => {
    if (!isTelegram || !fallbackMainButton?.onClick) return
    const handler = () => mainButtonRef.current?.onClick()
    const off = mainButton.onClick(handler)
    return () => off()
  }, [isTelegram, fallbackMainButton?.onClick])

  const setBackButton = useCallback(
    (onClick: (() => void) | null) => {
      backButtonRef.current = onClick
      if (!isTelegram) return
      if (onClick) safe(() => backButton.show())
      else safe(() => backButton.hide())
    },
    [isTelegram],
  )

  useEffect(() => {
    if (!isTelegram) return
    const handler = () => backButtonRef.current?.()
    const off = backButton.onClick(handler)
    return () => off()
  }, [isTelegram])

  // ── Haptics ─────────────────────────────────────────────────
  const haptics = useMemo<Haptics>(() => {
    if (!isTelegram) return noopHaptics
    return {
      selection: () => safe(() => hapticFeedback.selectionChanged()),
      impact: (style = 'medium') => safe(() => hapticFeedback.impactOccurred(style)),
      notify: (type) => safe(() => hapticFeedback.notificationOccurred(type)),
      success: () => safe(() => hapticFeedback.notificationOccurred('success')),
      warning: () => safe(() => hapticFeedback.notificationOccurred('warning')),
      error: () => safe(() => hapticFeedback.notificationOccurred('error')),
    }
  }, [isTelegram])

  const value = useMemo<TelegramContextValue>(
    () => ({
      isTelegram,
      ready,
      initDataRaw,
      user,
      haptics,
      setMainButton,
      setBackButton,
      fallbackMainButton,
    }),
    [isTelegram, ready, initDataRaw, user, haptics, setMainButton, setBackButton, fallbackMainButton],
  )

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>
}

function safeSub(sub: () => () => void): () => void {
  try {
    return sub()
  } catch {
    return () => {}
  }
}
