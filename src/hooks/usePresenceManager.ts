import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface PresenceManagerOptions {
  heartbeatInterval?: number; // in milliseconds
  offlineThreshold?: number; // in milliseconds
}

export const usePresenceManager = (options: PresenceManagerOptions = {}) => {
  const { user } = useAuth();
  const {
    heartbeatInterval = 60000, // 60 seconds - meno aggressivo
    offlineThreshold = 300000   // 5 minuti - molto più permissivo
  } = options;

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const hasSetInitialRef = useRef<boolean>(false);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Non forziamo is_on_service a true: rispettiamo lo stato attuale dell'utente
      // Aggiorniamo solo last_service_status_change per mostrare che è vivo
      // (non usiamo last_activity perché la colonna non esiste)
      await supabase
        .from('users')
        .update({
          last_service_status_change: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (error) {
      console.warn('Error sending heartbeat (ignored):', error);
    }
  }, [user?.id]);

  const setOffline = useCallback(async () => {
    if (!user?.id) return;
    // Chiamato solo in casi estremi, non al cambio tab
    try {
      await supabase
        .from('users')
        .update({
          is_on_service: false,
          last_service_status_change: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (error) {
      console.warn('Error setting offline (ignored):', error);
    }
  }, [user?.id]);

  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden) {
      updateActivity();
      if (user?.id) {
        sendHeartbeat();
      }
    }
  }, [sendHeartbeat, updateActivity, user?.id]);

  // Activity event listeners (mouse, keyboard, scroll)
  const handleUserActivity = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  useEffect(() => {
    if (!user?.id) {
      hasSetInitialRef.current = false;
      return;
    }

    if (!hasSetInitialRef.current) {
      sendHeartbeat();
      hasSetInitialRef.current = true;
    }

    heartbeatRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity < offlineThreshold || !document.hidden) {
        sendHeartbeat();
      }
      // NOTA: Non settiamo più is_on_service=false in automatico per timeout.
      // L'utente decide manualmente quando entrare/uscire dal servizio.
    }, heartbeatInterval);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousedown', handleUserActivity);
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('keypress', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    document.addEventListener('touchstart', handleUserActivity);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousedown', handleUserActivity);
      document.removeEventListener('mousemove', handleUserActivity);
      document.removeEventListener('keypress', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
      document.removeEventListener('touchstart', handleUserActivity);
    };
  }, [
    user?.id,
    heartbeatInterval,
    offlineThreshold,
    sendHeartbeat,
    handleVisibilityChange,
    handleUserActivity
  ]);

  return {
    updateActivity,
    setOffline,
    sendHeartbeat
  };
};
