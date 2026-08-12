import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const REALTIME_TABLES = [
  'activity_logs',
  'announcement_reads',
  'announcements',
  'daily_shifts',
  'disciplinary_warnings',
  'notifications',
  'pending_employee_registrations',
  'sales',
  'shift_absences',
  'users',
  'vehicles',
] as const;

export type GlobalRealtimeChange = {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

const EVENT_NAME = 'concessionario:realtime-change';

export const useGlobalRealtimeRefresh = (enabled = true) => {
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const channels = REALTIME_TABLES.map((table) =>
      supabase
        .channel(`global-realtime-${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            if (!mounted) return;

            const change: GlobalRealtimeChange = {
              table,
              eventType: payload.eventType as GlobalRealtimeChange['eventType'],
              new: payload.eventType === 'DELETE' ? null : (payload.new as Record<string, unknown>),
              old: payload.eventType === 'INSERT' ? null : (payload.old as Record<string, unknown>),
            };

            window.dispatchEvent(new CustomEvent<GlobalRealtimeChange>(EVENT_NAME, {
              detail: change,
            }));
          },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[Realtime] Subscription failed for ${table}:`, status);
          }
        }),
    );

    channelsRef.current = channels;

    return () => {
      mounted = false;
      const currentChannels = channelsRef.current;
      channelsRef.current = [];
      void Promise.all(currentChannels.map((channel) => supabase.removeChannel(channel)));
    };
  }, [enabled]);
};

export const GLOBAL_REALTIME_EVENT = EVENT_NAME;
