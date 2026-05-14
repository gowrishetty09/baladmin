import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { BookingDetailsScreen } from '../screens/BookingDetailsScreen';
import { AssignDriverScreen } from '../screens/AssignDriverScreen';
import { ChangeCarScreen } from '../screens/ChangeCarScreen';
import LoginScreen from '../screens/LoginScreen';
import { RootStackParamList } from '../types';
import { useAuthContext } from '../hooks/useAuthStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isInitializing } = useAuthContext();

  if (isInitializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        // Support deep linking from FCM notifications
        animation: 'default',
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="BookingDetails"
            component={BookingDetailsScreen}
            options={{
              title: 'Booking Details',
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="AssignDriver"
            component={AssignDriverScreen}
            options={{
              title: 'Assign Driver',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="ChangeCar"
            component={ChangeCarScreen}
            options={{
              title: 'Change Car',
              presentation: 'modal',
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            headerShown: false,
          }}
        />
      )}
    </Stack.Navigator>
  );
};
