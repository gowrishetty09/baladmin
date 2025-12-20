import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationsProvider } from './src/hooks/NotificationsContext';
import { ThemeProvider, useThemeContext } from './src/hooks/ThemeContext';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, addNotificationListeners } from './src/services/notifications';
import { useNotificationsContext } from './src/hooks/NotificationsContext';
import ApiService from './src/services/api';

function AppInner() {
  const { refresh } = useNotificationsContext();
  const { navTheme, isDark } = useThemeContext();

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        // Register push token with backend
        ApiService.registerPushToken(token).catch(() => {
          // Token registration is non-critical
        });
      }
    });

    const unsubscribe = addNotificationListeners(
      () => {
        // Refresh in-app list when a notification is received
        refresh().catch(() => {});
      },
      (response: Notifications.NotificationResponse) => {
        const bookingId = response.notification.request.content.data?.bookingId as string | undefined;
        // Handle deep navigation to booking details if bookingId is present
        // Navigation is available in screens; here we just log
        if (bookingId) console.log('Open booking', bookingId);
      }
    );
    return unsubscribe;
  }, []);

  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationsProvider>
        <AppInner />
      </NotificationsProvider>
    </ThemeProvider>
  );
}
