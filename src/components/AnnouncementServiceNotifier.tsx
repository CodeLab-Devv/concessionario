import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, ChevronRight, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useServiceStatus } from '../hooks/useServiceStatus';

interface AnnouncementPreview {
  id: string;
  author_id: string;
  title: string;
  content: string;
  created_at: string;
}

interface Props { onOpen: () => void; }

export const AnnouncementServiceNotifier: React.FC<Props> = ({ onOpen }) => {
  const { user } = useAuth();
  const isOnService = useServiceStatus(user);
  const [announcement, setAnnouncement] = useState<AnnouncementPreview | null>(null);
  const previousServiceRef = useRef<boolean>(isOnService);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissNotification = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setAnnouncement(null);
  }, []);

  const scheduleDismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      setAnnouncement(null);
    }, 3000);
  }, []);

  const findUnreadLatest = useCallback(async () => {
    if (!user?.id || !isOnService) return null;

    const { data: recent, error } = await supabase
      .from('announcements')
      .select('id,author_id,title,content,created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !recent?.length) return null;

    const recipientAnnouncements = recent.filter(item => item.author_id !== user.id);
    if (!recipientAnnouncements.length) return null;

    const ids = recipientAnnouncements.map(item => item.id);
    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', user.id)
      .in('announcement_id', ids);

    const readIds = new Set((reads || []).map(item => item.announcement_id));
    return recipientAnnouncements.find(item => !readIds.has(item.id)) || null;
  }, [user?.id, isOnService]);

  const notify = useCallback(async () => {
    if (!isOnService) return;
    const latest = await findUnreadLatest();
    if (latest) {
      setAnnouncement(latest);
      scheduleDismiss();
    }
  }, [findUnreadLatest, isOnService, scheduleDismiss]);

  useEffect(() => {
    if (!isOnService) {
      dismissNotification();
      previousServiceRef.current = false;
      return;
    }

    const wasOnService = previousServiceRef.current;
    if (!wasOnService) void notify();
    previousServiceRef.current = true;
  }, [isOnService, notify, dismissNotification]);

  useEffect(() => {
    if (!user?.id || !isOnService) return;

    const channel = supabase
      .channel(`announcement-service-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => {
        const inserted = payload.new as AnnouncementPreview;
        if (inserted.author_id !== user.id) void notify();
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, isOnService, notify]);

  useEffect(() => () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  if (!isOnService || !announcement) return null;

  return <div className="fixed bottom-4 right-4 z-[80] w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl animate-[notificationIn_0.3s_ease-out]">
    <div className="flex items-start gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Bell className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Nuovo annuncio</p><h3 className="mt-0.5 truncate text-sm font-bold text-gray-900">{announcement.title}</h3><p className="mt-1 line-clamp-2 text-xs text-gray-500">{announcement.content}</p></div>
      <button onClick={dismissNotification} aria-label="Chiudi notifica" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
    </div>
    <button onClick={() => { dismissNotification(); onOpen(); }} className="flex w-full items-center justify-between border-t bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"><span>Visualizza annuncio</span><ChevronRight className="h-4 w-4" /></button>
    <div className="h-1 w-full overflow-hidden bg-amber-100"><div className="h-full origin-left animate-[notificationProgress_3s_linear] bg-amber-500" /></div>
  </div>;
};
