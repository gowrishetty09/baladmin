import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Notification, NotificationType } from '../types';
import { Colors } from '../constants/colors';

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
}) => {
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.NEW_BOOKING:
        return 'add-circle';
      case NotificationType.DRIVER_ASSIGNED:
        return 'person-add';
      case NotificationType.RIDE_STARTED:
        return 'play-circle';
      case NotificationType.RIDE_COMPLETED:
        return 'checkmark-circle';
      case NotificationType.SOS_RAISED:
        return 'alert-circle';
      case NotificationType.BOOKING_CANCELLED:
        return 'close-circle';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.NEW_BOOKING:
        return Colors.info;
      case NotificationType.DRIVER_ASSIGNED:
        return Colors.success;
      case NotificationType.RIDE_STARTED:
        return Colors.inProgress;
      case NotificationType.RIDE_COMPLETED:
        return Colors.completed;
      case NotificationType.SOS_RAISED:
        return Colors.sos;
      case NotificationType.BOOKING_CANCELLED:
        return Colors.cancelled;
      default:
        return Colors.primary;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return { color: Colors.danger, label: 'High' };
      case 'MEDIUM':
        return { color: Colors.warning, label: 'Medium' };
      case 'LOW':
        return { color: Colors.info, label: 'Low' };
      default:
        return { color: Colors.textLight, label: '' };
    }
  };

  const icon = getNotificationIcon(notification.type);
  const color = getNotificationColor(notification.type);
  const priorityBadge = getPriorityBadge(notification.priority);
  const timeAgo = formatTimeAgo(notification.createdAt);

  // Check if this is a high-priority notification type (SOS or New Booking)
  const isHighPriority =
    notification.type === NotificationType.SOS_RAISED ||
    notification.type === NotificationType.NEW_BOOKING;
  const isSOS = notification.type === NotificationType.SOS_RAISED;
  const accentColor = isSOS ? Colors.sos : color;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !notification.isRead && styles.unreadContainer,
        isHighPriority && styles.highPriorityContainer,
        isHighPriority && { borderLeftColor: accentColor },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer, 
        { backgroundColor: accentColor + '20' }
      ]}>
        <Ionicons name={icon} size={24} color={accentColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              !notification.isRead && styles.unreadTitle,
              isHighPriority && { color: Colors.navy },
            ]}
          >
            {notification.title}
          </Text>
          {!notification.isRead && <View style={styles.unreadDot} />}
        </View>

        <Text 
          style={[
            styles.message,
          ]} 
          numberOfLines={2}
        >
          {notification.message}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.time}>{timeAgo}</Text>
          {notification.priority !== 'LOW' && !isHighPriority && (
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityBadge.color + '20' },
              ]}
            >
              <Text
                style={[styles.priorityText, { color: priorityBadge.color }]}
              >
                {priorityBadge.label}
              </Text>
            </View>
          )}
          {isHighPriority && (
            <View style={[styles.priorityBadge, { backgroundColor: accentColor + '20' }]}>
              <Text style={[styles.priorityText, { color: accentColor }]}>
                {isSOS ? 'URGENT' : 'NEW'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  unreadContainer: {
    backgroundColor: Colors.gold + '10',
    borderWidth: 1,
    borderColor: Colors.gold + '30',
  },
  highPriorityContainer: {
    borderLeftWidth: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.navy,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.navy + '99',
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 12,
    color: Colors.navy + '66',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
