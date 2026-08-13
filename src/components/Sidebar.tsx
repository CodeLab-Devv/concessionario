import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, CalendarDays, ChevronDown, ChevronLeft, LayoutDashboard, LogOut, Megaphone, Settings } from 'lucide-react';
import { useServiceStatus } from '../hooks/useServiceStatus';
import { ProfileModal } from './modals/ProfileModal';
import { Avatar } from './Avatar';
import { supabase } from '../lib/supabase';
import type { PresenceStatus } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentPage: 'dashboard' | 'admin' | 'documents' | 'announcements' | 'shifts' | 'activity';
  onPageChange: (page: 'dashboard' | 'admin' | 'documents' | 'announcements' | 'shifts' | 'activity') => void;
}

const ROLE_META: Record<string, { label: string; className: string }> = {
  owner: { label: 'Proprietario', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  director: { label: 'Direttore', className: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  vice_director: { label: 'Vice Direttore', className: 'border-violet-200 bg-violet-50 text-violet-700' },
  employee: { label: 'Dipendente', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  probation: { label: 'In Prova', className: 'border-orange-200 bg-orange-50 text-orange-700' },
};

const PRESENCE_META: Record<PresenceStatus, { label: string; dot: string; activeBg: string }> = {
  available: { label: 'Disponibile', dot: 'bg-emerald-500', activeBg: 'bg-emerald-50' },
  inactive: { label: 'Inattivo', dot: 'bg-orange-500', activeBg: 'bg-orange-50' },
  busy: { label: 'Occupato', dot: 'bg-red-500', activeBg: 'bg-red-50' },
};

const normalizePresence = (status?: PresenceStatus | null): PresenceStatus =>
  status === 'available' || status === 'busy' ? status : 'inactive';

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, currentPage, onPageChange }) => {
  const { user, setPresenceStatus } = useAuth();
  const isOnService = useServiceStatus(user);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [presenceOpen, setPresenceOpen] = useState(false);
  const [presenceLoading, setPresenceLoading] = useState(false);

  const roleMeta = ROLE_META[user?.role || ''] ?? { label: 'Utente', className: 'border-slate-200 bg-slate-50 text-slate-600' };
  const currentPresence = normalizePresence(user?.presenceStatus);
  const currentPresenceMeta = PRESENCE_META[currentPresence];
  const canAccessActivity = ['owner', 'director', 'vice_director'].includes(user?.role || '') && isOnService;
  const canAccessAnnouncements = isOnService;
  const canAccessShifts = isOnService;

  const menuItems = [
    { id: 'dashboard', label: 'Home', description: 'Panoramica', icon: LayoutDashboard, page: 'dashboard' as const },
    ...(canAccessActivity ? [{ id: 'activity', label: 'Attività', description: 'Registro operativo', icon: Activity, page: 'activity' as const }] : []),
    ...(canAccessShifts ? [{ id: 'shifts', label: 'Turni', description: 'Disponibilità e turnazione', icon: CalendarDays, page: 'shifts' as const }] : []),
    ...(canAccessAnnouncements ? [{ id: 'announcements', label: 'Annunci', description: 'Comunicazioni del team', icon: Megaphone, page: 'announcements' as const }] : []),
  ];

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

  const handleLogout = async () => {
    if (!user || isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      if (user.isOnService) {
        await supabase.from('users').update({ is_on_service: false, last_service_status_change: new Date().toISOString() }).eq('id', user.id);
      }
      try {
        await supabase.rpc('log_activity', {
          p_user_id: user.id,
          p_action: 'LOGOUT',
          p_details: `${user.name || user.email || 'Utente'} ha effettuato la disconnessione`,
          p_target_user_id: null,
        });
      } catch (error) {
        console.warn('Impossibile registrare il logout:', error);
      }
    } finally {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Logout Supabase error:', error);
      } catch (error) {
        console.error('Logout exception:', error);
      }
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className={`safe-area-bottom app-viewport-height fixed inset-y-0 left-0 z-50 flex w-[min(88vw,21rem)] flex-col overflow-hidden border-r border-slate-200/70 bg-white shadow-[10px_0_40px_rgba(15,23,42,0.10)] transition-[transform,width,box-shadow] duration-300 ease-out lg:relative lg:shadow-none ${isOpen ? 'translate-x-0 lg:w-[18.5rem]' : '-translate-x-full lg:w-[5.5rem] lg:translate-x-0'}`}>
      <div className="safe-area-top border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 px-3 pb-3 pt-3 sm:px-4">
        <div className={`flex items-center ${isOpen ? 'justify-start' : 'justify-center'}`}>
          <img src={isOpen ? '/aurum-motors-logo.svg' : '/aurum-motors-mark.svg'} alt="Aurum Motors" className={isOpen ? 'h-11 w-auto max-w-[14rem]' : 'h-11 w-11'} draggable={false} />
        </div>
        {isOpen && user && (
          <div className="relative mt-4">
            <button type="button" onClick={() => setShowProfileModal(true)} className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 text-left shadow-sm transition hover:border-amber-200 hover:bg-amber-50/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 active:scale-[0.99]">
              <div className="relative shrink-0">
                <Avatar src={user.avatar_url} alt={user.name || 'Utente'} size="md" fallbackText={user.name || 'U'} />
                <button
                  type="button"
                  aria-label={`Stato: ${currentPresenceMeta.label}. Cambia stato`}
                  title={`Stato: ${currentPresenceMeta.label}`}
                  onClick={(event) => { event.stopPropagation(); setPresenceOpen(previous => !previous); }}
                  className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                >
                  <span className={`h-3 w-3 rounded-full ${currentPresenceMeta.dot}`} />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{user.name || 'Utente'}</p>
                <span className={`mt-1 inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${roleMeta.className}`}>{roleMeta.label}</span>
              </div>
              <Settings className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-amber-600" />
            </button>

            {presenceOpen && (
              <>
                <button type="button" aria-label="Chiudi selezione stato" className="fixed inset-0 z-40 cursor-default" onClick={() => setPresenceOpen(false)} />
                <div className="absolute left-2 right-2 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)] ring-1 ring-black/5">
                  <div className="px-3 pb-2 pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Stato personale</p>
                    <p className="mt-0.5 text-xs text-slate-500">Scegli come vuoi apparire al team</p>
                  </div>
                  <div className="space-y-1">
                    {(Object.keys(PRESENCE_META) as PresenceStatus[]).map(status => {
                      const meta = PRESENCE_META[status];
                      const active = status === currentPresence;
                      return (
                        <button
                          key={status}
                          type="button"
                          disabled={presenceLoading}
                          onClick={() => void handlePresenceChange(status)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? meta.activeBg : 'hover:bg-slate-50'} disabled:cursor-wait disabled:opacity-60`}
                        >
                          <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${meta.dot} ${active ? 'ring-4 ring-white shadow-sm' : ''}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-800">{meta.label}</span>
                            <span className="block text-[10px] text-slate-400">{status === 'available' ? 'Disponibile per il team' : status === 'inactive' ? 'Non attivamente disponibile' : 'Impegnato in un’attività'}</span>
                          </span>
                          {active && <span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 shadow-sm">Attuale</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4" aria-label="Navigazione principale">
        {isOpen && <div className="mb-3 px-2"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Menu principale</span></div>}
        <div className="space-y-1.5">
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.page;
            return <button key={item.id} type="button" onClick={() => onPageChange(item.page)} aria-current={active ? 'page' : undefined} title={!isOpen ? item.label : undefined} className={`group relative flex min-h-12 w-full items-center rounded-2xl text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 active:scale-[0.99] ${isOpen ? 'gap-3 px-3' : 'justify-center px-2'} ${active ? 'bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.22)]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              {active && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-white/90" />}
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${active ? 'bg-white/15 text-white ring-1 ring-white/15' : 'bg-slate-100/80 text-slate-500 group-hover:bg-white group-hover:text-amber-600 group-hover:shadow-sm'}`}><Icon className="h-[19px] w-[19px]" strokeWidth={2.1} /></span>
              {isOpen && <span className="min-w-0 flex-1 py-0.5"><span className={`block truncate text-sm font-semibold ${active ? 'text-white' : 'text-slate-800'}`}>{item.label}</span><span className={`mt-0.5 block truncate text-[10px] font-medium ${active ? 'text-white/75' : 'text-slate-400'}`}>{item.description}</span></span>}
              {isOpen && active && <ChevronLeft className="h-4 w-4 rotate-180 text-white/80" />}
            </button>;
          })}
        </div>
      </nav>
      <div className="safe-area-bottom border-t border-slate-200/80 bg-slate-50/70 p-3 sm:p-4">
        {isOpen ? (
          <button type="button" onClick={() => void handleLogout()} disabled={isLoggingOut} className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-red-100 bg-white px-3 text-left text-red-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50">{isLoggingOut ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" /> : <LogOut className="h-4 w-4" />}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{isLoggingOut ? 'Disconnessione...' : 'Esci'}</span><span className="block text-[10px] font-medium text-red-400">Disconnetti l'account</span></span>
          </button>
        ) : (
          <button type="button" onClick={() => void handleLogout()} disabled={isLoggingOut} title="Disconnetti l'account" aria-label="Disconnetti l'account" className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-white text-red-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 active:scale-95 disabled:cursor-wait disabled:opacity-70">
            {isLoggingOut ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" /> : <LogOut className="h-5 w-5" />}
          </button>
        )}
      </div>
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </aside>
  );
};