import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Trash2, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

import type { VirtualOccurrence } from '../../lib/recurrence'
import type { Todo, Assignment, TodoInsert, AssignmentInsert } from '../../types/database'
import type { Recurrence } from '../../lib/recurrence'
import { RECURRENCE_OPTIONS } from '../../lib/recurrence'
import { SUBJECT_COLORS } from '../../lib/colors'

import CreatableSelect from '../ui/CreatableSelect'
import DatePicker from '../ui/DatePicker'
import RecurrenceDialog from '../ui/RecurrenceDialog'

type TaskMode = 'todos' | 'assignments'
type TaskItem = Todo | Assignment

interface FormState {
    title: string
    description: string
    dueDate: string
    course: string
    type: string
    status: string
    recurrence: Recurrence
    recurrenceUntil: string
}

const INITIAL_FORM: FormState = {
    title: '',
    description: '',
    dueDate: '',
    course: '',
    type: '',
    status: 'Not Started',
    recurrence: 'once',
    recurrenceUntil: '',
}

interface TaskModalProps {
    onClose: () => void
    mode: TaskMode
    initialItem: TaskItem | null
    initialOccurrence: VirtualOccurrence<TaskItem> | null
    defaultDate?: string

    typeOptions: string[]
    statusOptions: string[]
    courseOptions: string[]
    courseColors: Record<string, string>

    onAddTypeOption: (val: string) => void
    onDeleteTypeOption: (val: string) => void
    onAddStatusOption: (val: string) => void
    onAddCourseOption: (val: string, color: string) => void
    onDeleteCourseOption: (val: string) => void

    createTodo: (todo: TodoInsert) => Promise<Todo>
    updateTodo: (id: string, updates: Partial<TodoInsert>) => Promise<Todo>
    deleteTodo: (id: string) => Promise<void>
    createAssignment: (assignment: AssignmentInsert) => Promise<Assignment>
    updateAssignment: (id: string, updates: Partial<AssignmentInsert>) => Promise<Assignment>
    deleteAssignment: (id: string) => Promise<void>
    createException: (exception: any) => Promise<any>
    deleteExceptionsForParent: (parentType: string, parentId: string) => Promise<void>
}

