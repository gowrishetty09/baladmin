import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { NotificationType } from '../types';

/**
 * Utilities for testing FCM notifications
 * Use these for local testing without backend server
 */

/**
 * Mock FCM notification for testing
 */
export function createMockNotification(
    overrides?: Partial<FirebaseMessagingTypes.RemoteMessage>
): FirebaseMessagingTypes.RemoteMessage {
    const baseNotification: FirebaseMessagingTypes.RemoteMessage = {
        messageId: `MSG-${Date.now()}`,
        sentTime: Date.now(),
        notification: {
            title: 'Test Notification',
            body: 'This is a test notification',
        },
        data: {
            type: 'NEW_BOOKING',
            bookingId: 'BK-TEST-001',
            priority: 'MEDIUM',
        },
        from: '123456789',
        collapseKey: 'test',
    };

    return {
        ...baseNotification,
        ...overrides,
        data: {
            ...baseNotification.data,
            ...overrides?.data,
        },
        notification: {
            ...baseNotification.notification,
            ...overrides?.notification,
        },
    };
}

/**
 * Create a booking-related notification
 */
export function createBookingNotification(
    bookingId: string,
    type: NotificationType,
    overrides?: Partial<FirebaseMessagingTypes.RemoteMessage>
): FirebaseMessagingTypes.RemoteMessage {
    const notificationTexts: Record<NotificationType, { title: string; body: string }> = {
        [NotificationType.NEW_BOOKING]: {
            title: 'New Booking',
            body: `Booking ${bookingId} created`,
        },
        [NotificationType.DRIVER_ASSIGNED]: {
            title: 'Driver Assigned',
            body: `Driver assigned to booking ${bookingId}`,
        },
        [NotificationType.RIDE_STARTED]: {
            title: 'Ride Started',
            body: `Ride for booking ${bookingId} has started`,
        },
        [NotificationType.RIDE_COMPLETED]: {
            title: 'Ride Completed',
            body: `Ride for booking ${bookingId} completed`,
        },
        [NotificationType.SOS_RAISED]: {
            title: 'SOS Alert',
            body: `SOS raised for booking ${bookingId}`,
        },
        [NotificationType.BOOKING_CANCELLED]: {
            title: 'Booking Cancelled',
            body: `Booking ${bookingId} has been cancelled`,
        },
    };

    const texts = notificationTexts[type] || { title: 'Notification', body: '' };

    return createMockNotification({
        notification: {
            title: texts.title,
            body: texts.body,
        },
        data: {
            type,
            bookingId,
            priority: type === NotificationType.SOS_RAISED ? 'HIGH' : 'MEDIUM',
        },
        ...overrides,
    });
}

/**
 * Create SOS notification
 */
export function createSOSNotification(
    bookingId: string,
    sosMessage: string,
    overrides?: Partial<FirebaseMessagingTypes.RemoteMessage>
): FirebaseMessagingTypes.RemoteMessage {
    return createMockNotification({
        notification: {
            title: 'SOS Alert',
            body: sosMessage,
        },
        data: {
            type: NotificationType.SOS_RAISED,
            bookingId,
            priority: 'HIGH',
        },
        ...overrides,
    });
}

/**
 * Simulate app states for testing
 */
export enum AppState {
    FOREGROUND = 'foreground',
    BACKGROUND = 'background',
    KILLED = 'killed',
}

/**
 * Test notification delivery scenarios
 */
export async function testNotificationScenario(
    scenario: AppState,
    notification: FirebaseMessagingTypes.RemoteMessage,
    handler: (notification: FirebaseMessagingTypes.RemoteMessage) => Promise<void>
): Promise<void> {
    console.log(`\n=== Testing ${scenario} scenario ===`);
    console.log('Notification:', JSON.stringify(notification, null, 2));

    try {
        await handler(notification);
        console.log(`✓ ${scenario} scenario passed`);
    } catch (error) {
        console.error(`✗ ${scenario} scenario failed:`, error);
        throw error;
    }
}

/**
 * Validate notification structure
 */
