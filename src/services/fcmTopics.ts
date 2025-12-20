import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

/**
 * Topic Management for FCM subscriptions
 * Useful for sending notifications to groups of users (e.g., all admins)
 */

// Predefined topics
export const FCM_TOPICS = {
    ALL_ADMINS: 'all-admins',
    SOS_ALERTS: 'sos-alerts',
    NEW_BOOKINGS: 'new-bookings',
    DRIVER_UPDATES: 'driver-updates',
    SYSTEM_ALERTS: 'system-alerts',
} as const;

/**
 * Subscribe admin to notification topics
 */
export async function subscribeToAdminTopics(): Promise<void> {
    try {
        await Promise.all([
            subscribeToTopic(FCM_TOPICS.ALL_ADMINS),
            subscribeToTopic(FCM_TOPICS.SOS_ALERTS),
            subscribeToTopic(FCM_TOPICS.NEW_BOOKINGS),
            subscribeToTopic(FCM_TOPICS.SYSTEM_ALERTS),
        ]);
        console.log('Subscribed to all admin topics');
    } catch (error) {
        console.error('Error subscribing to topics:', error);
    }
}

/**
 * Subscribe to a specific topic
 */
export async function subscribeToTopic(topic: string): Promise<void> {
    try {
        await messaging().subscribeToTopic(topic);
        console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
        console.error(`Error subscribing to topic ${topic}:`, error);
        throw error;
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
        throw error;
    }
}

/**
 * Check if subscribed to a topic
 */
export async function isSubscribedToTopic(topic: string): Promise<boolean> {
    try {
        // Note: React Native Firebase doesn't provide a direct method to check subscription
        // This would need to be tracked on the backend
        return true;
    } catch (error) {
        console.error(`Error checking topic subscription:`, error);
        return false;
    }
}

/**
 * Notification handler with categorization
 */
export interface NotificationHandler {
    type: string;
    handler: (notification: FirebaseMessagingTypes.RemoteMessage) => Promise<void>;
}

const handlers: Map<string, NotificationHandler['handler']> = new Map();

/**
 * Register a handler for a specific notification type
 */
export function registerNotificationHandler(
    type: string,
    handler: NotificationHandler['handler']
): void {
    handlers.set(type, handler);
    console.log(`Registered handler for notification type: ${type}`);
}

/**
 * Handle notification based on type
 */
export async function handleNotificationByType(
    notification: FirebaseMessagingTypes.RemoteMessage
): Promise<void> {
    const type = notification.data?.type || 'UNKNOWN';
    const handler = handlers.get(type);

    if (handler) {
        try {
            await handler(notification);
        } catch (error) {
            console.error(`Error handling notification of type ${type}:`, error);
        }
    } else {
        console.warn(`No handler registered for notification type: ${type}`);
    }
}

/**
 * Setup predefined notification handlers
 */
export function setupNotificationHandlers(navigationRef: any): void {
    // Handler for new bookings
    registerNotificationHandler('NEW_BOOKING', async (notification) => {
        const bookingId = notification.data?.bookingId;
        if (bookingId && navigationRef?.current) {
            navigationRef.current.navigate('BookingDetails', { bookingId });
        }
    });

    // Handler for SOS alerts
    registerNotificationHandler('SOS_RAISED', async (notification) => {
        const bookingId = notification.data?.bookingId;
        if (bookingId && navigationRef?.current) {
            navigationRef.current.navigate('BookingDetails', { bookingId });
        }
    });

    // Handler for driver assignments
    registerNotificationHandler('DRIVER_ASSIGNED', async (notification) => {
        const bookingId = notification.data?.bookingId;
        if (bookingId && navigationRef?.current) {
            navigationRef.current.navigate('BookingDetails', { bookingId });
        }
    });

    // Handler for ride started
    registerNotificationHandler('RIDE_STARTED', async (notification) => {
        const bookingId = notification.data?.bookingId;
        if (bookingId && navigationRef?.current) {
            navigationRef.current.navigate('BookingDetails', { bookingId });
        }
    });

    // Handler for ride completed
    registerNotificationHandler('RIDE_COMPLETED', async (notification) => {
        const bookingId = notification.data?.bookingId;
        if (bookingId && navigationRef?.current) {
            navigationRef.current.navigate('BookingDetails', { bookingId });
        }
    });

    // Handler for system alerts
    registerNotificationHandler('SYSTEM_ALERT', async (notification) => {
        console.log('System alert:', notification.notification?.body);
        // Show alert or banner without navigation
    });
}

/**
 * Get notification priority level
 */
export function getNotificationPriority(notification: FirebaseMessagingTypes.RemoteMessage): 'high' | 'normal' {
    const priority = notification.data?.priority || 'MEDIUM';
    return priority === 'HIGH' ? 'high' : 'normal';
}

/**
 * Extract structured data from notification
 */
export interface StructuredNotificationData {
    type: string;
    bookingId?: string;
    sosId?: string;
    driverId?: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    timestamp: number;
    title: string;
    body: string;
    actionUrl?: string;
}

export function extractNotificationData(
    notification: FirebaseMessagingTypes.RemoteMessage
): StructuredNotificationData {
    const data = notification.data || {};
    const priority = (data.priority || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH';

    return {
        type: data.type || 'UNKNOWN',
        bookingId: data.bookingId,
        sosId: data.sosId,
        driverId: data.driverId,
        priority,
        timestamp: notification.sentTime || Date.now(),
        title: notification.notification?.title || '',
        body: notification.notification?.body || '',
        actionUrl: data.actionUrl,
    };
}

/**
 * Filter notifications by priority
 */
export function shouldShowNotification(
    notification: FirebaseMessagingTypes.RemoteMessage,
    minimumPriority: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
): boolean {
    const priorityMap = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3 };
    const notificationPriority = (notification.data?.priority || 'MEDIUM') as keyof typeof priorityMap;

    return priorityMap[notificationPriority] >= priorityMap[minimumPriority];
}

/**
 * Batch notifications for summary
 */
export interface NotificationGroup {
    type: string;
    count: number;
    latestTitle: string;
    latestBody: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export function groupNotifications(
    notifications: FirebaseMessagingTypes.RemoteMessage[]
): NotificationGroup[] {
    const groups = new Map<string, StructuredNotificationData[]>();

    notifications.forEach((notif) => {
        const data = extractNotificationData(notif);
        const type = data.type;

        if (!groups.has(type)) {
            groups.set(type, []);
        }
        groups.get(type)!.push(data);
    });

    return Array.from(groups.entries()).map(([type, items]) => ({
        type,
        count: items.length,
        latestTitle: items[0].title,
        latestBody: items[0].body,
        priority: items[0].priority,
    }));
}
