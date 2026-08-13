import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  AuthChangeEvent,
  Session,
  Subscription,
  User as SupabaseUser,
} from '@supabase/supabase-js';

import {
  PresenceStatus,
  User,
  AuthContextType,
} from '../types';

import { supabase } from '../lib/supabase';
import { sendServiceStatusNotification } from '../services/discordService';
import { getErrorMessage } from '../utils/errorHandling';

const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

interface UserProfileRow {
  id: string;
  email: string;
  name: string;
  role: User['role'];
  employee_type: 'dealer' | null;
  is_on_service: boolean | null;
  presence_status: PresenceStatus | null;
  last_service_status_change: string | null;
  created_at: string;
  avatar_url: string | null;
  availability: string | null;
}

const isValidPresenceStatus = (
  status: unknown,
): status is PresenceStatus =>
  status === 'available' ||
  status === 'inactive' ||
  status === 'busy';

const normalizePresenceStatus = (
  status: unknown,
): PresenceStatus =>
  isValidPresenceStatus(status)
    ? status
    : 'inactive';

const PRESENCE_LABELS: Record<
  PresenceStatus,
  string
> = {
  available: 'Disponibile',
  inactive: 'Inattivo',
  busy: 'Occupato',
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider',
    );
  }

  return context;
};

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] =
    useState<User | null>(null);

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [employees, setEmployees] =
    useState<User[]>([]);

  const isInitializingRef =
    useRef(true);

  const profileFetchInFlightRef =
    useRef<Map<string, Promise<boolean>>>(
      new Map(),
    );

  /**
   * Carica il profilo dell'utente autenticato.
   */
  const fetchUserProfile = useCallback(
    async (
      authUser: SupabaseUser,
    ): Promise<boolean> => {
      const userId = authUser.id;

      const existingRequest =
        profileFetchInFlightRef.current.get(
          userId,
        );

      if (existingRequest) {
        return existingRequest;
      }

      const request = (async () => {
        try {
          let {
            data,
            error,
          } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (error) {
            throw error;
          }

          /**
           * Se il profilo non esiste, prova prima
           * l'RPC e poi il fallback diretto.
           */
          if (!data) {
            const email =
              authUser.email ?? '';

            const name =
              authUser.user_metadata
                ?.full_name ??
              email.split('@')[0] ??
              'Dipendente';

            try {
              const { error: rpcError } =
                await supabase.rpc(
                  'create_user_profile',
                  {
                    p_id: userId,
                    p_email: email,
                    p_name: name,
                  },
                );

              if (rpcError) {
                console.warn(
                  'create_user_profile RPC failed:',
                  rpcError,
                );
              }
            } catch (rpcError) {
              console.warn(
                'create_user_profile exception:',
                rpcError,
              );
            }

            const profileResult =
              await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            data = profileResult.data;
          }

          /**
           * Fallback finale se il profilo ancora
           * non esiste.
           */
          if (!data) {
            const email =
              authUser.email ?? '';

            const name =
              authUser.user_metadata
                ?.full_name ??
              email.split('@')[0] ??
              'Dipendente';

            const {
              data: insertedProfile,
              error: insertError,
            } = await supabase
              .from('users')
              .upsert({
                id: userId,
                email,
                name,
                role: 'probation',
                employee_type: 'dealer',
                is_on_service: false,
                presence_status: 'inactive',
              })
              .select()
              .maybeSingle();

            if (insertError) {
              throw insertError;
            }

            data = insertedProfile;
          }

          if (!data) {
            return false;
          }

          const presenceStatus =
            normalizePresenceStatus(
              data.presence_status,
            );

          const userData: User = {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role,
            employeeType:
              data.employee_type ??
              undefined,
            isOnService:
              data.is_on_service ?? false,
            presenceStatus,
            lastServiceStatusChange:
              data.last_service_status_change ??
              undefined,
            createdAt: data.created_at,
            avatar_url:
              data.avatar_url ??
              undefined,
            availability:
              data.availability ??
              undefined,
          };

          setUser(userData);
          setIsAuthenticated(true);

          return true;
        } catch (error) {
          console.error(
            'Error fetching user profile:',
            error,
          );

          return false;
        } finally {
          profileFetchInFlightRef.current.delete(
            userId,
          );
        }
      })();

      profileFetchInFlightRef.current.set(
        userId,
        request,
      );

      return request;
    },
    [],
  );

  /**
   * Inizializzazione autenticazione.
   */
  useEffect(() => {
    let mounted = true;
    let authSubscription:
      | Subscription
      | null = null;

    const safetyTimeout =
      window.setTimeout(() => {
        if (!mounted) return;

        console.warn(
          'Auth initialization timed out.',
        );

        isInitializingRef.current = false;
        setLoading(false);
      }, 25000);

    const handleAuthStateChange = async (
      event: AuthChangeEvent,
      session: Session | null,
    ) => {
      if (!mounted) return;

      try {
        if (
          event === 'SIGNED_IN' &&
          session?.user
        ) {
          /**
           * Evita il doppio fetch durante
           * l'inizializzazione iniziale.
           */
          if (isInitializingRef.current) {
            return;
          }

          const success =
            await fetchUserProfile(
              session.user,
            );

          if (!success) {
            setUser(null);
            setIsAuthenticated(false);
          }

          return;
        }

        if (event === 'SIGNED_OUT') {
          profileFetchInFlightRef.current.clear();

          setUser(null);
          setIsAuthenticated(false);

          return;
        }

        if (
          (
            event === 'TOKEN_REFRESHED' ||
            event === 'USER_UPDATED'
          ) &&
          session?.user
        ) {
          await fetchUserProfile(
            session.user,
          );
        }
      } catch (error) {
        console.error(
          'Auth state change error:',
          error,
        );
      }
    };

    const initializeAuth =
      async () => {
        try {
          setLoading(true);
          isInitializingRef.current = true;

          const authListener =
            supabase.auth.onAuthStateChange(
              handleAuthStateChange,
            );

          authSubscription =
            authListener.data.subscription;

          const {
            data: sessionData,
            error,
          } =
            await supabase.auth.getSession();

          if (error) {
            console.error(
              'Session fetch error:',
              error,
            );

            setUser(null);
            setIsAuthenticated(false);

            return;
          }

          const session =
            sessionData.session;

          if (session?.user) {
            const success =
              await fetchUserProfile(
                session.user,
              );

            if (!success) {
              setUser(null);
              setIsAuthenticated(false);
            }
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error(
            'Initial auth error:',
            error,
          );

          setUser(null);
          setIsAuthenticated(false);
        } finally {
          window.clearTimeout(
            safetyTimeout,
          );

          isInitializingRef.current =
            false;

          if (mounted) {
            setLoading(false);
          }
        }
      };

    void initializeAuth();

    return () => {
      mounted = false;

      window.clearTimeout(
        safetyTimeout,
      );

      isInitializingRef.current = false;

      profileFetchInFlightRef.current.clear();

      authSubscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  /**
   * Realtime del profilo dell'utente corrente.
   *
   * Serve per aggiornare istantaneamente:
   * - presenza
   * - servizio
   * - ruolo
   * - avatar
   * - dati profilo
   */
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const channel = supabase
      .channel(
        `presence-user-${user.id}`,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const row =
            payload.new as Partial<UserProfileRow>;

          if (!row.id) {
            return;
          }

          const nextPresence =
            normalizePresenceStatus(
              row.presence_status,
            );

          setUser((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              name:
                row.name ??
                current.name,

              role:
                row.role ??
                current.role,

              email:
                row.email ??
                current.email,

              isOnService:
                row.is_on_service ??
                current.isOnService,

              presenceStatus:
                nextPresence,

              lastServiceStatusChange:
                row.last_service_status_change ??
                current.lastServiceStatusChange,

              avatar_url:
                row.avatar_url ??
                current.avatar_url,

              availability:
                row.availability ??
                current.availability,
            };
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [user?.id]);

  /**
   * Scrittura log attività.
   *
   * Importante:
   * questa funzione NON deve bloccare le operazioni
   * della UI quando il log non è essenziale.
   */
  const logActivity = useCallback(
    async (
      action: string,
      details: string,
      targetUserId?: string,
    ) => {
      if (!user?.id) {
        return;
      }

      try {
        await supabase.rpc(
          'log_activity',
          {
            p_user_id: user.id,
            p_action: action,
            p_details: details,
            p_target_user_id:
              targetUserId ?? null,
          },
        );
      } catch (error) {
        console.error(
          'Error logging activity:',
          error,
        );
      }
    },
    [user?.id],
  );

  /**
   * Carica tutti i dipendenti.
   */
  const fetchEmployeesStatus =
    useCallback(
      async (): Promise<User[]> => {
        try {
          const {
            data,
            error,
          } =
            await supabase
              .from('users')
              .select('*')
              .order('created_at', {
                ascending: false,
              });

          if (error) {
            throw error;
          }

          const employeesData: User[] =
            (data ?? []).map(
              (
                profile: UserProfileRow,
              ) => ({
                id: profile.id,
                email: profile.email,
                name: profile.name,
                role: profile.role,

                employeeType:
                  profile.employee_type ??
                  undefined,

                isOnService:
                  profile.is_on_service ??
                  false,

                presenceStatus:
                  normalizePresenceStatus(
                    profile.presence_status,
                  ),

                lastServiceStatusChange:
                  profile.last_service_status_change ??
                  undefined,

                createdAt:
                  profile.created_at,

                avatar_url:
                  profile.avatar_url ??
                  undefined,

                availability:
                  profile.availability ??
                  undefined,
              }),
            );

          setEmployees(
            employeesData,
          );

          return employeesData;
        } catch (error) {
          console.error(
            'Error fetching employees status:',
            error,
          );

          return [];
        }
      },
      [],
    );

  /**
   * Cambia lo stato di servizio.
   *
   * Servizio ON:
   *   presence = available
   *
   * Servizio OFF:
   *   presence = inactive
   */
  const toggleServiceStatus =
    useCallback(
      async (
        userId?: string,
      ): Promise<boolean> => {
        const targetUserId =
          userId ?? user?.id;

        if (!targetUserId) {
          return false;
        }

        try {
          const {
            data: currentUser,
            error: fetchError,
          } =
            await supabase
              .from('users')
              .select(
                'is_on_service',
              )
              .eq('id', targetUserId)
              .single();

          if (
            fetchError ||
            !currentUser
          ) {
            return false;
          }

          const isNowOnService =
            !currentUser.is_on_service;

          const nextPresenceStatus: PresenceStatus =
            isNowOnService
              ? 'available'
              : 'inactive';

          const timestamp =
            new Date().toISOString();

          const {
            error: updateError,
          } =
            await supabase
              .from('users')
              .update({
                is_on_service:
                  isNowOnService,

                presence_status:
                  nextPresenceStatus,

                last_service_status_change:
                  timestamp,
              })
              .eq(
                'id',
                targetUserId,
              );

          if (updateError) {
            throw updateError;
          }

          if (userId) {
            /**
             * Non bloccare il cambio stato
             * aspettando un refetch amministrativo.
             */
            void fetchEmployeesStatus();
          } else {
            setUser((current) =>
              current
                ? {
                    ...current,
                    isOnService:
                      isNowOnService,

                    presenceStatus:
                      nextPresenceStatus,

                    lastServiceStatusChange:
                      timestamp,
                  }
                : current,
            );
          }

          const targetUser =
            employees.find(
              (employee) =>
                employee.id ===
                targetUserId,
            ) ?? user;

          /**
           * Logging non bloccante.
           */
          void logActivity(
            'Stato Servizio',
            `${targetUser?.name ?? 'Utente'} ${
              isNowOnService
                ? 'è entrato in servizio'
                : 'è uscito dal servizio'
            }`,
            targetUserId,
          );

          /**
           * Discord notification non bloccante.
           */
          if (!userId) {
            const {
              data: updatedUser,
              error: updatedUserError,
            } =
              await supabase
                .from('users')
                .select(
                  'name, role',
                )
                .eq(
                  'id',
                  targetUserId,
                )
                .single();

            if (
              !updatedUserError &&
              updatedUser
            ) {
              void sendServiceStatusNotification(
                updatedUser.name,
                isNowOnService,
                updatedUser.role,
              ).catch((error) =>
                console.warn(
                  'Discord notification failed:',
                  error,
                ),
              );
            }
          }

          return true;
        } catch (error) {
          console.error(
            'Error toggling service status:',
            error,
          );

          return false;
        }
      },
      [
        user,
        employees,
        fetchEmployeesStatus,
        logActivity,
      ],
    );

  /**
   * Cambia la presenza.
   *
   * IMPORTANTE:
   * - UI ottimistica
   * - Supabase salva
   * - log in background
   *
   * La UI NON aspetta logActivity().
   */
  const setPresenceStatus =
    useCallback(
      async (
        status: PresenceStatus,
      ): Promise<boolean> => {
        if (
          !user?.id ||
          !isValidPresenceStatus(
            status,
          )
        ) {
          return false;
        }

        const previousStatus =
          normalizePresenceStatus(
            user.presenceStatus,
          );

        /**
         * Aggiornamento immediato.
         * Il pallino cambia istantaneamente.
         */
        setUser((current) =>
          current
            ? {
                ...current,
                presenceStatus: status,
              }
            : current,
        );

        try {
          const {
            error,
          } =
            await supabase
              .from('users')
              .update({
                presence_status:
                  status,
              })
              .eq(
                'id',
                user.id,
              );

          if (error) {
            throw error;
          }

          /**
           * Il log NON deve bloccare il cambio stato.
           */
          void logActivity(
            'Stato Presenza',
            `${user.name} ha impostato lo stato su ${PRESENCE_LABELS[status]}`,
          );

          return true;
        } catch (error) {
          console.error(
            'Error updating presence status:',
            error,
          );

          /**
           * Rollback UI se il database fallisce.
           */
          setUser((current) =>
            current
              ? {
                  ...current,
                  presenceStatus:
                    previousStatus,
                }
              : current,
          );

          return false;
        }
      },
      [
        user?.id,
        user?.name,
        user?.presenceStatus,
        logActivity,
      ],
    );

  /**
   * Aggiornamento ruolo.
   */
  const updateUserRole =
    useCallback(
      async (
        userId: string,
        newRole:
          | 'owner'
          | 'director'
          | 'vice_director'
          | 'employee'
          | 'probation',
      ): Promise<boolean> => {
        if (
          !user ||
          user.id === userId
        ) {
          return false;
        }

        const {
          data: targetUser,
          error: fetchError,
        } =
          await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (
          fetchError ||
          !targetUser
        ) {
          return false;
        }

        const currentRole =
          targetUser.role;

        /**
         * Vice Direttore non può gestire
         * ruoli alti.
         */
        if (
          user.role ===
            'vice_director' &&
          (
            newRole === 'owner' ||
            newRole === 'director' ||
            currentRole === 'owner' ||
            currentRole === 'director'
          )
        ) {
          return false;
        }

        /**
         * Direttore non può modificare
         * Proprietari.
         */
        if (
          user.role ===
            'director' &&
          (
            currentRole === 'owner' ||
            newRole === 'owner'
          )
        ) {
          return false;
        }

        try {
          const {
            error,
          } =
            await supabase
              .from('users')
              .update({
                role: newRole,
              })
              .eq(
                'id',
                userId,
              );

          if (error) {
            throw error;
          }

          const targetUserName =
            employees.find(
              (employee) =>
                employee.id ===
                userId,
            )?.name ??
            'Utente sconosciuto';

          const roleLabels = {
            owner: 'Proprietario',
            director: 'Direttore',
            vice_director:
              'Vice Direttore',
            employee: 'Dipendente',
            probation: 'In Prova',
          };

          void logActivity(
            'Cambio Ruolo',
            `${user.name} ha cambiato il ruolo di ${targetUserName} da ${
              roleLabels[
                currentRole as keyof typeof roleLabels
              ] ??
              currentRole
            } a ${
              roleLabels[
                newRole
              ]
            }`,
            userId,
          );

          return true;
        } catch (error) {
          console.error(
            'Error updating role:',
            error,
          );

          return false;
        }
      },
      [
        user,
        employees,
        logActivity,
      ],
    );

  /**
   * Licenziamento.
   */
  const fireEmployee =
    useCallback(
      async (
        employeeId: string,
      ): Promise<boolean> => {
        if (
          !user ||
          employeeId === user.id ||
          ![
            'owner',
            'director',
            'vice_director',
          ].includes(
            user.role,
          )
        ) {
          return false;
        }

        const employeeToFire =
          employees.find(
            (employee) =>
              employee.id ===
              employeeId,
          );

        if (!employeeToFire) {
          return false;
        }

        /**
         * Protezioni gerarchiche.
         */
        if (
          user.role ===
            'vice_director' &&
          [
            'owner',
            'director',
            'vice_director',
          ].includes(
            employeeToFire.role,
          )
        ) {
          return false;
        }

        if (
          user.role ===
            'director' &&
          employeeToFire.role ===
            'owner'
        ) {
          return false;
        }

        try {
          await supabase
            .from('activity_logs')
            .delete()
            .eq(
              'user_id',
              employeeId,
            );

          await supabase
            .from('activity_logs')
            .delete()
            .eq(
              'target_user_id',
              employeeId,
            );

          const {
            error,
          } =
            await supabase
              .from('users')
              .delete()
              .eq(
                'id',
                employeeId,
              );

          if (error) {
            throw error;
          }

          void logActivity(
            'Licenziamento',
            `${user.name} ha licenziato ${employeeToFire.name} (${employeeToFire.email}) - Ruolo: ${employeeToFire.role}`,
            employeeId,
          );

          void fetchEmployeesStatus();

          return true;
        } catch (error) {
          console.error(
            'Error firing employee:',
            error,
          );

          return false;
        }
      },
      [
        user,
        employees,
        fetchEmployeesStatus,
        logActivity,
      ],
    );

  /**
   * Login.
   */
  const login =
    useCallback(
      async (
        email: string,
        password: string,
      ): Promise<{
        success: boolean;
        message?: string;
      }> => {
        try {
          const {
            data,
            error,
          } =
            await supabase.auth.signInWithPassword(
              {
                email,
                password,
              },
            );

          if (error) {
            console.error(
              'Login error:',
              error,
            );

            if (
              error.message?.includes(
                'Invalid login credentials',
              )
            ) {
              return {
                success: false,
                message:
                  'Email o password non corretti. Se non hai un account, clicca su Registrati.',
              };
            }

            if (
              error.message?.includes(
                'Email not confirmed',
              ) ||
              error.message?.includes(
                'email_not_confirmed',
              )
            ) {
              return {
                success: false,
                message:
                  'Email non confermata. Controlla la tua casella email e clicca sul link di conferma.',
              };
            }

            return {
              success: false,
              message:
                error.message ||
                "Errore durante l'accesso",
            };
          }

          if (!data.user) {
            return {
              success: false,
              message:
                'Utente non trovato',
            };
          }

          const profileOk =
            await fetchUserProfile(
              data.user,
            );

          if (!profileOk) {
            return {
              success: false,
              message:
                'Errore nel caricamento del profilo utente. Se il problema persiste, contatta l\'amministratore.',
            };
          }

          const userName =
            data.user.user_metadata
              ?.full_name ??
            email;

          /**
           * Log accesso in background.
           */
          void logActivity(
            'Accesso',
            `${userName} ha effettuato l'accesso`,
          );

          return {
            success: true,
          };
        } catch (error: unknown) {
          console.error(
            'Login exception:',
            error,
          );

          return {
            success: false,
            message:
              getErrorMessage(
                error,
                'Errore di connessione',
              ),
          };
        }
      },
      [
        fetchUserProfile,
        logActivity,
      ],
    );

  /**
   * Logout.
   */
  const logout =
    useCallback(
      async () => {
        try {
          if (user?.isOnService) {
            await toggleServiceStatus(
              user.id,
            );
          }

          void logActivity(
            'LOGOUT',
            `${user?.name ?? user?.email ?? 'Utente'} ha effettuato la disconnessione`,
          );

          await supabase.auth.signOut();

          setUser(null);
          setIsAuthenticated(false);
        } catch (error) {
          console.error(
            'Logout error:',
            error,
          );
        }
      },
      [
        user,
        toggleServiceStatus,
        logActivity,
      ],
    );

  /**
   * Registrazione normale.
   */
  const register =
    useCallback(
      async (
        email: string,
        password: string,
        name: string,
      ): Promise<{
        success: boolean;
        message?: string;
        needsEmailConfirmation?: boolean;
      }> => {
        try {
          const {
            data:
              signUpData,
            error: authError,
          } =
            await supabase.auth.signUp(
              {
                email,
                password,
                options: {
                  data: {
                    full_name:
                      name,
                  },
                },
              },
            );

          if (authError) {
            console.error(
              'Auth registration error:',
              authError,
            );

            const message =
              authError.message ??
              '';

            if (
              message.includes(
                'already registered',
              ) ||
              message.includes(
                'already been registered',
              ) ||
              message.includes(
                'user_already_exists',
              )
            ) {
              return {
                success: false,
                message:
                  'Questa email è già registrata. Prova a fare il Login.',
              };
            }

            return {
              success: false,
              message:
                authError.message ||
                'Errore durante la registrazione',
            };
          }

          const authUser =
            signUpData.user;

          const session =
            signUpData.session;

          if (!authUser) {
            return {
              success: false,
              message:
                'Impossibile creare l\'account',
            };
          }

          let profileCreated =
            true;

          try {
            const {
              error: rpcError,
            } =
              await supabase.rpc(
                'create_user_profile',
                {
                  p_id:
                    authUser.id,
                  p_email:
                    email,
                  p_name:
                    name,
                },
              );

            if (rpcError) {
              const {
                error:
                  upsertError,
              } =
                await supabase
                  .from('users')
                  .upsert({
                    id: authUser.id,
                    email,
                    name,
                    role: 'probation',
                    employee_type:
                      'dealer',
                    is_on_service:
                      false,
                    presence_status:
                      'inactive',
                  });

              if (upsertError) {
                profileCreated =
                  false;
              }
            }
          } catch (error) {
            console.error(
              'Profile creation error:',
              error,
            );

            profileCreated =
              false;
          }

          if (!session) {
            return {
              success: true,
              needsEmailConfirmation:
                true,
              message:
                profileCreated
                  ? 'Registrazione completata! Controlla la tua email e clicca sul link di conferma per attivare l\'account, poi potrai fare il login.'
                  : 'Registrazione completata! Il tuo profilo utente verrà creato automaticamente al primo accesso.',
            };
          }

          if (!profileCreated) {
            return {
              success: true,
              message:
                'Account creato con successo! Il profilo verrà inizializzato al primo accesso. Ora puoi effettuare il login.',
            };
          }

          return {
            success: true,
            message:
              'Registrazione completata! Ora puoi accedere.',
          };
        } catch (error: unknown) {
          console.error(
            'Registration exception:',
            error,
          );

          const message =
            getErrorMessage(
              error,
              'Errore imprevisto durante la registrazione',
            );

          return {
            success: false,
            message: message.includes(
              'fetch',
            )
              ? 'Impossibile connettersi al server. Verifica le credenziali Supabase.'
              : message,
          };
        }
      },
      [],
    );

  /**
   * Registrazione proprietario.
   */
  const registerOwner =
    useCallback(
      async (
        email: string,
        password: string,
        name: string,
      ): Promise<boolean> => {
        try {
          const {
            count,
          } =
            await supabase
              .from('users')
              .select(
                '*',
                {
                  count:
                    'exact',
                  head: true,
                },
              )
              .eq(
                'role',
                'owner',
              );

          if (
            count &&
            count > 0
          ) {
            return false;
          }

          const {
            data,
            error: authError,
          } =
            await supabase.auth.signUp(
              {
                email,
                password,
              },
            );

          if (
            authError ||
            !data.user
          ) {
            return false;
          }

          const {
            error: dbError,
          } =
            await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email:
                  data.user.email ??
                  email,
                name,
                role: 'owner',
                employee_type:
                  'dealer',
                is_on_service:
                  false,
                presence_status:
                  'inactive',
              });

          if (dbError) {
            return false;
          }

          void supabase.rpc(
            'log_activity',
            {
              p_user_id:
                data.user.id,
              p_action:
                'Registrazione Proprietario',
              p_details:
                `Nuovo proprietario registrato: ${name} (${email})`,
              p_target_user_id:
                null,
            },
          );

          return true;
        } catch (error) {
          console.error(
            'Owner registration error:',
            error,
          );

          return false;
        }
      },
      [],
    );

  /**
   * Reset dati.
   */
  const resetAllData =
    useCallback(
      async (): Promise<boolean> => {
        if (
          !user ||
          ![
            'owner',
            'director',
          ].includes(
            user.role,
          )
        ) {
          return false;
        }

        try {
          /**
           * Il reset deve rimanere sincronizzato
           * con la RPC principale.
           */
          void logActivity(
            'Reset Totale',
            `${user.name} ha avviato un reset totale di tutti i dati del concessionario (vendite e log attività)`,
          );

          const {
            error:
              batchError,
          } =
            await supabase.rpc(
              'reset_all_data',
            );

          if (batchError) {
            await supabase
              .from('activity_logs')
              .delete()
              .not(
                'action',
                'eq',
                'Reset Totale',
              );

            await supabase
              .from('sales')
              .delete()
              .gte(
                'created_at',
                '1900-01-01',
              );
          }

          void logActivity(
            'Reset Completato',
            `${user.name} ha completato con successo il reset totale dei dati`,
          );

          return true;
        } catch (error) {
          console.error(
            'Error resetting all data:',
            error,
          );

          return false;
        }
      },
      [
        user,
        logActivity,
      ],
    );

  /**
   * Refresh esplicito del profilo.
   * Non viene usato per il cambio stato.
   */
  const refreshUserProfile =
    useCallback(
      async (): Promise<boolean> => {
        try {
          const {
            data: sessionData,
          } =
            await supabase.auth.getSession();

          if (!sessionData.session?.user) {
            return false;
          }

          return fetchUserProfile(
            sessionData.session.user,
          );
        } catch (error) {
          console.error(
            'Error refreshing user profile:',
            error,
          );

          return false;
        }
      },
      [fetchUserProfile],
    );

  /**
   * Loader iniziale.
   */
  if (loading) {
    return (
      <div className="app-viewport flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-yellow-600" />

          <p className="mt-4 text-gray-600">
            Caricamento...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated,
        register,
        registerOwner,
        updateUserRole,
        fireEmployee,
        toggleServiceStatus,
        setPresenceStatus,
        fetchEmployeesStatus,
        resetAllData,
        employees,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
