import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useEscapeClose } from '../../hooks/useEscapeClose'

interface ComplaintDialogProps {
  onClose: () => void
}

export default function ComplaintDialog({ onClose }: ComplaintDialogProps) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEscapeClose(onClose)

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('Please write your complaint.')
      return
    }
    setStatus('sending')
    setError(null)
    try {
      const { data } = await supabase.auth.getSession()
      const res = await fetch('/api/complaint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ subject, message }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null
        throw new Error(body?.error ?? 'Failed to send')
      }
      setStatus('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
      setStatus('idle')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="File a complaint"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-glass-border bg-void p-4"
      >
        <h3 className="text-sm font-semibold text-star-white mb-4">File a Complaint</h3>

        {status === 'sent' ? (
          <p className="text-sm text-star-white/80">Sent! Jacob will get it by email.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="text-xs text-star-white/60">
              Subject
              <input
                type="text"
                placeholder="What's wrong?"
                value={subject}
                maxLength={120}
                onChange={e => setSubject(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/60 focus:outline-none focus:border-stardust/50 text-sm"
                autoFocus
              />
            </label>
            <label className="text-xs text-star-white/60">
              Complaint
              <textarea
                placeholder="Tell me everything"
                value={message}
                maxLength={5000}
                rows={6}
                onChange={e => setMessage(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/60 focus:outline-none focus:border-stardust/50 text-sm resize-none"
              />
            </label>
          </div>
        )}

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-xs text-star-white/70 hover:text-star-white hover:bg-glass-hover transition-colors"
          >
            {status === 'sent' ? 'Close' : 'Cancel'}
          </button>
          {status !== 'sent' && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={status === 'sending'}
              className="px-3 py-2 rounded-lg bg-gold text-midnight text-xs font-semibold disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending...' : 'Send'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
