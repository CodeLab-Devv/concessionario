import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
})

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'owner' | 'director' | 'vice_director' | 'employee' | 'probation'
          employee_type: 'dealer' | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'owner' | 'director' | 'vice_director' | 'employee' | 'probation'
          employee_type?: 'dealer' | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'owner' | 'director' | 'vice_director' | 'employee' | 'probation'
          employee_type?: 'dealer' | null
          created_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          employee_id: string
          employee_name: string
          item_name: string
          car_model: string | null
          price: number
          quantity: number
          total: number
          date: string
          type: 'sale'
          category: 'concessionari'
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          employee_name: string
          item_name: string
          car_model?: string | null
          price: number
          quantity: number
          total: number
          date: string
          type: 'sale'
          category: 'concessionari'
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          employee_name?: string
          item_name?: string
          car_model?: string | null
          price?: number
          quantity?: number
          total?: number
          date?: string
          type?: 'sale'
          category?: 'concessionari'
          created_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          details: string
          target_user_id: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          details: string
          target_user_id?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          details?: string
          target_user_id?: string | null
          timestamp?: string
        }
      }
    }
    Functions: {
      log_activity: {
        Args: {
          p_user_id: string
          p_action: string
          p_details: string
          p_target_user_id?: string
        }
        Returns: void
      }
    }
  }
}
