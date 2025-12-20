# Backend API Integration Guide for FCM

## Overview

This guide describes the backend APIs required to fully integrate FCM push notifications with the Admin Mobile App.

## API Endpoints

### 1. Device Token Registration

#### Endpoint

```
POST /device/register-fcm-token
```

#### Request Body

```json
{
  "token": "d7GIqX4kjahf7Dah...",
  "role": "ADMIN",
  "deviceType": "android|ios",
  "timestamp": "2025-01-01T10:00:00Z"
}
```

#### Response (Success)

```json
{
  "success": true,
  "message": "Token registered successfully",
  "data": {
    "deviceId": "DEV-001",
    "role": "ADMIN",
    "registeredAt": "2025-01-01T10:00:00Z"
  }
}
```

#### Response (Error)

```json
{
  "success": false,
  "message": "Invalid token",
  "error": "TOKEN_INVALID"
}
```

#### Implementation Notes

- Store token with user/admin account
- Update existing token if admin already registered
- Set token expiration (typically 1 month)
- Track device type for platform-specific notifications
- Log registration for audit trail

#### Database Schema

```sql
CREATE TABLE device_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    admin_id BIGINT NOT NULL,
    fcm_token VARCHAR(512) NOT NULL,
    device_type ENUM('android', 'ios') NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(id),
    UNIQUE(fcm_token),
    INDEX(admin_id),
    INDEX(expires_at)
);
```

---

### 2. Send Notification to Device

#### Internal Endpoint (Backend to Firebase)

```
POST /notification/send-fcm
(Internal use only - not called from mobile app)
```

#### Request Body

```json
{
  "token": "d7GIqX4kjahf7Dah...",
  "title": "New Booking",
  "body": "Booking BK-001 created",
  "data": {
    "type": "NEW_BOOKING",
    "bookingId": "BK-001",
    "priority": "HIGH"
  },
  "android": {
    "priority": "high"
  },
  "apns": {
    "headers": {
      "apns-priority": "10"
    }
  }
}
```

#### Firebase Admin SDK Implementation (Node.js)

```javascript
const admin = require("firebase-admin");

async function sendFCMNotification(token, message) {
  try {
    const response = await admin.messaging().send({
      token: token,
      notification: {
        title: message.title,
        body: message.body,
      },
      data: message.data || {},
      android: {
        priority: message.priority || "high",
        notification: {
          icon: "ic_launcher",
          color: "#2563eb",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            alert: {
              title: message.title,
              body: message.body,
            },
            sound: "default",
            badge: 1,
          },
        },
      },
    });

    console.log("Notification sent:", response);
    return response;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
}
```

---

### 3. Get Notifications

#### Endpoint

```
GET /notifications?limit=50&offset=0&unread=true
```

#### Query Parameters

- `limit` (optional, default: 50) - Number of notifications to return
- `offset` (optional, default: 0) - Pagination offset
- `unread` (optional) - Filter by read status (true/false)
- `type` (optional) - Filter by notification type

