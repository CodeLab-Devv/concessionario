import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, Plus, ShieldAlert, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from './ui/NotificationManager';

type Severity = 'richiamo' | 'formale';
interface Employee { id: string; name: string; role: string; }
interface Warning { id: string; employee_id: string; issued_by: string; reason: string; severity: Severity; created_at: string; }

const roleLabel: Record<string, string> = { owner: 'Proprietario', director: 'Direttore', vice_director: 'Vice Direttore', employee: 'Dipendente', probation: 'In Prova' };

export const WarningsPage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotifications();
  const isOwner = user?.role === 'owner';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', severity: 'richiamo' as Severity, reason: '' });

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [{ data: users }, result] = await Promise.all([
      supabase.from('users').select('id,name,role').order('name'),
      isOwner
        ? supabase.from('disciplinary_warnings').select('id,employee_id,issued_by,reason,severity,created_at').order('created_at', { ascending: false })
        : supabase.from('disciplinary_warnings').select('id,employee_id,issued_by,reason,severity,created_at').eq('employee_id', user.id).order('created_at', { ascending: false })
    ]);
    setEmployees((users || []) as Employee[]);
    if (result.error) showError('Errore richiami', result.error.message);
    setWarnings((result.data || []) as Warning[]);
    setLoading(false);
  }, [isOwner, showError, user?.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel('disciplinary-warnings').on('postgres_changes', { event: '*', schema: 'public', table: 'disciplinary_warnings' }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const createWarning = async () => {
    if (!isOwner || !user?.id || saving) return;
    if (!form.employeeId) return showWarning('Seleziona un dipendente', 'Scegli chi deve ricevere il richiamo.');
    const reason = form.reason.trim();
    if (reason.length < 3) return showWarning('Motivazione mancante', 'Inserisci una motivazione.');
    setSaving(true);
    const { error } = await supabase.from('disciplinary_warnings').insert({ employee_id: form.employeeId, issued_by: user.id, severity: form.severity, reason });
    setSaving(false);
    if (error) return showError('Impossibile registrare il richiamo', error.message);
    setOpen(false); setForm({ employeeId: '', severity: 'richiamo', reason: '' });
    showSuccess('Richiamo registrato');
    void load();
  };

  const removeWarning = async (id: string) => {
    if (!isOwner || !window.confirm('Eliminare questo richiamo?')) return;
    const { error } = await supabase.from('disciplinary_warnings').delete().eq('id', id);
    if (error) return showError('Impossibile eliminare il richiamo', error.message);
    setWarnings(current => current.filter(item => item.id !== id));
    showSuccess('Richiamo eliminato');
  };

  const employeeName = (id: string) => employees.find(item => item.id === id)?.name || 'Dipendente';
  const issuerName = (id: string) => employees.find(item => item.id === id)?.name || 'Proprietario';

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-amber-600" /></div>;
  return <div className="mx-auto max-w-7xl space-y-6 px-2 py-4 sm:px-4 sm:py-6">
    <header className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4"><div className="rounded-xl bg-white/20 p-3"><ShieldAlert /></div><div><h1 className="text-2xl font-bold">Richiami</h1><p className="text-sm text-amber-50">Storico dei richiami disciplinari</p></div></div>
      {isOwner && <button onClick={() => { setForm({ employeeId: employees.find(e => e.id !== user?.id)?.id || '', severity: 'richiamo', reason: '' }); setOpen(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 font-semibold text-amber-700"><Plus className="h-5 w-5" />Nuovo richiamo</button>}
    </header>
    {!warnings.length ? <div className="rounded-2xl bg-white p-10 text-center shadow"><ShieldAlert className="mx-auto mb-3 text-gray-300" /><h2 className="font-semibold">Nessun richiamo</h2><p className="text-sm text-gray-500">Lo storico è vuoto.</p></div> : <div className="divide-y overflow-hidden rounded-2xl bg-white shadow">{warnings.map(w => <article key={w.id} className="flex gap-4 p-5"><div className={`rounded-xl p-3 ${w.severity === 'formale' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}><AlertTriangle /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{employeeName(w.employee_id)}</h3><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{w.severity === 'formale' ? 'Richiamo formale' : 'Richiamo'}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{w.reason}</p><div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(w.created_at))}</span><span>Emesso da {issuerName(w.issued_by)}</span></div></div>{isOwner && <button onClick={() => void removeWarning(w.id)} className="h-fit rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}</article>)}</div>}
    {open && isOwner && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><div><h2 className="text-lg font-bold">Nuovo richiamo</h2><p className="text-sm text-gray-500">Assegna un richiamo a un dipendente.</p></div><button onClick={() => setOpen(false)}><X /></button></div><div className="space-y-4 p-5"><label className="block text-sm font-medium">Dipendente<select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} className="mt-1.5 w-full rounded-lg border p-2.5">{employees.filter(e => e.id !== user?.id).map(e => <option key={e.id} value={e.id}>{e.name} — {roleLabel[e.role] || e.role}</option>)}</select></label><label className="block text-sm font-medium">Tipo<select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as Severity }))} className="mt-1.5 w-full rounded-lg border p-2.5"><option value="richiamo">Richiamo</option><option value="formale">Richiamo formale</option></select></label><label className="block text-sm font-medium">Motivazione<textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} maxLength={2000} rows={5} placeholder="Motivo del richiamo..." className="mt-1.5 w-full rounded-lg border p-2.5" /></label><div className="flex justify-end gap-3 border-t pt-4"><button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2.5">Annulla</button><button onClick={() => void createWarning()} disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? 'Salvataggio...' : 'Assegna richiamo'}</button></div></div></div></div>}
  </div>;
};
