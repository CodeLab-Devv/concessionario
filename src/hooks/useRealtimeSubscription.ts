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

    const dispatch = async (payload: RealtimePayload) => {
      if (!isMounted) return;

      let enrichedPayload = payload;
      if (table === 'announcements' && payload.eventType !== 'DELETE') {
        const row = payload.new as Record<string, unknown>;
        const authorId = typeof row.author_id === 'string' ? row.author_id : null;
        if (authorId) {
          const { data: author } = await supabase
            .from('users')
            .select('id,name,avatar_url,role')
            .eq('id', authorId)
            .maybeSingle();

          if (author && isMounted) {
            enrichedPayload = {
              ...payload,
              new: { ...row, author }
            } as RealtimePayload;
          }
        }
      }

      if (!isMounted) return;
      switch (enrichedPayload.eventType) {
        case 'INSERT':
          onInsertRef.current?.(enrichedPayload);
          break;
        case 'UPDATE':
          onUpdateRef.current?.(enrichedPayload);
          break;
        case 'DELETE':
          onDeleteRef.current?.(enrichedPayload);
          break;
      }
    };

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
          void dispatch(payload);
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