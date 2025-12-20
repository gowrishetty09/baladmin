import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { BookingDetailsScreen } from '../screens/BookingDetailsScreen';
import { AssignDriverScreen } from '../screens/AssignDriverScreen';
import { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        // Support deep linking from FCM notifications
        animationEnabled: true,
      }}
    >
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
    </Stack.Navigator>
  );
};
