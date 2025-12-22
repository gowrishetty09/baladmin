/**
 * Notification Topics and Handlers
 * 
 * Note: Topic subscriptions are not available in Expo managed workflow.
 * The backend should handle topic-based routing using device tokens.
 * 
 * This file provides notification handler utilities that work with expo-notifications.
 */

/**
 * Predefined notification topics (for backend reference)
 * These are handled server-side, not client-side in Expo
 */
export const NOTIFICATION_TOPICS = {
    ALL_ADMINS: 'all-admins',
    SOS_ALERTS: 'sos-alerts',
    NEW_BOOKINGS: 'new-bookings',
    DRIVER_UPDATES: 'driver-updates',
    SYSTEM_ALERTS: 'system-alerts',
} as const;

// Legacy export for backward compatibility
export const FCM_TOPICS = NOTIFICATION_TOPICS;

/**
 * Topic subscriptions are not available in Expo managed workflow
 * The backend should manage topic-based routing
 */
export async function subscribeToAdminTopics(): Promise<void> {
    console.log('Topic subscriptions are managed server-side in Expo managed workflow');
}

export async function subscribeToTopic(_topic: string): Promise<void> {
    console.log('Topic subscriptions are managed server-side in Expo managed workflow');
}

export async function unsubscribeFromTopic(_topic: string): Promise<void> {
    console.log('Topic unsubscriptions are managed server-side in Expo managed workflow');
}

export async function isSubscribedToTopic(_topic: string): Promise<boolean> {
    // This would need to be tracked on the backend
    return true;
}

/**
 * Notification handler with categorization
 */
export interface NotificationHandler {
    type: string;
    handler: (notification: any) => Promise<void>;
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
    notification: any
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
export function getNotificationPriority(notification: any): 'high' | 'normal' {
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
    notification: any
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
    notification: any,
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
    notifications: any[]
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
