import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import CosmicBackground from '../ui/CosmicBackground'



import { authSchema } from '../../lib/validation'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    // Validate input using Zod
    const result = authSchema.safeParse({ email, password })
    if (!result.success) {
      // Show the first error message
      setError(result.error.issues[0].message)
      return
    }

    setLoading(true)

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password)

    if (error) {
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        setError('An account with this email already exists.')
      } else if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password.')
      } else {
        setError(error.message)
      }
    } else if (isSignUp) {
      setMessage('Check your email for a confirmation link!')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <CosmicBackground intensity="high" />

      <motion.div
        className="auth-card relative z-10 w-full max-w-[380px] px-10 py-12"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Title block — clear focal point */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
        >
          <h1 className="text-[28px] font-semibold tracking-tight text-star-white mb-1.5">
            Muffin Time
          </h1>
          <p className="text-star-white/40 text-[13px] font-light tracking-wide">
            Your productivity companion
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.form
            key={isSignUp ? 'signup' : 'signin'}
            onSubmit={handleSubmit}
            className="space-y-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {/* Email field — floating label style */}
            <div className="relative">
              <input
                type="email"
                id="auth-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                className="auth-input peer"
                placeholder=" "
                required
                autoComplete="email"
              />
              <label
                htmlFor="auth-email"
                className="auth-label"
              >
                Email
              </label>
              <div className={`auth-line ${emailFocused ? 'auth-line-active' : ''}`} />
            </div>

            {/* Password field */}
            <div className="relative">
              <input
                type="password"
                id="auth-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                className="auth-input peer"
                placeholder=" "
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
              <label
                htmlFor="auth-password"
                className="auth-label"
              >
                Password
              </label>
              <div className={`auth-line ${passwordFocused ? 'auth-line-active' : ''}`} />
            </div>

            {/* Error / success messages */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400/90 text-[13px] text-center"
              >
                {error}
              </motion.p>
            )}
            {message && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-emerald-400/90 text-[13px] text-center"
              >
                {message}
              </motion.p>
            )}

            {/* Primary action — the visual anchor */}
            <motion.button
              type="submit"
              disabled={loading}
              className="auth-submit-btn gold-btn"
              whileHover={{ scale: 1.015, y: -1 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    className="inline-block w-3.5 h-3.5 border-2 border-midnight/30 border-t-midnight rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  <span>One moment...</span>
                </span>
              ) : isSignUp ? 'Create Account' : 'Sign In'}
            </motion.button>
          </motion.form>
        </AnimatePresence>

        {/* Mode toggle — quiet, secondary */}
        <motion.p
          className="text-center text-[13px] text-star-white/35 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
            className="text-stardust/70 hover:text-stardust transition-colors duration-200 bg-transparent border-none p-0 font-normal cursor-pointer"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </motion.p>
      </motion.div>
    </div>
  )
}
