import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, ChevronRight, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useServiceStatus } from '../hooks/useServiceStatus';

interface AnnouncementPreview { id: string; title: string; content: string; created_at: string; }

interface Props { onOpen: () => void; }

export const AnnouncementServiceNotifier: React.FC<Props> = ({ onOpen }) => {
  const { user } = useAuth();
  const isOnService = useServiceStatus(user);
  const [announcement, setAnnouncement] = useState<AnnouncementPreview | null>(null);
  const previousServiceRef = useRef<boolean>(isOnService);

  const findUnreadLatest = useCallback(async () => {
    if (!user?.id || !isOnService) return null;
    const { data: recent } = await supabase.from('announcements').select('id,title,content,created_at').order('created_at', { ascending: false }).limit(10);
    if (!recent?.length) return null;
    const ids = recent.map(item => item.id);
    const { data: reads } = await supabase.from('announcement_reads').select('announcement_id').eq('user_id', user.id).in('announcement_id', ids);
    const readIds = new Set((reads || []).map(item => item.announcement_id));
    return recent.find(item => !readIds.has(item.id)) || null;
  }, [user?.id, isOnService]);

  const notify = useCallback(async () => {
    if (!isOnService) return;
    const latest = await findUnreadLatest();
    if (latest) setAnnouncement(latest);
  }, [findUnreadLatest, isOnService]);

  useEffect(() => {
    if (!isOnService) {
      setAnnouncement(null);
      previousServiceRef.current = false;
      return;
    }

    const wasOnService = previousServiceRef.current;
    if (!wasOnService) void notify();
    previousServiceRef.current = true;
  }, [isOnService, notify]);

  useEffect(() => {
    if (!user?.id || !isOnService) return;
    const channel = supabase.channel(`announcement-service-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, () => {
        void notify();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, isOnService, notify]);

  if (!isOnService || !announcement) return null;

  return <div className="fixed bottom-4 right-4 z-[80] w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl">
    <div className="flex items-start gap-3 p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Bell className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Nuovo annuncio</p><h3 className="mt-0.5 truncate text-sm font-bold text-gray-900">{announcement.title}</h3><p className="mt-1 line-clamp-2 text-xs text-gray-500">{announcement.content}</p></div><button onClick={() => setAnnouncement(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button></div>
    <button onClick={() => { setAnnouncement(null); onOpen(); }} className="flex w-full items-center justify-between border-t bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"><span>Visualizza e prendi visione</span><ChevronRight className="h-4 w-4" /></button>
  </div>;
};
