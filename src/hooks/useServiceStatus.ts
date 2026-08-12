import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

export const useServiceStatus = (user: Pick<User, 'id' | 'isOnService'> | null | undefined) => {
  const [isOnService, setIsOnService] = useState(Boolean(user?.isOnService));

  useEffect(() => {
    if (!user?.id) {
      setIsOnService(false);
      return;
    }

    let mounted = true;
    const userId = user.id;
    const initialStatus = Boolean(user.isOnService);

    setIsOnService(initialStatus);

    const refresh = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('is_on_service')
        .eq('id', userId)
        .maybeSingle();

      if (!error && mounted) {
        setIsOnService(Boolean(data?.is_on_service));
      }
    };

    void refresh();

    const channel = supabase
      .channel(`service-status-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        payload => {
          if (!mounted) return;

          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as {
            id?: string;
            is_on_service?: boolean | null;
          } | null;

          if (!row?.id || String(row.id) !== String(userId)) return;

          if (payload.eventType === 'DELETE') {
            setIsOnService(false);
            return;
          }

          setIsOnService(Boolean(row.is_on_service));
        },
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          void refresh();
        }
      });

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return isOnService;
};
