import { useContext, useEffect } from 'react'
import { TelegramContext, type Haptics, type MainButtonConfig } from './context'

export function useTelegram() {
  const ctx = useContext(TelegramContext)
  if (!ctx) throw new Error('useTelegram must be used inside <TelegramProvider>')
  return ctx
}

/**
 * Drive the primary action button for the current screen.
 * Native Telegram MainButton inside Telegram; a fallback bottom bar in browser.
 * Pass a stable `onClick` (wrap in useCallback) to avoid re-registering each render.
 */
export function useMainButton(config: MainButtonConfig | null): void {
  const { setMainButton } = useTelegram()
  const { text, onClick, visible, enabled, loading } = config ?? {}
  useEffect(() => {
    if (!config || !text || !onClick) {
      setMainButton(null)
      return
    }
    setMainButton({ text, onClick, visible, enabled, loading })
    return () => setMainButton(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, onClick, visible, enabled, loading, setMainButton])
}

/** Wire the Telegram BackButton to a handler. Pass null to hide it. */
export function useBackButton(onClick: (() => void) | null): void {
  const { setBackButton } = useTelegram()
  useEffect(() => {
    setBackButton(onClick)
    return () => setBackButton(null)
  }, [onClick, setBackButton])
}

export function useHaptics(): Haptics {
  return useTelegram().haptics
}

/** Brand stays dark; exposes whether we're inside Telegram. */
export function useTheme(): { isDark: boolean; isTelegram: boolean } {
  const { isTelegram } = useTelegram()
  return { isDark: true, isTelegram }
}

export function useInitData(): { raw: string; user: ReturnType<typeof useTelegram>['user'] } {
  const { initDataRaw, user } = useTelegram()
  return { raw: initDataRaw, user }
}