#### Response (Success)

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "N001",
        "type": "NEW_BOOKING",
        "title": "New Booking",
        "body": "Booking BK-001 created",
        "bookingId": "BK-001",
        "isRead": false,
        "createdAt": "2025-01-01T10:00:00Z",
        "priority": "HIGH"
      },
      {
        "id": "N002",
        "type": "SOS_RAISED",
        "title": "SOS Alert",
        "body": "Vehicle breakdown reported",
        "bookingId": "BK-005",
        "isRead": true,
        "createdAt": "2025-01-01T09:30:00Z",
        "priority": "HIGH"
      }
    ],
    "total": 145,
    "unreadCount": 3,
    "limit": 50,
    "offset": 0
  }
}
```

#### Implementation Notes

- Return notifications in reverse chronological order
- Include unread count for badge updates
- Support filtering by type and status
- Cache frequently accessed data
- Implement pagination for performance

#### Database Schema

```sql
CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    admin_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    booking_id VARCHAR(50),
    sos_id VARCHAR(50),
    data JSON,
    priority ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id),
    INDEX(admin_id),
    INDEX(created_at),
    INDEX(is_read),
    INDEX(type)
);
```

---

### 4. Mark Notification as Read

#### Endpoint

```
PUT /notifications/{notificationId}/read
```

#### Request Body (Optional)

```json
{
  "readAt": "2025-01-01T10:05:00Z"
}
```

#### Response (Success)

```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": "N001",
    "isRead": true,
    "readAt": "2025-01-01T10:05:00Z"
  }
}
```

#### Implementation Notes

- Update only if notification belongs to authenticated admin
- Track read timestamp for analytics
- Support batch marking (optional enhancement)
- Return updated notification count

---

### 5. Mark All Notifications as Read

#### Endpoint

```
PUT /notifications/read-all
```

#### Request Body (Optional)

```json
{
  "type": "NEW_BOOKING" // Optional: filter by type
}
```

#### Response (Success)

```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 15,
    "unreadCount": 0
  }
}
```

---

### 6. Delete Notification

#### Endpoint

```
DELETE /notifications/{notificationId}
```

#### Response (Success)

```json
{
  "success": true,
  "message": "Notification deleted",
  "data": {
    "id": "N001",
    "deletedAt": "2025-01-01T10:10:00Z"
  }
}
```

#### Implementation Notes

- Soft delete for audit trail (recommended)
- Only allow deletion by notification owner
- Support batch deletion (optional)

---

### 7. Subscribe to Topic

#### Internal Endpoint (Backend to Firebase)

```
POST /notification/topic/subscribe
(Internal use only)
```

#### Request Body

```json
{
  "tokens": ["token1", "token2", "..."],
  "topic": "all-admins"
}
```

#### Firebase Admin SDK Implementation

```javascript
async function subscribeToTopic(tokens, topic) {
  try {
    const response = await admin.messaging().subscribeToTopic(tokens, topic);
    console.log(`Successfully subscribed to topic ${topic}:`, response);
    return response;
  } catch (error) {
    console.error(`Error subscribing to topic ${topic}:`, error);
    throw error;
  }
}
```

---

### 8. Send Notification to Topic

#### Internal Endpoint (Backend to Firebase)

```
POST /notification/send-topic
(Internal use only)
```

#### Request Body

```json
{
  "topic": "all-admins",
  "title": "System Maintenance",
  "body": "Server maintenance scheduled for 2:00 AM",
  "data": {
    "type": "SYSTEM_ALERT",
    "severity": "HIGH"
  }
}
```

#### Firebase Admin SDK Implementation

```javascript
async function sendToTopic(topic, message) {
  try {
    const response = await admin.messaging().send({
      topic: topic,
      notification: {
        title: message.title,
        body: message.body,
      },
      data: message.data || {},
      android: {
        priority: "high",
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
      },
    });

    console.log("Topic message sent:", response);
    return response;
  } catch (error) {
    console.error("Error sending to topic:", error);
    throw error;
  }
}
```

---

## Event-Based Notifications

### Triggers for Automatic Notifications

#### 1. New Booking Created

```
Event: Booking.Created
Notification Type: NEW_BOOKING
Trigger: When booking is created
Recipients: All admins subscribed to 'new-bookings' topic
Payload:
{
  "type": "NEW_BOOKING",
  "bookingId": "BK-001",
  "hotelName": "Grand Hyatt",
  "customerName": "John Doe",
  "priority": "MEDIUM"
}
```

#### 2. SOS Raised

```
Event: SOS.Raised
Notification Type: SOS_RAISED
Trigger: Immediately when SOS is triggered
Recipients: All admins + driver-specific admins
Payload:
{
  "type": "SOS_RAISED",
  "bookingId": "BK-005",
  "sosId": "SOS-001",
  "sosMessage": "Vehicle breakdown",
  "priority": "HIGH"
}
```

#### 3. Driver Assigned

```
Event: Booking.DriverAssigned
Notification Type: DRIVER_ASSIGNED
Trigger: When driver is assigned to booking
Recipients: Relevant admins
Payload:
{
  "type": "DRIVER_ASSIGNED",
  "bookingId": "BK-001",
  "driverId": "DRV-001",
  "driverName": "John Smith",
  "priority": "MEDIUM"
}
```

#### 4. Ride Started

```
Event: Ride.Started
Notification Type: RIDE_STARTED
Trigger: When driver starts the ride
Recipients: Assigned admin
Payload:
{
  "type": "RIDE_STARTED",
  "bookingId": "BK-001",
  "driverId": "DRV-001",
  "priority": "LOW"
}
```

#### 5. Ride Completed

```
Event: Ride.Completed
Notification Type: RIDE_COMPLETED
Trigger: When ride is completed
Recipients: Assigned admin
Payload:
{
  "type": "RIDE_COMPLETED",
  "bookingId": "BK-001",
  "duration": "25 minutes",
  "distance": "12.5 km",
  "priority": "LOW"
}
```

---

## Implementation Workflow

### Backend Sequence Diagram

```
┌─────────────────┐
│   Mobile App    │
└────────┬────────┘
         │ (1) registerFCMToken
         ▼
