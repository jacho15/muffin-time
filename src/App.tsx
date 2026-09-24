import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Moon } from 'lucide-react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { FocusTimerProvider } from './hooks/useFocusTimer'
import { ToastProvider } from './hooks/useToast'
import ErrorBoundary from './components/ErrorBoundary'
import AppLayout from './components/layout/AppLayout'

const AuthPage = lazy(() => import('./components/auth/AuthPage'))
const EventsView = lazy(() => import('./components/events/EventsView'))
const FocusView = lazy(() => import('./components/focus/FocusView'))
const StatsView = lazy(() => import('./components/stats/StatsView'))
const TasksView = lazy(() => import('./components/tasks/TasksView'))
const LifestyleView = lazy(() => import('./components/lifestyle/LifestyleView'))

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

function LazyView({ children }: { children: ReactNode }) {
  return <Suspense fallback={<CosmicLoader />}>{children}</Suspense>
}

function ProtectedRoutes() {
  const { user, isGuest, loading } = useAuth()

  if (loading) return <CosmicLoader />
  if (!user && !isGuest) return <Navigate to="/auth" replace />

  return (
    <ToastProvider>
      <FocusTimerProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route
              path="/events"
              element={
                <LazyView>
                  <EventsView />
                </LazyView>
              }
            />
            <Route
              path="/focus"
              element={
                <LazyView>
                  <FocusView />
                </LazyView>
              }
            />
            <Route
              path="/stats"
              element={
                <LazyView>
                  <StatsView />
                </LazyView>
              }
            />
            <Route
              path="/tasks"
              element={
                <LazyView>
                  <TasksView />
                </LazyView>
              }
            />
            <Route
              path="/lifestyle"
              element={
                <LazyView>
                  <LifestyleView />
                </LazyView>
              }
            />
            <Route path="*" element={<Navigate to="/events" replace />} />
          </Route>
        </Routes>
      </FocusTimerProvider>
    </ToastProvider>
  )
}

function AuthRoute() {
  const { user, isGuest, loading } = useAuth()
  if (loading) return null
  if (user || isGuest) return <Navigate to="/events" replace />
  return (
    <LazyView>
      <AuthPage />
    </LazyView>
  )
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
