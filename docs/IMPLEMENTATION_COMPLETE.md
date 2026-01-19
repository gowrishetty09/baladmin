# Admin Mobile App - Complete Implementation Guide

## ✅ Implementation Summary

The admin mobile app (baladmin) has been fully integrated with the backend cab management API following the bal-customer app patterns and best practices.

## Files Created/Updated

### Core API & Authentication
- **`src/services/api.ts`** — HTTP client with token refresh logic and all backend endpoints
- **`src/hooks/useAuthStore.ts`** — AuthContext for managing JWT tokens and user session (SecureStore persisted)
- **`src/hooks/useAuth.ts`** — useAuth hook wrapper for easy access to auth context
- **`src/utils/index.ts`** — Error handling and formatting utilities
- **`src/screens/LoginScreen.tsx`** — Login UI with email/password form
- **`src/types/index.ts`** — Added Admin user type interface

### Configuration
- **`.env`** — Environment variables with BASE_URL

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Application Layer                       │
│  (Screens, Navigation, Components)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                    AuthContext Provider                      │
│  (useAuthStore.ts - manages tokens, user, session)         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│               API Service Layer (api.ts)                     │
│  - Auth endpoints (login, refresh, me)                      │
│  - Dashboard endpoints                                       │
│  - Bookings endpoints                                       │
│  - Notifications & FCM endpoints                            │
│  - Drivers & Dispatch endpoints                             │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│           Axios HTTP Client with Interceptors               │
│  - Automatic Bearer token injection                         │
│  - Token refresh logic (401 handling)                       │
│  - Request/response error handling                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
              Backend API Server
         (http://localhost:3000/api)
```

## Token Management Flow

### Initial Login
```
1. User enters email/password → LoginScreen
2. Login screen calls → useAuthContext.login(email, password)
3. AuthContext calls → apiService.loginAdmin(email, password)
4. API Service → POST /auth/login
5. Response includes: accessToken, refreshToken, accessTokenExpiresAt, user
6. AuthContext stores tokens in SecureStore (encrypted)
7. setAuthToken() sets Authorization header for future requests
```

### Token Refresh (Automatic)
```
1. Request to API fails with 401 Unauthorized
2. HTTP Interceptor catches 401 response
3. If refresh token exists, calls onRefreshToken handler
4. AuthContext calls → apiService.refreshAdminToken(refreshToken)
5. API Service → POST /auth/refresh
6. New tokens received, stored, and Authorization header updated
7. Original request retried with new token
```

### Logout
```
1. User calls → useAuthContext.logout()
2. Clears SecureStore
3. Sets tokens to null
4. Removes Authorization header
5. Navigation redirects to LoginScreen
```

## Setup Instructions

### 1. Wrap App with AuthProvider

Update your root navigation or App.tsx:

```tsx
import { AuthProvider } from './src/hooks/useAuthStore';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
```

### 2. Update Navigation to Include LoginScreen

In your RootNavigator.tsx:

```tsx
import { useAuthContext } from '../hooks/useAuthStore';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/HomeScreen';

export default function RootNavigator() {
  const { isAuthenticated, isInitializing } = useAuthContext();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator>
      {!isAuthenticated ? (
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <Stack.Screen 
          name="Home" 
          component={DashboardScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
```

### 3. Update Environment Configuration

In `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
# For production:
# EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api
```

## Usage Examples

### Login Screen Usage

```tsx
import useAuth from '../hooks/useAuth';

function MyComponent() {
  const { login, isAuthenticated, user } = useAuth();
  
  const handleLogin = async () => {
    try {
      await login('admin@example.com', 'password123');
      // User is now authenticated
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  return (
    <View>
      {isAuthenticated && <Text>Welcome, {user?.name}</Text>}
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}
```

### Using API Service

```tsx
import apiService from '../services/api';

async function loadDashboard() {
  try {
    const summary = await apiService.getDashboardSummary();
    console.log('Bookings:', summary.newBookingsToday);
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

async function getBookings() {
  try {
    const bookings = await apiService.getBookings({
      status: 'PENDING',
      limit: 20,
      offset: 0
    });
    return bookings;
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
  }
}

async function assignDriver() {
  try {
    const booking = await apiService.assignDriver(
      'booking-id-123',
      'driver-id-456'
    );
    return booking;
  } catch (error) {
    console.error('Failed to assign driver:', error);
  }
}
```

### Fetch Current Admin on App Load

```tsx
import apiService from '../services/api';
import { useAuthContext } from '../hooks/useAuthStore';

useEffect(() => {
  const fetchProfile = async () => {
    try {
      const adminUser = await apiService.fetchCurrentAdmin();
      console.log('Current admin:', adminUser);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };
  
  if (isAuthenticated) {
    fetchProfile();
  }
}, [isAuthenticated]);
```

## API Endpoints

All endpoints require Bearer token authentication (except /auth/login).

### Authentication
- `POST /auth/login` → Login admin
- `POST /auth/refresh` → Refresh access token
- `GET /auth/me` → Get current admin profile

### Dashboard
- `GET /dashboard/bookings-summary?from=ISO&to=ISO` → Dashboard summary

### Bookings
- `GET /bookings?status=&driverId=&limit=&offset=` → List bookings
- `GET /bookings/:id` → Get booking detail
- `POST /bookings/:id/assign` → Assign driver to booking

### Notifications
- `GET /notifications?limit=&offset=` → List notifications
- `PATCH /notifications/:id/read` → Mark as read
- `GET /notifications/unread-count` → Get unread count
- `POST /notifications/register-device` → Register FCM token
- `DELETE /notifications/unregister-device` → Unregister FCM token

### Dispatch
- `GET /dispatch/available-drivers` → Get available drivers

## Error Handling

The app automatically handles common errors:

- **401 Unauthorized** → Attempts token refresh, then logs out if failed
- **Network errors** → Displayed to user via error messages
- **Invalid credentials** → Shows friendly error message

Custom error handling in components:

```tsx
import { getErrorMessage } from '../utils';

try {
  await apiService.getBookings();
} catch (error) {
  const message = getErrorMessage(error, 'Failed to load bookings');
  Alert.alert('Error', message);
}
```

## FCM Integration

When you receive FCM tokens, register them:

```tsx
import apiService from '../services/api';

// On app startup or token refresh
const fcmToken = await getFCMToken(); // from Firebase
await apiService.registerFCMToken(fcmToken);
```

On logout:

```tsx
const { logout } = useAuthContext();

const handleLogout = async () => {
  const fcmToken = await getFCMToken();
  await apiService.unregisterFCMToken(fcmToken);
  await logout();
};
```

## Security Notes

1. **Tokens are stored securely** in expo-secure-store (encrypted)
2. **Refresh tokens** are kept in memory and only persisted if needed
3. **Authorization header** is auto-injected on all requests
4. **401 errors trigger automatic logout** to prevent stale tokens
5. **Sensitive operations** require valid JWT token

## Testing

### Test Login
```
Email: admin@example.com
Password: testpassword123

(Credentials from backend bootstrap)
```

### Test Navigation
1. App starts → shows LoginScreen if not authenticated
2. Enter credentials → redirects to Dashboard/HomeScreen
3. Close app → reopens to Dashboard (session restored)
4. Logout → redirects back to LoginScreen

## Troubleshooting

### Issue: 401 Unauthorized errors
**Solution:** Check if tokens exist, refresh manually or logout and login again

### Issue: Network errors
**Solution:** Verify BASE_URL in .env points to correct backend server

### Issue: Login fails with invalid credentials
**Solution:** Ensure admin account exists in backend with correct email/password

### Issue: Session not persisting
**Solution:** Ensure expo-secure-store is installed and SecureStore.getItemAsync works on device

## Next Steps

1. ✅ Integrate LoginScreen into RootNavigator
2. ✅ Wrap app with AuthProvider
3. ✅ Update .env with production API URL when ready
4. ✅ Implement home/dashboard screen
5. ✅ Add FCM token registration on app startup
6. ✅ Test complete login/logout flow
7. ✅ Test API calls with real backend
8. ✅ Add error boundaries for better error handling
9. ✅ Implement proper loading states across app

## Reference Structure (bal-customer app)

The implementation follows the proven pattern from bal-customer app:
- AuthContext for state management (not Redux)
- SecureStore for token persistence
- Axios HTTP client with interceptors
- Error handling utilities
- Re-usable auth hooks

