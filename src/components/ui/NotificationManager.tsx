import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Notification, NotificationProps, NotificationType } from './Notification';

interface NotificationContextType {
  showNotification: (type: NotificationType, title: string, message?: string, duration?: number) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

const buildKey = (type: NotificationType, title: string, message?: string) =>
  `${type}:${title.trim()}:${(message ?? '').trim()}`;

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);
  const recentKeys = useRef(new Map<string, number>());

  const removeNotification = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, title: string, message?: string, duration?: number) => {
      const key = buildKey(type, title, message);
      const now = Date.now();
      const lastShown = recentKeys.current.get(key);

      if (lastShown && now - lastShown < 5000) {
        return;
      }

      recentKeys.current.set(key, now);

      for (const [storedKey, timestamp] of recentKeys.current) {
        if (now - timestamp >= 10000) {
          recentKeys.current.delete(storedKey);
        }
      }

      const notification: NotificationProps = {
        id: `${now}-${Math.random().toString(36).slice(2, 10)}`,
        type,
        title,
        message,
        duration,
        onClose: removeNotification,
      };

      setNotifications((current) => [...current, notification]);
    },
    [removeNotification],
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => showNotification('success', title, message),
    [showNotification],
  );

  const showError = useCallback(
    (title: string, message?: string) => showNotification('error', title, message),
    [showNotification],
  );

  const showWarning = useCallback(
    (title: string, message?: string) => showNotification('warning', title, message),
    [showNotification],
  );

  const showInfo = useCallback(
    (title: string, message?: string) => showNotification('info', title, message),
    [showNotification],
  );

  const value: NotificationContextType = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="safe-area-top fixed left-4 right-4 top-0 z-50 space-y-2 sm:left-auto sm:right-4 sm:w-96">
        {notifications.map((notification) => (
          <Notification key={notification.id} {...notification} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
