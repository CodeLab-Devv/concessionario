import { createClient } from '@supabase/supabase-js'

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variable.')
}

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'concessionario-auth-session',
    detectSessionInUrl: false,
    flowType: 'pkce',
  }
})

const originalAuthUpdateUser = supabaseClient.auth.updateUser.bind(supabaseClient.auth)

// The application uses fictional/test email addresses. For email changes we use the
// authenticated Edge Function so the Auth user and public profile are updated immediately,
// without the confirmation-email flow. All other auth.updateUser calls keep the native behavior.
supabaseClient.auth.updateUser = async (attributes, options) => {
  if (!attributes.email) {
    return originalAuthUpdateUser(attributes, options)
  }

  const requestedEmail = attributes.email.trim().toLowerCase()
  if (!requestedEmail) {
    return originalAuthUpdateUser(attributes, options)
  }

  const { data, error } = await supabaseClient.functions.invoke('update-own-email', {
    body: { email: requestedEmail },
  })

  if (error) return { data: { user: null, session: null }, error }
  if (!data?.success) {
    return {
      data: { user: null, session: null },
      error: new Error(data?.error || 'Impossibile cambiare email.'),
    }
  }

  const { data: refreshedSession, error: refreshError } = await supabaseClient.auth.refreshSession()
  if (refreshError) return { data: { user: null, session: null }, error: refreshError }

  return {
    data: {
      user: refreshedSession.session?.user ?? null,
      session: refreshedSession.session,
    },
    error: null,
  }
}

export const supabase = supabaseClient

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
          user_id: string | null
          action: string
          details: string
          target_user_id: string | null
          created_at: string
          table_name: string | null
          record_id: string | null
          metadata: Record<string, unknown> | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          details: string
          target_user_id?: string | null
          created_at?: string
          table_name?: string | null
          record_id?: string | null
          metadata?: Record<string, unknown> | null
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          details?: string
          target_user_id?: string | null
          created_at?: string
          table_name?: string | null
          record_id?: string | null
          metadata?: Record<string, unknown> | null
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
      save_registration_availability: {
        Args: {
          p_email: string
          p_availability: string
        }
        Returns: string
      }
      apply_registration_availability: {
        Args: {
          p_token: string
        }
        Returns: boolean
      }
    }
  }
}
