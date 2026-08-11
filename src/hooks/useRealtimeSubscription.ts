import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

interface UseRealtimeSubscriptionOptions {
  table: string;
  onInsert?: (payload: RealtimePayload) => void;
  onUpdate?: (payload: RealtimePayload) => void;
  onDelete?: (payload: RealtimePayload) => void;
  filter?: string;
  enabled?: boolean;
}

export const useRealtimeSubscription = ({
  table,
  onInsert,
  onUpdate,
  onDelete,
  filter,
  enabled = true
}: UseRealtimeSubscriptionOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);

  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;
  onDeleteRef.current = onDelete;

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const filterKey = filter ? encodeURIComponent(filter) : 'none';
    const channelName = `realtime-${table}-${filterKey}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter && { filter })
        },
        (payload: RealtimePayload) => {
          if (!isMounted) return;
          
          switch (payload.eventType) {
            case 'INSERT':
              onInsertRef.current?.(payload);
              break;
            case 'UPDATE':
              onUpdateRef.current?.(payload);
              break;
            case 'DELETE':
              onDeleteRef.current?.(payload);
              break;
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        const ch = channelRef.current;
        channelRef.current = null;
        supabase.removeChannel(ch).catch((err) => {
          console.warn('Error removing realtime channel:', err);
        });
      }
    };
  }, [table, filter, enabled]);

  const unsubscribe = () => {
    if (channelRef.current) {
      const ch = channelRef.current;
      channelRef.current = null;
      supabase.removeChannel(ch).catch(() => {});
    }
  };

  return { unsubscribe };
};
