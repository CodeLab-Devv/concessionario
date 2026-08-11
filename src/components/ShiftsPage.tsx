import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Edit3, Plus, Save, Trash2, Users, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';

interface UserRow { id: string; name: string; role: string; avatar_url?: string | null; employee_type?: string | null; }
interface Shift { id: string; user_id: string; shift_date: string; start_time: string; end_time: string; notes: string | null; }

const HIGH_ROLES = ['owner', 'director', 'vice_director'];
const ROLE_LABELS: Record<string, string> = { owner: 'Proprietario', director: 'Direttore', vice_director: 'Vice Direttore', employee: 'Dipendente', probation: 'In Prova' };
const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const displayDate = (value: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`));
const shortDate = (date: Date) => new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric' }).format(date);

export const ShiftsPage: React.FC = () => {
  const { user } = useAuth();
  const canManage = HIGH_ROLES.includes(user?.role || '');
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [users, setUsers] = useState<UserRow[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState({ userId: '', start: '09:00', end: '18:00', notes: '' });

  const weekDates = useMemo(() => {
    const current = new Date(`${selectedDate}T12:00:00`);
    const day = current.getDay() || 7;
    current.setDate(current.getDate() - day + 1);
    return Array.from({ length: 7 }, (_, index) => { const date = new Date(current); date.setDate(current.getDate() + index); return date; });
  }, [selectedDate]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: usersData }, { data: shiftsData, error }] = await Promise.all([
      supabase.from('users').select('id,name,role,avatar_url,employee_type').order('name'),
      supabase.from('daily_shifts').select('id,user_id,shift_date,start_time,end_time,notes').eq('shift_date', selectedDate).order('start_time'),
    ]);
    if (!error) setShifts(shiftsData || []);
    setUsers(usersData || []);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel('daily-shifts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_shifts' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const userMap = useMemo(() => new Map(users.map(item => [item.id, item])), [users]);
  const assignedIds = useMemo(() => new Set(shifts.map(item => item.user_id)), [shifts]);

  const openCreate = () => { setEditing(null); setForm({ userId: users.find(item => !assignedIds.has(item.id))?.id || users[0]?.id || '', start: '09:00', end: '18:00', notes: '' }); setEditorOpen(true); };
  const openEdit = (shift: Shift) => { setEditing(shift); setForm({ userId: shift.user_id, start: shift.start_time.slice(0, 5), end: shift.end_time.slice(0, 5), notes: shift.notes || '' }); setEditorOpen(true); };

  const save = async () => {
    if (!form.userId || !form.start || !form.end) return;
    const payload = { user_id: form.userId, shift_date: selectedDate, start_time: form.start, end_time: form.end, notes: form.notes.trim() || null, created_by: user?.id };
    const result = editing ? await supabase.from('daily_shifts').update(payload).eq('id', editing.id) : await supabase.from('daily_shifts').insert(payload);
    if (result.error) { console.error('Errore salvataggio turno:', result.error); return; }
    setEditorOpen(false); await load();
  };

  const remove = async (shift: Shift) => {
    if (!window.confirm('Vuoi eliminare questo turno?')) return;
    const { error } = await supabase.from('daily_shifts').delete().eq('id', shift.id);
    if (!error) await load();
  };

  return <div className="mx-auto w-full max-w-6xl space-y-5 pb-8">
    <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-5 text-white shadow-xl sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="mb-2 flex items-center gap-2 text-amber-300"><CalendarDays className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.2em]">Organizzazione</span></div><h1 className="text-2xl font-bold sm:text-3xl">Turni giornalieri</h1><p className="mt-1 text-sm text-gray-300">Visualizza i turni impostati per tutta la squadra.</p></div>
        {canManage && <button onClick={openCreate} disabled={!users.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 font-semibold text-gray-950 shadow-lg transition hover:from-yellow-400 hover:to-amber-500 disabled:opacity-50"><Plus className="h-5 w-5" />Aggiungi turno</button>}
      </div>
    </div>

    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setSelectedDate(formatDate(new Date(new Date(`${selectedDate}T12:00:00`).setDate(new Date(`${selectedDate}T12:00:00`).getDate() - 1))))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50" aria-label="Giorno precedente"><ChevronLeft className="h-5 w-5" /></button>
        <div className="min-w-0 text-center"><p className="truncate text-xs font-semibold uppercase tracking-wider text-gray-400">Turni del giorno</p><p className="truncate text-sm font-bold capitalize text-gray-900 sm:text-base">{displayDate(selectedDate)}</p></div>
        <button onClick={() => setSelectedDate(formatDate(new Date(new Date(`${selectedDate}T12:00:00`).setDate(new Date(`${selectedDate}T12:00:00`).getDate() + 1))))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50" aria-label="Giorno successivo"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">{weekDates.map(date => { const value = formatDate(date); const active = value === selectedDate; return <button key={value} onClick={() => setSelectedDate(value)} className={`min-w-0 rounded-xl px-1 py-2 text-center transition ${active ? 'bg-amber-500 text-white shadow-md' : 'hover:bg-gray-100 text-gray-600'}`}><span className="block truncate text-[10px] font-semibold uppercase sm:text-xs">{shortDate(date).split(' ')[0]}</span><span className="mt-0.5 block text-sm font-bold sm:text-base">{date.getDate()}</span></button>; })}</div>
    </div>

    {loading ? <div className="flex h-48 items-center justify-center rounded-2xl border border-gray-200 bg-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" /></div> : shifts.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shifts.map(shift => { const employee = userMap.get(shift.user_id); if (!employee) return null; return <article key={shift.id} className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-center gap-3"><Avatar src={employee.avatar_url || undefined} alt={employee.name} size="md" fallbackText={employee.name} /><div className="min-w-0 flex-1"><h3 className="truncate font-bold text-gray-900">{employee.name}</h3><p className="truncate text-xs text-gray-500">{ROLE_LABELS[employee.role] || employee.role}</p></div>{canManage && <div className="flex shrink-0 gap-1"><button onClick={() => openEdit(shift)} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-amber-50 hover:text-amber-600" title="Modifica turno"><Edit3 className="h-4 w-4" /></button><button onClick={() => void remove(shift)} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600" title="Elimina turno"><Trash2 className="h-4 w-4" /></button></div>}</div><div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5"><Clock3 className="h-4 w-4 text-amber-500" /><span className="text-sm font-bold text-gray-800">{shift.start_time.slice(0, 5)} — {shift.end_time.slice(0, 5)}</span></div>{shift.notes && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{shift.notes}</p>}</article>; })}</div> : <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm"><Users className="mx-auto h-10 w-10 text-gray-300" /><h3 className="mt-3 font-bold text-gray-900">Nessun turno impostato</h3><p className="mt-1 text-sm text-gray-500">Per questa giornata non sono ancora stati programmati turni.</p>{canManage && <button onClick={openCreate} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"><Plus className="h-4 w-4" />Imposta il primo turno</button>}</div>}

    {editorOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-gray-900">{editing ? 'Modifica turno' : 'Nuovo turno'}</h2><p className="text-xs text-gray-500 capitalize">{displayDate(selectedDate)}</p></div><button onClick={() => setEditorOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-semibold text-gray-700">Dipendente</span><select value={form.userId} onChange={e => setForm(v => ({ ...v, userId: e.target.value }))} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100">{users.map(item => <option key={item.id} value={item.id}>{item.name} · {ROLE_LABELS[item.role] || item.role}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label><span className="mb-1.5 block text-sm font-semibold text-gray-700">Inizio</span><input type="time" value={form.start} onChange={e => setForm(v => ({ ...v, start: e.target.value }))} className="h-11 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-amber-500" /></label><label><span className="mb-1.5 block text-sm font-semibold text-gray-700">Fine</span><input type="time" value={form.end} onChange={e => setForm(v => ({ ...v, end: e.target.value }))} className="h-11 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-amber-500" /></label></div><label className="block"><span className="mb-1.5 block text-sm font-semibold text-gray-700">Nota <span className="font-normal text-gray-400">(opzionale)</span></span><textarea value={form.notes} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} rows={3} maxLength={500} className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500" placeholder="Es. apertura concessionario" /></label><div className="flex gap-2 pt-1"><button onClick={() => setEditorOpen(false)} className="min-h-11 flex-1 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50">Annulla</button><button onClick={() => void save()} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 font-semibold text-gray-950 hover:from-yellow-400 hover:to-amber-500"><Save className="h-4 w-4" />Salva turno</button></div></div></div></div>}
  </div>;
};