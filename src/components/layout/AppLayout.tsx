import { lazy, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

const FloatingTimer = lazy(() => import('../focus/FloatingTimer'))

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-void overflow-hidden">
      <Sidebar />
      <Suspense fallback={null}>
        <FloatingTimer />
      </Suspense>
      <main className="flex-1 overflow-auto pt-10 px-10 pb-8 relative z-10">
        <Outlet />
      </main>
    </div>
  )
}
