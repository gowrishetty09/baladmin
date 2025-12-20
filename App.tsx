import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationsProvider } from './src/hooks/NotificationsContext';
import { ThemeProvider, useThemeContext } from './src/hooks/ThemeContext';
import {
  initializeFCM,
  requestNotificationPermission,
  requestUserPermission,
  getFCMToken,
  handleForegroundNotification,
  handleBackgroundNotification,
  getInitialNotification,
  parseNotificationData,
} from './src/services/fcm';
import { useNotificationsContext } from './src/hooks/NotificationsContext';
import ApiService from './src/services/api';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

const navigationRef = useRef<NavigationContainerRef<any>>(null);

function AppInner() {
  const { refresh, addNotification } = useNotificationsContext();
  const { navTheme, isDark } = useThemeContext();

  useEffect(() => {
    setupFCM();
  }, []);

  const setupFCM = async () => {
    try {
      // Initialize Firebase
      await initializeFCM();

      // Request permissions
      await Promise.all([requestNotificationPermission(), requestUserPermission()]);

      // Get FCM token
      const token = await getFCMToken();
      if (token) {
        // Register token with backend as ADMIN
        await ApiService.registerFCMToken(token, 'ADMIN');
      }

      // Handle foreground notifications
      const unsubscribeForeground = handleForegroundNotification((remoteMessage) => {
        console.log('Foreground notification:', remoteMessage);
        handleNotification(remoteMessage);
      });

      // Handle background notifications
      await handleBackgroundNotification((remoteMessage) => {
        console.log('Background notification:', remoteMessage);
        handleNotification(remoteMessage);
      });

      // Handle notification that opened the app from killed state
      const initialNotification = await getInitialNotification();
      if (initialNotification) {
        console.log('App opened from killed state by notification:', initialNotification);
        handleNotification(initialNotification, true);
      }

      return unsubscribeForeground;
    } catch (error) {
      console.error('FCM setup error:', error);
    }
  };

  const handleNotification = async (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
    isInitial = false
  ) => {
    const parsedData = parseNotificationData(remoteMessage);
    console.log('Parsed notification:', parsedData);

    // Refresh notifications list
    await refresh().catch(() => {});

    // Add to context for in-app display
    if (addNotification) {
      addNotification({
        id: parsedData.messageId || Date.now().toString(),
        type: parsedData.type,
        title: parsedData.title,
        message: parsedData.body,
        bookingId: parsedData.bookingId,
        isRead: false,
        createdAt: new Date().toISOString(),
        priority: parsedData.data.priority || 'MEDIUM',
      });
    }

    // Navigate if it's a booking or SOS notification
    if (parsedData.bookingId && navigationRef.current) {
      navigationRef.current.navigate('BookingDetails', {
        bookingId: parsedData.bookingId,
      });
    } else if (parsedData.sosId && navigationRef.current) {
      navigationRef.current.navigate('Bookings', {
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
      <NotificationsProvider>
        <AppInner />
      </NotificationsProvider>
    </ThemeProvider>
  );
}
