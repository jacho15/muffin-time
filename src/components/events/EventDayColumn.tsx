import React, { memo } from 'react'
import { format, parseISO } from 'date-fns'
import { Repeat } from 'lucide-react'

import type { VirtualOccurrence } from '../../lib/recurrence'
import type { CalendarEvent } from '../../types/database'

interface EventDayColumnProps {
    day: Date

    occurrences: { occurrence: VirtualOccurrence<CalendarEvent>; adjustedEvent: CalendarEvent }[]

    currentTimeTop: number | null
    dragPreviewTop: number | null
    dragPreviewHeight: number
    eventDragPreviewTop: number | null
    eventDragPreviewHeight: number
    eventDragPreviewColor: string | null
    isDraggingEvent: boolean

    onDayMouseDown: (day: Date, e: React.MouseEvent<HTMLDivElement>) => void
    onDayMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
    onEventClick: (occurrence: VirtualOccurrence<CalendarEvent>, adjustedEvent: CalendarEvent, e: React.MouseEvent) => void
    onEventMouseDown: (occurrence: VirtualOccurrence<CalendarEvent>, adjustedEvent: CalendarEvent, e: React.MouseEvent) => void

    getEventPosition: (event: CalendarEvent) => { top: number; height: number }
    getCalendarColor: (calendarId: string) => string
}

function EventDayColumnComponent({
    day,
    occurrences,
    currentTimeTop,
    dragPreviewTop,
    dragPreviewHeight,
    eventDragPreviewTop,
    eventDragPreviewHeight,
    eventDragPreviewColor,
    isDraggingEvent,
    onDayMouseDown,
    onDayMouseMove,
    onEventClick,
    onEventMouseDown,
    getEventPosition,
    getCalendarColor
}: EventDayColumnProps) {
    return (
        <div
            className={`relative border-l border-glass-border/30 select-none ${isDraggingEvent ? '' : 'cursor-pointer'}`}
            onMouseDown={e => onDayMouseDown(day, e)}
            onMouseMove={onDayMouseMove}
        >
            {/* Current time indicator */}
            {currentTimeTop !== null && (
                <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: currentTimeTop }}
                >
                    <div className="relative flex items-center">
                        <div
                            className="w-2.5 h-2.5 rounded-full bg-gold -ml-[5px] shrink-0"
                            style={{ boxShadow: '0 0 8px rgba(245, 224, 80, 0.6)' }}
                        />
                        <div className="flex-1 h-[2px] bg-gold/80" />
                    </div>
                </div>
            )}

            {/* Drag-to-create preview */}
            {dragPreviewTop !== null && (
                <div
                    className="absolute left-0.5 right-0.5 rounded-lg border-2 z-10 pointer-events-none"
                    style={{
                        top: dragPreviewTop,
                        height: dragPreviewHeight,
                        backgroundColor: 'rgba(196, 160, 255, 0.2)',
                        borderColor: 'rgba(196, 160, 255, 0.5)',
                    }}
                />
            )}

            {/* Event drag preview */}
            {eventDragPreviewTop !== null && eventDragPreviewColor && (
                <div
                    className="absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-xs text-white overflow-hidden pointer-events-none z-30 opacity-60"
                    style={{
                        top: eventDragPreviewTop,
                        height: eventDragPreviewHeight,
                        backgroundColor: eventDragPreviewColor,
                        outline: `2px solid ${eventDragPreviewColor}`,
                    }}
                />
            )}

            {occurrences.map(({ occurrence, adjustedEvent }) => {
                const pos = getEventPosition(adjustedEvent)
                const isRec = !!occurrence.data.recurrence
                const calendarColor = getCalendarColor(adjustedEvent.calendar_id)
                return (
                    <div
                        key={`${occurrence.data.id}-${occurrence.occurrenceDate}`}
                        data-event
                        className="absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-xs text-white overflow-hidden cursor-grab transition-all z-10 hover:scale-[1.02] hover:shadow-lg active:cursor-grabbing"
                        style={{
                            top: pos.top,
                            height: pos.height,
                            backgroundColor: calendarColor,
                            opacity: 0.9,
                            boxShadow: `0 2px 8px ${calendarColor}33`,
                        }}
                        onMouseDown={e => onEventMouseDown(occurrence, adjustedEvent, e)}
                        onClick={e => onEventClick(occurrence, adjustedEvent, e)}
                    >
                        <div className="font-medium truncate flex items-center gap-1">
                            {adjustedEvent.title}
                            {isRec && <Repeat size={10} className="shrink-0 opacity-70" />}
                        </div>
                        <div className="text-[11px] font-light truncate">
                            {format(parseISO(adjustedEvent.start_time), 'h:mm a')} - {format(parseISO(adjustedEvent.end_time), 'h:mm a')}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export const EventDayColumn = memo(EventDayColumnComponent)
