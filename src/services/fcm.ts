/**
 * FCM Service - Re-exports from expo-notifications based service
 * 
 * This file provides backward compatibility for existing imports.
 * All functionality is now handled by the unified notifications.ts service
 * using expo-notifications (Expo managed workflow compatible).
 * 
 * @deprecated Import from './notifications' instead
 */

export {
    configureNotificationHandler,
    registerForPushNotificationsAsync,
    requestNotificationPermission,
    addNotificationListeners,
    getLastNotificationResponse,
    parseNotificationData,
    scheduleLocalNotification,
    cancelNotification,
    cancelAllNotifications,
    getBadgeCount,
    setBadgeCount,
    dismissAllNotifications,
} from './notifications';

export type { ParsedNotificationData } from './notifications';

// Legacy function aliases for backward compatibility
export const initializeFCM = async (): Promise<void> => {
    console.log('Notifications: Using expo-notifications (Expo managed workflow)');
};

export const getFCMToken = async (): Promise<string | null> => {
    const { registerForPushNotificationsAsync } = await import('./notifications');
    return registerForPushNotificationsAsync();
};

export const requestUserPermission = async (): Promise<boolean> => {
    const { requestNotificationPermission } = await import('./notifications');
    return requestNotificationPermission();
};

// These functions are not applicable in Expo managed workflow
export const subscribeToTopic = async (_topic: string): Promise<void> => {
    console.log('Topic subscriptions are not available in Expo managed workflow');
};

export const unsubscribeFromTopic = async (_topic: string): Promise<void> => {
    console.log('Topic unsubscriptions are not available in Expo managed workflow');
};
