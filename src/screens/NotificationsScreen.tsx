import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
    <View style={[styles.container, { backgroundColor: isDark ? Colors.navy : '#F5F7FA' }]}>
      {/* Modern Gradient Header */}
      <LinearGradient
        colors={isDark ? [Colors.navy, Colors.navy + 'EE'] : [Colors.navy, '#1E3A5F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllAsRead}
            >
              <Ionicons name="checkmark-done" size={18} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={[styles.filterContainer, { backgroundColor: isDark ? '#2A2A2A' : Colors.white }]}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.borderLight },
            !showUnreadOnly && styles.filterChipActive,
          ]}
          onPress={() => setShowUnreadOnly(false)}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: isDark ? Colors.ivory : Colors.navy },
              !showUnreadOnly && { color: Colors.navy },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.borderLight },
            showUnreadOnly && styles.filterChipActive,
          ]}
          onPress={() => setShowUnreadOnly(true)}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: isDark ? Colors.ivory : Colors.navy },
              showUnreadOnly && { color: Colors.navy },
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
            <Text style={[styles.emptyText, !isDark && { color: Colors.navy + '80' }]}>
              {showUnreadOnly ? 'No unread notifications' : 'No notifications'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gold,
    fontWeight: '500',
    marginTop: 4,
  },
  markAllButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.white + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: Colors.gold,
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '600',
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
    color: Colors.gold,
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
