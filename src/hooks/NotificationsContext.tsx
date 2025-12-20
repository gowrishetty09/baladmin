import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import ApiService from '../services/api';
import { Notification } from '../types';

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const refresh = async () => {
    const data = await ApiService.getNotifications();
    setNotifications(data);
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const value = useMemo(() => ({ notifications, unreadCount, setNotifications, refresh }), [notifications, unreadCount]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotificationsContext = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotificationsContext must be used within NotificationsProvider');
  return ctx;
};
