import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

export const useServiceStatus = (user: Pick<User, 'id' | 'isOnService'> | null | undefined) => {
  const userId = user?.id;
  const userStatus = Boolean(user?.isOnService);
  const [isOnService, setIsOnService] = useState(userStatus);

  useEffect(() => {
    setIsOnService(userStatus);
  }, [userStatus]);

  useEffect(() => {
    if (!userId) {
      setIsOnService(false);
      return;
    }

    let mounted = true;

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

          setIsOnService(payload.eventType === 'DELETE' ? false : Boolean(row.is_on_service));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return isOnService;
};
