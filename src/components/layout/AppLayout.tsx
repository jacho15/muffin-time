import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import CosmicBackground from '../ui/CosmicBackground'

export default function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-void overflow-hidden">
      <CosmicBackground intensity="medium" />
      <Sidebar />
      <main className="flex-1 overflow-auto pt-10 px-10 pb-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
