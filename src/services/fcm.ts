import firebase from '@react-native-firebase/app';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

/**
 * Initialize Firebase and set up FCM
 */
export async function initializeFCM(): Promise<void> {
    try {
        // Firebase is auto-initialized from google-services.json on Android
        // and GoogleService-Info.plist on iOS
        console.log('Firebase initialized for FCM');
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        throw error;
    }
}

/**
 * Request notification permissions (Android 13+)
 */
export async function requestNotificationPermission(): Promise<boolean> {
    try {
        if (Platform.OS === 'android') {
            const androidVersion = Platform.Version;

            if (androidVersion >= 33) {
                // Android 13+ requires POST_NOTIFICATIONS permission
                const result = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                return result === PermissionsAndroid.RESULTS.GRANTED;
            }
        }
        // iOS and older Android versions handle permissions differently
        return true;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
}

/**
 * Get FCM device token
 */
export async function getFCMToken(): Promise<string | null> {
    try {
        const token = await messaging().getToken();
        console.log('FCM Token:', token);
        return token;
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
}

/**
 * Handle notification when app is in foreground
 */
export function handleForegroundNotification(
    onNotification: (notification: FirebaseMessagingTypes.RemoteMessage) => void
): () => void {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
        console.log('Foreground notification received:', remoteMessage);
        onNotification(remoteMessage);
    });
    return unsubscribe;
}

/**
 * Handle notification when app is in background or killed
 * This needs to be registered early, typically in index.ts or at app initialization
 */
export async function handleBackgroundNotification(
    onNotification: (message: FirebaseMessagingTypes.RemoteMessage) => void
): Promise<void> {
    // This is called when the app is killed/terminated and a notification arrives
    messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log(
            'Notification opened from background state:',
            remoteMessage
        );
        if (remoteMessage) {
            onNotification(remoteMessage);
        }
    });
}

/**
 * Get the initial notification that opened the app (when it was killed)
 */
export async function getInitialNotification(): Promise<FirebaseMessagingTypes.RemoteMessage | null> {
    try {
        const remoteMessage = await messaging().getInitialNotification();
        if (remoteMessage) {
            console.log('App opened from killed state via notification:', remoteMessage);
            return remoteMessage;
        }
        return null;
    } catch (error) {
        console.error('Error getting initial notification:', error);
        return null;
    }
}

/**
 * Request user permission for notifications (iOS)
 */
export async function requestUserPermission(): Promise<boolean> {
    try {
        const authorizationStatus = await messaging().requestPermission();

        const enabled =
            authorizationStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authorizationStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
            console.log('User notification permissions granted');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error requesting user permission:', error);
        return false;
    }
}

/**
 * Enable FCM auto-init (default is enabled)
 */
export async function setFCMAutoInit(enabled: boolean): Promise<void> {
    try {
        await messaging().setAutoInitEnabled(enabled);
    } catch (error) {
        console.error('Error setting FCM auto init:', error);
    }
}

/**
 * Subscribe to a topic
 */
export async function subscribeToTopic(topic: string): Promise<void> {
    try {
        await messaging().subscribeToTopic(topic);
        console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
        console.error(`Error subscribing to topic ${topic}:`, error);
    }
}

/**
 * Unsubscribe from a topic
 */
export async function unsubscribeFromTopic(topic: string): Promise<void> {
    try {
        await messaging().unsubscribeFromTopic(topic);
        console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
        console.error(`Error unsubscribing from topic ${topic}:`, error);
    }
}

/**
 * Parse notification data to extract action and ID
 */
export function parseNotificationData(notification: FirebaseMessagingTypes.RemoteMessage) {
    const data = notification.data || {};
    return {
        type: data.type || notification.notification?.title,
        bookingId: data.bookingId,
        sosId: data.sosId,
        title: notification.notification?.title || '',
        body: notification.notification?.body || '',
        messageId: notification.messageId,
        sentTime: notification.sentTime,
        data,
    };
}
