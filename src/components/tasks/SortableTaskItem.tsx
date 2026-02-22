import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableTaskItemProps {
    id: string
    children: React.ReactNode
    style?: React.CSSProperties
    className?: string
    onClick?: (e: React.MouseEvent) => void
    onDoubleClick?: (e: React.MouseEvent) => void
}

export default function SortableTaskItem({
    id,
    children,
    style,
    className,
    onClick,
    onDoubleClick,
}: SortableTaskItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id })

    const combinedStyle: React.CSSProperties = {
        ...style,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
        position: 'relative',
        cursor: 'grab',
    }

    return (
        <div
            ref={setNodeRef}
            style={combinedStyle}
            className={className}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            {...attributes}
            {...listeners}
        >
            {children}
        </div>
    )
}
