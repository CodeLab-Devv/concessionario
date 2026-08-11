import React, { useEffect, useMemo, useState } from 'react';
import { User } from '../../types';
import { supabase } from '../../lib/supabase';
import { parseAvailability, AVAILABILITY_DAYS } from '../AvailabilityEditor';
import { X, UserCheck, Crown, Star, Award, Shield, Trash2, Clock, CheckCircle2, XCircle, Car, CalendarDays } from 'lucide-react';
import { useNotifications } from '../ui/NotificationManager';
import { useDialogs } from '../ui/DialogManager';

interface PromoteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPromote: (userId: string, newRole: User['role']) => Promise<boolean>;
  onFire: (userId: string) => void;
  employee: User | null;
  currentUserRole: string;
}

export const PromoteEmployeeModal: React.FC<PromoteEmployeeModalProps> = ({ isOpen, onClose, onPromote, onFire, employee, currentUserRole }) => {
  const [newRole, setNewRole] = useState<User['role']>(employee?.role || 'probation');
  const [availability, setAvailability] = useState<string>(employee?.availability || '');
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
      case 'owner': return <Shield className="h-5 w-5 text-red-600" />;
      case 'director': return <Crown className="h-5 w-5 text-yellow-600" />;
      case 'vice_director': return <Award className="h-5 w-5 text-purple-600" />;
      case 'employee': return <UserCheck className="h-5 w-5 text-blue-600" />;
      case 'probation': return <Star className="h-5 w-5 text-orange-600" />;
      default: return <UserCheck className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleLabel = (role: string) => ({ owner: 'Proprietario', director: 'Direttore', vice_director: 'Vice Direttore', employee: 'Dipendente', probation: 'In Prova' } as Record<string, string>)[role] || role;
  const getRoleColor = (role: string) => ({ owner: 'bg-red-100 text-red-800', director: 'bg-yellow-100 text-yellow-800', vice_director: 'bg-purple-100 text-purple-800', employee: 'bg-blue-100 text-blue-800', probation: 'bg-orange-100 text-orange-800' } as Record<string, string>)[role] || 'bg-gray-100 text-gray-800';
  const canPromoteToRole = (role: string) => currentUserRole === 'owner' || (currentUserRole === 'director' && role !== 'owner') || (currentUserRole === 'vice_director' && !['owner', 'director'].includes(role));
  const canFire = () => currentUserRole === 'owner' || (currentUserRole === 'director' && employee?.role !== 'owner') || (currentUserRole === 'vice_director' && !['owner', 'director', 'vice_director'].includes(employee?.role || ''));
  const isSelfManagement = () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('sb-' + window.location.hostname.replace(/\./g, '-') + '-auth-token') || '{}');
      return employee?.id === currentUser?.user?.id;
    } catch { return false; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || newRole === employee.role || loading) return;
    const roleLabels = { owner: 'Proprietario', director: 'Direttore', vice_director: 'Vice Direttore', employee: 'Dipendente', probation: 'In Prova' };
    const confirmed = await showConfirm({
      title: 'Conferma Modifica',
      message: `Sei sicuro di voler cambiare il ruolo di ${employee.name} da "${roleLabels[employee.role]}" a "${roleLabels[newRole]}"?`,
      confirmText: 'Conferma', cancelText: 'Annulla', type: 'warning', icon: 'warning'
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      const updated = await onPromote(employee.id, newRole);
      if (!updated) { showError('Errore', 'Non è stato possibile aggiornare il dipendente'); return; }
      showSuccess('Dipendente aggiornato', `Le informazioni di ${employee.name} sono state aggiornate con successo`);
      onClose();
    } catch (error) {
      console.error('Error updating employee:', error);
      showError('Errore', 'Si è verificato un errore durante l\'aggiornamento');
    } finally { setLoading(false); }
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="safe-area-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="modal-shell flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 p-5">
          <div><h3 className="text-lg font-semibold text-gray-900">Gestisci Dipendente</h3><p className="text-xs text-gray-500">Ruolo, servizio e disponibilità</p></div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="flex min-h-11 min-w-11 items-center justify-center text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
        </header>

        <div className="min-h-0 overflow-y-auto p-5">
          <div className="mb-5 flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-yellow-600" />
            <div><h4 className="font-semibold text-gray-900">{employee.name}</h4><p className="text-sm text-gray-500">{employee.email}</p><p className="mt-1 flex items-center gap-1 text-xs font-medium text-yellow-700"><Car className="h-3 w-3" />Concessionario – Aurum Motors</p></div>
          </div>

          <div className="mb-5 flex items-center gap-2">
            <span className="text-sm text-gray-500">Ruolo attuale:</span>
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${getRoleColor(employee.role)}`}>{getRoleIcon(employee.role)}<span className="ml-1">{getRoleLabel(employee.role)}</span></span>
          </div>

          <section className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="mb-3 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-blue-600" /><h4 className="font-semibold text-gray-900">Disponibilità dipendente</h4></div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {AVAILABILITY_DAYS.map(([key, label]) => {
                const day = schedule[key];
                return <div key={key} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"><span className="font-medium text-gray-700">{label}</span><span className={day.enabled ? 'font-semibold text-green-600' : 'text-gray-400'}>{day.enabled ? `${day.start} — ${day.end}` : 'Non disponibile'}</span></div>;
              })}
            </div>
          </section>

          {['owner', 'director', 'vice_director'].includes(currentUserRole) && employee.role !== 'owner' && (
            <section className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-3 flex items-center text-sm font-medium text-gray-700"><Clock className="mr-2 h-4 w-4 text-yellow-600" />Stato di servizio</h4>
              <div className="flex items-center">{employee.isOnService ? <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" /> : <XCircle className="mr-2 h-5 w-5 text-gray-400" />}<span className="text-sm font-medium">{employee.isOnService ? 'In servizio' : 'Fuori servizio'}</span></div>
              {employee.lastServiceStatusChange && <p className="mt-2 text-xs text-gray-500">Ultimo aggiornamento: {new Date(employee.lastServiceStatusChange).toLocaleString('it-IT')}</p>}
            </section>
          )}

          {!isSelfManagement() && (currentUserRole === 'owner' || currentUserRole === 'director') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label htmlFor="newRole" className="mb-2 block text-sm font-medium text-gray-700">Nuovo Ruolo</label><select id="newRole" value={newRole} onChange={e => setNewRole(e.target.value as User['role'])} className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"><option value="probation" disabled={!canPromoteToRole('probation')}>In Prova</option><option value="employee" disabled={!canPromoteToRole('employee')}>Dipendente</option><option value="vice_director" disabled={!canPromoteToRole('vice_director')}>Vice Direttore</option><option value="director" disabled={!canPromoteToRole('director')}>Direttore</option>{currentUserRole === 'owner' && <option value="owner">Proprietario</option>}</select></div>
              <div className="flex flex-col gap-3 sm:flex-row"><button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-300">Annulla</button><button type="submit" disabled={loading || newRole === employee.role} className="min-h-11 flex-1 rounded-lg bg-yellow-500 px-4 py-2 font-medium text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Salvataggio...' : 'Salva Ruolo'}</button></div>
            </form>
          )}

          {canFire() && !isSelfManagement() && <div className="mt-5 border-t border-gray-200 pt-4"><button type="button" onClick={() => onFire(employee.id)} disabled={loading} className="min-h-11 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"><Trash2 className="h-4 w-4" />Licenzia Dipendente</button></div>}
        </div>
      </div>
    </div>
  );
};