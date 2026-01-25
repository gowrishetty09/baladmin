import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatus } from '../types';
import { Colors } from '../constants/colors';
import { useThemeContext } from '../hooks/ThemeContext';

interface BookingCardProps {
  booking: Booking;
  onAssignDriver: () => void;
  onViewDetails: () => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onAssignDriver,
  onViewDetails,
}) => {
  const { isDark } = useThemeContext();
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        // Only allow horizontal swipes
        if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
          pan.setValue({ x: gesture.dx, y: 0 });
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 100) {
          // Swipe right - Assign driver
          onAssignDriver();
        } else if (gesture.dx < -100) {
          // Swipe left - View details
          onViewDetails();
        }
        // Reset position
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.DRIVER_ASSIGNED:
        return Colors.assigned;
      case BookingStatus.IN_PROGRESS:
        return Colors.inProgress;
      case BookingStatus.COMPLETED:
        return Colors.completed;
      case BookingStatus.CANCELLED:
        return Colors.cancelled;
      case BookingStatus.PENDING:
      default:
        return Colors.pending;
    }
  };

  const getStatusText = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.DRIVER_ASSIGNED:
        return 'Driver Assigned';
      case BookingStatus.IN_PROGRESS:
        return 'In Progress';
      case BookingStatus.COMPLETED:
        return 'Completed';
      case BookingStatus.CANCELLED:
        return 'Cancelled';
      case BookingStatus.PENDING:
      default:
        return 'Pending';
    }
  };

  const statusColor = getStatusColor(booking.status);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: statusColor, backgroundColor: isDark ? '#2A2A2A' : Colors.white }]}
        onPress={onViewDetails}
        activeOpacity={0.9}
      >
        {/* SOS Alert Badge */}
        {booking.hasSOS && (
          <View style={styles.sosBadge}>
            <Ionicons name="alert-circle" size={20} color={Colors.white} />
            <Text style={styles.sosText}>SOS</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.bookingId, { color: isDark ? Colors.ivory : Colors.navy }]}>{booking.bookingId}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusText(booking.status)}
              </Text>
            </View>
          </View>
          <View style={[styles.sourceContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.borderLight }]}>
            <Ionicons
              name={
                booking.source === 'HOTEL'
                  ? 'business'
                  : booking.source === 'KIOSK'
                  ? 'location'
                  : 'person'
              }
              size={16}
              color={isDark ? Colors.ivory + '99' : Colors.textSecondary}
            />
            <Text style={[styles.sourceText, { color: isDark ? Colors.ivory + '99' : Colors.navy + '99' }]}>{booking.source}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerInfo}>
          <Ionicons name="person-outline" size={16} color={isDark ? Colors.ivory + '99' : Colors.navy + '99'} />
          <Text style={[styles.customerName, { color: isDark ? Colors.ivory : Colors.navy }]}>{booking.customerName}</Text>
        </View>

        {/* Route */}
        <View style={styles.routeContainer}>
          <View style={styles.routeItem}>
            <View style={styles.pickupDot} />
            <Text style={[styles.locationText, { color: isDark ? Colors.ivory : Colors.navy }]} numberOfLines={1}>
              {booking.pickup.address}
            </Text>
          </View>
          <View style={styles.routeDivider}>
            <Ionicons name="arrow-down" size={16} color={isDark ? Colors.ivory + '66' : Colors.navy + '66'} />
          </View>
          <View style={styles.routeItem}>
            <View style={styles.dropDot} />
            <Text style={[styles.locationText, { color: isDark ? Colors.ivory : Colors.navy }]} numberOfLines={1}>
              {booking.drop.address}
            </Text>
          </View>
        </View>

        {/* Bottom Info */}
        <View style={[styles.bottomInfo, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.borderLight }]}>
          <View style={styles.infoItem}>
            <Ionicons name="car-outline" size={16} color={isDark ? Colors.ivory + '99' : Colors.navy + '99'} />
            <Text style={[styles.infoText, { color: isDark ? Colors.ivory + '99' : Colors.navy + '99' }]}>{booking.vehicleCategory}</Text>
          </View>
          {booking.driver ? (
            <View style={styles.infoItem}>
              <Ionicons name="person-circle-outline" size={16} color={Colors.assigned} />
              <Text style={[styles.infoText, { color: Colors.assigned }]}>
                {booking.driver.name}
              </Text>
            </View>
          ) : (
            <View style={styles.infoItem}>
              <Ionicons name="warning-outline" size={16} color={Colors.warning} />
              <Text style={[styles.infoText, { color: Colors.warning }]}>
                No Driver
              </Text>
            </View>
          )}
        </View>

        {/* Swipe Hint */}
        <View style={styles.swipeHint}>
          <Text style={[styles.swipeHintText, { color: isDark ? Colors.ivory + '66' : Colors.navy + '66' }]}>← View Details | Assign Driver →</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sosBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.sos,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  sosText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  bookingId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.navy,
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sourceText: {
    fontSize: 11,
    color: Colors.navy + '99',
    marginLeft: 4,
    fontWeight: '500',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 14,
    color: Colors.navy,
    marginLeft: 6,
    fontWeight: '500',
  },
  routeContainer: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    marginRight: 10,
  },
  dropDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
    marginRight: 10,
  },
  routeDivider: {
    marginLeft: 4,
    marginVertical: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: Colors.navy,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: Colors.navy + '99',
    marginLeft: 6,
    fontWeight: '500',
  },
  swipeHint: {
    marginTop: 8,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 10,
    color: Colors.navy + '66',
    fontStyle: 'italic',
  },
});