export interface NotificationValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export function validateNotification(
    notification: FirebaseMessagingTypes.RemoteMessage
): NotificationValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!notification.messageId) {
        errors.push('Missing messageId');
    }
    if (!notification.notification?.title) {
        warnings.push('Missing notification title');
    }
    if (!notification.notification?.body) {
        warnings.push('Missing notification body');
    }

    // Data validation
    if (!notification.data?.type) {
        warnings.push('Missing notification type in data');
    }

    // Specific type validations
    const type = notification.data?.type;
    if ([NotificationType.NEW_BOOKING, NotificationType.SOS_RAISED].includes(type as NotificationType)) {
        if (!notification.data?.bookingId) {
            errors.push(`Missing bookingId for ${type} notification`);
        }
    }

    // Priority validation
    const priority = notification.data?.priority;
    if (priority && !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
        warnings.push(`Invalid priority: ${priority}`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Generate test report for notification
 */
export function generateTestReport(
    notification: FirebaseMessagingTypes.RemoteMessage,
    validation: NotificationValidation,
    handler: (notification: FirebaseMessagingTypes.RemoteMessage) => Promise<void>
): string {
    let report = `\n${'='.repeat(50)}\n`;
    report += `NOTIFICATION TEST REPORT\n`;
    report += `${'='.repeat(50)}\n\n`;

    report += `Message ID: ${notification.messageId}\n`;
    report += `Type: ${notification.data?.type || 'UNKNOWN'}\n`;
    report += `Sent Time: ${new Date(notification.sentTime || 0).toISOString()}\n\n`;

    report += `NOTIFICATION CONTENT:\n`;
    report += `  Title: ${notification.notification?.title || '(empty)'}\n`;
    report += `  Body: ${notification.notification?.body || '(empty)'}\n\n`;

    report += `VALIDATION RESULT: ${validation.isValid ? '✓ PASS' : '✗ FAIL'}\n`;

    if (validation.errors.length > 0) {
        report += `\nERRORS:\n`;
        validation.errors.forEach((error) => {
            report += `  - ${error}\n`;
        });
    }

    if (validation.warnings.length > 0) {
        report += `\nWARNINGS:\n`;
        validation.warnings.forEach((warning) => {
            report += `  - ${warning}\n`;
        });
    }

    report += `\n${'='.repeat(50)}\n`;

    return report;
}

/**
 * Batch test multiple notifications
 */
export async function batchTestNotifications(
    notifications: FirebaseMessagingTypes.RemoteMessage[],
    handler: (notification: FirebaseMessagingTypes.RemoteMessage) => Promise<void>
): Promise<{
    total: number;
    passed: number;
    failed: number;
    errors: Map<string, Error>;
}> {
    const errors = new Map<string, Error>();
    let passed = 0;
    let failed = 0;

    console.log(`\nRunning batch test for ${notifications.length} notifications...`);

    for (const notification of notifications) {
        try {
            await handler(notification);
            passed++;
        } catch (error) {
            failed++;
            errors.set(notification.messageId || `unknown-${Date.now()}`, error as Error);
        }
    }

    console.log(`\nBatch test complete:`);
    console.log(`  Total: ${notifications.length}`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);

    return {
        total: notifications.length,
        passed,
        failed,
        errors,
    };
}

/**
 * Create test suite for FCM
 */
export class FCMTestSuite {
    private notifications: FirebaseMessagingTypes.RemoteMessage[] = [];
    private results: Map<string, { passed: boolean; error?: Error }> = new Map();

    addTest(
        name: string,
        notification: FirebaseMessagingTypes.RemoteMessage
    ): void {
        this.notifications.push(notification);
        console.log(`Added test: ${name}`);
    }

    async runTests(
        handler: (notification: FirebaseMessagingTypes.RemoteMessage) => Promise<void>
    ): Promise<void> {
        console.log(`\nRunning ${this.notifications.length} tests in FCM Test Suite...\n`);

        for (let i = 0; i < this.notifications.length; i++) {
            const notification = this.notifications[i];
            const testName = `Test ${i + 1}: ${notification.data?.type || 'Unknown'}`;

            try {
                await handler(notification);
                this.results.set(testName, { passed: true });
                console.log(`✓ ${testName}`);
            } catch (error) {
                this.results.set(testName, { passed: false, error: error as Error });
                console.log(`✗ ${testName}`);
            }
        }

        this.printSummary();
    }

    private printSummary(): void {
        const passed = Array.from(this.results.values()).filter((r) => r.passed).length;
        const failed = this.results.size - passed;

        console.log(`\n${'='.repeat(50)}`);
        console.log(`TEST SUMMARY`);
        console.log(`${'='.repeat(50)}`);
        console.log(`Total: ${this.results.size}`);
        console.log(`Passed: ${passed} ✓`);
        console.log(`Failed: ${failed} ✗`);
        console.log(`${'='.repeat(50)}\n`);

        if (failed > 0) {
            console.log(`FAILURES:`);
            this.results.forEach((result, testName) => {
                if (!result.passed && result.error) {
                    console.log(`  ${testName}: ${result.error.message}`);
                }
            });
        }
    }
}
