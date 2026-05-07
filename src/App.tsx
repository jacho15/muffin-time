import { lazy, Profiler, Suspense, type ReactElement } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

const isDev = import.meta.env.DEV

function onViewRender(id: string, _phase: 'mount' | 'update' | 'nested-update', actualDuration: number) {
  if (!import.meta.env.DEV) return
  if (actualDuration < 12) return
  console.debug(`[Profiler] ${id} took ${actualDuration.toFixed(1)}ms`)
}

const wrapWithProfiler = (id: string, element: ReactElement) =>
  isDev ? <Profiler id={id} onRender={onViewRender}>{element}</Profiler> : element

function CosmicLoader() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="w-16 h-16 rounded-full border-2 border-stardust/20 border-t-stardust animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Moon size={24} className="text-gold" fill="currentColor" strokeWidth={0} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ProtectedRoutes() {
  const { user, isGuest, loading } = useAuth()

  if (loading) return <CosmicLoader />
  if (!user && !isGuest) return <Navigate to="/auth" replace />

  return (
    <FocusTimerProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/events" element={wrapWithProfiler('EventsView', <Suspense fallback={<CosmicLoader />}><EventsView /></Suspense>)} />
          <Route path="/focus" element={wrapWithProfiler('FocusView', <Suspense fallback={<CosmicLoader />}><FocusView /></Suspense>)} />
          <Route path="/stats" element={wrapWithProfiler('StatsView', <Suspense fallback={<CosmicLoader />}><StatsView /></Suspense>)} />
          <Route path="/tasks" element={wrapWithProfiler('TasksView', <Suspense fallback={<CosmicLoader />}><TasksView /></Suspense>)} />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Route>
      </Routes>
    </FocusTimerProvider>
  )
}

function AuthRoute() {
  const { user, isGuest, loading } = useAuth()
  if (loading) return null
  if (user || isGuest) return <Navigate to="/events" replace />
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