export default function TaskModal({
    onClose,
    mode,
    initialItem,
    initialOccurrence,
    defaultDate,

    typeOptions,
    statusOptions,
    courseOptions,
    courseColors,

    onAddTypeOption,
    onDeleteTypeOption,
    onAddStatusOption,
    onAddCourseOption,
    onDeleteCourseOption,

    createTodo,
    updateTodo,
    deleteTodo,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    createException,
    deleteExceptionsForParent,
}: TaskModalProps) {

    const [form, setForm] = useState<FormState>(() => {
        if (initialItem) {
            return {
                title: initialItem.title,
                description: initialItem.description || '',
                dueDate: initialOccurrence ? initialOccurrence.occurrenceDate :
                    mode === 'todos'
                        ? (initialItem as Todo).due_date || ''
                        : (initialItem as Assignment).due_date,
                course: (initialItem as Record<string, unknown>).course as string || '',
                type: (initialItem as Record<string, unknown>).type as string || '',
                status: (initialItem as Record<string, unknown>).status as string || (initialItem.completed ? 'Completed' : 'Not Started'),
                recurrence: (initialItem.recurrence || 'once') as Recurrence,
                recurrenceUntil: initialItem.recurrence_until || '',
            }
        }
        return {
            ...INITIAL_FORM,
            dueDate: defaultDate || format(new Date(), 'yyyy-MM-dd'),
        }
    })

    const [recurrenceDialog, setRecurrenceDialog] = useState<{
        action: 'edit' | 'delete'
    } | null>(null)

    const [isRepeatsOpen, setIsRepeatsOpen] = useState(false)
    const repeatsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (repeatsRef.current && !repeatsRef.current.contains(event.target as Node)) {
                setIsRepeatsOpen(false)
            }
        }
        if (isRepeatsOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isRepeatsOpen])

    const isFormValid = useMemo(() => !!(form.title && form.dueDate), [form.title, form.dueDate])
    const isRecurring = initialItem?.recurrence && initialItem.recurrence !== 'once'

    const buildPayload = () => {
        const completed = form.status === 'Completed'
        const recurrence = form.recurrence === 'once' ? null : form.recurrence
        const recurrence_until = form.recurrence === 'once' ? null : form.recurrenceUntil
        const base = {
            title: form.title,
            description: form.description || null,
            completed,
            type: form.type || null,
            status: form.status || null,
            recurrence,
            recurrence_until,
        }
        if (mode === 'todos') return { ...base, due_date: form.dueDate || null }
        return { ...base, due_date: form.dueDate, course: form.course || null }
    }

    const saveItem = async (id: string | null, payload: ReturnType<typeof buildPayload>) => {
        if (id) {
            if (mode === 'todos') await updateTodo(id, payload as Partial<TodoInsert>)
            else await updateAssignment(id, payload as Partial<AssignmentInsert>)
        } else {
            if (mode === 'todos') await createTodo(payload as TodoInsert)
            else await createAssignment(payload as AssignmentInsert)
        }
    }

    const deleteItem = async (id: string) => {
        if (mode === 'todos') await deleteTodo(id)
        else await deleteAssignment(id)
    }

    const handleSave = async () => {
        if (!isFormValid) return
        try {
            if (initialItem && isRecurring && initialOccurrence) {
                setRecurrenceDialog({ action: 'edit' })
                return
            }
            await saveItem(initialItem?.id ?? null, buildPayload())
            onClose()
        } catch (err) {
            console.error('Failed to save:', err)
        }
    }

    const handleDelete = async () => {
        if (!initialItem) return
        if (isRecurring && initialOccurrence) {
            setRecurrenceDialog({ action: 'delete' })
            return
        }
        await deleteItem(initialItem.id)
        onClose()
    }

    const handleRecurrenceThisOnly = async () => {
        if (!initialItem || !initialOccurrence) return
        const parentType = mode === 'todos' ? 'todo' : 'assignment'
        const occDate = initialOccurrence.occurrenceDate

        if (recurrenceDialog?.action === 'delete') {
            await createException({
                parent_type: parentType,
                parent_id: initialItem.id,
                exception_date: occDate,
                exception_type: 'skipped',
            })
        } else {
            const { recurrence: _, recurrence_until: __, ...overrides } = buildPayload()
            await createException({
                parent_type: parentType,
                parent_id: initialItem.id,
                exception_date: occDate,
                exception_type: 'modified',
                overrides,
            })
        }
        setRecurrenceDialog(null)
        onClose()
    }

    const handleRecurrenceAll = async () => {
        if (!initialItem) return
        const parentType = mode === 'todos' ? 'todo' : 'assignment'

        if (recurrenceDialog?.action === 'delete') {
            await deleteItem(initialItem.id)
            await deleteExceptionsForParent(parentType, initialItem.id)
        } else {
            await saveItem(initialItem.id, buildPayload())
        }
        setRecurrenceDialog(null)
        onClose()
    }

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={onClose}
        >
            <motion.div
                className="glass-panel w-full max-w-lg cosmic-glow"
                style={{ background: '#060B18' }}
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
            >
                <div className="px-6 pt-6 pb-2 flex items-start justify-between">
                    <input
                        type="text"
                        placeholder={mode === 'todos' ? 'Untitled todo' : 'Untitled assignment'}
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        className="text-xl font-semibold text-star-white bg-transparent border-none outline-none placeholder-star-white/20 flex-1"
                        autoFocus
                    />
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-glass-hover text-star-white/50 ml-2 shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 pb-4">
                    <div className="grid gap-y-3" style={{ gridTemplateColumns: '120px 1fr' }}>
                        <div className="text-sm text-star-white/50 flex items-center">Type</div>
                        <CreatableSelect
                            value={form.type}
                            options={typeOptions.filter(t => t !== 'Todo' && t !== 'Assignment')}
                            onChange={v => setForm(f => ({ ...f, type: v }))}
                            onCreateOption={onAddTypeOption}
                            onDeleteOption={onDeleteTypeOption}
                            placeholder="Select type..."
                        />

                        <div className="text-sm text-star-white/50 flex items-center">Course</div>
                        <CreatableSelect
                            value={form.course}
                            options={courseOptions}
                            onChange={v => setForm(f => ({ ...f, course: v }))}
                            onCreateOption={() => { }}
                            onCreateOptionWithColor={onAddCourseOption}
                            onDeleteOption={onDeleteCourseOption}
                            colorPalette={SUBJECT_COLORS}
                            colorMap={courseColors}
                            placeholder="Select course..."
                        />

                        <div className="text-sm text-star-white/50 flex items-center">Due Date</div>
                        <DatePicker
                            value={form.dueDate}
                            onChange={v => setForm(f => ({ ...f, dueDate: v }))}
                        />

                        <div className="text-sm text-star-white/50 flex items-center">Repeats</div>
                        <div className="relative" ref={repeatsRef}>
                            <button
                                type="button"
                                onClick={() => setIsRepeatsOpen(!isRepeatsOpen)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-stardust/50 text-sm cursor-pointer transition-colors hover:bg-glass-hover hover:border-stardust/30"
                            >
                                <span className="truncate">
                                    {RECURRENCE_OPTIONS.find(opt => opt.value === form.recurrence)?.label}
                                </span>
                                <ChevronDown
                                    size={14}
                                    className={`text-star-white/40 transition-transform ${isRepeatsOpen ? 'rotate-180' : ''}`}
                                />
                            </button>
                            <div
                                className={`absolute top-full left-0 mt-1 w-full min-w-[140px] rounded-lg border border-glass-border z-[60] overflow-hidden cosmic-glow shadow-2xl transition-all duration-100 origin-top ${isRepeatsOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-[0.98] pointer-events-none'
                                    }`}
                                style={{ background: '#060B18', backdropFilter: 'blur(16px)' }}
                            >
                                <div className="py-1">
                                    {RECURRENCE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => {
                                                setForm(f => ({ ...f, recurrence: opt.value }))
                                                setIsRepeatsOpen(false)
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${opt.value === form.recurrence ? 'bg-gold/10 text-gold' : 'text-star-white/70 hover:bg-glass-hover hover:text-star-white'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {form.recurrence !== 'once' && (
                            <>
                                <div className="text-sm text-star-white/50 flex items-center">Repeat until</div>
                                <DatePicker
                                    value={form.recurrenceUntil}
                                    onChange={v => setForm(f => ({ ...f, recurrenceUntil: v }))}
                                />
                            </>
                        )}

                        <div className="text-sm text-star-white/50 flex items-center">Status</div>
                        <CreatableSelect
                            value={form.status}
                            options={statusOptions}
                            onChange={v => setForm(f => ({ ...f, status: v }))}
                            onCreateOption={onAddStatusOption}
                            placeholder="Select status..."
                        />
                    </div>
                </div>

                <div className="px-6 pb-6 flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={!isFormValid}
                        className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${isFormValid
                            ? 'bg-gold text-midnight hover:bg-gold/90 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(245,224,80,0.3)] active:scale-[0.98]'
                            : 'bg-gold/30 text-midnight/50 cursor-not-allowed'
                            }`}
                    >
                        {initialItem ? 'Update' : 'Create'}
                    </button>
                    {initialItem && (
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </motion.div>

            {recurrenceDialog && (
                <RecurrenceDialog
                    action={recurrenceDialog.action}
                    onThisOnly={handleRecurrenceThisOnly}
                    onAll={handleRecurrenceAll}
                    onCancel={() => setRecurrenceDialog(null)}
                />
            )}
        </div>
    )
}
