import { useEffect, useMemo, useRef, useState, type UIEvent } from 'react'

interface UseVirtualizedListOptions {
  itemCount: number
  itemHeight: number
  overscan?: number
}

export function useVirtualizedList({
  itemCount,
  itemHeight,
  overscan = 5,
}: UseVirtualizedListOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const rafRef = useRef<number | null>(null)
  const pendingScrollTopRef = useRef(0)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) setViewportHeight(entry.contentRect.height)
    })
    resizeObserver.observe(node)
    setViewportHeight(node.clientHeight)
    return () => resizeObserver.disconnect()
  }, [])

  const virtual = useMemo(() => {
    const safeCount = Math.max(itemCount, 0)
    const totalHeight = safeCount * itemHeight
    const visibleCount = Math.ceil(viewportHeight / itemHeight)
    const rawStart = Math.floor(scrollTop / itemHeight) - overscan
    const start = Math.max(0, rawStart)
    const end = Math.min(safeCount, start + visibleCount + overscan * 2)

    return {
      start,
      end,
      offsetTop: start * itemHeight,
      totalHeight,
    }
  }, [itemCount, itemHeight, overscan, scrollTop, viewportHeight])

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    pendingScrollTopRef.current = e.currentTarget.scrollTop
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      setScrollTop(pendingScrollTopRef.current)
    })
  }

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return {
    containerRef,
    onScroll,
    ...virtual,
  }
}
