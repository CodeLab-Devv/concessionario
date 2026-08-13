import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CircleDot, Power, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { NotificationBell } from './NotificationBell';
import type { PresenceStatus } from '../types';

const PRESENCE_META: Record<PresenceStatus, { label: string; dot: string; bg: string; text: string }> = {
  available: { label: 'Disponibile', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-800' },
  inactive: { label: 'Inattivo', dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-700' },
  busy: { label: 'Occupato', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-800' },
  dnd: { label: 'Non disturbare', dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-800' },
  absent: { label: 'Assente', dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-800' },
};

export const Header: React.FC = () => {
  const { user, isAuthenticated, toggleServiceStatus, setPresenceStatus } = useAuth();
  const [warningCount, setWarningCount] = useState(0);
  const [hasLastChance, setHasLastChance] = useState(false);
  const [isServiceLoading, setIsServiceLoading] = useState(false);
  const [presenceOpen, setPresenceOpen] = useState(false);
  const [presenceLoading, setPresenceLoading] = useState(false);

  const currentPresence = user?.presenceStatus || (user?.isOnService ? 'available' : 'inactive');
  const currentPresenceMeta = PRESENCE_META[currentPresence];

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disciplinary_warnings', filter: `employee_id=eq.${user.id}` }, () => void loadWarnings())
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

  const handlePresenceChange = async (status: PresenceStatus) => {
    if (!setPresenceStatus || status === currentPresence || presenceLoading) return;
    setPresenceLoading(true);
    try {
      const success = await setPresenceStatus(status);
      if (success) setPresenceOpen(false);
    } finally {
      setPresenceLoading(false);
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 shadow-sm">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <img src="/aurum-motors-logo.svg" alt="Aurum Motors" className="h-9 w-auto max-w-[12rem] sm:h-10 sm:max-w-[14rem]" draggable={false} />
          </div>

          {isAuthenticated && (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {warningCount > 0 || hasLastChance ? (
                <div className="flex min-h-11 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 shadow-sm sm:px-3 sm:text-sm" title="Provvedimenti disciplinari">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>{hasLastChance ? 'Last Chance' : `${warningCount} ${warningCount === 1 ? 'richiamo' : 'richiami'}`}</span>
                </div>
              ) : null}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPresenceOpen(previous => !previous)}
                  disabled={presenceLoading}
                  aria-expanded={presenceOpen}
                  className={`flex min-h-11 items-center gap-2 rounded-xl border px-2.5 transition sm:px-3 ${currentPresenceMeta.bg} ${currentPresenceMeta.text} border-slate-200 hover:border-slate-300`}
                  title="Cambia stato"
                >
                  <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                    <span className={`h-3 w-3 rounded-full ${currentPresenceMeta.dot}`} />
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block text-[11px] font-bold uppercase tracking-wide">{currentPresenceMeta.label}</span>
                    <span className="block text-[10px] opacity-60">Stato personale</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${presenceOpen ? 'rotate-180' : ''}`} />
                </button>

                {presenceOpen && (
                  <>
                    <button type="button" aria-label="Chiudi selezione stato" className="fixed inset-0 z-40 cursor-default" onClick={() => setPresenceOpen(false)} />
                    <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                      <div className="px-3 py-2">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Stato</p>
                        <p className="mt-0.5 text-xs text-slate-500">Come su Discord / WhatsApp</p>
                      </div>
                      {(Object.keys(PRESENCE_META) as PresenceStatus[]).map(status => {
                        const meta = PRESENCE_META[status];
                        const active = status === currentPresence;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => void handlePresenceChange(status)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                          >
                            <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${meta.dot}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-slate-800">{meta.label}</span>
                            </span>
                            {active && <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Attivo</span>}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleServiceToggle()}
                disabled={isServiceLoading}
                aria-label={user?.isOnService ? 'Esci dal servizio' : 'Entra in servizio'}
                title={user?.isOnService ? 'Esci dal servizio' : 'Entra in servizio'}
                className={`group relative flex min-h-11 items-center gap-2 rounded-xl border px-2.5 transition-all duration-200 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:px-3 ${user?.isOnService ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-200 hover:bg-amber-50'}`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ${user?.isOnService ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {user?.isOnService ? <CircleDot className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-[11px] font-bold uppercase tracking-wide">{user?.isOnService ? 'In servizio' : 'Fuori servizio'}</span>
                  <span className="block text-[10px] opacity-65">{user?.isOnService ? 'Clicca per uscire' : 'Clicca per entrare'}</span>
                </span>
                {isServiceLoading && <span className="ml-0.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              </button>

              <NotificationBell />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
