export interface Database {
  public: {
    Tables: {
      calendars: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          visible: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          color: string
          visible?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          visible?: boolean
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          user_id: string
          calendar_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          recurrence: string | null
          recurrence_until: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          calendar_id: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          recurrence?: string | null
          recurrence_until?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          calendar_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          recurrence?: string | null
          recurrence_until?: string | null
          created_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          archived: boolean
          position: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          color: string
          archived?: boolean
          position?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          archived?: boolean
          position?: number | null
          created_at?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          id: string
          user_id: string
          subject_id: string
          start_time: string
          end_time: string | null
          duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          subject_id: string
          start_time: string
          end_time?: string | null
          duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string
          start_time?: string
          end_time?: string | null
          duration_seconds?: number | null
          created_at?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          due_date: string | null
          completed: boolean
          type: string | null
          status: string | null
          course: string | null
          recurrence: string | null
          recurrence_until: string | null
          position: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          description?: string | null
          due_date?: string | null
          completed?: boolean
          type?: string | null
          status?: string | null
          course?: string | null
          recurrence?: string | null
          recurrence_until?: string | null
          position?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          completed?: boolean
          type?: string | null
          status?: string | null
          course?: string | null
          recurrence?: string | null
          recurrence_until?: string | null
          position?: number | null
          created_at?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          due_date: string
          course: string | null
          completed: boolean
          type: string | null
          status: string | null
          recurrence: string | null
          recurrence_until: string | null
          position: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          description?: string | null
          due_date: string
          course?: string | null
          completed?: boolean
          type?: string | null
          status?: string | null
          recurrence?: string | null
          recurrence_until?: string | null
          position?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          due_date?: string
          course?: string | null
          completed?: boolean
          type?: string | null
          status?: string | null
          recurrence?: string | null
          recurrence_until?: string | null
          position?: number | null
          created_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          timer_mode: string
          pomodoro_focus_minutes: number
          pomodoro_short_break_minutes: number
          pomodoro_long_break_minutes: number
          pomodoro_cycles: number
          period_tracker_enabled: boolean
          gym_routine_enabled: boolean
          cycle_last_notified_phase: string | null
          cycle_last_notified_on: string | null
          budget_monthly: number | null
          gym_routine: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          timer_mode?: string
          pomodoro_focus_minutes?: number
          pomodoro_short_break_minutes?: number
          pomodoro_long_break_minutes?: number
          pomodoro_cycles?: number
          period_tracker_enabled?: boolean
          gym_routine_enabled?: boolean
          cycle_last_notified_phase?: string | null
          cycle_last_notified_on?: string | null
          budget_monthly?: number | null
          gym_routine?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timer_mode?: string
          pomodoro_focus_minutes?: number
          pomodoro_short_break_minutes?: number
          pomodoro_long_break_minutes?: number
          pomodoro_cycles?: number
          period_tracker_enabled?: boolean
          gym_routine_enabled?: boolean
          cycle_last_notified_phase?: string | null
          cycle_last_notified_on?: string | null
          budget_monthly?: number | null
          gym_routine?: string[] | null
          created_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          date: string
          amount: number
          category: string
          note: string | null
          card: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          date: string
          amount: number
          category: string
          note?: string | null
          card?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          amount?: number
          category?: string
          note?: string | null
          card?: string | null
          created_at?: string
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          date: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      period_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          flow: string | null
          symptoms: string[] | null
          mood: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          date: string
          flow?: string | null
          symptoms?: string[] | null
          mood?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          flow?: string | null
          symptoms?: string[] | null
          mood?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      recurrence_exceptions: {
        Row: {
          id: string
          user_id: string
          parent_type: string
          parent_id: string
          exception_date: string
          exception_type: string
          overrides: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          parent_type: string
          parent_id: string
          exception_date: string
          exception_type: string
          overrides?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          parent_type?: string
          parent_id?: string
          exception_date?: string
          exception_type?: string
          overrides?: Record<string, unknown> | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Calendar = Database['public']['Tables']['calendars']['Row']
export type CalendarInsert = Database['public']['Tables']['calendars']['Insert']
export type CalendarEvent = Database['public']['Tables']['events']['Row']
export type CalendarEventInsert = Database['public']['Tables']['events']['Insert']
export type Subject = Database['public']['Tables']['subjects']['Row']
export type SubjectInsert = Database['public']['Tables']['subjects']['Insert']
export type FocusSession = Database['public']['Tables']['focus_sessions']['Row']
export type Todo = Database['public']['Tables']['todos']['Row']
export type TodoInsert = Database['public']['Tables']['todos']['Insert']
export type Assignment = Database['public']['Tables']['assignments']['Row']
export type AssignmentInsert = Database['public']['Tables']['assignments']['Insert']
export type RecurrenceException = Database['public']['Tables']['recurrence_exceptions']['Row']
export type RecurrenceExceptionInsert = Database['public']['Tables']['recurrence_exceptions']['Insert']
export type UserSettings = Database['public']['Tables']['user_settings']['Row']
export type PeriodLog = Database['public']['Tables']['period_logs']['Row']
export type PeriodLogInsert = Database['public']['Tables']['period_logs']['Insert']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
export type WorkoutLog = Database['public']['Tables']['workout_logs']['Row']
export type WorkoutLogInsert = Database['public']['Tables']['workout_logs']['Insert']
