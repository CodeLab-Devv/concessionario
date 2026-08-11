import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Edit3, Moon, MoonStar, Plus, Save, Sun, Sunset, Trash2, UserRoundX, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from './ui/NotificationManager';
import { Avatar } from './Avatar';

interface UserRow { id: string; name: string; role: string; avatar_url?: string | null; employee_type?: string | null; }
interface Shift { id: string; user_id: string; shift_date: string; start_time: string; end_time: string; notes: string | null; }
interface Absence { id: string; user_id: string; absence_date: string; slot: Slot; start_time: string; end_time: string; note: string | null; created_by: string | null; }

type WorkSlot = 'mattino' | 'pomeriggio' | 'sera' | 'tarda_notte';
type Slot = WorkSlot | 'tutto_giorno';

const HIGH_ROLES = ['owner', 'director', 'vice_director'];
const ROLE_LABELS: Record<string, string> = { owner: 'Proprietario', director: 'Direttore', vice_director: 'Vice Direttore', employee: 'Dipendente', probation: 'In prova' };
const SLOTS: Array<{ key: WorkSlot; label: string; time: string; from: string; to: string; icon: React.ElementType }> = [
  { key: 'mattino', label: 'Mattino', time: '06:00 — 12:00', from: '06:00', to: '12:00', icon: Sun },
  { key: 'pomeriggio', label: 'Pomeriggio', time: '12:00 — 18:00', from: '12:00', to: '18:00', icon: Sunset },
  { key: 'sera', label: 'Sera', time: '18:00 — 00:00', from: '18:00', to: '00:00', icon: Moon },
  { key: 'tarda_notte', label: 'Tarda notte', time: '00:00 — 06:00', from: '00:00', to: '06:00', icon: MoonStar },
];
const ALL_DAY: { key: 'tutto_giorno'; label: string; time: string; from: string; to: string; icon: React.ElementType } = { key: 'tutto_giorno', label: 'Tutto il giorno', time: 'Assenza completa', from: '00:00', to: '23:59', icon: UserRoundX };

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const displayDate = (value: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const shortDate = (date: Date) => new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric' }).format(date);
const normalizeTime = (value: string) => value.length === 5 ? `${value}:00` : value;
const getSlot = (start: string): WorkSlot => { const hour = Number(start.slice(0, 2)); if (hour >= 6 && hour < 12) return 'mattino'; if (hour >= 12 && hour < 18) return 'pomeriggio'; if (hour >= 18) return 'sera'; return 'tarda_notte'; };
const getSlotInfo = (key: Slot) => key === 'tutto_giorno' ? ALL_DAY : SLOTS.find(slot => slot.key === key)!;

export const ShiftsPage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotifications();
  const canManage = HIGH_ROLES.includes(user?.role || '');
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [users, setUsers] = useState<UserRow[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<'shift' | 'absence' | null>(null);
  const [editingIds, setEditingIds] = useState<string[]>([]);
  const [editingAbsenceId, setEditingAbsenceId] = useState<string | null>(null);
  const [form, setForm] = useState({ slot: 'mattino' as WorkSlot, userIds: ['', ''], notes: '' });
  const [absenceForm, setAbsenceForm] = useState({ slot: 'mattino' as Slot, note: '' });

  const weekDates = useMemo(() => {
    const current = new Date(`${selectedDate}T12:00:00`);
    const day = current.getDay() || 7;
    current.setDate(current.getDate() - day + 1);
    return Array.from({ length: 7 }, (_, index) => { const date = new Date(current); date.setDate(current.getDate() + index); return date; });
  }, [selectedDate]);

  const userMap = useMemo(() => new Map(users.map(item => [item.id, item])), [users]);
  const shiftsBySlot = useMemo(() => {
    const map = new Map<WorkSlot, Shift[]>();
    SLOTS.forEach(slot => map.set(slot.key, []));
    shifts.forEach(shift => map.get(getSlot(shift.start_time))?.push(shift));
    map.forEach(rows => rows.sort((a, b) => a.user_id.localeCompare(b.user_id)));
    return map;
  }, [shifts]);
  const absencesBySlot = useMemo(() => {
    const map = new Map<Slot, Absence[]>();
    [...SLOTS.map(item => item.key), 'tutto_giorno' as const].forEach(slot => map.set(slot, []));
    absences.forEach(absence => {
      if (absence.slot === 'tutto_giorno') SLOTS.forEach(slot => map.get(slot.key)?.push(absence));
      else map.get(absence.slot)?.push(absence);
    });
    return map;
  }, [absences]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [{ data: usersData, error: usersError }, { data: shiftsData, error: shiftsError }, { data: absencesData, error: absencesError }] = await Promise.all([
      supabase.from('users').select('id,name,role,avatar_url,employee_type').order('name'),
      supabase.from('daily_shifts').select('id,user_id,shift_date,start_time,end_time,notes').eq('shift_date', selectedDate).order('start_time'),
      supabase.from('shift_absences').select('id,user_id,absence_date,slot,start_time,end_time,note,created_by').eq('absence_date', selectedDate).order('start_time'),
    ]);
    if (usersError) console.error('Errore caricamento dipendenti:', usersError);
    if (shiftsError) console.error('Errore caricamento turni:', shiftsError);
    if (absencesError) console.error('Errore caricamento assenze:', absencesError);
    setUsers(usersData || []);
    setShifts((shiftsData || []) as Shift[]);
    setAbsences((absencesData || []) as Absence[]);
    setLoading(false);
  }, [selectedDate, user?.id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let active = true;
    const channel = supabase.channel(`shifts-${selectedDate}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_shifts' }, payload => {
        if (!active) return;
        if (payload.eventType === 'INSERT') {
          const row = payload.new as Shift;
          if (row.shift_date === selectedDate) setShifts(current => current.some(item => item.id === row.id) ? current : [...current, row]);
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as Shift;
          setShifts(current => row.shift_date === selectedDate ? current.some(item => item.id === row.id) ? current.map(item => item.id === row.id ? row : item) : [...current, row] : current.filter(item => item.id !== row.id));
        } else if (payload.eventType === 'DELETE') {
          const row = payload.old as Partial<Shift>;
          setShifts(current => current.filter(item => item.id !== row.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_absences' }, payload => {
        if (!active) return;
        if (payload.eventType === 'INSERT') {
          const row = payload.new as Absence;
          if (row.absence_date === selectedDate) setAbsences(current => current.some(item => item.id === row.id) ? current : [...current, row]);
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as Absence;
          setAbsences(current => row.absence_date === selectedDate ? current.some(item => item.id === row.id) ? current.map(item => item.id === row.id ? row : item) : [...current, row] : current.filter(item => item.id !== row.id));
        } else if (payload.eventType === 'DELETE') {
          const row = payload.old as Partial<Absence>;
          setAbsences(current => current.filter(item => item.id !== row.id));
        }
      })
      .subscribe(status => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('Realtime turni non disponibile:', status); });
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [selectedDate]);

  const openCreateShift = (slot: WorkSlot) => {
    if (!canManage) return showWarning('Permesso negato', 'Solo Direzione e Proprietario possono modificare i turni.');
    const info = getSlotInfo(slot);
    setEditingIds([]);
    setForm({ slot, userIds: ['', ''], notes: '' });
    setEditor('shift');
  };

  const openEditShift = (slot: WorkSlot) => {
    if (!canManage) return;
    const rows = shiftsBySlot.get(slot) || [];
    const info = getSlotInfo(slot);
    setEditingIds(rows.map(row => row.id));
    setForm({ slot, userIds: [rows[0]?.user_id || '', rows[1]?.user_id || ''], notes: rows[0]?.notes || rows[1]?.notes || '' });
    setEditor('shift');
  };

  const saveShift = async () => {
    if (!canManage || saving) return;
    const [first, second] = form.userIds;
    if (!first || !second || first === second) return showError('Coppia non valida', 'Ogni turno deve avere due dipendenti diversi.');
    const info = getSlotInfo(form.slot);
    setSaving(true);
    try {
      const duplicate = shifts.some(row => !editingIds.includes(row.id) && form.userIds.includes(row.user_id) && getSlot(row.start_time) === form.slot);
      if (duplicate) { showWarning('Turno già assegnato', 'Uno dei due dipendenti è già presente in questa fascia.'); return; }
      if (editingIds.length) {
        const { error } = await supabase.from('daily_shifts').delete().in('id', editingIds);
        if (error) throw error;
      }
      const payload = form.userIds.map(userId => ({ user_id: userId, shift_date: selectedDate, start_time: normalizeTime(info.from), end_time: normalizeTime(info.to), notes: form.notes.trim() || null, created_by: user?.id || null }));
      const { data, error } = await supabase.from('daily_shifts').insert(payload).select('id,user_id,shift_date,start_time,end_time,notes');
      if (error) throw error;
      const inserted = (data || []) as Shift[];
      setShifts(current => [...current.filter(row => !editingIds.includes(row.id)), ...inserted]);
      setEditor(null);
      showSuccess(editingIds.length ? 'Coppia aggiornata' : 'Coppia assegnata');
    } catch (error) {
      console.error('Errore salvataggio turno:', error);
      showError('Impossibile salvare il turno', error instanceof Error ? error.message : 'Controlla i dati e riprova.');
    } finally { setSaving(false); }
  };

  const deleteShift = async (slot: WorkSlot) => {
    if (!canManage || saving) return;
    const rows = shiftsBySlot.get(slot) || [];
    if (!rows.length) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('daily_shifts').delete().in('id', rows.map(row => row.id));
      if (error) throw error;
      setShifts(current => current.filter(row => !rows.some(item => item.id === row.id)));
      showSuccess('Turno rimosso');
    } catch (error) { showError('Impossibile rimuovere il turno', error instanceof Error ? error.message : 'Riprova.'); }
    finally { setSaving(false); }
  };

  const openCreateAbsence = (slot: Slot = 'mattino') => { if (!user?.id) return; setEditingAbsenceId(null); setAbsenceForm({ slot, note: '' }); setEditor('absence'); };
  const openEditAbsence = (absence: Absence) => { if (absence.user_id !== user?.id) return; setEditingAbsenceId(absence.id); setAbsenceForm({ slot: absence.slot, note: absence.note || '' }); setEditor('absence'); };

  const saveAbsence = async () => {
    if (!user?.id || saving) return;
    const info = getSlotInfo(absenceForm.slot);
    setSaving(true);
    try {
      const payload = { user_id: user.id, absence_date: selectedDate, slot: absenceForm.slot, start_time: normalizeTime(info.from), end_time: normalizeTime(info.to), note: absenceForm.note.trim() || null, created_by: user.id };
      if (editingAbsenceId) {
        const { data, error } = await supabase.from('shift_absences').update(payload).eq('id', editingAbsenceId).eq('user_id', user.id).select('id,user_id,absence_date,slot,start_time,end_time,note,created_by').single();
        if (error) throw error;
        setAbsences(current => current.map(item => item.id === editingAbsenceId ? data as Absence : item));
      } else {
        const { data, error } = await supabase.from('shift_absences').insert(payload).select('id,user_id,absence_date,slot,start_time,end_time,note,created_by').single();
        if (error) throw error;
        setAbsences(current => [...current, data as Absence]);
      }
      setEditor(null);
      showSuccess(editingAbsenceId ? 'Assenza aggiornata' : 'Disponibilità salvata');
    } catch (error) { console.error('Errore salvataggio assenza:', error); showError('Impossibile salvare la disponibilità', error instanceof Error ? error.message : 'Riprova.'); }
    finally { setSaving(false); }
  };

  const deleteAbsence = async (absence: Absence) => {
    if (absence.user_id !== user?.id || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('shift_absences').delete().eq('id', absence.id).eq('user_id', user.id);
      if (error) throw error;
      setAbsences(current => current.filter(item => item.id !== absence.id));
      showSuccess('Disponibilità rimossa');
    } catch (error) { showError('Impossibile rimuovere la disponibilità', error instanceof Error ? error.message : 'Riprova.'); }
    finally { setSaving(false); }
  };

  const navigateWeek = (direction: number) => {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + direction * 7);
    setSelectedDate(formatDate(date));
  };

  return (
    <div className="page-container shifts-page">
      <div className="page-header">
        <div>
          <div className="page-title"><CalendarDays size={22} /> Turni</div>
          <p className="page-subtitle">Pianificazione giornaliera a coppie · 4 fasce operative</p>
        </div>
        <div className="shifts-header-actions">
          <button className="btn btn-secondary" onClick={() => navigateWeek(-1)} aria-label="Settimana precedente"><ChevronLeft size={18} /></button>
          <button className="btn btn-secondary" onClick={() => setSelectedDate(formatDate(new Date()))}>Oggi</button>
          <button className="btn btn-secondary" onClick={() => navigateWeek(1)} aria-label="Settimana successiva"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="shifts-week-strip">
        {weekDates.map(date => {
          const value = formatDate(date);
          const active = value === selectedDate;
          return <button key={value} className={`shifts-day ${active ? 'active' : ''}`} onClick={() => setSelectedDate(value)}><span>{shortDate(date)}</span><strong>{date.getDate()}</strong></button>;
        })}
      </div>

      <div className="shifts-date-title"><Clock3 size={18} /> <span>{displayDate(selectedDate)}</span></div>

      {loading ? <div className="shifts-empty">Caricamento turni…</div> : (
        <div className="shifts-table-wrap">
          <table className="shifts-table">
            <thead><tr><th>Fascia</th><th>Dipendente 1</th><th>Dipendente 2</th><th>Note</th><th aria-label="Azioni" /></tr></thead>
            <tbody>
              {SLOTS.map(slot => {
                const rows = shiftsBySlot.get(slot.key) || [];
                const absences = absencesBySlot.get(slot.key) || [];
                const people = rows.slice(0, 2).map(row => userMap.get(row.user_id)).filter(Boolean) as UserRow[];
                const note = rows.find(row => row.notes)?.notes;
                const Icon = slot.icon;
                return <tr key={slot.key}>
                  <td><div className="shift-slot-cell"><span className="shift-slot-icon"><Icon size={19} /></span><div><strong>{slot.label}</strong><small>{slot.time}</small></div></div></td>
                  {[0, 1].map(index => {
                    const person = people[index];
                    const absence = absences.find(item => item.user_id === person?.id);
                    return <td key={index}>
                      {person ? <div className="shift-person"><Avatar src={person.avatar_url || undefined} name={person.name} size={34} /><div><strong>{person.name}</strong><small>{ROLE_LABELS[person.role] || person.role}</small></div></div> : <span className="shift-unassigned">Non assegnato</span>}
                      {absence && <span className="shift-absence-badge">Assente</span>}
                    </td>;
                  })}
                  <td>{note ? <span className="shift-note">{note}</span> : <span className="shift-muted">—</span>}</td>
                  <td><div className="shift-row-actions">
                    {canManage && <><button className="icon-btn" onClick={() => rows.length ? openEditShift(slot.key) : openCreateShift(slot.key)} title={rows.length ? 'Modifica coppia' : 'Assegna coppia'}>{rows.length ? <Edit3 size={16} /> : <Plus size={17} />}</button>{rows.length > 0 && <button className="icon-btn danger" onClick={() => void deleteShift(slot.key)} title="Rimuovi coppia"><Trash2 size={16} /></button>}</>}
                    {!canManage && <button className="icon-btn" onClick={() => openCreateAbsence(slot.key)} title="Segnala indisponibilità"><UserRoundX size={16} /></button>}
                  </div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}

      {!canManage && <div className="shifts-availability-card"><div><strong>La tua disponibilità</strong><span>Segnala un'assenza per una o tutte le fasce della giornata.</span></div><button className="btn btn-secondary" onClick={() => openCreateAbsence('tutto_giorno')}><UserRoundX size={16} /> Segnala assenza</button></div>}

      {absences.length > 0 && <div className="shifts-absence-list"><h3>Le tue indisponibilità</h3>{absences.filter(item => item.user_id === user?.id).map(absence => <div className="shift-absence-item" key={absence.id}><div><strong>{getSlotInfo(absence.slot).label}</strong><span>{absence.note || 'Nessuna nota'}</span></div><div><button className="icon-btn" onClick={() => openEditAbsence(absence)}><Edit3 size={15} /></button><button className="icon-btn danger" onClick={() => void deleteAbsence(absence)}><Trash2 size={15} /></button></div></div>)}</div>}

      {editor && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setEditor(null); }}><div className="modal-card">
        <div className="modal-header"><div><h2>{editor === 'shift' ? (editingIds.length ? 'Modifica coppia' : 'Assegna coppia') : (editingAbsenceId ? 'Modifica indisponibilità' : 'Segnala indisponibilità')}</h2><p>{displayDate(selectedDate)}</p></div><button className="icon-btn" onClick={() => setEditor(null)}><X size={18} /></button></div>
        {editor === 'shift' ? <>
          <label>Fascia<select value={form.slot} onChange={event => setForm(current => ({ ...current, slot: event.target.value as WorkSlot }))}>{SLOTS.map(slot => <option key={slot.key} value={slot.key}>{slot.label} · {slot.time}</option>)}</select></label>
          <div className="shift-form-grid"><label>Dipendente 1<select value={form.userIds[0]} onChange={event => setForm(current => ({ ...current, userIds: [event.target.value, current.userIds[1]] }))}><option value="">Seleziona…</option>{users.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Dipendente 2<select value={form.userIds[1]} onChange={event => setForm(current => ({ ...current, userIds: [current.userIds[0], event.target.value] }))}><option value="">Seleziona…</option>{users.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
          <label>Note<textarea value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Note opzionali…" rows={3} /></label>
          <button className="btn btn-primary modal-submit" disabled={saving} onClick={() => void saveShift()}><Save size={17} /> {saving ? 'Salvataggio…' : 'Salva coppia'}</button>
        </> : <>
          <label>Fascia<select value={absenceForm.slot} onChange={event => setAbsenceForm(current => ({ ...current, slot: event.target.value as Slot }))}><option value="tutto_giorno">Tutto il giorno · assenza completa</option>{SLOTS.map(slot => <option key={slot.key} value={slot.key}>{slot.label} · {slot.time}</option>)}</select></label>
          <label>Nota<textarea value={absenceForm.note} onChange={event => setAbsenceForm(current => ({ ...current, note: event.target.value }))} placeholder="Motivo o comunicazione opzionale…" rows={3} /></label>
          <button className="btn btn-primary modal-submit" disabled={saving} onClick={() => void saveAbsence()}><Save size={17} /> {saving ? 'Salvataggio…' : 'Salva indisponibilità'}</button>
        </>}
      </div></div>}
    </div>
  );
};
