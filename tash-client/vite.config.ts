import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // LAN/tunnel orqali kirishga ruxsat
    // ngrok (va boshqa tunnel) hostlariga ruxsat. Boshidagi "." subdomenlarni qamraydi.
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io', '.trycloudflare.com'],
    // /api → backend (8001). Shu proxy tufayli bitta tunnel (client) yetarli:
    // Telegram Mini App /api/... ga so'rov yuboradi, Vite uni backendga uzatadi.
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
  },
})
