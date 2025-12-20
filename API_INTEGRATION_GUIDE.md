# Backend API Integration Summary

## Overview

The admin mobile app (`baladmin`) has been successfully integrated with the backend cab management API. All endpoints now call the real backend instead of using mock data.

## Configuration

### Environment Setup

- Created `.env` file in the baladmin root with `EXPO_PUBLIC_API_BASE_URL`
- Update this URL with your backend deployment URL

**Example:**

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
# or for production:
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api
```

## Authentication

### Auth Store (`src/hooks/useAuthStore.ts`)

Created Zustand-based auth store to manage JWT tokens and user session:

- **accessToken**: JWT token for API requests
- **refreshToken**: Token for refreshing expired sessions
- **user**: Logged-in user details
- Persisted to AsyncStorage for offline support

### Request Interceptor

All API requests automatically include the Bearer token:

```
Authorization: Bearer <accessToken>
```

## Integrated Endpoints

### Dashboard

- **GET /dashboard/bookings-summary** → `getDashboardSummary(from?, to?)`
  - Returns aggregated stats: bookings today, ongoing rides, completed, SOS, revenue
  - Defaults to current day if no date range provided

### Bookings

- **GET /bookings** → `getBookings(filters)`

  - Filters: status, driverId, hotelId, limit, offset
  - Returns paginated booking list

- **GET /bookings/:id** → `getBookingById(bookingId)`

  - Fetch single booking details

- **POST /bookings/:id/assign** → `assignDriver(bookingId, driverId, vehicleId?)`
  - Assign driver to booking, optionally specify vehicle

### Drivers & Dispatch

- **GET /dispatch/available-drivers** → `getAvailableDrivers()`
  - Returns drivers available for assignment

### Notifications & FCM

- **GET /notifications** → `getNotifications(limit?, offset?)`

  - Fetch paginated notifications with defaults (limit: 50, offset: 0)

- **PATCH /notifications/:id/read** → `markNotificationAsRead(notificationId)`

  - Mark single notification as read

- **GET /notifications/unread-count** → `getUnreadNotificationCount()`

  - Get unread notification badge count

- **POST /notifications/register-device** → `registerFCMToken(token)`

  - Register FCM device token (automatically detects ANDROID/IOS platform)

- **DELETE /notifications/unregister-device** → `unregisterFCMToken(token)`
  - Unregister device on logout

## Usage Example

```typescript
import apiService from "@/services/api";
import { useAuthStore } from "@/hooks/useAuthStore";

// Login and set tokens
const login = async (email: string, password: string) => {
  try {
    const response = await axios.post("/auth/login", { email, password });
    useAuthStore
      .getState()
      .login(
        response.data.accessToken,
        response.data.refreshToken,
        response.data.user
      );
  } catch (error) {
    console.error("Login failed", error);
  }
};

// Fetch dashboard data
const loadDashboard = async () => {
  try {
    const summary = await apiService.getDashboardSummary();
    console.log("Bookings today:", summary.newBookingsToday);
  } catch (error) {
    console.error("Failed to load dashboard", error);
  }
};

// Register FCM token
const registerFCM = async (token: string) => {
  await apiService.registerFCMToken(token);
};

// Logout and clean up
const logout = () => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    apiService.unregisterFCMToken(token);
  }
  useAuthStore.getState().logout();
};
```

## Files Modified/Created

### Modified

- `src/services/api.ts` - Replaced mock data with real backend calls

### Created

- `.env` - Environment configuration
- `src/hooks/useAuthStore.ts` - JWT token and auth state management

## Next Steps

1. **Update BASE_URL**: Set `EXPO_PUBLIC_API_BASE_URL` to your backend URL in `.env`
2. **Implement Auth Screen**: Integrate login endpoint to authenticate and store tokens
3. **Handle Token Refresh**: Add refresh token logic to interceptor for expired tokens
4. **Error Handling**: Implement global error handling (401 → redirect to login, etc.)
5. **Testing**: Test each endpoint against your backend to verify data mapping

## Notes

- All endpoints require JWT authentication (except /auth/login)
- Bookmark the [backend API specification](../cab-management/apps/backend/src)
- FCM platform is auto-detected from Platform.OS (iOS/Android)
- Dashboard dates default to today if not specified
- Pagination defaults: limit=50, offset=0
