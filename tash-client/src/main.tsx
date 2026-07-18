import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { TelegramProvider } from './telegram/TelegramProvider.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// Console inside the Telegram webview during development.
if (import.meta.env.DEV) {
  import('eruda').then(({ default: eruda }) => eruda.init()).catch(() => {})
}

// Surface errors that happen OUTSIDE React (chunk load fails, SDK errors,
// promise rejections) as an on-screen banner — Telegram has no console.
function showFatalBanner(message: string) {
  if (document.getElementById('tash-fatal')) return
  const el = document.createElement('div')
  el.id = 'tash-fatal'
  el.style.cssText =
    'position:fixed;left:0;right:0;top:0;z-index:9999;background:#C25436;color:#F4F3EF;' +
    'font:12px/1.4 monospace;padding:10px 14px;white-space:pre-wrap;word-break:break-word'
  el.textContent = 'Xatolik: ' + message
  document.body.appendChild(el)
}
window.addEventListener('error', (e) => showFatalBanner(e.message || String(e.error)))
window.addEventListener('unhandledrejection', (e) =>
  showFatalBanner(e.reason?.message || String(e.reason)),
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <TelegramProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TelegramProvider>
    </ErrorBoundary>
  </StrictMode>,
)
