import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import FloatingTimer from '../focus/FloatingTimer'

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-void overflow-hidden">
      <Sidebar />
      <FloatingTimer />
      <main className="flex-1 overflow-auto pt-10 px-10 pb-8 relative z-10">
        <Outlet />
      </main>
    </div>
  )
}
