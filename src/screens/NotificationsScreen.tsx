import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { GradientBackground } from '../components/GradientBackground';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { NotificationItem } from '../components/NotificationItem';
import { Notification, BottomTabParamList, RootStackParamList } from '../types';
import { Colors } from '../constants/colors';
import ApiService from '../services/api';
import { useNotificationsContext } from '../hooks/NotificationsContext';
import { useThemeContext } from '../hooks/ThemeContext';

type NotifNav = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Notifications'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NotifNav>();
  const { notifications, setNotifications, refresh } = useNotificationsContext();
  const { isDark, colors } = useThemeContext();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    // ensure initial refresh if needed
    refresh().catch(() => {});
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await ApiService.markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate to booking details if available
    if (notification.bookingId) {
      navigation.navigate('BookingDetails', { bookingId: notification.bookingId });
    }
  };

  const markAllAsRead = async () => {
    try {
      // In real app, would call API to mark all as read
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const filteredNotifications = showUnreadOnly
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <GradientBackground>
      <View style={[styles.header, !isDark && { backgroundColor: Colors.white }]}>
        <View>
          <Text style={[styles.headerTitle, !isDark && { color: Colors.navy }]}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={[styles.unreadCount, !isDark && { color: Colors.gold }]}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={[styles.markAllButton, !isDark && { backgroundColor: Colors.gold + '15' }]}
            onPress={markAllAsRead}
          >
            <Ionicons name="checkmark-done" size={20} color={Colors.gold} />
            <Text style={[styles.markAllText, !isDark && { color: Colors.gold }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            !showUnreadOnly && styles.filterChipActive,
          ]}
          onPress={() => setShowUnreadOnly(false)}
        >
          <Text
            style={[
              styles.filterChipText,
              !showUnreadOnly && { color: Colors.white },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            showUnreadOnly && styles.filterChipActive,
          ]}
          onPress={() => setShowUnreadOnly(true)}
        >
          <Text
            style={[
              styles.filterChipText,
              showUnreadOnly && { color: Colors.white },
            ]}
          >
            Unread
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => handleNotificationPress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color={Colors.ivory}
            />
            <Text style={styles.emptyText}>
              {showUnreadOnly ? 'No unread notifications' : 'No notifications'}
            </Text>
          </View>
        }
      />
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.ivory,
  },
  unreadCount: {
    fontSize: 14,
    color: Colors.gold,
    marginTop: 2,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '600',
    marginLeft: 6,
  },
  filterContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  filterChipActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  badge: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
});
