import { startTransition } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Calendar, Timer, BarChart3, ListTodo, Heart, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/events', icon: Calendar, label: 'Events' },
  { to: '/focus', icon: Timer, label: 'Focus' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks' },
  { to: '/lifestyle', icon: Heart, label: 'Lifestyle' },
]

export default function Sidebar() {
  const { signOut, isGuest } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside className="fixed bottom-0 inset-x-0 h-16 flex-row justify-around border-t px-2 pb-[env(safe-area-inset-bottom)] md:static md:h-screen md:w-16 md:flex-col md:justify-start md:border-t-0 md:border-r md:px-0 md:py-4 bg-void/80 backdrop-blur-xl border-glass-border flex items-center shrink-0 z-20">
      <nav className="flex flex-row md:flex-col gap-1 md:gap-2 md:flex-1 md:pt-2 items-center">
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
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className="w-11 h-11 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors relative z-10 bg-transparent border-none cursor-pointer p-0"
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-cosmic-purple/30 border border-stardust/25 transition-colors duration-200 ease-out" />
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

              {/* Tooltip (pointer devices only; bottom bar hides it) */}
              <span
                className="pointer-events-none hidden md:block absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-void border border-glass-border text-xs text-star-white whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-out"
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
        <div className="mb-1 hidden md:flex flex-col items-center gap-1">
          <span className="text-[9px] font-medium tracking-widest text-stardust/60 uppercase">Guest</span>
        </div>
      )}
      <button
        onClick={signOut}
        title={isGuest ? 'Exit Guest Mode' : 'Sign Out'}
        aria-label={isGuest ? 'Exit guest mode' : 'Sign out'}
        className="w-11 h-11 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-star-white/50 hover:text-nova-pink hover:bg-glass-hover transition-[color,background-color,transform] bg-transparent border-none cursor-pointer hover:scale-[1.1] active:scale-95 duration-200"
      >
        <LogOut size={20} />
      </button>
    </aside>
  )
}
