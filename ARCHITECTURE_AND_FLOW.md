# FCM Architecture & Data Flow

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     CAB MANAGEMENT SYSTEM                       │
│                   Admin Mobile Application                      │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │                  │    │                  │                  │
│  │   App.tsx        │────│   RootNavigator  │                  │
│  │  (FCM Setup)     │    │  (Deep Linking)  │                  │
│  │                  │    │                  │                  │
│  └────────┬─────────┘    └────────┬─────────┘                  │
│           │                       │                            │
│           │ Initialize            │ Navigation                 │
│           │                       │                            │
│  ┌────────▼─────────┐    ┌────────▼─────────┐                  │
│  │  BookingDetails  │    │   NotificationsContext      │       │
│  │  Screen          │    │   (State Mgmt)   │                  │
│  └──────────────────┘    └────────┬─────────┘                  │
│                                   │                            │
│  ┌────────────────────────────────▼──────────────────┐         │
│  │        Notification UI Components                 │         │
│  │  - Badge counter                                  │         │
│  │  - Toast notifications                           │         │
│  │  - Notification list                             │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       Services Layer                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              fcm.ts                                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ • initializeFCM()                                        │  │
│  │ • requestNotificationPermission()                       │  │
│  │ • requestUserPermission()                               │  │
│  │ • getFCMToken()                                         │  │
│  │ • handleForegroundNotification()                        │  │
│  │ • handleBackgroundNotification()                        │  │
│  │ • getInitialNotification()                              │  │
│  │ • subscribeToTopic()                                    │  │
│  │ • unsubscribeFromTopic()                                │  │
│  │ • parseNotificationData()                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           fcmTopics.ts & fcmTesting.ts                  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ • Topic management                                       │  │
│  │ • Notification handler registry                          │  │
│  │ • Testing utilities                                      │  │
│  │ • Mock notification generators                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              api.ts                                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ • registerFCMToken(token, role)                          │  │
│  │ • getNotifications()                                     │  │
│  │ • markNotificationAsRead(id)                             │  │
│  │ • Backend API integration                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Firebase Layer                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Firebase Cloud Messaging (FCM)                  │  │
│  │  (Configured via @react-native-firebase/messaging)      │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                          │                         │
│           │ Token                    │ Messages                │
│           │                          │                         │
│  ┌────────▼──────────────┐  ┌────────▼──────────────┐          │
│  │  Token Management     │  │  Message Delivery    │          │
│  │  - Generate           │  │  - Android           │          │
│  │  - Refresh            │  │  - iOS               │          │
│  │  - Store              │  │  - Foreground        │          │
│  │  - Expire             │  │  - Background        │          │
│  └───────────────────────┘  │  - Killed            │          │
│                             └──────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Backend Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              REST API Endpoints                          │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ POST   /device/register-fcm-token                        │  │
│  │ GET    /notifications                                    │  │
│  │ PUT    /notifications/{id}/read                          │  │
│  │ DELETE /notifications/{id}                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                          │                         │
│           │ Save Token               │ Query/Update            │
│           │                          │                         │
│  ┌────────▼──────────────┐  ┌────────▼──────────────┐          │
│  │  Device Tokens Table  │  │  Notifications Table │          │
│  │  - admin_id           │  │  - notification_id   │          │
│  │  - fcm_token          │  │  - admin_id          │          │
│  │  - device_type        │  │  - type              │          │
│  │  - registered_at      │  │  - title/body        │          │
│  │  - expires_at         │  │  - is_read           │          │
│  └───────────────────────┘  │  - created_at        │          │
│                             └──────────────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Event Triggers (Topic Subscriptions)            │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ • Booking.Created → all-admins, new-bookings            │  │
│  │ • SOS.Raised → sos-alerts, all-admins                   │  │
│  │ • Driver.Assigned → driver-updates                      │  │
│  │ • Ride.Started → relevant-admin                         │  │
│  │ • Ride.Completed → relevant-admin                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### 1. App Startup Flow

```
┌─────────────┐
│   App.tsx   │
│   Startup   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│ initializeFCM()                 │
│ - Initialize Firebase           │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ requestNotificationPermission()  │
│ - Android 13+ permission        │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ requestUserPermission()          │
│ - iOS permission request        │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ getFCMToken()                   │
│ - Generate device token         │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ registerFCMToken(token, 'ADMIN')│
│ - POST /device/register-fcm-token
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Subscribe to Topics             │
│ - all-admins                    │
│ - sos-alerts                    │
│ - new-bookings                  │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Setup Notification Listeners    │
│ - Foreground                    │
│ - Background                    │
│ - Killed state                  │
└─────────────────────────────────┘
```

