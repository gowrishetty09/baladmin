import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { HomeScreen } from '../screens/HomeScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useNotificationsContext } from '../hooks/NotificationsContext';
import { useThemeContext } from '../hooks/ThemeContext';
import { BottomTabParamList } from '../types';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const MainTabs: React.FC = () => {
  const { unreadCount } = useNotificationsContext();
  const { isDark } = useThemeContext();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: isDark ? Colors.navy : Colors.gold,
        tabBarInactiveTintColor: isDark ? Colors.navy + '80' : Colors.navy + '99',
        tabBarStyle: {
          backgroundColor: isDark ? Colors.gold : Colors.white,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: Colors.navy,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          height: 90,
          paddingBottom: 30,
          paddingTop: 10,
        },
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === 'Home' ? 'home' :
            route.name === 'Bookings' ? 'car' :
            route.name === 'Notifications' ? 'notifications' :
            'person';
          return <Ionicons name={name as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
