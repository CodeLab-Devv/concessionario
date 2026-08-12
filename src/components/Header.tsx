import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { NotificationBell } from './NotificationBell';

export const Header: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [warningCount, setWarningCount] = useState(0);
  const [hasLastChance, setHasLastChance] = useState(false);

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

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 min-w-0 items-center justify-between gap-3">
          <h1 className="truncate text-base font-bold tracking-tight text-gray-900 sm:text-xl">
            AURUM MOTORS
          </h1>

          {isAuthenticated && (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {warningCount > 0 || hasLastChance ? (
                <div
                  className="flex min-h-11 items-center gap-1.5 rounded-lg bg-amber-50 px-2 text-xs font-semibold text-amber-800 sm:px-3 sm:text-sm"
                  title="Provvedimenti disciplinari"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>{hasLastChance ? 'Last Chance' : `${warningCount} ${warningCount === 1 ? 'richiamo' : 'richiami'}`}</span>
                </div>
              ) : null}
              <NotificationBell />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};