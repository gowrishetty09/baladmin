import React from "react";
import { View, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { MonitoringScreen } from "../screens/MonitoringScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { BookingsScreen } from "../screens/BookingsScreen";
import { ExpensesScreen } from "../screens/ExpensesScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { useNotificationsContext } from "../hooks/NotificationsContext";
import { useThemeContext } from "../hooks/ThemeContext";
import { BottomTabParamList } from "../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Tab = createBottomTabNavigator<BottomTabParamList>();

const TAB_CONFIG: Record<keyof BottomTabParamList, { icon: string; label: string }> = {
  Home: { icon: "home", label: "Home" },
  Monitoring: { icon: "map", label: "Live Map" },
  Bookings: { icon: "car-sport", label: "Rides" },
  Expenses: { icon: "receipt", label: "Expenses" },
  Notifications: { icon: "notifications", label: "Alerts" },
  Profile: { icon: "person", label: "Profile" },
};

export const MainTabs: React.FC = () => {
  const { unreadCount } = useNotificationsContext();
  const { isDark } = useThemeContext();
  const insets = useSafeAreaInsets();

  const tabBarHeight = 70 + Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name];
        return {
          headerShown: false,
          tabBarActiveTintColor: Colors.gold,
          tabBarInactiveTintColor: isDark ? Colors.ivory + "70" : Colors.navy + "60",
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: -4,
            marginBottom: Platform.OS === "ios" ? 0 : 8,
          },
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isDark ? Colors.navy + "F5" : Colors.white + "F8",
            borderTopWidth: 0,
            elevation: 0,
            height: tabBarHeight,
            paddingTop: 10,
            paddingHorizontal: 8,
            ...(Platform.OS === "ios" && {
              shadowColor: Colors.navy,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
            }),
          },
          tabBarBackground: () => null,
          tabBarIcon: ({ color, focused }) => {
            const iconName = focused
              ? config.icon
              : `${config.icon}-outline`;
            return (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: 48,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: focused
                    ? Colors.gold + "20"
                    : "transparent",
                }}
              >
                <Ionicons
                  name={iconName as any}
                  size={22}
                  color={focused ? Colors.gold : color}
                />
              </View>
            );
          },
          tabBarLabel: config.label,
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Monitoring" component={MonitoringScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors.danger,
            fontSize: 10,
            fontWeight: "700",
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
