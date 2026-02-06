import { NavLink } from 'react-router-dom'
import { Calendar, Timer, BarChart3, CheckSquare, BookOpen, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/events', icon: Calendar, label: 'Events' },
  { to: '/focus', icon: Timer, label: 'Focus' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
  { to: '/todos', icon: CheckSquare, label: 'Todos' },
  { to: '/assignments', icon: BookOpen, label: 'Assignments' },
]

export default function Sidebar() {
  const { signOut } = useAuth()

  return (
    <aside className="w-16 h-screen bg-deep-blue border-r border-glass-border flex flex-col items-center py-4 shrink-0">
      <div className="text-gold font-bold text-lg mb-8">M</div>

      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                isActive
                  ? 'bg-gold/20 text-gold'
                  : 'text-star-white/50 hover:text-star-white hover:bg-glass-hover'
              }`
            }
          >
            <Icon size={20} />
          </NavLink>
        ))}
      </nav>

      <button
        onClick={signOut}
        title="Sign Out"
        className="w-10 h-10 rounded-lg flex items-center justify-center text-star-white/50 hover:text-red-400 hover:bg-glass-hover transition-colors bg-transparent border-none cursor-pointer"
      >
        <LogOut size={20} />
      </button>
    </aside>
  )
}
