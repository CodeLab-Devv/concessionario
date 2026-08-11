import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, AuthContextType } from '../types';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session, Subscription, AuthChangeEvent } from '@supabase/supabase-js';
import { sendServiceStatusNotification } from '../services/discordService';
import { getErrorMessage } from '../utils/errorHandling';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface UserProfileRow {
  id: string;
  email: string;
  name: string;
  role: User['role'];
  employee_type: 'dealer' | null;
  is_on_service: boolean | null;
  last_service_status_change: string | null;
  created_at: string;
  avatar_url: string | null;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<User[]>([]);

  const isInitializingRef = useRef(true);
  const profileFetchInFlightRef = useRef<Map<string, Promise<boolean>>>(new Map());

  const fetchUserProfile = useCallback(async (authUser: SupabaseUser): Promise<boolean> => {
    const uid = authUser.id;
    const existing = profileFetchInFlightRef.current.get(uid);
    if (existing) {
      return existing;
    }

    const task = (async () => {
      try {
        let { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (!data) {
          console.warn('Utente in Auth ma non in public.users. Generazione profilo automatico...');
          const userEmail = authUser.email || '';
          const userName = authUser.user_metadata?.full_name || userEmail.split('@')[0] || 'Dipendente';
          
          try {
            const { error: rpcErr } = await supabase.rpc('create_user_profile', {
              p_id: authUser.id,
              p_email: userEmail,
              p_name: userName,
            });
            if (rpcErr) {
              console.warn('RPC create_user_profile failed, trying direct upsert:', rpcErr);
            }
          } catch (rpcEx) {
            console.warn('RPC create_user_profile exception:', rpcEx);
          }

          const check = await supabase.from('users').select('*').eq('id', authUser.id).maybeSingle();
          data = check.data;

          if (!data) {
            const insertRes = await supabase.from('users').upsert({
              id: authUser.id,
              email: userEmail,
              name: userName,
              role: 'probation',
              employee_type: 'dealer',
              is_on_service: false
            }).select().maybeSingle();
            if (insertRes.error) {
              console.error('Direct upsert failed:', insertRes.error);
            }
            data = insertRes.data;
          }
        }

        if (!data) {
          console.error('Impossibile recuperare o creare il profilo per l\'utente:', authUser.id);
          return false;
        }

        const userData: User = {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          employeeType: data.employee_type || 'dealer',
          isOnService: data.is_on_service || false,
          lastServiceStatusChange: data.last_service_status_change,
          createdAt: data.created_at,
          avatar_url: data.avatar_url
        };

        setUser(userData);
        setIsAuthenticated(true);
        return true;
      } catch (error) {
        console.error('Error fetching user profile:', error);
        return false;
      } finally {
        profileFetchInFlightRef.current.delete(uid);
      }
    })();

    profileFetchInFlightRef.current.set(uid, task);
    return task;
  }, []);

  useEffect(() => {
    let mounted = true;
    let subscription: Subscription | null = null;
    const profileFetches = profileFetchInFlightRef.current;

    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth initialization timed out, forcing loading=false');
        isInitializingRef.current = false;
        setLoading(false);
      }
    }, 25000);

    const handleAuthStateChange = async (event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          if (isInitializingRef.current) {
            return;
          }
          const ok = await fetchUserProfile(session.user);
          if (!ok) {
            setUser(null);
            setIsAuthenticated(false);
          }
        } else if (event === 'SIGNED_OUT') {
          profileFetches.clear();
          setUser(null);
          setIsAuthenticated(false);
        } else if ((event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
          await fetchUserProfile(session.user);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      }
    };

    const initializeAuth = async () => {
      try {
        setLoading(true);
        isInitializingRef.current = true;

        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
        subscription = authSub;

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session fetch error:', error);
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        if (session?.user) {
          const ok = await fetchUserProfile(session.user);
          if (!ok) {
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Initial auth error:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        clearTimeout(safetyTimeout);
        isInitializingRef.current = false;
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      isInitializingRef.current = false;
      profileFetches.clear();
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  const logActivity = useCallback(async (action: string, details: string, targetUserId?: string) => {
    if (!user) return;

    try {
      await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_action: action,
        p_details: details,
        p_target_user_id: targetUserId || null
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Login error:', error);
        if (error.message?.includes('Invalid login credentials')) {
          return { success: false, message: 'Email o password non corretti. Se non hai un account, clicca su Registrati.' };
        }
        if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
          return { success: false, message: 'Email non confermata. Controlla la tua casella email e clicca sul link di conferma.' };
        }
        return { success: false, message: error.message || 'Errore durante l\'accesso' };
      }

      if (data.user) {
        const profileOk = await fetchUserProfile(data.user);
        if (!profileOk) {
          return { success: false, message: 'Errore nel caricamento del profilo utente. Se il problema persiste, contatta l\'amministratore.' };
        }
        const userName = data.user.user_metadata?.full_name || email;
        logActivity('Accesso', `${userName} ha effettuato l'accesso`).catch(() => {});
        return { success: true };
      }
      return { success: false, message: 'Utente non trovato' };
    } catch (error: unknown) {
      console.error('Login exception:', error);
      return { success: false, message: getErrorMessage(error, 'Errore di connessione') };
    }
  }, [fetchUserProfile, logActivity]);

  const logout = useCallback(async () => {
    try {
      if (user?.isOnService) {
        await toggleServiceStatus(user.id);
      }
      const userName = user?.name || user?.email || 'Utente sconosciuto';
      await logActivity('LOGOUT', `${userName} ha effettuato la disconnessione`);
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [user, logActivity]);

  const fetchEmployeesStatus = useCallback(async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees status:', error);
        return [];
      }

      const employeesData: User[] = (data || []).map((emp) => {
        const profile = emp as UserProfileRow;

        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          employeeType: profile.employee_type || undefined,
          isOnService: profile.is_on_service || false,
          lastServiceStatusChange: profile.last_service_status_change || undefined,
          createdAt: profile.created_at,
          avatar_url: profile.avatar_url || undefined
        };
      });

      setEmployees(employeesData);
      return employeesData;
    } catch (error) {
      console.error('Error fetching employees status:', error);
      return [];
    }
  }, []);

  const toggleServiceStatus = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return false;

    try {
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('is_on_service')
        .eq('id', targetUserId)
        .single();

      if (fetchError || !currentUser) return false;

      const newStatus = !currentUser.is_on_service;

      const { error } = await supabase
        .from('users')
        .update({
          is_on_service: newStatus,
          last_service_status_change: new Date().toISOString()
        })
        .eq('id', targetUserId);

      if (error) throw error;

      const { data: updatedUserData, error: fetchUserError } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', targetUserId)
        .single();
      
      if (!fetchUserError && updatedUserData) {
        sendServiceStatusNotification(
          updatedUserData.name,
          newStatus,
          updatedUserData.role
        ).catch(error => {
          console.warn('Discord notification failed:', error);
        });
      }

      if (userId) {
        await fetchEmployeesStatus();
      } else {
        setUser(prev => prev ? { ...prev, isOnService: newStatus } : prev);
      }

      const targetUser = employees.find(emp => emp.id === targetUserId) || user;
      const userName = targetUser?.name || 'Utente sconosciuto';
      
      await logActivity('Stato Servizio', 
        `${userName} ${newStatus ? 'è entrato in servizio' : 'è uscito dal servizio'}`,
        targetUserId);

      return true;
    } catch (error) {
      console.error('Error toggling service status:', error);
      return false;
    }
  }, [user, employees, fetchEmployeesStatus, logActivity]);

  const fireEmployee = useCallback(async (employeeId: string): Promise<boolean> => {
    if (!user) return false;

    const employeeToFire = employees.find(e => e.id === employeeId);
    if (!employeeToFire) return false;
    if (employeeId === user.id) return false;

    if (user.role === 'vice_director') {
      const restrictedRoles = ['owner', 'director', 'vice_director'];
      if (restrictedRoles.includes(employeeToFire.role)) {
        return false;
      }
    }

    if (user.role === 'director' && employeeToFire.role === 'owner') {
      return false;
    }

    const authorizedRoles = ['owner', 'director', 'vice_director'];
    if (!authorizedRoles.includes(user.role)) {
      return false;
    }

    try {
      await supabase.from('activity_logs').delete().eq('user_id', employeeId);
      await supabase.from('activity_logs').delete().eq('target_user_id', employeeId);

      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', employeeId);

      if (dbError) throw dbError;

      const managerName = user.name || 'Manager';
      await logActivity('Licenziamento', 
        `${managerName} ha licenziato ${employeeToFire.name} (${employeeToFire.email}) - Ruolo: ${employeeToFire.role}`, 
        employeeId);

      await fetchEmployeesStatus();
      return true;
    } catch (error) {
      console.error('Error firing employee:', error);
      return false;
    }
  }, [user, employees, fetchEmployeesStatus, logActivity]);

  const updateUserRole = useCallback(async (userId: string, newRole: 'owner' | 'director' | 'vice_director' | 'employee' | 'probation'): Promise<boolean> => {
    if (!user) return false;

    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) return false;

    const currentRole = targetUser.role;

    if (user.role === 'vice_director') {
      if (newRole === 'owner' || newRole === 'director' ||
          currentRole === 'owner' || currentRole === 'director') {
        return false;
      }
    } else if (user.role === 'director') {
      if (currentRole === 'owner' || newRole === 'owner') {
        return false;
      }
    }

    if (user.id === userId) return false;

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      const managerName = user.name || 'Manager';
      const targetUserName = employees.find(emp => emp.id === userId)?.name || 'Utente sconosciuto';
      
      const roleLabels = {
        owner: 'Proprietario',
        director: 'Direttore',
        vice_director: 'Vice Direttore',
        employee: 'Dipendente',
        probation: 'In Prova'
      };
      
      const oldRoleLabel = roleLabels[currentRole as keyof typeof roleLabels] || currentRole;
      const newRoleLabel = roleLabels[newRole as keyof typeof roleLabels] || newRole;
      
      await logActivity('Cambio Ruolo', 
        `${managerName} ha promosso ${targetUserName} da ${oldRoleLabel} a ${newRoleLabel}`,
        userId);

      return true;
    } catch (error) {
      console.error('Error updating role:', error);
      return false;
    }
  }, [user, employees, logActivity]);

  const register = useCallback(async (email: string, password: string, name: string): Promise<{success: boolean, message?: string, needsEmailConfirmation?: boolean}> => {
    try {
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });

      if (authError) {
        console.error('Auth registration error:', authError);
        const msg = authError.message || '';
        if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user_already_exists')) {
          return { success: false, message: 'Questa email è già registrata. Prova a fare il Login.' };
        }
        return { success: false, message: authError.message || 'Errore durante la registrazione' };
      }

      const authUser = signUpData.user;
      const session = signUpData.session;
      if (!authUser) {
        return { success: false, message: 'Impossibile creare l\'account' };
      }

      let profileCreated = true;
      try {
        const { error: rpcErr } = await supabase.rpc('create_user_profile', {
          p_id: authUser.id,
          p_email: email,
          p_name: name,
        });

        if (rpcErr) {
          console.warn('RPC create_user_profile failed, trying direct upsert:', rpcErr);
          const { error: upsertErr } = await supabase.from('users').upsert({
            id: authUser.id,
            email: email,
            name: name,
            role: 'probation',
            employee_type: 'dealer',
            is_on_service: false
          });
          if (upsertErr) {
            console.error('Direct upsert also failed:', upsertErr);
            profileCreated = false;
          }
        }
      } catch (dbErr) {
        console.error('Profile creation error:', dbErr);
        profileCreated = false;
      }

      if (!session) {
        if (!profileCreated) {
          return { 
            success: true, 
            needsEmailConfirmation: true,
            message: 'Registrazione completata! Conferma la tua email tramite il link che ti abbiamo inviato, poi potrai accedere. Il tuo profilo utente verrà creato automaticamente al primo accesso.' 
          };
        }
        return { 
          success: true, 
          needsEmailConfirmation: true,
          message: 'Registrazione completata! Controlla la tua email e clicca sul link di conferma per attivare l\'account, poi potrai fare il login.' 
        };
      }

      if (!profileCreated) {
        return { 
          success: true, 
          message: 'Account creato con successo! Il profilo verrà inizializzato al primo accesso. Ora puoi effettuare il login.' 
        };
      }

      return { success: true, message: 'Registrazione completata! Ora puoi accedere.' };
    } catch (error: unknown) {
      console.error('Registration exception:', error);
      const errorMessage = getErrorMessage(error, 'Errore imprevisto durante la registrazione');
      if (errorMessage.includes('fetch')) {
        return { success: false, message: 'Impossibile connettersi al server. Verifica le credenziali Supabase.' };
      }
      return { success: false, message: errorMessage };
    }
  }, []);

  const registerOwner = useCallback(async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'owner');

      if (count && count > 0) {
        console.error('Owner already exists');
        return false;
      }

      const { data: { user: authUser }, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !authUser) {
        console.error('Auth registration error:', authError);
        return false;
      }

      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email || email,
          name,
          role: 'owner',
          employee_type: 'dealer',
          is_on_service: false
        });

      if (dbError) {
        console.error('DB registration error:', dbError);
        return false;
      }

      try {
        await supabase.rpc('log_activity', {
          p_user_id: authUser.id,
          p_action: 'Registrazione Proprietario',
          p_details: `Nuovo proprietario registrato: ${name} (${email})`,
          p_target_user_id: null
        });
      } catch (logError) {
        console.warn('Failed to log owner registration:', logError);
      }

      return true;
    } catch (error) {
      console.error('Owner registration error:', error);
      return false;
    }
  }, []);

  const resetAllData = useCallback(async (): Promise<boolean> => {
    if (!user || !['owner', 'director'].includes(user.role)) {
      console.error('Unauthorized: Only owner and director can reset all data');
      return false;
    }

    try {
      await logActivity('Reset Totale', 
        `${user.name} ha avviato un reset totale di tutti i dati del concessionario (vendite e log attività)`);

      const { error: batchError } = await supabase.rpc('reset_all_data');
      
      if (batchError) {
        console.warn('RPC reset failed, using fallback method:', batchError);
        
        await supabase
          .from('activity_logs')
          .delete()
          .not('action', 'eq', 'Reset Totale');

        await supabase
          .from('sales')
          .delete()
          .gte('created_at', '1900-01-01');
      }

      await logActivity('Reset Completato', 
        `${user.name} ha completato con successo il reset totale dei dati`);

      return true;
    } catch (error) {
      console.error('Error resetting all data:', error);
      return false;
    }
  }, [user, logActivity]);

  const refreshUserProfile = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return false;
      }
      return fetchUserProfile(session.user);
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      return false;
    }
  }, [fetchUserProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated,
      register,
      registerOwner,
      updateUserRole,
      fireEmployee,
      toggleServiceStatus,
      fetchEmployeesStatus,
      resetAllData,
      employees,
      refreshUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};
