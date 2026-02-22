import React, { memo } from 'react'
import { format, parseISO } from 'date-fns'
import { Repeat } from 'lucide-react'

import type { VirtualOccurrence } from '../../lib/recurrence'
import type { CalendarEvent } from '../../types/database'

const HOUR_HEIGHT = 60

interface EventDayColumnProps {
    day: Date
    dayIdx: number

    occurrences: { occurrence: VirtualOccurrence<CalendarEvent>; adjustedEvent: CalendarEvent }[]

    currentTimePosition: { top: number; dayIndex: number } | null
    dragPreview: { top: number; height: number; dayIndex: number } | null
    eventDragPreview: { dayIdx: number; topMinutes: number; durationMinutes: number; color: string } | null
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
    dayIdx,
    occurrences,
    currentTimePosition,
    dragPreview,
    eventDragPreview,
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
            {currentTimePosition && currentTimePosition.dayIndex === dayIdx && (
                <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: currentTimePosition.top }}
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
            {dragPreview && dragPreview.dayIndex === dayIdx && (
                <div
                    className="absolute left-0.5 right-0.5 rounded-lg border-2 z-10 pointer-events-none"
                    style={{
                        top: dragPreview.top,
                        height: dragPreview.height,
                        backgroundColor: 'rgba(196, 160, 255, 0.2)',
                        borderColor: 'rgba(196, 160, 255, 0.5)',
                    }}
                />
            )}

            {/* Event drag preview */}
            {eventDragPreview && eventDragPreview.dayIdx === dayIdx && (
                <div
                    className="absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-xs text-white overflow-hidden pointer-events-none z-30 opacity-60"
                    style={{
                        top: (eventDragPreview.topMinutes / 60) * HOUR_HEIGHT,
                        height: Math.max((eventDragPreview.durationMinutes / 60) * HOUR_HEIGHT, 20),
                        backgroundColor: eventDragPreview.color,
                        outline: `2px solid ${eventDragPreview.color}`,
                    }}
                />
            )}

            {occurrences.map(({ occurrence, adjustedEvent }) => {
                const pos = getEventPosition(adjustedEvent)
                const isRec = !!occurrence.data.recurrence
                return (
                    <div
                        key={`${occurrence.data.id}-${occurrence.occurrenceDate}`}
                        data-event
                        className="absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-xs text-white overflow-hidden cursor-grab transition-all z-10 hover:scale-[1.02] hover:shadow-lg active:cursor-grabbing"
                        style={{
                            top: pos.top,
                            height: pos.height,
                            backgroundColor: getCalendarColor(adjustedEvent.calendar_id),
                            opacity: 0.9,
                            boxShadow: `0 2px 8px ${getCalendarColor(adjustedEvent.calendar_id)}33`,
                        }}
                        onMouseDown={e => onEventMouseDown(occurrence, adjustedEvent, e)}
                        onClick={e => onEventClick(occurrence, adjustedEvent, e)}
                    >
                        <div className="font-medium truncate flex items-center gap-1">
                            {adjustedEvent.title}
                            {isRec && <Repeat size={10} className="shrink-0 opacity-70" />}
                        </div>
                        <div className="text-[11px] font-light truncate">
                            {format(parseISO(adjustedEvent.start_time), 'h:mm a')}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export const EventDayColumn = memo(EventDayColumnComponent)
