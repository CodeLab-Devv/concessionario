import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from './ui/NotificationManager';

interface SiteNotification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

const SELECT_FIELDS = 'id,recipient_id,type,title,message,data,read_at,created_at';

export const GlobalNotifications: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { showWarning, showInfo, showSuccess, showError } = useNotifications();
  const handledIds = useRef(new Set<string>());

  useEffect(() => {
    handledIds.current.clear();
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let active = true;
    const recipientId = user.id;

    const displayNotification = (notification: SiteNotification) => {
      if (!active || notification.recipient_id !== recipientId || notification.read_at) return;
      if (handledIds.current.has(notification.id)) return;

      handledIds.current.add(notification.id);
      const message = notification.message ?? undefined;

      switch (notification.type) {
        case 'success':
          showSuccess(notification.title, message);
          break;
        case 'error':
          showError(notification.title, message);
          break;
        case 'info':
          showInfo(notification.title, message);
          break;
        default:
          showWarning(notification.title, message);
      }
    };

    const loadUnread = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(SELECT_FIELDS)
        .eq('recipient_id', recipientId)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Errore caricamento notifiche:', error);
        return;
      }

      if (!active) return;
      (data ?? []).forEach((item) => displayNotification(item as SiteNotification));
    };

    void loadUnread();

    const channel = supabase
      .channel(`global-notifications-${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${recipientId}`,
        },
        (payload) => displayNotification(payload.new as SiteNotification),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${recipientId}`,
        },
        (payload) => {
          const notification = payload.new as SiteNotification;
          if (notification.read_at) handledIds.current.delete(notification.id);
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime notifiche non disponibile:', status);
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, showError, showInfo, showSuccess, showWarning, user?.id]);

  return null;
};
