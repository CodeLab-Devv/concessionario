import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from './ui/NotificationManager';

interface Warning {
  id: string;
  employee_id: string;
  issued_by: string;
  reason: string;
  severity: 'richiamo' | 'formale';
  created_at: string;
}

interface Employee { id: string; name: string; role: string; }

const roleLabels: Record<string, string> = {
  owner: 'Proprietario', director: 'Direttore', vice_director: 'Vice Direttore', employee: 'Dipendente', probation: 'In Prova'
};

export const WarningsWidget: React.FC<{ mode: 'dashboard' | 'manage' }> = ({ mode }) => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotifications();
  const isOwner = user?.role === 'owner';
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employeeId: '', severity: 'richiamo' as Warning['severity'], reason: '' });

  const employeeMap = useMemo(() => new Map(employees.map(employee => [employee.id, employee])), [employees]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [{ data: warningsData, error: warningsError }] = await Promise.all([
      supabase.from('disciplinary_warnings').select('id,employee_id,issued_by,reason,severity,created_at').eq('employee_id', user.id).order('created_at', { ascending: false })
    ]);
    if (warningsError) console.error('Errore caricamento richiami:', warningsError);
    setWarnings((warningsData || []) as Warning[]);
    setLoading(false);
  }, [user?.id]);

  const loadManage = useCallback(async () => {
    if (!isOwner || !user?.id) return;
    const [{ data: usersData, error: usersError }, { data: warningsData, error: warningsError }] = await Promise.all([
      supabase.from('users').select('id,name,role').order('name'),
      supabase.from('disciplinary_warnings').select('id,employee_id,issued_by,reason,severity,created_at').order('created_at', { ascending: false })
    ]);
    if (usersError) console.error('Errore dipendenti:', usersError);
    if (warningsError) console.error('Errore richiami:', warningsError);
    setEmployees((usersData || []) as Employee[]);
    setWarnings((warningsData || []) as Warning[]);
    setLoading(false);
  }, [isOwner, user?.id]);

  useEffect(() => { void (mode === 'manage' && isOwner ? loadManage() : load()); }, [mode, isOwner, load, loadManage]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`disciplinary-warnings-${user.id}-${mode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disciplinary_warnings' }, () => {
        void (mode === 'manage' && isOwner ? loadManage() : load());
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [isOwner, mode, user?.id, load, loadManage]);

  const save = async () => {
    if (!isOwner || !user?.id || saving) return;
    const reason = form.reason.trim();
    if (!form.employeeId) return showWarning('Dipendente mancante', 'Seleziona il dipendente da richiamare.');
    if (form.employeeId === user.id) return showWarning('Operazione non valida', 'Non puoi assegnare un richiamo a te stesso.');
    if (reason.length < 3) return showWarning('Motivazione mancante', 'Inserisci una motivazione valida.');
    setSaving(true);
    try {
      const { error } = await supabase.from('disciplinary_warnings').insert({ employee_id: form.employeeId, issued_by: user.id, severity: form.severity, reason });
      if (error) throw error;
      setForm({ employeeId: '', severity: 'richiamo', reason: '' });
      setShowForm(false);
      showSuccess('Richiamo registrato', `Richiamo assegnato a ${employeeMap.get(form.employeeId)?.name || 'dipendente'}.`);
      await loadManage();
    } catch (error) {
      showError('Impossibile registrare il richiamo', error instanceof Error ? error.message : 'Riprova.');
    } finally { setSaving(false); }
  };

  const remove = async (warningId: string) => {
    if (!isOwner || !window.confirm('Eliminare definitivamente questo richiamo?')) return;
    const { error } = await supabase.from('disciplinary_warnings').delete().eq('id', warningId);
    if (error) return showError('Impossibile eliminare il richiamo', error.message);
    setWarnings(current => current.filter(item => item.id !== warningId));
    showSuccess('Richiamo eliminato');
  };

  if (mode === 'dashboard') {
    if (loading || warnings.length === 0) return null;
    return <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-lg">
      <div className="flex items-center gap-4"><div className="rounded-xl bg-amber-100 p-3 text-amber-600"><AlertTriangle className="h-6 w-6" /></div><div className="min-w-0"><p className="text-sm font-medium text-amber-700">Richiami disciplinari</p><p className="text-2xl font-bold text-gray-900">{warnings.length} {warnings.length === 1 ? 'richiamo' : 'richiami'}</p><p className="text-sm text-gray-600">Hai ricevuto {warnings.length === 1 ? 'un richiamo' : `${warnings.length} richiami`}.</p></div></div>
      <div className="mt-4 space-y-2">{warnings.slice(0, 3).map(warning => <div key={warning.id} className="rounded-lg bg-white/80 px-3 py-2 text-sm text-gray-700"><span className="font-semibold">{warning.severity === 'formale' ? 'Richiamo formale' : 'Richiamo'}:</span> {warning.reason}</div>)}</div>
    </div>;
  }

  if (!isOwner) return null;
  if (loading) return <div className="rounded-xl bg-white p-5 shadow-lg"><div className="h-5 w-40 animate-pulse rounded bg-gray-200" /></div>;

  return <div className="rounded-xl bg-white shadow-lg overflow-hidden">
    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6"><div><h2 className="text-lg font-semibold text-gray-900">Richiami disciplinari</h2><p className="text-sm text-gray-600">Gestisci i richiami assegnati ai dipendenti.</p></div><button onClick={() => setShowForm(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-2.5 font-semibold text-white shadow-md hover:from-yellow-600 hover:to-amber-700"><Plus className="h-4 w-4" /> Nuovo richiamo</button></div>
    <div className="divide-y divide-gray-100">{warnings.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">Nessun richiamo registrato.</div> : warnings.map(warning => <div key={warning.id} className="flex items-start justify-between gap-4 p-5"><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-gray-900">{employeeMap.get(warning.employee_id)?.name || 'Dipendente'}</span><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{warning.severity === 'formale' ? 'Formale' : 'Richiamo'}</span></div><p className="mt-2 text-sm text-gray-700">{warning.reason}</p><p className="mt-2 text-xs text-gray-500">{new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(warning.created_at))}</p></div><button onClick={() => void remove(warning.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}</div>
    {showForm && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setShowForm(false); }}><div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><h2 className="text-lg font-bold text-gray-900">Nuovo richiamo</h2><button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-5"><label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Dipendente</span><select value={form.employeeId} onChange={event => setForm(current => ({ ...current, employeeId: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5"><option value="">Seleziona dipendente</option>{employees.filter(employee => employee.id !== user?.id).map(employee => <option key={employee.id} value={employee.id}>{employee.name} — {roleLabels[employee.role] || employee.role}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Tipo</span><select value={form.severity} onChange={event => setForm(current => ({ ...current, severity: event.target.value as Warning['severity'] }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5"><option value="richiamo">Richiamo</option><option value="formale">Richiamo formale</option></select></label><label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Motivazione</span><textarea value={form.reason} onChange={event => setForm(current => ({ ...current, reason: event.target.value }))} rows={5} maxLength={2000} placeholder="Descrivi il motivo del richiamo..." className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5" /></label><div className="flex justify-end gap-3 border-t pt-4"><button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2.5 text-gray-700 hover:bg-gray-100">Annulla</button><button onClick={() => void save()} disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? 'Salvataggio...' : 'Assegna richiamo'}</button></div></div></div></div>}
  </div>;
};
