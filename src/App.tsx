import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AuthPage from './components/auth/AuthPage'
import AppLayout from './components/layout/AppLayout'
import EventsView from './components/events/EventsView'
import FocusView from './components/focus/FocusView'
import StatsView from './components/stats/StatsView'
import TodoView from './components/todo/TodoView'
import AssignmentsView from './components/assignments/AssignmentsView'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="text-gold text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/events" element={<EventsView />} />
        <Route path="/focus" element={<FocusView />} />
        <Route path="/stats" element={<StatsView />} />
        <Route path="/todos" element={<TodoView />} />
        <Route path="/assignments" element={<AssignmentsView />} />
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Route>
    </Routes>
  )
}

function AuthRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/events" replace />
  return <AuthPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
