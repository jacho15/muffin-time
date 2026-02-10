export const SUBJECT_COLORS = [
  '#4F9CF7', '#F57C4F', '#9B59B6', '#2ECC71',
  '#E74C3C', '#F5E050', '#1ABC9C', '#E91E63',
]

const LS_COURSE_COLORS_KEY = 'muffin-course-colors'

export function getStatusColor(status: string | null, completed: boolean): string {
  if (completed || status === 'Completed') return '#2ECC71'
  if (status === 'In Progress') return '#F5E050'
  return '#E74C3C'
}

export function loadCourseColors(): Record<string, string> {
  try {
    const stored = localStorage.getItem(LS_COURSE_COLORS_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return {}
}

export function saveCourseColors(map: Record<string, string>) {
  localStorage.setItem(LS_COURSE_COLORS_KEY, JSON.stringify(map))
}
