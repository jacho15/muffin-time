import { startTransition } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Calendar, Timer, BarChart3, ListTodo, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/events', icon: Calendar, label: 'Events' },
  { to: '/focus', icon: Timer, label: 'Focus' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks' },
]

export default function Sidebar() {
  const { signOut, isGuest } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside className="w-16 h-screen bg-void/80 backdrop-blur-xl border-r border-glass-border flex flex-col items-center py-4 shrink-0 relative z-20"
      style={{
        boxShadow: '1px 0 20px rgba(74, 27, 109, 0.15)',
      }}
    >
      <nav className="flex flex-col gap-2 flex-1 pt-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to
          return (
            <div
              key={to}
              className="relative group"
            >
              <button
                type="button"
                onClick={() => startTransition(() => navigate(to))}
                title={label}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative z-10 bg-transparent border-none cursor-pointer p-0"
              >
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-lg bg-cosmic-purple/40 transition-colors duration-200 ease-out"
                    style={{ boxShadow: '0 0 15px rgba(196, 160, 255, 0.2)' }}
                  />
                )}
                <div className="relative z-10 transition-transform duration-200 hover:scale-[1.15]">
                  <Icon
                    size={20}
                    className={`transition-colors ${
                      isActive ? 'text-stardust' : 'text-star-white/50 hover:text-stardust'
                    }`}
                  />
                </div>
              </button>

              {/* Tooltip */}
              <span
                className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-void border border-glass-border text-xs text-star-white whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-out"
                style={{
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                {label}
              </span>
            </div>
          )
        })}
      </nav>

      {isGuest && (
        <div className="mb-1 flex flex-col items-center gap-1">
          <span className="text-[9px] font-medium tracking-widest text-stardust/50 uppercase">Guest</span>
        </div>
      )}
      <button
        onClick={signOut}
        title={isGuest ? 'Exit Guest Mode' : 'Sign Out'}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-star-white/50 hover:text-nova-pink hover:bg-glass-hover transition-[color,background-color,transform] bg-transparent border-none cursor-pointer hover:scale-[1.1] active:scale-95 duration-200"
      >
        <LogOut size={20} />
      </button>
    </aside>
  )
}
