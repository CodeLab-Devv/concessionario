import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  DollarSign,
  LayoutDashboard,
  Megaphone,
  Users,
  X,
} from 'lucide-react';
import { useServiceStatus } from '../hooks/useServiceStatus';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentPage: 'dashboard' | 'admin' | 'documents' | 'announcements' | 'shifts' | 'activity';
  onPageChange: (page: 'dashboard' | 'admin' | 'documents' | 'announcements' | 'shifts' | 'activity') => void;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  director: 'Direttore',
  vice_director: 'Vice Direttore',
  employee: 'Dipendente',
  probation: 'Prova',
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  currentPage,
  onPageChange,
}) => {
  const { user } = useAuth();
  const isOnService = useServiceStatus(user);
  const canAccessAdmin = user?.role === 'owner' || user?.role === 'director';
  const canAccessActivity = ['owner', 'director', 'vice_director'].includes(user?.role || '') && isOnService;
  const canAccessAnnouncements = isOnService;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Home',
      description: 'Panoramica',
      icon: LayoutDashboard,
      page: 'dashboard' as const,
    },
    ...(canAccessActivity
      ? [{
          id: 'activity',
          label: 'Attività',
          description: 'Registro operativo',
          icon: Activity,
          page: 'activity' as const,
        }]
      : []),
    {
      id: 'shifts',
      label: 'Turni',
      description: 'Disponibilità e turnazione',
      icon: CalendarDays,
      page: 'shifts' as const,
    },
    ...(canAccessAnnouncements
      ? [{
          id: 'announcements',
          label: 'Annunci',
          description: 'Comunicazioni del team',
          icon: Megaphone,
          page: 'announcements' as const,
        }]
      : []),
    ...(canAccessAdmin
      ? [{
          id: 'admin',
          label: 'Stipendi',
          description: 'Compensi e gestione',
          icon: DollarSign,
          page: 'admin' as const,
        }]
      : []),
  ];

  const handlePageChange = (page: SidebarProps['currentPage']) => {
    onPageChange(page);
  };

  return (
    <>
      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`safe-area-bottom app-viewport-height fixed inset-y-0 left-0 z-50 flex w-[min(88vw,21rem)] flex-col overflow-hidden border-r border-slate-200/70 bg-white shadow-[10px_0_40px_rgba(15,23,42,0.10)] transition-[transform,width,box-shadow] duration-300 ease-out lg:relative lg:shadow-none ${
          isOpen
            ? 'translate-x-0 lg:w-[18.5rem]'
            : '-translate-x-full lg:w-[5.5rem] lg:translate-x-0'
        }`}
      >
        <div className="safe-area-top border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 px-3 pb-3 pt-3 sm:px-4">
          <div className={`flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
            <div className={`flex min-w-0 items-center ${isOpen ? 'gap-3' : ''}`}>
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 shadow-[0_8px_22px_rgba(245,158,11,0.28)] ring-4 ring-amber-50">
                <Users className="h-5 w-5 text-white" strokeWidth={2.2} />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
              </div>

              {isOpen && (
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">
                    Concessionario
                  </p>
                  <h1 className="truncate text-[17px] font-bold tracking-tight text-slate-900">
                    Aurum Motors
                  </h1>
                </div>
              )}
            </div>

            {isOpen && (
              <button
                onClick={onToggle}
                aria-label="Chiudi menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 active:scale-95 lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {isOpen && user && (
            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
                    {user.name?.slice(0, 1).toUpperCase() || '?'}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {user.name || 'Utente'}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="truncate text-[11px] font-medium text-slate-500">
                      {ROLE_LABELS[user.role || ''] || user.role || 'Utente'}
                    </span>
                    {isOnService && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        In servizio
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4" aria-label="Navigazione principale">
          <div className="mb-3 flex items-center justify-between px-2">
            {isOpen ? (
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Menu principale
              </span>
            ) : (
              <span className="mx-auto h-1.5 w-1.5 rounded-full bg-slate-300" />
            )}
          </div>

          <div className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.page;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePageChange(item.page)}
                  aria-current={active ? 'page' : undefined}
                  title={!isOpen ? item.label : undefined}
                  className={`group relative flex min-h-12 w-full items-center rounded-2xl text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 active:scale-[0.99] ${
                    isOpen ? 'gap-3 px-3' : 'justify-center px-2'
                  } ${
                    active
                      ? 'bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.22)]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-white/90" />
                  )}

                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                      active
                        ? 'bg-white/15 text-white ring-1 ring-white/15'
                        : 'bg-slate-100/80 text-slate-500 group-hover:bg-white group-hover:text-amber-600 group-hover:shadow-sm'
                    }`}
                  >
                    <Icon className="h-[19px] w-[19px]" strokeWidth={2.1} />
                  </span>

                  {isOpen && (
                    <span className="min-w-0 flex-1 py-0.5">
                      <span className={`block truncate text-sm font-semibold ${active ? 'text-white' : 'text-slate-800'}`}>
                        {item.label}
                      </span>
                      <span className={`mt-0.5 block truncate text-[10px] font-medium ${active ? 'text-white/75' : 'text-slate-400'}`}>
                        {item.description}
                      </span>
                    </span>
                  )}

                  {isOpen && active && (
                    <ChevronLeft className="h-4 w-4 rotate-180 text-white/80" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="safe-area-bottom border-t border-slate-200/80 bg-slate-50/70 p-3 sm:p-4">
          {isOpen ? (
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">Stato operativo</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                    {isOnService ? 'Sei attualmente in servizio.' : 'Non sei attualmente in servizio.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`mx-auto h-3 w-3 rounded-full ring-4 ${
                isOnService
                  ? 'bg-emerald-500 ring-emerald-50'
                  : 'bg-slate-300 ring-slate-100'
              }`}
              title={isOnService ? 'In servizio' : 'Fuori servizio'}
            />
          )}
        </div>
      </aside>
    </>
  );
};
