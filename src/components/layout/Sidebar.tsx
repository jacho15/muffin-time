import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Timer, BarChart3, ListTodo, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/events', icon: Calendar, label: 'Events' },
  { to: '/focus', icon: Timer, label: 'Focus' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks' },
]

export default function Sidebar() {
  const { signOut } = useAuth()
  const location = useLocation()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

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
              className="relative"
              onMouseEnter={() => setHoveredItem(to)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <NavLink
                to={to}
                title={label}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative z-10"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-cosmic-purple/40"
                    style={{
                      boxShadow: '0 0 15px rgba(196, 160, 255, 0.2)',
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className="relative z-10"
                >
                  <Icon
                    size={20}
                    className={`transition-colors ${
                      isActive ? 'text-stardust' : 'text-star-white/50 hover:text-stardust'
                    }`}
                  />
                </motion.div>
              </NavLink>

              {/* Tooltip */}
              {hoveredItem === to && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-void border border-glass-border text-xs text-star-white whitespace-nowrap z-50"
                  style={{
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  }}
                >
                  {label}
                </motion.span>
              )}
            </div>
          )
        })}
      </nav>

      <motion.button
        onClick={signOut}
        title="Sign Out"
        className="w-10 h-10 rounded-lg flex items-center justify-center text-star-white/50 hover:text-nova-pink hover:bg-glass-hover transition-colors bg-transparent border-none cursor-pointer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <LogOut size={20} />
      </motion.button>
    </aside>
  )
}
