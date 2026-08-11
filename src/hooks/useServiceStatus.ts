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
    setIsOnService(Boolean(user.isOnService));

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
      .channel(`service-status-${userId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        payload => {
          if (!mounted) return;
          setIsOnService(Boolean((payload.new as { is_on_service?: boolean }).is_on_service));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return isOnService;
};
