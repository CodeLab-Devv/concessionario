import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { User } from '../../types';
import { supabase } from '../../lib/supabase';
import { parseAvailability, AVAILABILITY_DAYS } from '../AvailabilityEditor';
import { EmployeeWarningsSection } from '../EmployeeWarningsSection';
import { X, UserCheck, Crown, Star, Award, Shield, Trash2, Clock, CheckCircle2, XCircle, Car, CalendarDays } from 'lucide-react';
import { useNotifications } from '../ui/NotificationManager';
import { useDialogs } from '../ui/DialogManager';

interface PromoteEmployeeModalProps { isOpen: boolean; onClose: () => void; onPromote: (userId: string, newRole: User['role']) => Promise<boolean>; onFire: (userId: string) => void; employee: User | null; currentUserRole: string; }
const ROLE_LABELS: Record<string, string> = { owner: 'Proprietario', director: 'Direttore', vice_director: 'Vice Direttore', employee: 'Dipendente', probation: 'In Prova' };
const ROLE_COLORS: Record<string, string> = { owner: 'bg-red-100 text-red-800', director: 'bg-yellow-100 text-yellow-800', vice_director: 'bg-purple-100 text-purple-800', employee: 'bg-blue-100 text-blue-800', probation: 'bg-orange-100 text-orange-800' };

