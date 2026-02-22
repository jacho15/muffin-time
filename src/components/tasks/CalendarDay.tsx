import React, { memo } from 'react'
import { format, isSameMonth, isToday } from 'date-fns'
import { Repeat } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import type { VirtualOccurrence } from '../../lib/recurrence'
import type { Todo, Assignment } from '../../types/database'
import SortableTaskItem from './SortableTaskItem'
import { getStatusColor } from '../../lib/colors'

type TaskItem = Todo | Assignment

interface CalendarDayProps {
    day: Date
    currentMonth: Date
    focusedDate: string | null
    selectedItemId: string | null
    mode: 'todos' | 'assignments'
    dayOccurrences: VirtualOccurrence<TaskItem>[]

    onDayClick: (day: Date) => void
    onDayDoubleClick: (day: Date) => void
    onItemClick: (id: string, e: React.MouseEvent) => void
    onItemDoubleClick: (occ: VirtualOccurrence<TaskItem>, e: React.MouseEvent) => void
    onToggleComplete: (occ: VirtualOccurrence<TaskItem>, e: React.ChangeEvent<HTMLInputElement>) => void
    getCourseItemColor: (course: string | null) => string
    isOccurrenceCompleted: (occ: VirtualOccurrence<TaskItem>) => boolean
}

function CalendarDayComponent({
    day,
    currentMonth,
    focusedDate,
    selectedItemId,
    mode,
    dayOccurrences,
    onDayClick,
    onDayDoubleClick,
    onItemClick,
    onItemDoubleClick,
    onToggleComplete,
    getCourseItemColor,
    isOccurrenceCompleted
}: CalendarDayProps) {
    const dateStr = format(day, 'yyyy-MM-dd')
    const isCurrentMonth = isSameMonth(day, currentMonth)
    const isFocused = focusedDate === dateStr

    const { setNodeRef, isOver } = useDroppable({
        id: `day-${dateStr}`,
        data: {
            type: 'day',
            date: dateStr
        }
    })

    return (
        <div
            ref={setNodeRef}
            className={`bg-void/50 p-1.5 min-h-[80px] cursor-pointer transition-colors ${!isCurrentMonth ? 'opacity-40' : ''
                } ${isFocused ? 'ring-1 ring-stardust/40 ring-inset' : ''} ${isOver ? 'bg-white/5' : ''}`}
            onClick={() => onDayClick(day)}
            onDoubleClick={() => onDayDoubleClick(day)}
        >
            <div
                className={`text-xs mb-1 ${isToday(day)
                    ? 'w-5 h-5 rounded-full bg-gold text-midnight flex items-center justify-center font-bold'
                    : 'text-star-white/60'
                    }`}
                style={isToday(day) ? { boxShadow: '0 0 8px rgba(245, 224, 80, 0.4)' } : undefined}
            >
                {format(day, 'd')}
            </div>

            <SortableContext
                items={dayOccurrences.map(occ => `${occ.data.id}-${occ.occurrenceDate}`)}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex flex-col gap-0.5">
                    {dayOccurrences.slice(0, 3).map(occ => {
                        const item = occ.data
                        const assignment = item as Assignment
                        const completed = isOccurrenceCompleted(occ)
                        const isRec = !!item.recurrence
                        return (
                            <SortableTaskItem
                                key={`${item.id}-${occ.occurrenceDate}`}
                                id={`${item.id}-${occ.occurrenceDate}`}
                                className={`text-[11px] px-1 py-0.5 rounded transition-all cursor-pointer ${completed
                                    ? 'text-star-white/30'
                                    : 'text-white'
                                    } ${selectedItemId === item.id ? 'ring-1 ring-gold' : ''}`}
                                style={{
                                    backgroundColor: completed
                                        ? 'rgba(255,255,255,0.03)'
                                        : getCourseItemColor(assignment.course) + '20',
                                }}
                                onClick={e => onItemClick(item.id, e)}
                                onDoubleClick={e => onItemDoubleClick(occ, e)}
                            >
                                <span className="flex items-center gap-1.5 w-full">
                                    {/* Left status dot */}
                                    <div
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{ backgroundColor: getStatusColor(mode === 'todos' ? (item as Todo).status : (item as Assignment).status, completed) }}
                                    />

                                    <input
                                        type="checkbox"
                                        checked={completed}
                                        onChange={e => onToggleComplete(occ, e)}
                                        onClick={e => e.stopPropagation()}
                                        className="w-3 h-3 rounded accent-gold shrink-0"
                                    />

                                    <span className="flex-1 truncate">{item.title}</span>

                                    {isRec && <Repeat size={8} className="shrink-0 opacity-50" />}

                                    {/* Right course dot */}
                                    {assignment.course && (
                                        <div
                                            className="w-1.5 h-1.5 rounded-full shrink-0"
                                            style={{ backgroundColor: getCourseItemColor(assignment.course) }}
                                        />
                                    )}
                                </span>
                            </SortableTaskItem>
                        )
                    })}
                    {dayOccurrences.length > 3 && (
                        <div className="text-[10px] text-star-white/40 px-1">
                            +{dayOccurrences.length - 3} more
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    )
}

export const CalendarDay = memo(CalendarDayComponent)
