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
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          color: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
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
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type Calendar = Database['public']['Tables']['calendars']['Row']
export type CalendarInsert = Database['public']['Tables']['calendars']['Insert']
export type CalendarEvent = Database['public']['Tables']['events']['Row']
export type CalendarEventInsert = Database['public']['Tables']['events']['Insert']
export type Subject = Database['public']['Tables']['subjects']['Row']
export type SubjectInsert = Database['public']['Tables']['subjects']['Insert']
export type FocusSession = Database['public']['Tables']['focus_sessions']['Row']
export type FocusSessionInsert = Database['public']['Tables']['focus_sessions']['Insert']
export type Todo = Database['public']['Tables']['todos']['Row']
export type TodoInsert = Database['public']['Tables']['todos']['Insert']
export type Assignment = Database['public']['Tables']['assignments']['Row']
export type AssignmentInsert = Database['public']['Tables']['assignments']['Insert']
export type RecurrenceException = Database['public']['Tables']['recurrence_exceptions']['Row']
export type RecurrenceExceptionInsert = Database['public']['Tables']['recurrence_exceptions']['Insert']
