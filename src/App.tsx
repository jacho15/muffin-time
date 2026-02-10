import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Moon } from 'lucide-react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { FocusTimerProvider } from './hooks/useFocusTimer'
import ErrorBoundary from './components/ErrorBoundary'
import AppLayout from './components/layout/AppLayout'

const AuthPage = lazy(() => import('./components/auth/AuthPage'))
const EventsView = lazy(() => import('./components/events/EventsView'))
const FocusView = lazy(() => import('./components/focus/FocusView'))
const StatsView = lazy(() => import('./components/stats/StatsView'))
const TasksView = lazy(() => import('./components/tasks/TasksView'))

function CosmicLoader() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="relative w-16 h-16"
        >
          {/* Orbit ring */}
          <div
            className="absolute inset-0 rounded-full border border-stardust/30"
          />
          {/* Orbiting dot */}
          <motion.div
            className="absolute w-2 h-2 rounded-full bg-stardust"
            style={{ top: '-4px', left: 'calc(50% - 4px)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
          {/* Center moon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Moon size={24} className="text-gold" fill="currentColor" strokeWidth={0} />
          </div>
        </motion.div>
        <motion.div
          className="flex gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-stardust/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  )
}

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) return <CosmicLoader />
  if (!user) return <Navigate to="/auth" replace />

  return (
    <FocusTimerProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/events" element={<Suspense fallback={<CosmicLoader />}><EventsView /></Suspense>} />
          <Route path="/focus" element={<Suspense fallback={<CosmicLoader />}><FocusView /></Suspense>} />
          <Route path="/stats" element={<Suspense fallback={<CosmicLoader />}><StatsView /></Suspense>} />
          <Route path="/tasks" element={<Suspense fallback={<CosmicLoader />}><TasksView /></Suspense>} />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Route>
      </Routes>
    </FocusTimerProvider>
  )
}

function AuthRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/events" replace />
  return <Suspense fallback={<CosmicLoader />}><AuthPage /></Suspense>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}
