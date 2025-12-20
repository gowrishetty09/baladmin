# Quick Start Guide - Admin Mobile App Integration

## What Was Implemented

✅ **Complete API Integration** with backend cab management system  
✅ **Authentication System** with JWT tokens and refresh logic  
✅ **Auth Context** for token/user management (SecureStore persisted)  
✅ **Login Screen** ready to use  
✅ **All Backend Endpoints** connected and ready  
✅ **Error Handling** with automatic 401 token refresh  
✅ **FCM Support** for push notifications  

## 1-Minute Setup

### Step 1: Install Dependencies (if not already done)
```bash
npx expo install expo-secure-store axios
```

### Step 2: Update Your App Root Component

**Before:**
```tsx
export default function App() {
  return <RootNavigator />;
}
```

**After:**
```tsx
import { AuthProvider } from './src/hooks/useAuthStore';

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
```

### Step 3: Update RootNavigator

Add LoginScreen to your navigation:

```tsx
import { useAuthContext } from '../hooks/useAuthStore';
import LoginScreen from '../screens/LoginScreen';
import DashboardStack from './DashboardStack'; // your existing screens

export default function RootNavigator() {
  const { isAuthenticated, isInitializing } = useAuthContext();

  if (isInitializing) {
    return <SplashScreen />; // loading screen
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
          name="Dashboard" 
          component={DashboardStack}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
```

### Step 4: Set Environment Variables

Update `.env`:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

For production:
```env
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api
```

## That's It! 🎉

Your app now has:

- ✅ Login/Logout
- ✅ Auto token refresh
- ✅ Secure token storage
- ✅ All API endpoints ready to use
- ✅ Session persistence across app restarts
- ✅ Error handling for auth failures

## Using the API in Your Screens

```tsx
import apiService from '../services/api';
import useAuth from '../hooks/useAuth';

function HomeScreen() {
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const data = await apiService.getBookings({ limit: 20 });
        setBookings(data);
      } catch (error) {
        console.error('Failed to load:', error);
      }
    };

    loadBookings();
  }, []);

  return (
    <View>
      <Text>Welcome {user?.name}</Text>
      {bookings.map(booking => (
        <Text key={booking.id}>{booking.bookingId}</Text>
      ))}
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
```

## Available API Methods

```typescript
// Auth
apiService.loginAdmin(email, password)
apiService.refreshAdminToken(refreshToken)
apiService.fetchCurrentAdmin()

// Dashboard
apiService.getDashboardSummary(from?, to?)

// Bookings
apiService.getBookings(filters)
apiService.getBookingById(id)
apiService.assignDriver(bookingId, driverId, vehicleId?)

// Notifications
apiService.getNotifications(limit, offset)
apiService.markNotificationAsRead(id)
apiService.getUnreadNotificationCount()
apiService.registerFCMToken(token)
apiService.unregisterFCMToken(token)

// Drivers
apiService.getAvailableDrivers()
```

## Test Login Credentials

Use credentials created during backend bootstrap:
- Email: Check your backend logs for bootstrap admin email
- Password: Check your backend logs for bootstrap admin password

## Need More Details?

See `IMPLEMENTATION_COMPLETE.md` for comprehensive documentation including:
- Architecture overview
- Error handling patterns
- Token refresh flow
- FCM integration
- Troubleshooting guide

## Quick Troubleshooting

**App shows LoginScreen even after logging in?**
- Check if AuthProvider is wrapping RootNavigator
- Verify .env has EXPO_PUBLIC_API_BASE_URL set

**401 Unauthorized errors keep appearing?**
- Backend may reject the token
- Clear app data and login again
- Check backend logs for auth issues

**Can't reach backend?**
- Verify backend is running on the configured URL
- Check .env BASE_URL matches backend address
- Ensure CORS is enabled on backend

**Session not persisting after app restart?**
- Verify expo-secure-store is installed
- Check device has secure storage (some emulators don't)
- Try on a real device

