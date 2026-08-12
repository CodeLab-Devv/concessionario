import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Check, ChevronRight, Eye, Megaphone, Plus, Send, Users, X, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { useDialogs } from './ui/DialogManager';

interface Announcement { id: string; author_id: string; title: string; content: string; created_at: string; updated_at: string; author?: Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>; viewers?: Viewer[]; read?: boolean; }
interface Viewer { user_id: string; viewed_at: string; user?: Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>; }
const MANAGEMENT_ROLES = new Set(['owner', 'director', 'vice_director']);
const formatDate = (value: string) => new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const { showDeleteConfirm } = useDialogs();
  const canManage = MANAGEMENT_ROLES.has(user?.role || '');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const loadAnnouncements = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data || []) as Announcement[];
      const authorIds = [...new Set(rows.map(row => row.author_id))];
      const { data: authors } = authorIds.length ? await supabase.from('users').select('id,name,avatar_url,role').in('id', authorIds) : { data: [] };
      const { data: reads } = await supabase.from('announcement_reads').select('announcement_id,viewed_at').eq('user_id', user.id);
      const readMap = new Map((reads || []).map(read => [read.announcement_id, read.viewed_at]));
      const authorMap = new Map((authors || []).map(author => [author.id, author]));
      setAnnouncements(rows.map(row => ({ ...row, author: authorMap.get(row.author_id), read: row.author_id === user.id || readMap.has(row.id) })));
    } catch (error) { console.error('Errore caricamento annunci:', error); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { void loadAnnouncements(); }, [loadAnnouncements]);
  useRealtimeSubscription({ table: 'announcements', onInsert: () => void loadAnnouncements(), onUpdate: () => void loadAnnouncements(), onDelete: () => void loadAnnouncements(), enabled: Boolean(user?.id) });
  useRealtimeSubscription({ table: 'announcement_reads', onInsert: () => void loadAnnouncements(), onUpdate: () => void loadAnnouncements(), onDelete: () => void loadAnnouncements(), enabled: Boolean(user?.id) });

  const openAnnouncement = async (announcement: Announcement) => {
    setSelected(announcement);
    if (!user?.id || announcement.author_id === user.id || announcement.read) return;
    const { error } = await supabase.from('announcement_reads').upsert({ announcement_id: announcement.id, user_id: user.id }, { onConflict: 'announcement_id,user_id' });
    if (!error) {
      setAnnouncements(current => current.map(item => item.id === announcement.id ? { ...item, read: true } : item));
      setSelected(current => current ? { ...current, read: true } : current);
    }
  };

  const loadViewers = async (announcement: Announcement) => {
    if (!canManage) return;
    const { data: reads, error } = await supabase.from('announcement_reads').select('user_id,viewed_at').eq('announcement_id', announcement.id).order('viewed_at', { ascending: false });
    if (error) return;
    const ids = [...new Set((reads || []).map(read => read.user_id))];
    const { data: users } = ids.length ? await supabase.from('users').select('id,name,avatar_url,role').in('id', ids) : { data: [] };
    const userMap = new Map((users || []).map(item => [item.id, item]));
    setSelected({ ...announcement, viewers: (reads || []).map(read => ({ ...read, user: userMap.get(read.user_id) })) });
  };

  const startCreate = () => { setEditing(null); setTitle(''); setContent(''); setShowComposer(true); };
  const startEdit = (announcement: Announcement) => { if (!canManage) return; setEditing(announcement); setTitle(announcement.title); setContent(announcement.content); setSelected(null); setShowComposer(true); };

  const saveAnnouncement = async () => {
    const normalizedTitle = title.trim();
    const normalizedContent = content.trim();
    if (!user?.id || !canManage || !normalizedTitle || !normalizedContent) return;
    if (normalizedTitle.length < 3) {
      alert('Il titolo deve contenere almeno 3 caratteri.');
      return;
    }
    if (normalizedTitle.length > 120) {
      alert('Il titolo non può superare 120 caratteri.');
      return;
    }
    if (normalizedContent.length > 10000) {
      alert('Il contenuto non può superare 10.000 caratteri.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('announcements').update({ title: normalizedTitle, content: normalizedContent, updated_at: new Date().toISOString() }).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('announcements').insert({ author_id: user.id, title: normalizedTitle, content: normalizedContent });
        if (error) throw error;
      }
      setTitle(''); setContent(''); setEditing(null); setShowComposer(false); await loadAnnouncements();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      alert(`Errore salvataggio annuncio: ${message}`);
    } finally { setSaving(false); }
  };

  const deleteAnnouncement = async (announcement: Announcement) => {
    if (!canManage) return;
    const confirmed = await showDeleteConfirm(announcement.title, 'annuncio');
    if (!confirmed) return;
    const { error } = await supabase.from('announcements').delete().eq('id', announcement.id);
    if (error) { alert(`Errore eliminazione annuncio: ${error.message}`); return; }
    setSelected(null);
    await loadAnnouncements();
  };

  const unreadCount = useMemo(() => announcements.filter(item => !item.read).length, [announcements]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2"><Megaphone className="h-6 w-6 text-amber-600" /><h1 className="text-2xl font-bold text-gray-900">Annunci</h1>{unreadCount > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{unreadCount} nuovi</span>}</div><p className="mt-1 text-sm text-gray-500">Comunicazioni del concessionario, con conferma di presa visione. Clicca sull'annuncio per visualizzare e leggere il contenuto.</p></div>
        {canManage && <button onClick={startCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-yellow-600 hover:to-amber-700"><Plus className="h-4 w-4" />Nuovo annuncio</button>}
      </div>

      {showComposer && canManage && <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-gray-900">{editing ? 'Modifica annuncio' : 'Pubblica annuncio'}</h2><button onClick={() => { setShowComposer(false); setEditing(null); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button></div>
        <div className="space-y-3"><input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} placeholder="Titolo dell'annuncio (minimo 3 caratteri)" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100" /><textarea value={content} onChange={event => setContent(event.target.value)} maxLength={10000} rows={5} placeholder="Scrivi il messaggio per il team..." className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100" /><div className="flex justify-end"><button disabled={saving || title.trim().length < 3 || !content.trim() || content.trim().length > 10000} onClick={() => void saveAnnouncement()} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />{saving ? 'Salvataggio...' : editing ? 'Salva modifiche' : 'Pubblica'}</button></div></div></div>}

      {loading ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">Caricamento annunci...</div> : announcements.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center"><Bell className="mx-auto h-9 w-9 text-gray-300" /><p className="mt-3 font-medium text-gray-700">Nessun annuncio</p><p className="mt-1 text-sm text-gray-400">Le comunicazioni del team appariranno qui.</p></div> : <div className="grid gap-3 md:grid-cols-2">{announcements.map(announcement => <div key={announcement.id} className={`group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${announcement.read ? 'border-gray-100' : 'border-amber-200 bg-amber-50/30'}`}>
        <button onClick={() => void openAnnouncement(announcement)} className="block w-full text-left"><div className="flex gap-3"><div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">{announcement.author?.avatar_url ? <img src={announcement.author.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">{announcement.author?.name?.slice(0,1).toUpperCase() || '?'}</div>}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="truncate font-semibold text-gray-900">{announcement.title}</h3>{!announcement.read ? <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Nuovo</span> : <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700"><Check className="h-3 w-3" />Visualizzato</span>}</div><p className="mt-0.5 text-xs text-gray-500">{announcement.author?.name || 'Utente'} · {formatDate(announcement.created_at)}</p><p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-600">{announcement.content}</p></div><ChevronRight className="mt-3 h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5" /></div></button>
        {canManage && <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3"><button onClick={() => startEdit(announcement)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"><Pencil className="h-3.5 w-3.5" />Modifica</button><button onClick={() => void deleteAnnouncement(announcement)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Elimina</button></div>}
      </div>)}</div>}

      {selected && <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4" onClick={() => setSelected(null)}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-start gap-3"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">{selected.author?.avatar_url ? <img src={selected.author.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-semibold text-gray-500">{selected.author?.name?.slice(0,1).toUpperCase() || '?'}</div>}</div><div className="min-w-0 flex-1"><h2 className="text-xl font-bold text-gray-900">{selected.title}</h2><p className="mt-1 text-xs text-gray-500">Scritto da <span className="font-medium text-gray-700">{selected.author?.name || 'Utente'}</span> · {formatDate(selected.created_at)}</p></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
        <div className="mt-5 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">{selected.content}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div className="flex items-center gap-2 text-sm text-gray-500"><Check className="h-4 w-4 text-emerald-500" />{selected.read ? 'Visualizzato' : 'Presa visione registrata all’apertura'}</div><div className="flex items-center gap-2">{canManage && <button onClick={() => void loadViewers(selected)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"><Eye className="h-4 w-4" />Visualizzazioni</button>}</div></div>
        {canManage && selected.viewers && <div className="mt-4 rounded-xl border bg-gray-50 p-3"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800"><Users className="h-4 w-4" />{selected.viewers.length} persone hanno preso visione</div>{selected.viewers.length === 0 ? <p className="text-xs text-gray-500">Nessuna presa visione ancora.</p> : <div className="space-y-2">{selected.viewers.map(viewer => <div key={viewer.user_id} className="flex items-center gap-2"><div className="h-7 w-7 overflow-hidden rounded-full bg-white">{viewer.user?.avatar_url ? <img src={viewer.user.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-gray-500">{viewer.user?.name?.slice(0,1).toUpperCase() || '?'}</div>}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-gray-800">{viewer.user?.name || 'Utente'}</p><p className="text-[10px] text-gray-400">{formatDate(viewer.viewed_at)}</p></div><Check className="h-3.5 w-3.5 text-emerald-500" /></div>)}</div>}</div>}
      </div></div>}
    </div>
  );
};
