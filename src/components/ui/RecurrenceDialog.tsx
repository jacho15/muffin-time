import { motion } from 'framer-motion'

interface RecurrenceDialogProps {
  action: 'edit' | 'delete'
  onThisOnly: () => void
  onAll: () => void
  onCancel: () => void
}

export default function RecurrenceDialog({ action, onThisOnly, onAll, onCancel }: RecurrenceDialogProps) {
  const verb = action === 'edit' ? 'Edit' : 'Delete'

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]"
      onClick={onCancel}
    >
      <motion.div
        className="glass-panel p-6 w-full max-w-sm cosmic-glow"
        style={{ background: '#060B18' }}
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h3 className="text-lg font-medium text-star-white mb-2">
          {verb} recurring item
        </h3>
        <p className="text-sm text-star-white/60 mb-5">
          This is a recurring item. What would you like to {action}?
        </p>
        <div className="flex flex-col gap-2">
          <motion.button
            onClick={onThisOnly}
            className="w-full py-2 rounded-lg bg-gold text-midnight font-medium text-sm hover:bg-gold/90 transition-colors"
            whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(245, 224, 80, 0.25)' }}
            whileTap={{ scale: 0.98 }}
          >
            This occurrence only
          </motion.button>
          <motion.button
            onClick={onAll}
            className="w-full py-2 rounded-lg bg-gold text-midnight font-medium text-sm hover:bg-gold/90 transition-colors"
            whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(245, 224, 80, 0.25)' }}
            whileTap={{ scale: 0.98 }}
          >
            All occurrences
          </motion.button>
          <button
            onClick={onCancel}
            className="w-full py-2 rounded-lg bg-glass border border-glass-border text-star-white/60 text-sm hover:text-star-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  )
}
