import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/**
 * Catches render/runtime errors and shows them ON SCREEN.
 * Inside Telegram there's no console, so a black screen tells you nothing —
 * this turns any crash into a readable message + a reload button.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[TASH] render error:', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-app flex-col items-center justify-center gap-4 bg-graphite px-8 text-center">
        <span className="font-display text-2xl tracking-tight text-brass">TASH</span>
        <div>
          <p className="font-display text-lg text-bone">Xatolik yuz berdi</p>
          <p className="mt-2 max-w-xs break-words font-mono text-xs text-clay">
            {this.state.error.message || String(this.state.error)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-[10px] bg-brass px-5 py-2.5 text-sm font-medium text-graphite"
        >
          Qayta yuklash
        </button>
      </div>
    )
  }
}
