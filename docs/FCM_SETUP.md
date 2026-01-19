# FCM Setup Instructions

## Quick Start Checklist

### 1. Firebase Project Setup

- [ ] Create Firebase project at [firebase.google.com](https://firebase.google.com)
- [ ] Add Android app to Firebase project
- [ ] Add iOS app to Firebase project
- [ ] Enable Cloud Messaging in Firebase Console

### 2. Android Setup

#### 2.1 Download google-services.json

1. Go to Firebase Console → Project Settings
2. Click on your Android app
3. Download `google-services.json`
4. Place in project root: `./google-services.json`

#### 2.2 Verify Android Configuration

Check `android/build.gradle`:

```gradle
buildscript {
    repositories {
        // ... existing repos
        mavenCentral()
    }
    dependencies {
        // ... existing dependencies
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

Check `android/app/build.gradle`:

```gradle
apply plugin: 'com.android.application'
apply plugin: 'org.jetbrains.kotlin.android'
apply plugin: 'com.facebook.react'
apply plugin: 'com.google.gms.google-services' // Add this line
```

#### 2.3 Verify AndroidManifest.xml

File: `android/app/src/main/AndroidManifest.xml`

Should contain:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="com.google.android.c2dm.permission.RECEIVE" />

    <application>
        <!-- ... -->
    </application>
</manifest>
```

### 3. iOS Setup

#### 3.1 Download GoogleService-Info.plist

1. Go to Firebase Console → Project Settings
2. Click on your iOS app
3. Download `GoogleService-Info.plist`
4. Place in project root: `./GoogleService-Info.plist`

#### 3.2 Configure APNs

1. Go to Firebase Console → Cloud Messaging
2. Upload Apple Push Notification certificate or key
   - Option A: Upload .p8 key from Apple Developer
   - Option B: Upload .p12 certificate

#### 3.3 Enable Push Notifications Capability

The app.json already has this configured, but verify in iOS provisioning profile:

- Enable "Push Notifications" capability
- Add "Background Modes" → "Remote notifications"

### 4. Project Dependencies

```bash
# Install dependencies
npm install
# or
yarn install

# This should install:
# - @react-native-firebase/app
# - @react-native-firebase/messaging
```

Verify in `package.json`:

```json
{
  "dependencies": {
    "@react-native-firebase/app": "^21.1.0",
    "@react-native-firebase/messaging": "^21.1.0"
  }
}
```

### 5. Environment Setup

#### For Development Build

```bash
# Clear cache
rm -rf node_modules
rm package-lock.json
npm install

# Build development APK (Android)
npm run android

# Build development app (iOS)
npm run ios
```

#### For EAS Build

```bash
# Login to EAS
eas login

# Build for Android
eas build -p android --profile development

# Build for iOS
eas build -p ios --profile development
```

### 6. Verify Installation

#### Test Token Generation

1. Run the app
2. Open React Native debugger
3. Check console logs for "FCM Token:" message
4. Verify token is 152+ characters long

Example output:

```
FCM Token: d7GIqX4kjahf7Dah...long_token_string...
```

#### Test Permissions

- **Android 13+**: App should show notification permission dialog on first launch
- **iOS**: App should show notification permission dialog on first launch

### 7. Backend Integration

#### Token Registration Endpoint (To Implement)

```
POST /device/register-fcm-token
Content-Type: application/json

{
  "token": "d7GIqX4kjahf7Dah...",
  "role": "ADMIN",
  "deviceType": "android|ios",
  "timestamp": "2025-01-01T10:00:00Z"
}

Response:
{
  "success": true,
  "message": "Token registered successfully"
}
```

#### Send Test Notification (Firebase Console)

1. Go to Cloud Messaging in Firebase Console
2. Click "Send first message"
3. Create notification:

   ```
   Title: Test Notification
   Body: FCM is working!

   Data:
   type: NEW_BOOKING
   bookingId: BK-TEST-001
   priority: MEDIUM
   ```

4. Select "Send to a device" and paste the FCM token
5. Send and verify notification appears

### 8. Testing Notifications

#### Foreground Test

1. Launch app
2. Send notification from Firebase Console
3. Verify in-app notification appears
4. Check console logs for notification data

#### Background Test

1. Launch app
2. Minimize app (don't close)
3. Send notification from Firebase Console
4. Verify system notification appears
5. Tap notification
6. Verify app navigates to BookingDetails screen

#### Killed State Test

1. Launch app
2. Kill app completely (Android: swipe from recents, iOS: force quit)
3. Send notification from Firebase Console
4. Tap notification from lock screen
5. Verify app launches
6. Verify app navigates to BookingDetails screen

### 9. Production Deployment

#### Android Play Store

1. Build signed APK/AAB
2. Ensure google-services.json is included
3. Upload to Play Console
4. Configure Firebase App Check (optional)

#### iOS App Store

1. Build with EAS: `eas build -p ios --profile production`
2. Ensure GoogleService-Info.plist is included
3. Upload to App Store Connect
4. Configure push notifications in certificate settings

### 10. Troubleshooting

#### Issue: "google-services.json not found"

**Solution:**

- Verify file exists at project root
- Check file name spelling (case-sensitive)
- Ensure it's valid JSON

#### Issue: "GoogleService-Info.plist not found"

**Solution:**

- Verify file exists at project root
- Check file name spelling (case-sensitive)
- Verify APNs certificate is configured in Firebase

#### Issue: Permission denied on Android

**Solution:**

- Update to Android 13+
- Grant POST_NOTIFICATIONS permission
- Check AndroidManifest.xml has correct permissions

#### Issue: No notifications on iOS

**Solution:**

- Verify APNs certificate/key uploaded to Firebase
- Check notification permission is granted
- Verify iOS app ID matches Bundle ID

#### Issue: Navigation not working

**Solution:**

- Verify bookingId is in notification data
- Check BookingDetails screen exists in RootNavigator
- Test with hardcoded bookingId first

### 11. Documentation Files

- `FCM_IMPLEMENTATION.md` - Complete implementation guide
- `src/services/fcm.ts` - Core FCM service
- `src/services/fcmTopics.ts` - Topic management and handlers
- `src/services/fcmTesting.ts` - Testing utilities

### 12. Code Files Modified

- `package.json` - Added Firebase dependencies
- `app.json` - Added Firebase plugins and configuration
- `eas.json` - Updated build configuration
- `App.tsx` - Added FCM initialization and notification handling
- `src/services/api.ts` - Added registerFCMToken method
- `src/hooks/NotificationsContext.tsx` - Enhanced with FCM support
- `src/navigation/RootNavigator.tsx` - Added deep linking support

## Next Steps

1. **Configure Backend**

   - Implement `/device/register-fcm-token` endpoint
   - Implement `/notifications` endpoint for sync
   - Implement server-side notification sending

2. **Implement Notification Handling**

   - Register notification type handlers in App.tsx
   - Implement SOS notification logic
   - Add sound/vibration preferences

3. **Add Advanced Features**

   - Notification categories and priorities
   - Delivery confirmation tracking
   - Rich notifications with images
   - Deep linking with query parameters

4. **Monitor and Debug**
   - Enable Firebase Analytics
   - Monitor delivery rates
   - Track user engagement
   - Set up error logging

## Support Resources

- [React Native Firebase Docs](https://rnfirebase.io/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Android Notifications](https://developer.android.com/guide/topics/ui/notifiers/notifications)
- [iOS UserNotifications](https://developer.apple.com/documentation/usernotifications)
