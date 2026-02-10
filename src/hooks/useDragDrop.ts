import { useState, useRef, useEffect, useCallback } from 'react'
import type { VirtualOccurrence } from '../lib/recurrence'

interface DragState<T> {
  isDragging: boolean
  draggedItem: VirtualOccurrence<T> | null
  dragSourceDate: string | null
  dragTargetDate: string | null
}

const INITIAL_STATE: DragState<never> = {
  isDragging: false,
  draggedItem: null,
  dragSourceDate: null,
  dragTargetDate: null,
}

export interface DragDropResult<T> {
  item: VirtualOccurrence<T>
  fromDate: string
  toDate: string
}

export function useDragDrop<T extends { id: string }>() {
  const [state, setState] = useState<DragState<T>>(INITIAL_STATE as DragState<T>)

  const ghostElRef = useRef<HTMLDivElement | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const stateRef = useRef(state)
  stateRef.current = state

  const startDrag = useCallback((
    occurrence: VirtualOccurrence<T>,
    sourceDate: string,
    offset: { x: number; y: number },
  ) => {
    dragOffsetRef.current = offset
    setState({
      isDragging: true,
      draggedItem: occurrence,
      dragSourceDate: sourceDate,
      dragTargetDate: null,
    })
  }, [])

  const updateDrag = useCallback((e: MouseEvent, targetDate: string | null) => {
    // Update ghost position via ref (no re-render)
    if (ghostElRef.current) {
      ghostElRef.current.style.left = `${e.clientX - dragOffsetRef.current.x}px`
      ghostElRef.current.style.top = `${e.clientY - dragOffsetRef.current.y}px`
    }
    // Only re-render when target day changes
    if (targetDate !== stateRef.current.dragTargetDate) {
      setState(prev => ({ ...prev, dragTargetDate: targetDate }))
    }
  }, [])

  const endDrag = useCallback((): DragDropResult<T> | null => {
    const s = stateRef.current
    const result: DragDropResult<T> | null =
      s.draggedItem && s.dragSourceDate && s.dragTargetDate && s.dragTargetDate !== s.dragSourceDate
        ? { item: s.draggedItem, fromDate: s.dragSourceDate, toDate: s.dragTargetDate }
        : null
    setState(INITIAL_STATE as DragState<T>)
    return result
  }, [])

  const cancelDrag = useCallback(() => {
    setState(INITIAL_STATE as DragState<T>)
  }, [])

  // Body cursor during drag
  useEffect(() => {
    if (state.isDragging) {
      document.body.style.cursor = 'grabbing'
      // Prevent text selection during drag
      document.body.style.userSelect = 'none'
      return () => {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [state.isDragging])

  // Escape key to cancel
  useEffect(() => {
    if (!state.isDragging) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelDrag()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isDragging, cancelDrag])

  return {
    dragState: state,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    ghostElRef,
    dragOffsetRef,
  }
}