export const PromoteEmployeeModal: React.FC<PromoteEmployeeModalProps> = ({ isOpen, onClose, onPromote, onFire, employee, currentUserRole }) => {
  const [newRole, setNewRole] = useState<User['role']>(employee?.role || 'probation');
  const [availability, setAvailability] = useState(employee?.availability || '');
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();
  const { showConfirm } = useDialogs();

  useEffect(() => {
    if (!employee || !isOpen) return;
    setNewRole(employee.role);
    setAvailability(employee.availability || '');
    let cancelled = false;
    const loadAvailability = async () => {
      const { data, error } = await supabase.from('users').select('availability').eq('id', employee.id).maybeSingle();
      if (!cancelled && !error) setAvailability(data?.availability || '');
    };
    void loadAvailability();
    return () => { cancelled = true; };
  }, [employee, isOpen]);

  const schedule = useMemo(() => parseAvailability(availability), [availability]);
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Shield className="h-4 w-4 text-red-600" />;
      case 'director': return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'vice_director': return <Award className="h-4 w-4 text-purple-600" />;
      case 'employee': return <UserCheck className="h-4 w-4 text-blue-600" />;
      case 'probation': return <Star className="h-4 w-4 text-orange-600" />;
      default: return <UserCheck className="h-4 w-4 text-gray-600" />;
    }
  };
  const canPromoteToRole = (role: string) => currentUserRole === 'owner' || (currentUserRole === 'director' && role !== 'owner') || (currentUserRole === 'vice_director' && !['owner', 'director'].includes(role));
  const canFire = () => currentUserRole === 'owner' || (currentUserRole === 'director' && employee?.role !== 'owner') || (currentUserRole === 'vice_director' && !['owner', 'director', 'vice_director'].includes(employee?.role || ''));
  const isSelfManagement = () => {
    try { const currentUser = JSON.parse(localStorage.getItem(`sb-${window.location.hostname.replace(/\./g, '-')}-auth-token`) || '{}'); return employee?.id === currentUser?.user?.id; } catch { return false; }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!employee || newRole === employee.role || loading) return;
    const confirmed = await showConfirm({ title: 'Conferma modifica', message: `Sei sicuro di voler cambiare il ruolo di ${employee.name} da "${ROLE_LABELS[employee.role]}" a "${ROLE_LABELS[newRole]}"?`, confirmText: 'Conferma', cancelText: 'Annulla', type: 'warning', icon: 'warning' });
    if (!confirmed) return;
    setLoading(true);
    try {
      const updated = await onPromote(employee.id, newRole);
      if (!updated) { showError('Errore', 'Non è stato possibile aggiornare il dipendente'); return; }
      showSuccess('Dipendente aggiornato', `Le informazioni di ${employee.name} sono state aggiornate con successo`);
      onClose();
    } catch (error) { console.error('Errore aggiornamento dipendente:', error); showError('Errore', "Si è verificato un errore durante l'aggiornamento"); }
    finally { setLoading(false); }
  };

  if (!isOpen || !employee) return null;
  const selfManagement = isSelfManagement();
  const canManageRole = !selfManagement && ['owner', 'director'].includes(currentUserRole);

  return createPortal(
    <div className="safe-area-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="manage-employee-title">
      <div className="modal-shell flex max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0"><div className="flex items-center gap-2"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-50 sm:h-10 sm:w-10"><UserCheck className="h-5 w-5 text-yellow-600" /></div><div className="min-w-0"><h3 id="manage-employee-title" className="truncate text-base font-bold text-gray-900 sm:text-lg">Gestisci Dipendente</h3><p className="hidden text-xs text-gray-500 sm:block">Ruolo, servizio, disponibilità e richiami</p></div></div></div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-5">
            <div className="space-y-4">
              <section className="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"><UserCheck className="h-5 w-5 text-gray-500" /></div><div className="min-w-0 flex-1"><h4 className="truncate text-sm font-bold text-gray-900 sm:text-base">{employee.name}</h4><p className="truncate text-xs text-gray-500 sm:text-sm">{employee.email}</p><p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-yellow-700 sm:text-xs"><Car className="h-3 w-3 shrink-0" />Concessionario · Aurum Motors</p></div><span className={`hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${ROLE_COLORS[employee.role] || 'bg-gray-100 text-gray-800'}`}>{getRoleIcon(employee.role)}{ROLE_LABELS[employee.role] || employee.role}</span></div></section>
              <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 sm:p-4"><div className="mb-3 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-blue-600" /><div><h4 className="text-sm font-bold text-gray-900">Disponibilità</h4><p className="text-[11px] text-gray-500">Orari settimanali del dipendente</p></div></div><div className="grid grid-cols-2 gap-2">{AVAILABILITY_DAYS.map(([key, label]) => { const day = schedule[key]; return <div key={key} className="min-w-0 rounded-xl border border-gray-200 bg-white px-2.5 py-2 sm:px-3"><p className="truncate text-[11px] font-semibold text-gray-700 sm:text-xs">{label}</p><p className={`mt-0.5 truncate text-[11px] font-semibold sm:text-xs ${day.enabled ? 'text-green-600' : 'text-gray-400'}`}>{day.enabled ? `${day.start} — ${day.end}` : 'Non disponibile'}</p></div>; })}</div></section>
              {['owner', 'director', 'vice_director'].includes(currentUserRole) && employee.role !== 'owner' && <section className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><Clock className="h-4 w-4 shrink-0 text-yellow-600" /><div><h4 className="text-sm font-bold text-gray-900">Stato di servizio</h4>{employee.lastServiceStatusChange && <p className="truncate text-[10px] text-gray-500 sm:text-xs">{new Date(employee.lastServiceStatusChange).toLocaleString('it-IT')}</p>}</div></div><span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${employee.isOnService ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{employee.isOnService ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{employee.isOnService ? 'In servizio' : 'Fuori servizio'}</span></div></section>}
            </div>
            <div className="space-y-4">
              {['owner', 'director'].includes(currentUserRole) && <EmployeeWarningsSection employeeId={employee.id} employeeName={employee.name} />}
              {canManageRole && <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4"><div className="mb-3"><h4 className="text-sm font-bold text-gray-900">Gestione ruolo</h4><p className="text-[11px] text-gray-500">Modifica il grado del dipendente</p></div><label htmlFor="newRole" className="sr-only">Nuovo ruolo</label><select id="newRole" value={newRole} onChange={(event) => setNewRole(event.target.value as User['role'])} className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"><option value="probation" disabled={!canPromoteToRole('probation')}>In Prova</option><option value="employee" disabled={!canPromoteToRole('employee')}>Dipendente</option><option value="vice_director" disabled={!canPromoteToRole('vice_director')}>Vice Direttore</option><option value="director" disabled={!canPromoteToRole('director')}>Direttore</option>{currentUserRole === 'owner' && <option value="owner">Proprietario</option>}</select><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Annulla</button><button type="submit" disabled={loading || newRole === employee.role} className="min-h-11 rounded-xl bg-yellow-500 px-3 text-sm font-bold text-gray-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Salvataggio...' : 'Salva ruolo'}</button></div></form>}
              {canFire() && !selfManagement && <section className="rounded-2xl border border-red-100 bg-red-50/60 p-3 sm:p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="text-sm font-bold text-red-900">Gestione dipendente</h4><p className="text-[11px] text-red-700">Rimuovi definitivamente il dipendente.</p></div><button type="button" onClick={() => onFire(employee.id)} disabled={loading} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50 sm:w-auto"><Trash2 className="h-4 w-4" />Licenzia</button></div></section>}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
