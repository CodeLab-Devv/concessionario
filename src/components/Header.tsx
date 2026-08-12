import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Circle, CircleDot, Power } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { NotificationBell } from './NotificationBell';

export const Header: React.FC = () => {
  const { user, isAuthenticated, toggleServiceStatus } = useAuth();
  const [warningCount, setWarningCount] = useState(0);
  const [hasLastChance, setHasLastChance] = useState(false);
  const [isServiceLoading, setIsServiceLoading] = useState(false);

  const loadWarnings = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('disciplinary_warnings')
      .select('severity')
      .eq('employee_id', user.id);

    if (error) {
      console.error('Errore caricamento richiami:', error);
      return;
    }

    const warnings = data ?? [];
    setWarningCount(warnings.filter(warning => warning.severity !== 'last_chance').length);
    setHasLastChance(warnings.some(warning => warning.severity === 'last_chance'));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setWarningCount(0);
      setHasLastChance(false);
      return;
    }

    void loadWarnings();
    const channel = supabase
      .channel(`header-warnings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'disciplinary_warnings',
          filter: `employee_id=eq.${user.id}`,
        },
        () => void loadWarnings(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, loadWarnings]);

  const handleServiceToggle = async () => {
    if (!user?.id || !toggleServiceStatus || isServiceLoading) return;
    setIsServiceLoading(true);
    try {
      await toggleServiceStatus();
    } catch (error) {
      console.error('Errore cambio stato servizio:', error);
    } finally {
      setIsServiceLoading(false);
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-600 sm:text-[10px]">Concessionario</p>
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">Aurum Motors</h1>
          </div>

          {isAuthenticated && (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {warningCount > 0 || hasLastChance ? (
                <div
                  className="flex min-h-11 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 shadow-sm sm:px-3 sm:text-sm"
                  title="Provvedimenti disciplinari"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>{hasLastChance ? 'Last Chance' : `${warningCount} ${warningCount === 1 ? 'richiamo' : 'richiami'}`}</span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handleServiceToggle()}
                disabled={isServiceLoading}
                aria-label={user?.isOnService ? 'Esci dal servizio' : 'Entra in servizio'}
                title={user?.isOnService ? 'Esci dal servizio' : 'Entra in servizio'}
                className={`group relative flex min-h-11 items-center gap-2 rounded-xl border px-2.5 transition-all duration-200 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:px-3 ${
                  user?.isOnService
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-200 hover:bg-amber-50'
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ${user?.isOnService ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {user?.isOnService ? <CircleDot className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-[11px] font-bold uppercase tracking-wide">{user?.isOnService ? 'In servizio' : 'Fuori servizio'}</span>
                  <span className="block text-[10px] opacity-65">{user?.isOnService ? 'Clicca per uscire' : 'Clicca per entrare'}</span>
                </span>
                {isServiceLoading ? (
                  <span className="ml-0.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Power className="hidden h-3.5 w-3.5 opacity-40 transition group-hover:opacity-70 sm:block" />
                )}
              </button>

              <NotificationBell />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
