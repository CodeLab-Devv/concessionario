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
  severity: 'richiamo' | 'formale' | 'last_chance';
  created_at: string;
}
interface Employee { id: string; name: string; role: string; }
const roleLabels: Record<string, string> = { owner: 'Proprietario', director: 'Direttore', vice_director: 'Vice Direttore', employee: 'Dipendente', probation: 'In Prova' };

export const WarningsWidget: React.FC<{ mode: 'dashboard' | 'manage'; employeeId?: string }> = ({ mode, employeeId }) => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotifications();
  const isOwner = user?.role === 'owner';
  const targetId = mode === 'dashboard' ? user?.id : employeeId;
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employeeId: employeeId || '', severity: 'richiamo' as Warning['severity'], reason: '' });

  const employeeMap = useMemo(() => new Map(employees.map(employee => [employee.id, employee])), [employees]);
  const warningCountByEmployee = useMemo(() => warnings.reduce<Record<string, number>>((counts, warning) => { counts[warning.employee_id] = (counts[warning.employee_id] || 0) + 1; return counts; }, {}), [warnings]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    let query = supabase.from('disciplinary_warnings').select('id,employee_id,issued_by,reason,severity,created_at').order('created_at', { ascending: false });
    if (mode === 'dashboard') query = query.eq('employee_id', user.id);
    else if (employeeId) query = query.eq('employee_id', employeeId);
    const { data, error } = await query;
    if (error) console.error('Errore caricamento richiami:', error);
    setWarnings((data || []) as Warning[]);
    setLoading(false);
  }, [user?.id, mode, employeeId]);

  const loadManage = useCallback(async () => {
    if (!isOwner || !user?.id) return;
    const [{ data: usersData, error: usersError }, { data: warningsData, error: warningsError }] = await Promise.all([
      supabase.from('users').select('id,name,role').order('name'),
      supabase.from('disciplinary_warnings').select('id,employee_id,issued_by,reason,severity,created_at').order('created_at', { ascending: false })
    ]);
    if (usersError) console.error('Errore dipendenti:', usersError);
    if (warningsError) console.error('Errore richiami:', warningsError);
    setEmployees((usersData || []) as Employee[]); setWarnings((warningsData || []) as Warning[]); setLoading(false);
  }, [isOwner, user?.id]);

  useEffect(() => { void (mode === 'manage' && isOwner && !employeeId ? loadManage() : load()); }, [mode, isOwner, employeeId, load, loadManage]);
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`disciplinary-warnings-${user.id}-${mode}-${employeeId || 'all'}`).on('postgres_changes', { event: '*', schema: 'public', table: 'disciplinary_warnings' }, () => { void (mode === 'manage' && isOwner && !employeeId ? loadManage() : load()); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [isOwner, mode, employeeId, user?.id, load, loadManage]);

  const selectedEmployeeWarningCount = form.employeeId ? (warningCountByEmployee[form.employeeId] || 0) : 0;
  const hasLastChance = form.employeeId ? warnings.some(w => w.employee_id === form.employeeId && w.severity === 'last_chance') : false;
  const canAddWarning = selectedEmployeeWarningCount < 3 && !hasLastChance;
  const canAddLastChance = selectedEmployeeWarningCount >= 3 && !hasLastChance;

  const save = async () => {
    if (!isOwner || !user?.id || saving) return;
    const reason = form.reason.trim();
    if (!form.employeeId) return showWarning('Dipendente mancante', 'Seleziona il dipendente da richiamare.');
    if (form.employeeId === user.id) return showWarning('Operazione non valida', 'Non puoi assegnare un richiamo a te stesso.');
    if (reason.length < 3) return showWarning('Motivazione mancante', 'Inserisci una motivazione valida.');
    if (!canAddWarning && form.severity !== 'last_chance') return showWarning('Limite raggiunto', 'Il dipendente ha già 3 richiami. Il prossimo provvedimento è Last Chance.');
    if (form.severity === 'last_chance' && !canAddLastChance) return showWarning('Last Chance non disponibile', 'La Last Chance è disponibile solo dopo 3 richiami.');
    setSaving(true);
    try {
      const { error } = await supabase.from('disciplinary_warnings').insert({ employee_id: form.employeeId, issued_by: user.id, severity: form.severity, reason });
      if (error) throw error;
      setForm({ employeeId: '', severity: 'richiamo', reason: '' }); setShowForm(false);
      showSuccess(form.severity === 'last_chance' ? 'Last Chance registrata' : 'Richiamo registrato', `${form.severity === 'last_chance' ? 'Last Chance assegnata' : 'Richiamo assegnato'} a ${employeeMap.get(form.employeeId)?.name || 'dipendente'}.`);
      await loadManage();
    } catch (error) { showError('Impossibile registrare il provvedimento', error instanceof Error ? error.message : 'Riprova.'); }
    finally { setSaving(false); }
  };

  const remove = async (warningId: string) => {
    if (!isOwner || !window.confirm('Eliminare definitivamente questo provvedimento?')) return;
    const { error } = await supabase.from('disciplinary_warnings').delete().eq('id', warningId);
    if (error) return showError('Impossibile eliminare il provvedimento', error.message);
    setWarnings(current => current.filter(item => item.id !== warningId)); showSuccess('Provvedimento eliminato');
  };

  if (mode === 'dashboard') {
    if (loading || warnings.length === 0) return null;
    const hasLastChanceDashboard = warnings.some(w => w.severity === 'last_chance');
    const regularCount = warnings.filter(w => w.severity !== 'last_chance').length;
    return <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-lg"><div className="flex items-center gap-4"><div className="rounded-xl bg-amber-100 p-3 text-amber-600"><AlertTriangle className="h-6 w-6" /></div><div><p className="text-sm font-medium text-amber-700">Provvedimenti disciplinari</p><p className="text-2xl font-bold text-gray-900">{hasLastChanceDashboard ? 'Last Chance' : `${regularCount} ${regularCount === 1 ? 'richiamo' : 'richiami'}`}</p><p className="text-sm text-gray-600">{hasLastChanceDashboard ? 'Hai ricevuto una Last Chance.' : `Hai ricevuto ${regularCount === 1 ? 'un richiamo' : `${regularCount} richiami`}.`}</p></div></div><div className="mt-4 space-y-2">{warnings.slice(0, 3).map(w => <div key={w.id} className="rounded-lg bg-white/80 px-3 py-2 text-sm text-gray-700"><span className="font-semibold">{w.severity === 'last_chance' ? 'Last Chance' : w.severity === 'formale' ? 'Richiamo formale' : 'Richiamo'}:</span> {w.reason}</div>)}</div></div>;
  }

  if (!isOwner) return null;
  if (employeeId) {
    const count = warnings.filter(w => w.severity !== 'last_chance').length;
    const lastChance = warnings.some(w => w.severity === 'last_chance');
    return <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-gray-900">Richiami</h3><p className="text-sm text-gray-600">{lastChance ? 'Last Chance' : `${count} ${count === 1 ? 'richiamo' : 'richiami'}`}</p></div><button onClick={() => setShowForm(true)} disabled={lastChance} className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus className="mr-1 inline h-4 w-4" />Aggiungi</button></div><div className="mt-3 space-y-2">{warnings.length ? warnings.map(w => <div key={w.id} className="flex items-start justify-between rounded-lg bg-white p-3"><div><p className="text-sm font-semibold">{w.severity === 'last_chance' ? 'Last Chance' : w.severity === 'formale' ? 'Richiamo formale' : 'Richiamo'}</p><p className="text-sm text-gray-700">{w.reason}</p><p className="text-xs text-gray-500">{new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(w.created_at))}</p></div><button onClick={() => void remove(w.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>) : <p className="text-sm text-gray-500">Nessun richiamo.</p>}</div></div>;
  }

  return <div className="rounded-xl bg-white shadow-lg overflow-hidden"><div className="flex items-center justify-between border-b px-4 py-4 sm:px-6"><div><h2 className="text-lg font-semibold">Richiami disciplinari</h2><p className="text-sm text-gray-600">Massimo 3 richiami, poi Last Chance.</p></div><button onClick={() => setShowForm(true)} className="rounded-lg bg-amber-600 px-4 py-2.5 font-semibold text-white"><Plus className="mr-1 inline h-4 w-4" />Nuovo richiamo</button></div><div className="divide-y">{warnings.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">Nessun richiamo registrato.</div> : warnings.map(w => <div key={w.id} className="flex items-start justify-between gap-4 p-5"><div><span className="font-semibold">{employeeMap.get(w.employee_id)?.name || 'Dipendente'}</span><p className="mt-2 text-sm">{w.reason}</p></div><button onClick={() => void remove(w.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}</div></div>;
};
