import { useMemo, useState, useEffect, memo } from 'react'

interface CosmicBackgroundProps {
  intensity?: 'low' | 'medium' | 'high'
}

const STAR_COUNTS = { low: 60, medium: 100, high: 150 }

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return reduced
}

function CosmicBackgroundInner({ intensity = 'medium' }: CosmicBackgroundProps) {
  const prefersReducedMotion = useReducedMotion()
  const starCount = prefersReducedMotion ? Math.min(STAR_COUNTS[intensity], 30) : STAR_COUNTS[intensity]
  const nebulaOpacity = intensity === 'low' ? 0.08 : intensity === 'medium' ? 0.12 : 0.18

  const stars = useMemo(() =>
    Array.from({ length: starCount }, (_, i) => {
      const layer = i % 3 // 0=far, 1=mid, 2=near
      const size = layer === 0 ? 1 : layer === 1 ? 1.5 : 2.5
      return {
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size,
        opacity: 0.3 + Math.random() * 0.7,
        duration: 2 + Math.random() * 4,
        delay: Math.random() * 5,
      }
    }), [starCount])

  // Shooting star state — disabled when reduced motion is preferred
  const [shootingStar, setShootingStar] = useState<{
    left: number; top: number; angle: number; key: number
  } | null>(null)

  useEffect(() => {
    if (prefersReducedMotion) return
    let timeout: ReturnType<typeof setTimeout>
    const spawn = () => {
      setShootingStar({
        left: Math.random() * 60 + 10,
        top: Math.random() * 40 + 5,
        angle: 30 + Math.random() * 20,
        key: Date.now(),
      })
      // Clear after animation completes
      setTimeout(() => setShootingStar(null), 1200)
      timeout = setTimeout(spawn, 8000 + Math.random() * 7000)
    }
    timeout = setTimeout(spawn, 3000 + Math.random() * 5000)
    return () => clearTimeout(timeout)
  }, [prefersReducedMotion])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Nebula clouds — skip blur when reduced motion preferred */}
      {!prefersReducedMotion && (
        <>
          <div
            className="absolute rounded-full"
            style={{
              width: '600px',
              height: '600px',
              top: '-10%',
              right: '-5%',
              background: 'radial-gradient(circle, rgba(74,27,109,0.4) 0%, transparent 70%)',
              filter: 'blur(80px)',
              opacity: nebulaOpacity,
              animation: 'float 20s ease-in-out infinite',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: '500px',
              height: '500px',
              bottom: '-15%',
              left: '-10%',
              background: 'radial-gradient(circle, rgba(91,141,239,0.3) 0%, transparent 70%)',
              filter: 'blur(80px)',
              opacity: nebulaOpacity,
              animation: 'float 25s ease-in-out infinite 5s',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: '400px',
              height: '400px',
              top: '40%',
              left: '50%',
              background: 'radial-gradient(circle, rgba(196,160,255,0.2) 0%, transparent 70%)',
              filter: 'blur(80px)',
              opacity: nebulaOpacity * 0.7,
              animation: 'float 22s ease-in-out infinite 8s',
            }}
          />
        </>
      )}

      {/* Crescent moon */}
      <div
        className="absolute"
        style={{
          top: '8%',
          right: '12%',
          width: '40px',
          height: '40px',
          animation: prefersReducedMotion ? undefined : 'float 8s ease-in-out infinite',
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #FFE8A3 0%, #F5E050 100%)',
            boxShadow: '0 0 30px rgba(255,232,163,0.4), 0 0 60px rgba(245,224,80,0.15)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '32px',
            height: '32px',
            top: '-4px',
            left: '10px',
            background: '#060B18',
          }}
        />
      </div>

      {/* Stars */}
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute rounded-full bg-star-white"
          style={{
            width: star.size + 'px',
            height: star.size + 'px',
            left: star.left + '%',
            top: star.top + '%',
            opacity: star.opacity,
            animation: prefersReducedMotion ? undefined : `twinkle ${star.duration}s ease-in-out infinite`,
            animationDelay: prefersReducedMotion ? undefined : star.delay + 's',
          }}
        />
      ))}

      {/* Shooting star */}
      {shootingStar && !prefersReducedMotion && (
        <div
          key={shootingStar.key}
          className="absolute"
          style={{
            left: shootingStar.left + '%',
            top: shootingStar.top + '%',
            width: '80px',
            height: '1.5px',
            background: 'linear-gradient(90deg, rgba(196,160,255,0.9) 0%, transparent 100%)',
            borderRadius: '1px',
            transform: `rotate(${shootingStar.angle}deg)`,
            animation: 'shooting-star 1s ease-out forwards',
          }}
        />
      )}
    </div>
  )
}

const CosmicBackground = memo(CosmicBackgroundInner)
export default CosmicBackground
