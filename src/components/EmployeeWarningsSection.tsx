import React, { useCallback, useEffect, useState } from 'react';
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

interface EmployeeWarningsSectionProps {
  employeeId: string;
  employeeName: string;
}

export const EmployeeWarningsSection: React.FC<EmployeeWarningsSectionProps> = ({ employeeId, employeeName }) => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotifications();
  const isOwner = user?.role === 'owner';
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState<Warning['severity']>('richiamo');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('disciplinary_warnings')
      .select('id,employee_id,issued_by,reason,severity,created_at')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Errore caricamento richiami:', error);
      return;
    }
    setWarnings((data || []) as Warning[]);
  }, [employeeId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`employee-warnings-${employeeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disciplinary_warnings', filter: `employee_id=eq.${employeeId}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [employeeId, load]);

  const createWarning = async () => {
    if (!isOwner || !user?.id || saving) return;
    const cleanReason = reason.trim();
    if (cleanReason.length < 3) {
      showWarning('Motivazione mancante', 'Inserisci una motivazione valida.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('disciplinary_warnings').insert({
        employee_id: employeeId,
        issued_by: user.id,
        reason: cleanReason,
        severity
      });
      if (error) throw error;
      setReason('');
      setSeverity('richiamo');
      setOpen(false);
      showSuccess('Richiamo registrato', `Richiamo assegnato a ${employeeName}.`);
      await load();
    } catch (error) {
      showError('Impossibile registrare il richiamo', error instanceof Error ? error.message : 'Riprova.');
    } finally {
      setSaving(false);
    }
  };

  const deleteWarning = async (id: string) => {
    if (!isOwner || !window.confirm('Eliminare definitivamente questo richiamo?')) return;
    const { error } = await supabase.from('disciplinary_warnings').delete().eq('id', id);
    if (error) {
      showError('Impossibile eliminare il richiamo', error.message);
      return;
    }
    setWarnings(current => current.filter(item => item.id !== id));
    showSuccess('Richiamo eliminato');
  };

  if (!isOwner) return null;

  return (
    <section className="mb-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div><h4 className="font-semibold text-gray-900">Richiami</h4><p className="text-xs text-gray-500">{warnings.length} {warnings.length === 1 ? 'richiamo presente' : 'richiami presenti'}</p></div>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"><Plus className="h-4 w-4" /> Aggiungi richiamo</button>
      </div>

      {warnings.length > 0 && <div className="mt-3 space-y-2">{warnings.map(warning => (
        <div key={warning.id} className="flex items-start justify-between gap-3 rounded-lg border border-amber-100 bg-white p-3">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-gray-900">{warning.severity === 'formale' ? 'Richiamo formale' : 'Richiamo'}</span><span className="text-xs text-gray-500">{new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(warning.created_at))}</span></div><p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{warning.reason}</p></div>
          <button type="button" onClick={() => void deleteWarning(warning.id)} className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Elimina richiamo"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}</div>}

      {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b p-5"><div><h2 className="text-lg font-bold text-gray-900">Nuovo richiamo</h2><p className="text-sm text-gray-500">Richiamo per {employeeName}</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
          <div className="space-y-4 p-5">
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Tipo</span><select value={severity} onChange={event => setSeverity(event.target.value as Warning['severity'])} className="w-full rounded-lg border border-gray-300 px-3 py-2.5"><option value="richiamo">Richiamo</option><option value="formale">Richiamo formale</option></select></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Motivazione</span><textarea value={reason} onChange={event => setReason(event.target.value)} rows={5} maxLength={2000} placeholder="Descrivi il motivo del richiamo..." className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5" /></label>
            <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2.5 text-gray-700 hover:bg-gray-100">Annulla</button><button type="button" onClick={() => void createWarning()} disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? 'Salvataggio...' : 'Assegna richiamo'}</button></div>
          </div>
        </div>
      </div>}
    </section>
  );
};
