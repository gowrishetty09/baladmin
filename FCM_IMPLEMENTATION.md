# Firebase Cloud Messaging (FCM) Implementation Guide

## Overview

This document describes the complete FCM implementation for the Cab Management System Admin Mobile App using React Native Firebase.

## Architecture

### Components

1. **FCM Service** (`src/services/fcm.ts`) - Core Firebase Cloud Messaging functionality
2. **API Service** (`src/services/api.ts`) - Backend token registration
3. **Notifications Context** (`src/hooks/NotificationsContext.tsx`) - State management
4. **App Component** (`App.tsx`) - Initialization and notification handling
5. **Configuration Files** - Android and iOS setup

## Installation

### 1. Install Dependencies

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
# or
yarn add @react-native-firebase/app @react-native-firebase/messaging
```

### 2. Android Configuration

#### Step 1: Add google-services.json

1. Download `google-services.json` from your Firebase Console
2. Place it in the project root: `./google-services.json`
3. The app.json already references it in the android plugin configuration

#### Step 2: Android Manifest Permissions

The permissions are automatically handled by Firebase, but verify the following are present in `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Notification permissions -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="com.google.android.c2dm.permission.RECEIVE" />
<uses-permission android:name="android.permission.INTERNET" />
```

#### Step 3: Build Gradle Configuration

Ensure `android/build.gradle` includes:

```gradle
buildscript {
    dependencies {
        // Add Google Services plugin
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

And `android/app/build.gradle` includes:

```gradle
// Apply Google Services plugin
apply plugin: 'com.google.gms.google-services'
```

### 3. iOS Configuration

#### Step 1: Download GoogleService-Info.plist

1. Download `GoogleService-Info.plist` from Firebase Console
2. Place it in the project root: `./GoogleService-Info.plist`
3. The app.json already references it in the @react-native-firebase/app plugin

#### Step 2: APNs Configuration

1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Upload your Apple Push Notification (APN) certificate or key
3. This enables Firebase to send notifications to iOS devices

#### Step 3: Capabilities

For EAS builds, iOS needs:

- Push Notifications capability
- Remote notifications background mode

Configure in `app.json`:

```json
"ios": {
  "bundleIdentifier": "com.bal.adminapp",
  "infoPlist": {
    "UIBackgroundModes": ["remote-notification"]
  }
}
```

## Notification Flow

### Foreground Notifications

When the app is running and in focus:

1. FCM message received
2. `onMessage` handler in `App.tsx` triggers
3. Notification parsed and added to state
4. In-app notification badge updates
5. User optionally navigates to content

### Background Notifications

When the app is running but in background:

1. FCM message received
2. Firebase automatically shows notification
3. User taps notification
4. `onNotificationOpenedApp` handler triggers
5. App navigates to relevant screen

### Killed State Notifications

When the app is completely closed:

1. User receives notification in system tray
2. User taps notification
3. App launches
4. `getInitialNotification` retrieves the message
5. App navigates to relevant screen

## Notification Payload Structure

### Example FCM Message

```json
{
  "data": {
    "type": "NEW_BOOKING",
    "bookingId": "BK-001",
    "priority": "HIGH"
  },
  "notification": {
    "title": "New Booking",
    "body": "New booking from Grand Hyatt Hotel"
  }
}
```

### SOS Notification Example

```json
{
  "data": {
    "type": "SOS_RAISED",
    "sosId": "SOS-001",
    "bookingId": "BK-005",
    "priority": "HIGH"
  },
  "notification": {
    "title": "SOS Alert",
    "body": "Vehicle breakdown reported"
  }
}
```

## API Integration

### FCM Token Registration

The app registers the FCM token with the backend:

```typescript
// In App.tsx
const token = await getFCMToken();
await ApiService.registerFCMToken(token, "ADMIN");
```

**Backend Endpoint** (to be implemented):

```
POST /device/register-fcm-token
Body: {
  "token": "string",
  "role": "ADMIN",
  "deviceType": "android|ios",
  "timestamp": "ISO8601"
}
```

### Notification Sync

The app periodically syncs notifications:

```typescript
// GET /notifications - Returns array of Notification objects
const notifications = await ApiService.getNotifications();
```

## Testing

### Local Testing with Firebase Emulator

```bash
# Start Firebase Emulator
firebase emulators:start --only messaging

# Send test notification
firebase messaging:send '{
  "data": {
    "type": "NEW_BOOKING",
    "bookingId": "TEST-001"
  },
  "notification": {
    "title": "Test Notification",
    "body": "This is a test"
  },
  "android": {
    "priority": "high"
  },
  "apns": {
    "headers": {
      "apns-priority": "10"
    }
  }
}'
```

### Testing Different States

#### 1. Foreground Test

1. Launch app
2. Send test notification via Firebase Console
3. Verify notification appears in-app

#### 2. Background Test

1. Launch app
2. Press home button to background
3. Send test notification
4. Verify system notification appears
5. Tap notification
6. Verify app navigates correctly

#### 3. Killed State Test

1. Launch app
2. Close app completely (swipe away)
3. Send test notification
4. Tap notification from lock screen
5. Verify app launches and navigates to correct screen

## Debugging

### Enable Verbose Logging

```typescript
// In App.tsx setupFCM()
import { enableLogging } from "@react-native-firebase/messaging";
enableLogging(true);
```

### Check Token

```typescript
// In App.tsx or via React DevTools
const token = await getFCMToken();
console.log("FCM Token:", token);
```

### Monitor Notifications

Use Firebase Console → Cloud Messaging → Send messages with:

- Target by token
- View delivery reports
- Check message content validation

## Permissions

### Android 13+ (POST_NOTIFICATIONS)

- Automatically requested in `App.tsx`
- User can deny, app still works but notifications won't show
- Handled in `requestNotificationPermission()`

### iOS

- Automatic permission request on first notification
- User can enable/disable in Settings → Notifications

## Best Practices

### 1. Token Management

- Store token securely on backend
- Refresh token periodically (Firebase auto-refreshes)
- Handle token expiration gracefully

### 2. Notification Content

- Keep titles and bodies concise
- Include relevant IDs (bookingId, sosId) in data
- Use high priority for urgent notifications

### 3. Error Handling

- Wrap FCM setup in try-catch
- Log errors for monitoring
- Don't crash app if FCM fails

### 4. Data Privacy

- Don't send sensitive data in notification body
- Use booking/SOS IDs to fetch full details from API
- Encrypt token transmission

## Troubleshooting

### Issue: Notifications not received

**Solutions:**

1. Verify `google-services.json` is in correct location
2. Check Firebase Console → Cloud Messaging → Delivery
3. Ensure app has notification permissions
4. Check logcat/Xcode logs for FCM errors
5. Verify backend is sending to correct token

### Issue: App crashes on startup

**Solutions:**

1. Ensure Firebase dependencies are installed
2. Check TypeScript compilation errors
3. Verify google-services.json is valid JSON
4. Check AndroidManifest.xml permissions

### Issue: Navigation not working on notification tap

**Solutions:**

1. Verify bookingId/sosId in notification data
2. Check navigationRef is properly initialized
3. Ensure routes exist in RootNavigator
4. Test with hardcoded bookingId first

## Production Deployment

### Android

1. Build signed APK/AAB with `google-services.json`
2. Upload to Play Store
3. Configure Firebase App Check (optional but recommended)

### iOS

1. Upload APNs certificate to Firebase
2. Build with EAS: `eas build -p ios --profile production`
3. Submit to App Store
4. Enable push notifications in App Store Connect

## Related Documentation

- [React Native Firebase Messaging](https://rnfirebase.io/messaging/usage)
- [Firebase Cloud Messaging Console](https://console.firebase.google.com)
- [Android Notification Channels](https://developer.android.com/guide/topics/ui/notifiers/notifications)
- [iOS Remote Notification](https://developer.apple.com/documentation/usernotifications)
