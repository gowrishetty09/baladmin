import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import ApiService from '../services/api';
import { Notification } from '../types';
import { useAuthContext } from './useAuthStore';

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  refresh: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { isAuthenticated, isInitializing } = useAuthContext();

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const refresh = async () => {
    if (!isAuthenticated) {
      return;
    }
    try {
      const data = await ApiService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  };

  const addNotification = (notification: Notification) => {
    // Add new notification at the beginning and ensure no duplicates
    setNotifications((prev) => {
      const exists = prev.some(n => n.id === notification.id);
      if (exists) return prev;
      return [notification, ...prev];
    });
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      // Call API
      await ApiService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    if (isInitializing) return;
    if (isAuthenticated) {
      refresh().catch(() => {});
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, isInitializing]);

  const value = useMemo(
    () => ({ notifications, unreadCount, setNotifications, refresh, addNotification, markAsRead }),
    [notifications, unreadCount]
  );

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