### 2. Foreground Notification Flow

```
┌──────────────┐
│  Firebase    │ Sends message to device
│  FCM Server  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  App Running in Foreground           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  onMessage Handler (fcm.ts)          │
│  - Receives FirebaseMessaging event  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  parseNotificationData()             │
│  - Extract type, bookingId, priority │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  handleNotification()                │
│  - Update NotificationsContext       │
│  - Add to notification list          │
│  - Show in-app notification          │
└──────┬───────────────────────────────┘
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
   ┌────────┐      ┌──────────┐       ┌──────────┐
   │ Badge  │      │  Toast   │       │  Sound & │
   │ Update │      │  Display │       │ Vibration│
   └────────┘      └──────────┘       └──────────┘
       │                  │                  │
       └──────────────────┴──────────────────┘
                          │
                          ▼
                  ┌──────────────────┐
                  │  User Interaction│
                  │  (Tap Toast/     │
                  │   Tap Badge)     │
                  └──────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Navigate to Screen   │
              │ - BookingDetails     │
              │ - Bookings (SOS)     │
              └──────────────────────┘
```

### 3. Background Notification Flow

```
┌──────────────┐
│  Firebase    │ Sends message to device
│  FCM Server  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  App in Background                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Firebase Auto-Display              │
│  - System Notification Tray          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  User Taps Notification              │
│  - From system tray                  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  onNotificationOpenedApp Handler     │
│  (fcm.ts)                            │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  App Comes to Foreground             │
│  - Process notification data         │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Navigate to Relevant Screen         │
│  - BookingDetails with bookingId     │
└──────────────────────────────────────┘
```

### 4. Killed State Notification Flow

```
┌──────────────┐
│  Firebase    │ Sends message to device
│  FCM Server  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  App Killed/Terminated               │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Firebase Auto-Display              │
│  - System Notification Tray          │
│  - Lock screen                       │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  User Taps Notification              │
│  - From lock screen                  │
│  - Or notification tray              │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  App Launch with Intent              │
│  - onCreate() called                 │
│  - App initialization                │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  App.tsx setupFCM()                  │
│  - Initialize Firebase               │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  getInitialNotification()             │
│  (fcm.ts)                            │
│  - Retrieve notification that opened │
│    the app                           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  handleNotification()                │
│  - Process notification data         │
│  - Prepare navigation                │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  NavigationContainerRef              │
│  - Navigate to target screen         │
│  - e.g., BookingDetails              │
└──────────────────────────────────────┘
```

### 5. Token Registration Flow

```
┌──────────────┐
│  Mobile App  │
│  getFCMToken │
└──────┬───────┘
       │ Token: "d7GIqX4k..."
       ▼
┌──────────────────────────────────┐
│  Backend API                     │
│  POST /device/register-fcm-token │
├──────────────────────────────────┤
│ {                                │
│   token: "d7GIqX4k...",         │
│   role: "ADMIN",                 │
│   deviceType: "android"          │
│ }                                │
└──────┬──────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Validate Token                  │
│  - Check format                  │
│  - Verify authenticity           │
└──────┬──────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Database                        │
│  INSERT device_tokens            │
│  - Store token                   │
│  - Associate with admin          │
│  - Set expiration                │
└──────┬──────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Subscribe to Topics             │
│  - all-admins                    │
│  - sos-alerts                    │
│  - etc.                          │
└──────┬──────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Response to Mobile              │
│  {                               │
│    success: true,                │
│    message: "Token registered"   │
│  }                               │
└──────────────────────────────────┘
```

### 6. Notification Sync Flow

