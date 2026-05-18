import { loadJSON, saveJSON } from './storage'

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

export function getHeatColor(minutes: number): string {
  if (minutes === 0) return 'rgba(200, 180, 255, 0.04)'
  if (minutes < 30) return '#2B1B48'
  if (minutes < 60) return '#6B3FA0'
  if (minutes < 120) return '#9B6DD7'
  return '#C4A0FF'
}

export function loadCourseColors(): Record<string, string> {
  return loadJSON<Record<string, string>>(LS_COURSE_COLORS_KEY, {})
}

export function saveCourseColors(map: Record<string, string>) {
  saveJSON(LS_COURSE_COLORS_KEY, map)
}
