import type { ReactNode } from 'react'
import { useTelegram } from '@/telegram/hooks'
import { Button } from '@/components/ui'
import { Splash } from '@/components/Splash'

/**
 * App shell wired to Telegram: graphite background, safe-area aware,
 * and a MainButton region. Inside Telegram the primary action is the native
 * MainButton; in a browser we render a fallback fixed bar so screens stay testable.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { ready, isTelegram, fallbackMainButton } = useTelegram()

  const showFallback = !isTelegram && fallbackMainButton && fallbackMainButton.visible !== false

  return (
    <div className="relative mx-auto flex min-h-app w-full max-w-md flex-col bg-graphite pt-safe">
      {!ready ? (
        <Splash />
      ) : (
        <main className={showFallback ? 'flex-1 pb-24' : 'flex-1 pb-safe'}>{children}</main>
      )}

      {showFallback && fallbackMainButton && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-hairline bg-graphite/95 px-4 pt-3 pb-safe backdrop-blur">
          <Button
            fullWidth
            size="lg"
            loading={fallbackMainButton.loading}
            disabled={fallbackMainButton.enabled === false}
            onClick={fallbackMainButton.onClick}
          >
            {fallbackMainButton.text}
          </Button>
        </div>
      )}
    </div>
  )
}