```
┌─────────────────────────────────┐
│  Mobile App                     │
│  useNotificationsContext()      │
│  refresh() called               │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Backend API                    │
│  GET /notifications             │
│  ?limit=50&offset=0             │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Database Query                 │
│  SELECT * FROM notifications    │
│  WHERE admin_id = ? AND         │
│        is_deleted = false        │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Response                       │
│  {                              │
│    notifications: [             │
│      {                          │
│        id: "N001",              │
│        type: "NEW_BOOKING",     │
│        title: "...",            │
│        isRead: false,           │
│        ...                      │
│      }                          │
│    ],                           │
│    total: 145,                  │
│    unreadCount: 3               │
│  }                              │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Update NotificationsContext    │
│  - setNotifications(data)       │
│  - Update unreadCount           │
│  - Update badge                 │
└─────────────────────────────────┘
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      App.tsx                                 │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ setupFCM()                                             │ │
│ │ - Initializes all FCM functionality                   │ │
│ │ - Sets up all listeners and handlers                  │ │
│ └────────────────────────────────────────────────────────┘ │
└──────────┬───────────────────────────────┬──────────────────┘
           │                               │
           ▼                               ▼
    ┌──────────────┐          ┌────────────────────┐
    │  fcm.ts      │          │ RootNavigator.tsx  │
    │              │          │                    │
    │ • Init       │          │ • Define routes    │
    │ • Permissions│          │ • Handle deep link │
    │ • Listeners  │          └────────────────────┘
    │ • Token mgmt │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────┐
    │ NotificationsContext │
    │                      │
    │ • State management   │
    │ • Add notification   │
    │ • Mark as read       │
    │ • Refresh list       │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ BookingDetailsScreen │
    │                      │
    │ • Display booking    │
    │ • SOS handling       │
    └──────────────────────┘
```

---

## Sequence Diagram: New Booking Notification

```
Mobile App              Firebase            Backend
    │                      │                   │
    │                      │                   │
    │                      │  Event: Booking   │
    │                      │  Created          │
    │                      │ ◄──────────────────┤
    │                      │                   │
    │                      │ Queue Message     │
    │                      │ ──────────────────►│
    │                      │                   │
    │                      │ Build FCM Message │
    │                      │ ◄──────────────────┤
    │                      │                   │
    │ Receive Message      │                   │
    │ ◄──────────────────────────────────────┤ │
    │                      │                   │
    │ Parse Notification   │                   │
    │ ─────┐               │                   │
    │      │ (process)     │                   │
    │ ─────┘               │                   │
    │                      │                   │
    │ Add to Context       │                   │
    │ ─────┐               │                   │
    │      │ (update state)│                   │
    │ ─────┘               │                   │
    │                      │                   │
    │ Display Toast        │                   │
    │ ─────┐               │                   │
    │      │ (in-app)      │                   │
    │ ─────┘               │                   │
    │                      │                   │
    │ Sync Notifications   │                   │
    │ ──────────────────────────────────────►  │
    │                      │                   │
    │                      │ Query Database    │
    │                      │ ◄──────────────────┤
    │                      │                   │
    │ Receive List         │                   │
    │ ◄──────────────────────────────────────  │
    │                      │                   │
    │ Update UI            │                   │
    │ (notification list)  │                   │
```

---

## State Management Flow

```
NotificationsContext
  │
  ├─ notifications: Notification[]
  │  │ From FCM handler: addNotification()
  │  │ From API: refresh()
  │  └─ Updated on every new notification
  │
  ├─ unreadCount: number
  │  │ Calculated from notifications
  │  └─ Used for badge display
  │
  ├─ refresh(): Promise<void>
  │  │ Calls API.getNotifications()
  │  └─ Updates notifications state
  │
  ├─ addNotification(n: Notification): void
  │  │ Called from FCM handler in App.tsx
  │  └─ Adds to beginning of list
  │
  └─ markAsRead(id: string): Promise<void>
     │ Updates local state
     │ Calls API to persist
     └─ Decrements unreadCount
```

---

## Error Handling Flow

```
┌─────────────────────────────┐
│  Try Operation              │
└──────┬──────────────────────┘
       │
       ├─ Success ──────┐
       │                │
       │ Error ─┐       │
       │        │       │
       ▼        ▼       ▼
   Continue  Log    Retry/Fallback
   Normal    Error  (exponential backoff)
   Operation        │
                    ├─ Network error
                    ├─ Invalid token
                    ├─ Permission denied
                    └─ Handle gracefully
```

---

## Notification Priority & Routing

```
Incoming Notification
       │
       ▼
   Parse Data
       │
       ├─ Type: NEW_BOOKING
       │  Priority: MEDIUM
       │  └─ Route to handleNewBooking()
       │
       ├─ Type: SOS_RAISED
       │  Priority: HIGH
       │  └─ Route to handleSOSAlert()
       │     ├─ Show urgent banner
       │     └─ Navigate immediately
       │
       ├─ Type: DRIVER_ASSIGNED
       │  Priority: MEDIUM
       │  └─ Route to handleDriverAssigned()
       │
       └─ Type: SYSTEM_ALERT
          Priority: HIGH
          └─ Show system-level notification
```

---

This architecture ensures:

- ✅ Reliable message delivery across all app states
- ✅ Proper state management with React Context
- ✅ Deep linking to relevant screens
- ✅ Graceful error handling
- ✅ Efficient notification synchronization
- ✅ User-friendly notification experience
