import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Expo Push Notifications Service
 * 
 * This service handles all push notification functionality using expo-notifications.
 * It is fully compatible with Expo managed workflow.
 */

let isNotificationHandlerConfigured = false;

/**
 * Configure how notifications are handled when the app is in the foreground
 * This is called lazily to avoid "property is not configurable" errors
 */
export function configureNotificationHandler(): void {
  if (isNotificationHandlerConfigured) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    isNotificationHandlerConfigured = true;
  } catch (error) {
    console.warn('Failed to configure notification handler:', error);
  }
}

/**
 * Request notification permissions and get the Expo push token
 * @returns The Expo push token string or null if failed
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // Configure notification handler first
    configureNotificationHandler();

    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#bd9250',
        sound: 'default',
      });

      // Create a high priority channel for SOS alerts
      await Notifications.setNotificationChannelAsync('sos-alerts', {
        name: 'SOS Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#ef4444',
        sound: 'default',
      });
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission for notifications not granted');
      return null;
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    console.log('Expo Push Token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.warn('Failed to register for push notifications:', error);
    return null;
  }
}

/**
 * Request notification permissions only (without getting token)
 * @returns true if permissions are granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Add notification listeners for foreground and tap handling
 * Must be called inside useEffect and cleaned up on unmount
 * 
 * @param onReceive - Called when a notification is received while app is in foreground
 * @param onResponse - Called when user taps on a notification
 * @returns Cleanup function to remove listeners
 */
export function addNotificationListeners(
  onReceive?: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void
): () => void {
  // Ensure notification handler is configured
  configureNotificationHandler();

  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received in foreground:', notification);
    onReceive?.(notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification tapped:', response);
    onResponse?.(response);
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Get the last notification response that opened the app
 * Call this on app startup to handle notifications that launched the app
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response;
  } catch (error) {
    console.error('Error getting last notification response:', error);
    return null;
  }
}

/**
 * Parse notification data to extract booking/SOS information
 */
export interface ParsedNotificationData {
  type: string;
  bookingId?: string;
  sosId?: string;
  title: string;
  body: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  data: Record<string, any>;
}

export function parseNotificationData(
  notification: Notifications.Notification | Notifications.NotificationResponse
): ParsedNotificationData {
  // Handle both Notification and NotificationResponse
  const notif = 'notification' in notification ? notification.notification : notification;
  const content = notif.request.content;
  const data = (content.data || {}) as Record<string, any>;

  const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
  const priority = validPriorities.includes(data.priority)
    ? (data.priority as 'LOW' | 'MEDIUM' | 'HIGH')
    : 'MEDIUM';

  return {
    type: data.type || 'GENERAL',
    bookingId: data.bookingId,
    sosId: data.sosId,
    title: content.title || '',
    body: content.body || '',
    priority,
    data,
  };
}

/**
 * Schedule a local notification (for testing or local alerts)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  seconds: number = 1
): Promise<string> {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: seconds > 0 ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds } : null,
  });
  return identifier;
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get the badge count (iOS only)
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count (iOS only)
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Dismiss all notifications from the notification center
 */
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
