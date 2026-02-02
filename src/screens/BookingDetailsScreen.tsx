import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  NativeStackScreenProps,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { Colors } from "../constants/colors";
import ApiService from "../services/api";
import { Booking, RootStackParamList } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "../components/GradientBackground";
import { useThemeContext } from "../hooks/ThemeContext";
import useAuth from "../hooks/useAuth";
import { getAdminSocket } from "../services/adminSocket";

// Format time helper
const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
};

// Format time only
const formatTime = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
};

// Calculate duration in minutes
const calculateDuration = (start?: string, end?: string) => {
  if (!start || !end) return null;
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const mins = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    return mins > 0 ? `${mins} min` : null;
  } catch {
    return null;
  }
};

// Get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'DRIVER_ASSIGNED':
      return '#3B82F6';
    case 'IN_PROGRESS':
    case 'EN_ROUTE':
    case 'ARRIVED':
    case 'RIDE_STARTED':
      return '#F59E0B';
    case 'COMPLETED':
      return '#10B981';
    case 'CANCELLED':
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

type DetailsNav = NativeStackNavigationProp<
  RootStackParamList,
  "BookingDetails"
>;
type DetailsProps = NativeStackScreenProps<
  RootStackParamList,
  "BookingDetails"
>;

export const BookingDetailsScreen: React.FC<DetailsProps> = ({ route }) => {
  const navigation = useNavigation<DetailsNav>();
  const { isDark } = useThemeContext();
  const { token, isAuthenticated } = useAuth();
  const bookingId = route.params.bookingId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBooking = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ApiService.getBookingById(bookingId);
      setBooking(data);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  // Refresh booking data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadBooking();
    }, [loadBooking])
  );

  // Real-time booking status updates via WebSocket
  useEffect(() => {
    if (!isAuthenticated || !token || !bookingId) return;

    const socket = getAdminSocket(token);
    if (!socket) return;

    const handleStatusUpdate = (payload: any) => {
      const payloadBookingId: string | undefined =
        payload?.bookingId ?? payload?.id ?? payload?.booking_id;
      if (!payloadBookingId || payloadBookingId !== bookingId) return;

      const nextStatus: string | undefined =
        payload?.status ?? payload?.bookingStatus ?? payload?.booking_status;
      
      // Update booking state with new status or reload full booking
      if (nextStatus) {
        setBooking((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: nextStatus as any,
            updatedAt: new Date().toISOString(),
            // Update driver info if present in payload
            ...(payload?.driverId && { driverId: payload.driverId }),
            ...(payload?.driverName && { driverName: payload.driverName }),
            ...(payload?.driverPhone && { driverPhone: payload.driverPhone }),
          };
        });
      } else {
        // Full reload if status not in payload
        loadBooking();
      }
    };

    // Handle admin:fleet events (ride:create, ride:update, ride:delete)
    const handleAdminFleetUpdate = (payload: any) => {
      const type = payload?.type;
      if (type === "ride:update" || type === "ride:create") {
        const ride = payload?.ride;
        const rideBookingId = ride?.bookingId ?? ride?.id;
        if (rideBookingId === bookingId) {
          handleStatusUpdate(ride);
        }
      }
    };

    // Listen for admin:fleet events
    socket.on("admin:fleet", handleAdminFleetUpdate);

    // Listen for various booking status events (fallback/direct events)
    socket.on("BOOKING_STATUS_UPDATED", handleStatusUpdate);
    socket.on("booking:status", handleStatusUpdate);
    socket.on("booking:updated", handleStatusUpdate);
    socket.on("driver:assigned", handleStatusUpdate);
    socket.on("ride:started", handleStatusUpdate);
    socket.on("ride:ended", handleStatusUpdate);

    return () => {
      socket.off("admin:fleet", handleAdminFleetUpdate);
      socket.off("BOOKING_STATUS_UPDATED", handleStatusUpdate);
      socket.off("booking:status", handleStatusUpdate);
      socket.off("booking:updated", handleStatusUpdate);
      socket.off("driver:assigned", handleStatusUpdate);
      socket.off("ride:started", handleStatusUpdate);
      socket.off("ride:ended", handleStatusUpdate);
    };
  }, [bookingId, isAuthenticated, token, loadBooking]);

  if (loading) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator color={Colors.gold} />
      </GradientBackground>
    );
  }

  if (!booking) {
    return (
      <GradientBackground style={styles.center}>
        <Text style={styles.muted}>Booking not found</Text>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.content}>
        {booking.hasSOS && (
          <View style={styles.sosBanner}>
            <Ionicons name="alert-circle" size={20} color={Colors.white} />
            <Text style={styles.sosText}>SOS Active</Text>
          </View>
        )}

        {/* Main Booking Info Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? "#2A2A2A" : "rgba(255,255,255,0.95)" },
          ]}
        >
          <Text
            style={[
              styles.title,
              { color: isDark ? Colors.ivory : Colors.navy },
            ]}
          >
            {booking.bookingId}
          </Text>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {booking.status.replace(/_/g, ' ')}
            </Text>
          </View>

          {/* Customer Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.ivory : Colors.navy }]}>
              <Ionicons name="person" size={16} /> Customer
            </Text>
            <Text style={[styles.value, { color: isDark ? Colors.ivory : Colors.navy }]}>
              {booking.customerName}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${booking.customerPhone}`)}>
              <Text style={[styles.link, { color: Colors.gold }]}>
                {booking.customerPhone}
              </Text>
            </TouchableOpacity>
            {booking.customerEmail && (
              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${booking.customerEmail}`)}>
                <Text style={[styles.link, { color: Colors.gold }]}>
                  {booking.customerEmail}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Pickup & Drop */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.ivory : Colors.navy }]}>
              <Ionicons name="location" size={16} /> Route
            </Text>
            <View style={styles.routeRow}>
              <View style={styles.routeDot}>
                <View style={[styles.dot, { backgroundColor: Colors.success }]} />
              </View>
              <View style={styles.routeContent}>
                <Text style={[styles.routeLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Pickup</Text>
                <Text style={[styles.value, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {booking.pickup.address}
                </Text>
              </View>
            </View>
            <View style={styles.routeRow}>
              <View style={styles.routeDot}>
                <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
              </View>
              <View style={styles.routeContent}>
                <Text style={[styles.routeLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Drop</Text>
                <Text style={[styles.value, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {booking.drop.address}
                </Text>
              </View>
            </View>
          </View>

          {/* Timing Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.ivory : Colors.navy }]}>
              <Ionicons name="time" size={16} /> Timing
            </Text>
            
            {booking.scheduledTime && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Scheduled</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {formatDateTime(booking.scheduledTime)}
                </Text>
              </View>
            )}
            
            {(booking as any).enRouteAt && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>En Route</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {formatDateTime((booking as any).enRouteAt)}
                </Text>
              </View>
            )}
            
            {(booking as any).arrivedAt && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Arrived</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {formatDateTime((booking as any).arrivedAt)}
                </Text>
              </View>
            )}
            
            {(booking as any).rideStartedAt && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Ride Started</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {formatDateTime((booking as any).rideStartedAt)}
                </Text>
              </View>
            )}
            
            {(booking as any).completedAt && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Completed</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {formatDateTime((booking as any).completedAt)}
                </Text>
              </View>
            )}

            {/* Duration calculations */}
            {(booking as any).arrivedAt && (booking as any).completedAt && (
              <View style={[styles.infoRow, styles.highlightRow]}>
                <Text style={[styles.infoLabel, { color: Colors.gold }]}>Trip Duration</Text>
                <Text style={[styles.infoValue, { color: Colors.gold, fontWeight: '700' }]}>
                  {calculateDuration((booking as any).arrivedAt, (booking as any).completedAt) || '-'}
                </Text>
              </View>
            )}
            
            {(booking as any).rideStartedAt && (booking as any).completedAt && (
              <View style={[styles.infoRow, styles.highlightRow]}>
                <Text style={[styles.infoLabel, { color: Colors.gold }]}>Ride Duration</Text>
                <Text style={[styles.infoValue, { color: Colors.gold, fontWeight: '700' }]}>
                  {calculateDuration((booking as any).rideStartedAt, (booking as any).completedAt) || '-'}
                </Text>
              </View>
            )}
          </View>

          {/* Flight Info */}
          {((booking as any).flightNumber || (booking as any).flightEta) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? Colors.ivory : Colors.navy }]}>
                <Ionicons name="airplane" size={16} /> Flight Information
              </Text>
              {(booking as any).flightNumber && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Flight Number</Text>
                  <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                    {(booking as any).flightNumber}
                  </Text>
                </View>
              )}
              {(booking as any).flightEta && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Flight ETA</Text>
                  <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                    {formatDateTime((booking as any).flightEta)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Vehicle Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.ivory : Colors.navy }]}>
              <Ionicons name="car" size={16} /> Vehicle
            </Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Category</Text>
              <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                {booking.vehicleCategory}
              </Text>
            </View>
            {(booking as any)?.vehicle?.make || (booking as any)?.vehicle?.model ? (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Vehicle</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {[(booking as any)?.vehicle?.make, (booking as any)?.vehicle?.model].filter(Boolean).join(' ')}
                </Text>
              </View>
            ) : null}
            {(booking as any)?.vehicle?.registrationNumber && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Plate</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {(booking as any)?.vehicle?.registrationNumber}
                </Text>
              </View>
            )}
            {(booking as any)?.serviceTier && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Service Tier</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {String((booking as any).serviceTier).replace(/_/g, ' ')}
                </Text>
              </View>
            )}
          </View>

          {/* Source Info - Hotel/Kiosk/Customer specific */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.ivory : Colors.navy }]}>
              <Ionicons name="information-circle" size={16} /> Booking Source
            </Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Source</Text>
              <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                {booking.source}
              </Text>
            </View>
            {booking.hotelName && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Hotel</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {booking.hotelName}
                </Text>
              </View>
            )}
            {(booking as any).guestName && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Guest Name</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {(booking as any).guestName}
                </Text>
              </View>
            )}
            {(booking as any).roomNumber && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Room Number</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {(booking as any).roomNumber}
                </Text>
              </View>
            )}
            {booking.kioskLocation && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Kiosk</Text>
                <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                  {booking.kioskLocation}
                </Text>
              </View>
            )}
          </View>

          {/* Driver Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.ivory : Colors.navy }]}>
              <Ionicons name="person-circle" size={16} /> Driver
            </Text>
            {booking.driver ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Name</Text>
                  <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                    {booking.driver.name}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Phone</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${booking.driver!.phone}`)}>
                    <Text style={[styles.link, { color: Colors.gold }]}>
                      {booking.driver.phone}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Vehicle</Text>
                  <Text style={[styles.infoValue, { color: isDark ? Colors.ivory : Colors.navy }]}>
                    {booking.driver.vehicleNumber}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.warningRow}>
                <Ionicons name="warning" size={18} color={Colors.warning} />
                <Text style={[styles.value, { color: Colors.warning, marginLeft: 6 }]}>
                  No driver assigned
                </Text>
              </View>
            )}
          </View>

          {/* Fare */}
          {booking.fare && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? Colors.ivory : Colors.navy }]}>
                <Ionicons name="cash" size={16} /> Fare
              </Text>
              <Text style={[styles.fareAmount, { color: Colors.gold }]}>
                RM {booking.fare.toFixed(2)}
              </Text>
            </View>
          )}

          {/* Notes */}
          {(booking as any).notes && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? Colors.ivory : Colors.navy }]}>
                <Ionicons name="document-text" size={16} /> Notes
              </Text>
              <Text style={[styles.value, { color: isDark ? Colors.ivory : Colors.navy }]}>
                {(booking as any).notes}
              </Text>
            </View>
          )}

          {/* SOS Message */}
          {booking.hasSOS && booking.sosMessage && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: Colors.danger }]}>
                <Ionicons name="alert-circle" size={16} /> SOS Message
              </Text>
              <Text style={[styles.value, { color: Colors.danger }]}>
                {booking.sosMessage}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {!booking.driver && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              navigation.navigate("AssignDriver", { bookingId: booking.id })
            }
          >
            <Ionicons name="person-add" color={Colors.white} size={18} />
            <Text style={styles.primaryButtonText}>Assign Driver</Text>
          </TouchableOpacity>
        )}

        {booking.driver && booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: Colors.navy }]}
            onPress={() =>
              navigation.navigate("AssignDriver", { bookingId: booking.id, isReassign: true })
            }
          >
            <Ionicons name="swap-horizontal" color={Colors.white} size={18} />
            <Text style={styles.primaryButtonText}>Reassign Driver</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  muted: { color: Colors.ivory },
  content: { padding: 16, paddingTop: 20 },
  sosBanner: {
    backgroundColor: Colors.sos,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sosText: { color: Colors.white, fontWeight: "700" },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.navy,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  value: { fontSize: 15, color: Colors.navy, marginTop: 2 },
  link: { fontSize: 15, marginTop: 2, textDecorationLine: "underline" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  highlightRow: {
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  routeRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  routeDot: {
    width: 24,
    alignItems: "center",
    paddingTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeContent: {
    flex: 1,
    marginLeft: 8,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: "700",
  },
  warningRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  primaryButton: {
    marginTop: 16,
    backgroundColor: Colors.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: { color: Colors.white, fontWeight: "700", marginLeft: 8 },
});