┌──────────────────┐
│ Backend Server   │
└────────┬─────────┘
         │ (2) Store token
         │ (3) Subscribe to topics
         │
         │ When booking created:
         │ (4) Generate notification
         │ (5) Send via Firebase
         │
         ▼
┌──────────────────┐
│  Firebase FCM    │
└────────┬─────────┘
         │
         │ (6) Deliver to device
         ▼
┌────────────────────┐
│ Mobile App         │
│ (receives & handles)
└────────────────────┘
```

---

## Error Handling

### Common FCM Errors

```javascript
// Invalid registration token
{
  "error": "INVALID_ARGUMENT",
  "message": "Invalid registration token provided"
}

// Token expired or revoked
{
  "error": "REGISTRATION_TOKEN_NOT_REGISTERED",
  "message": "Registration token is not registered"
}

// Device has uninstalled the app
{
  "error": "NOT_FOUND",
  "message": "An error occurred while communicating with the device"
}
```

### Handling Strategies

1. **Invalid/Expired Token**: Delete from database and prompt user to re-register
2. **Rate Limiting**: Implement exponential backoff for retries
3. **Network Errors**: Queue notifications and retry with exponential backoff
4. **Invalid Payload**: Log and skip, continue processing

---

## Security Considerations

### 1. Token Validation

- Validate token format before storage
- Implement token versioning for rotation
- Set token expiration periods

### 2. Authentication

- Require valid JWT/auth token for all endpoints
- Verify token belongs to authenticated user
- Log all access for audit trail

### 3. Rate Limiting

- Limit token registrations per admin
- Limit notification sends per period
- Implement per-IP rate limiting

### 4. Data Privacy

- Hash tokens in logging
- Don't expose tokens in error messages
- Encrypt tokens in database (optional)
- Implement automatic token rotation

### 5. Notification Payload

- Validate data payload structure
- Sanitize text fields
- Limit payload size
- Validate notification types

---

## Monitoring and Analytics

### Metrics to Track

1. **Delivery Rate**: % of notifications delivered
2. **Read Rate**: % of delivered notifications read
3. **Engagement Rate**: % of users who act on notifications
4. **Error Rate**: % of failed notifications
5. **Device Statistics**: Active devices by platform

### Logging

```javascript
// Log notification send
logger.info("FCM notification sent", {
  notificationId: "N001",
  adminId: "ADM-001",
  type: "NEW_BOOKING",
  timestamp: new Date(),
  status: "sent",
});

// Log delivery error
logger.error("FCM delivery failed", {
  notificationId: "N001",
  token: "xxx...", // hashed
  error: "INVALID_ARGUMENT",
  timestamp: new Date(),
});
```

---

## Testing

### Unit Tests

```javascript
describe("FCM Notifications", () => {
  test("should register device token", async () => {
    const response = await request(app)
      .post("/device/register-fcm-token")
      .send({
        token: "test-token",
        role: "ADMIN",
        deviceType: "android",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("should send notification to device", async () => {
    const response = await sendFCMNotification("test-token", {
      title: "Test",
      body: "Test message",
      data: { type: "TEST" },
    });

    expect(response).toBeDefined();
  });

  test("should handle invalid token", async () => {
    const response = await sendFCMNotification("invalid-token", {
      title: "Test",
      body: "Test message",
    });

    expect(response).toThrow();
  });
});
```

---

## References

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Cloud Messaging API](https://firebase.google.com/docs/cloud-messaging)
- [Notification Payloads](https://firebase.google.com/docs/cloud-messaging/concept-options)
