import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationsProvider } from './src/hooks/NotificationsContext';
import { ThemeProvider, useThemeContext } from './src/hooks/ThemeContext';
import {
  configureNotificationHandler,
  registerForPushNotificationsAsync,
  addNotificationListeners,
  getLastNotificationResponse,
  parseNotificationData,
} from './src/services/notifications';
import { useNotificationsContext } from './src/hooks/NotificationsContext';
import ApiService from './src/services/api';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/hooks/useAuthStore';
import { useAuthContext } from './src/hooks/useAuthStore';

const navigationRef = createNavigationContainerRef<any>();

function AppInner() {
  const { refresh, addNotification } = useNotificationsContext();
  const { navTheme, isDark } = useThemeContext();
  const { isAuthenticated, isInitializing } = useAuthContext();
  const notificationListenerCleanup = useRef<(() => void) | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    setupNotifications();

    return () => {
      // Cleanup notification listeners on unmount
      if (notificationListenerCleanup.current) {
        notificationListenerCleanup.current();
      }
    };
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) return;
    if (!expoPushToken) return;

    // Register token with backend only when authenticated.
    ApiService.registerFCMToken(expoPushToken).catch(() => {});
  }, [expoPushToken, isAuthenticated, isInitializing]);

  const setupNotifications = async () => {
    try {
      // Register for push notifications and get Expo push token
      const token = await registerForPushNotificationsAsync();

      if (token) {
        setExpoPushToken(token);
      }

      // Set up notification listeners
      notificationListenerCleanup.current = addNotificationListeners(
        // Handle foreground notifications
        (notification: Notifications.Notification) => {
          console.log('Foreground notification:', notification);
          handleNotification(notification);
        },
        // Handle notification tap
        (response: Notifications.NotificationResponse) => {
          console.log('Notification tapped:', response);
          handleNotificationResponse(response);
        }
      );

      // Check if app was opened from a notification
      const lastResponse = await getLastNotificationResponse();
      if (lastResponse) {
        console.log('App opened from notification:', lastResponse);
        handleNotificationResponse(lastResponse);
      }
    } catch (error) {
      console.error('Notification setup error:', error);
    }
  };

  const handleNotification = async (notification: Notifications.Notification) => {
    const parsedData = parseNotificationData(notification);
    console.log('Parsed notification:', parsedData);

    // Refresh notifications list from backend
    await refresh().catch(() => {});

    // Add to local notification context
    if (addNotification) {
      addNotification({
        id: notification.request.identifier || Date.now().toString(),
        type: (parsedData.type as any) || 'GENERAL',
        title: parsedData.title,
        message: parsedData.body,
        bookingId: parsedData.bookingId,
        isRead: false,
        createdAt: new Date().toISOString(),
        priority: parsedData.priority,
      });
    }
  };

  const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
    const parsedData = parseNotificationData(response);
    console.log('Handling notification tap:', parsedData);

    // Refresh notifications list
    await refresh().catch(() => {});

    // Navigate based on notification type
    if (parsedData.bookingId && navigationRef.isReady()) {
      navigationRef.navigate('BookingDetails', {
        bookingId: parsedData.bookingId,
      });
    } else if (parsedData.sosId && navigationRef.isReady()) {
      navigationRef.navigate('Bookings', {
        filterSOS: true,
      });
    }
  };

  return (
    <NavigationContainer theme={navTheme} ref={navigationRef}>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationsProvider>
          <AppInner />
        </NotificationsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
