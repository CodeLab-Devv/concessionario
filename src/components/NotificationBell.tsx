import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, Check, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDialogs } from './ui/DialogManager';

type NotificationRow = {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

const SELECT_FIELDS = 'id,recipient_id,type,title,message,data,read_at,created_at';
const formatTime = (value: string) => new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export const NotificationBell: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { showConfirm } = useDialogs();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) { setNotifications([]); return; }
    setLoading(true);
    const { data, error } = await supabase.from('notifications').select(SELECT_FIELDS).eq('recipient_id', user.id).is('read_at', null).order('created_at', { ascending: false }).limit(50);
    if (error) console.error('Errore caricamento notifiche:', error);
    else setNotifications((data ?? []) as NotificationRow[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    void loadNotifications();
    const channel = supabase.channel(`notification-bell-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, payload => {
        const row = payload.new as NotificationRow;
        if (!row.read_at) setNotifications(current => current.some(item => item.id === row.id) ? current : [row, ...current].slice(0, 50));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, payload => {
        const row = payload.new as NotificationRow;
        setNotifications(current => row.read_at ? current.filter(item => item.id !== row.id) : current.map(item => item.id === row.id ? row : item));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, payload => {
        const id = (payload.old as { id?: string }).id;
        if (id) setNotifications(current => current.filter(item => item.id !== id));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [isAuthenticated, loadNotifications, user?.id]);

  const markAsRead = async (notification: NotificationRow) => {
    if (!user?.id) return;
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notification.id).eq('recipient_id', user.id);
    if (error) { console.error('Errore marcatura notifica:', error); return; }
    setNotifications(current => current.filter(item => item.id !== notification.id));
  };

  const removeNotification = async (notification: NotificationRow) => {
    if (!user?.id) return;
    const confirmed = await showConfirm({ title: 'Elimina notifica', message: `Vuoi eliminare la notifica "${notification.title}"?`, confirmText: 'Elimina', cancelText: 'Annulla', type: 'danger', icon: 'delete' });
    if (!confirmed) return;
    const { error } = await supabase.from('notifications').delete().eq('id', notification.id).eq('recipient_id', user.id);
    if (error) { console.error('Errore eliminazione notifica:', error); return; }
    setNotifications(current => current.filter(item => item.id !== notification.id));
  };

  const visibleNotifications = useMemo(() => notifications.slice(0, 10), [notifications]);
  const count = notifications.length;
  if (!isAuthenticated) return null;

  return <div className="relative">
    <button type="button" onClick={() => setOpen(value => !value)} className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition ${open ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`} aria-label={`Notifiche${count ? `, ${count} non lette` : ''}`} title="Notifiche">
      {count > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
      {count > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">{count > 99 ? '99+' : count}</span>}
    </button>
    {open && <>
      <button type="button" aria-label="Chiudi notifiche" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
      <div className="fixed right-3 top-[calc(env(safe-area-inset-top)+4.5rem)] z-50 w-[calc(100vw-1.5rem)] max-w-[390px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:absolute sm:right-0 sm:top-auto sm:mt-2 sm:w-[390px]">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3"><div><p className="text-sm font-bold text-gray-900">Notifiche</p><p className="text-xs text-gray-500">{count ? `${count} da leggere` : 'Nessuna nuova notifica'}</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-4 w-4" /></button></div>
        <div className="max-h-[min(70vh,520px)] overflow-y-auto">
          {loading ? <div className="flex min-h-36 items-center justify-center text-sm text-gray-500">Caricamento...</div> : visibleNotifications.length === 0 ? <div className="flex min-h-40 flex-col items-center justify-center px-6 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400"><Bell className="h-5 w-5" /></div><p className="mt-3 text-sm font-semibold text-gray-700">Tutto aggiornato</p><p className="mt-1 text-xs text-gray-400">Le nuove notifiche compariranno qui.</p></div> : <div className="divide-y divide-gray-100">{visibleNotifications.map(notification => <div key={notification.id} className="group p-4 transition hover:bg-gray-50"><div className="flex items-start gap-3"><div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notification.type === 'error' ? 'bg-red-50 text-red-600' : notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : notification.type === 'info' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}><Bell className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="min-w-0 text-sm font-bold text-gray-900">{notification.title}</p><span className="shrink-0 text-[10px] font-medium text-gray-400">{formatTime(notification.created_at)}</span></div>{notification.message && <p className="mt-1 text-xs leading-5 text-gray-600">{notification.message}</p>}<div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={() => void markAsRead(notification)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"><Check className="h-3.5 w-3.5" />Segna vista</button><button type="button" onClick={() => void removeNotification(notification)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" />Elimina</button></div></div></div></div>)}</div>}
        </div>
      </div>
    </>}
  </div>;
};
