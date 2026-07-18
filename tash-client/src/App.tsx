import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Splash } from '@/components/Splash'

// Lazy-load routes to keep the initial bundle small (mid/low-end Android).
const SalonHome = lazy(() => import('@/routes/SalonHome'))
const Booking = lazy(() => import('@/routes/Booking'))
const MyBookings = lazy(() => import('@/routes/MyBookings'))
const Style = lazy(() => import('@/routes/Style'))

function App() {
  return (
    <AppShell>
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route path="/" element={<SalonHome />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/appointments" element={<MyBookings />} />
          <Route path="/style" element={<Style />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

export default App
