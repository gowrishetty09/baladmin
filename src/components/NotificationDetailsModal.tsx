import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatus, Notification, NotificationType } from '../types';
import { Colors } from '../constants/colors';
import { useThemeContext } from '../hooks/ThemeContext';
import ApiService from '../services/api';

interface NotificationDetailsModalProps {
  visible: boolean;
  notification: Notification | null;
  onClose: () => void;
  onViewFullDetails: (bookingId: string) => void;
}

const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const formatDuration = (fromIso?: string | null, toIso?: string | null): string | null => {
  if (!fromIso || !toIso) return null;
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
  const totalMinutes = Math.round((to - from) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatCurrency = (value?: number | null): string => {
  if (value == null || !Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `RM ${value.toFixed(2)}`;
  }
};

const cancelledByLabel = (by?: string): string => {
  switch (by) {
    case 'CUSTOMER':
      return 'Customer';
    case 'DRIVER':
      return 'Driver';
    case 'HOTEL':
      return 'Hotel';
    case 'ADMIN':
      return 'Admin';
    case 'SYSTEM':
      return 'System';
    default:
      return 'Unknown';
  }
};

export const NotificationDetailsModal: React.FC<NotificationDetailsModalProps> = ({
  visible,
  notification,
  onClose,
  onViewFullDetails,
}) => {
  const { isDark } = useThemeContext();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !notification?.bookingId) {
      setBooking(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    ApiService.getBookingById(notification.bookingId)
      .then((data) => {
        if (!cancelled) setBooking(data);
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Failed to load booking details.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, notification?.bookingId]);

  const cardBg = isDark ? '#2A2A2A' : Colors.white;
  const textColor = isDark ? Colors.ivory : Colors.navy;
  const subText = isDark ? 'rgba(245,245,245,0.7)' : '#5F6B7A';

  const renderRow = (label: string, value: React.ReactNode, opts?: { highlight?: boolean }) => (
    <View style={styles.row} key={label}>
      <Text style={[styles.rowLabel, { color: subText }]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          { color: opts?.highlight ? Colors.cancelled : textColor },
          opts?.highlight && { fontWeight: '700' },
        ]}
      >
        {value ?? '—'}
      </Text>
    </View>
  );

  const renderStatusSpecific = () => {
    if (!booking) return null;

    const status = booking.status;
    const sections: React.ReactNode[] = [];

    // Cancellation block
    if (status === BookingStatus.CANCELLED) {
      const reason =
        booking.cancellationReason ||
        booking.driverCancellationReason ||
        'No reason provided';
      sections.push(
        <View key="cancel" style={[styles.section, { backgroundColor: Colors.cancelled + '15' }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="close-circle" size={18} color={Colors.cancelled} />
            <Text style={[styles.sectionTitle, { color: Colors.cancelled }]}>Cancellation</Text>
          </View>
          {renderRow('Cancelled at', formatDateTime(booking.cancelledAt))}
          {renderRow('Cancelled by', cancelledByLabel(booking.cancelledBy))}
          {renderRow('Reason', reason, { highlight: true })}
          {booking.driver?.name &&
            renderRow('Driver was', booking.driver.name)}
          {booking.rideStartedAt &&
            renderRow('Ride had started at', formatDateTime(booking.rideStartedAt))}
        </View>
      );
    }

    // Completion block
    if (status === BookingStatus.COMPLETED) {
      const duration =
        formatDuration(booking.rideStartedAt, booking.completedAt) ||
        (booking.durationHours != null
          ? `${booking.durationHours.toFixed(1)} h`
          : null);
      const amount = booking.paymentAmount ?? booking.finalPrice;
      sections.push(
        <View key="complete" style={[styles.section, { backgroundColor: Colors.success + '15' }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={[styles.sectionTitle, { color: Colors.success }]}>Trip Completed</Text>
          </View>
          {renderRow('Completed at', formatDateTime(booking.completedAt))}
          {duration && renderRow('Duration', duration)}
          {booking.tripDistanceKm != null &&
            renderRow('Distance', `${booking.tripDistanceKm.toFixed(1)} km`)}
          {renderRow('Amount', formatCurrency(amount))}
          {booking.paymentMethod &&
            renderRow('Payment method', booking.paymentMethod)}
          {booking.paymentStatus &&
            renderRow('Payment status', booking.paymentStatus)}
        </View>
      );
    }

    // In-progress / driver assigned block
    if (
      status === BookingStatus.IN_PROGRESS ||
      status === BookingStatus.DRIVER_ASSIGNED
    ) {
      sections.push(
        <View key="progress" style={[styles.section, { backgroundColor: Colors.info + '15' }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="navigate" size={18} color={Colors.info} />
            <Text style={[styles.sectionTitle, { color: Colors.info }]}>Trip Progress</Text>
          </View>
          {booking.enRouteAt && renderRow('En route at', formatDateTime(booking.enRouteAt))}
          {booking.arrivedAt && renderRow('Arrived at', formatDateTime(booking.arrivedAt))}
          {booking.rideStartedAt &&
            renderRow('Ride started at', formatDateTime(booking.rideStartedAt))}
          {!booking.enRouteAt && !booking.arrivedAt && !booking.rideStartedAt &&
            renderRow('Status', 'Awaiting driver to start')}
        </View>
      );
    }

    return sections;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: cardBg }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handleBar} />

          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
              {notification?.title || 'Notification'}
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={textColor} />
            </TouchableOpacity>
          </View>

          {notification?.message ? (
            <Text style={[styles.message, { color: subText }]}>{notification.message}</Text>
          ) : null}

          <Text style={[styles.timestamp, { color: subText }]}>
            {formatDateTime(notification?.createdAt)}
          </Text>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.gold} />
                <Text style={[styles.loadingText, { color: subText }]}>
                  Loading booking details…
                </Text>
              </View>
            )}

            {!loading && error && (
              <View style={[styles.section, { backgroundColor: Colors.danger + '15' }]}>
                <Text style={[styles.rowValue, { color: Colors.danger }]}>{error}</Text>
              </View>
            )}

            {!loading && !error && !notification?.bookingId && (
              <View style={[styles.section, { backgroundColor: isDark ? '#1F1F1F' : '#F5F7FA' }]}>
                <Text style={[styles.rowValue, { color: subText }]}>
                  No booking is linked to this notification.
                </Text>
              </View>
            )}

            {!loading && !error && booking && (
              <>
                {/* Booking summary */}
                <View style={[styles.section, { backgroundColor: isDark ? '#1F1F1F' : '#F5F7FA' }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="receipt-outline" size={18} color={textColor} />
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Booking</Text>
                  </View>
                  {renderRow('Booking ID', booking.bookingId)}
                  {renderRow('Status', booking.status)}
                  {renderRow('Customer', booking.customerName || '—')}
                  {booking.customerPhone &&
                    renderRow('Phone', booking.customerPhone)}
                  {booking.pickup?.address &&
                    renderRow('Pickup', booking.pickup.address)}
                  {booking.drop?.address &&
                    renderRow('Drop', booking.drop.address)}
                  {booking.scheduledTime &&
                    renderRow('Scheduled', formatDateTime(booking.scheduledTime))}
                </View>

                {/* Driver / vehicle block */}
                {(booking.driver || booking.vehicle) && (
                  <View style={[styles.section, { backgroundColor: isDark ? '#1F1F1F' : '#F5F7FA' }]}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="car-outline" size={18} color={textColor} />
                      <Text style={[styles.sectionTitle, { color: textColor }]}>Driver & Vehicle</Text>
                    </View>
                    {booking.driver?.name && renderRow('Driver', booking.driver.name)}
                    {booking.driver?.phone && renderRow('Driver phone', booking.driver.phone)}
                    {booking.driver?.vehicleNumber &&
                      renderRow('Vehicle number', booking.driver.vehicleNumber)}
                    {booking.vehicle?.registrationNumber &&
                      renderRow('Plate', booking.vehicle.registrationNumber)}
                    {(booking.vehicle?.make || booking.vehicle?.model) &&
                      renderRow(
                        'Vehicle',
                        [booking.vehicle?.make, booking.vehicle?.model]
                          .filter(Boolean)
                          .join(' ')
                      )}
                  </View>
                )}

                {/* Status-specific blocks */}
                {renderStatusSpecific()}
              </>
            )}
          </ScrollView>

          {notification?.bookingId && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => onViewFullDetails(notification.bookingId!)}
            >
              <Text style={styles.primaryButtonText}>View full booking</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.navy} />
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(127,127,127,0.4)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  message: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    marginTop: 8,
    fontSize: 12,
  },
  body: {
    marginTop: 14,
  },
  bodyContent: {
    paddingBottom: 8,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  section: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    gap: 12,
  },
  rowLabel: {
    fontSize: 13,
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: Colors.navy,
    fontWeight: '700',
    fontSize: 15,
  },
});
