import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // SDK 51+ includes these iOS flags
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

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

    // Use projectId if available to avoid deprecation warnings
    // You can set EXPO_PUBLIC_PROJECT_ID in app config or .env
    let projectId: string | undefined;
    try {
      // @ts-ignore
      const exp = (await import('../../../app.json')).expo as any;
      // EAS injects projectId; if absent, Expo can infer in development
      projectId = exp?.extra?.eas?.projectId;
    } catch {}

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch (e) {
    console.warn('Failed to register for push notifications', e);
    return null;
  }
}

export function addNotificationListeners(
  onReceive?: (n: Notifications.Notification) => void,
  onResponse?: (r: Notifications.NotificationResponse) => void
) {
  const receivedSub = Notifications.addNotificationReceivedListener((n) => {
    onReceive?.(n);
  });
  const responseSub = Notifications.addNotificationResponseReceivedListener((r) => {
    onResponse?.(r);
  });
  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
