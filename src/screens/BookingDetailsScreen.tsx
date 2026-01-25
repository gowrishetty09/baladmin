import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import ApiService from '../services/api';
import { Booking, RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../components/GradientBackground';
import { useThemeContext } from '../hooks/ThemeContext';

type DetailsNav = NativeStackNavigationProp<RootStackParamList, 'BookingDetails'>;
type DetailsProps = NativeStackScreenProps<RootStackParamList, 'BookingDetails'>;

export const BookingDetailsScreen: React.FC<DetailsProps> = ({ route }) => {
  const navigation = useNavigation<DetailsNav>();
  const { isDark } = useThemeContext();
  const bookingId = route.params.bookingId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await ApiService.getBookingById(bookingId);
        setBooking(data);
      } catch (e) {
        // noop
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

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

        <View style={[styles.card, { backgroundColor: isDark ? '#2A2A2A' : 'rgba(255,255,255,0.95)' }]}>
          <Text style={[styles.title, { color: isDark ? Colors.ivory : Colors.navy }]}>{booking.bookingId}</Text>
          <Text style={[styles.label, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Customer</Text>
          <Text style={[styles.value, { color: isDark ? Colors.ivory : Colors.navy }]}>{booking.customerName}  ·  {booking.customerPhone}</Text>

          <Text style={[styles.label, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Pickup</Text>
          <Text style={[styles.value, { color: isDark ? Colors.ivory : Colors.navy }]}>{booking.pickup.address}</Text>

          <Text style={[styles.label, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Drop</Text>
          <Text style={[styles.value, { color: isDark ? Colors.ivory : Colors.navy }]}>{booking.drop.address}</Text>

          <Text style={[styles.label, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Vehicle</Text>
          <Text style={[styles.value, { color: isDark ? Colors.ivory : Colors.navy }]}>{booking.vehicleCategory}</Text>

          <Text style={[styles.label, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Source</Text>
          <Text style={[styles.value, { color: isDark ? Colors.ivory : Colors.navy }]}>{booking.source}{booking.hotelName ? ` · ${booking.hotelName}` : ''}</Text>

          {booking.driver ? (
            <>
              <Text style={[styles.label, { color: isDark ? Colors.ivory + '80' : Colors.navy + '80' }]}>Driver</Text>
              <Text style={[styles.value, { color: isDark ? Colors.ivory : Colors.navy }]}>{booking.driver.name} · {booking.driver.vehicleNumber}</Text>
            </>
          ) : (
            <View style={styles.warningRow}>
              <Ionicons name="warning" size={18} color={Colors.warning} />
              <Text style={[styles.value, { color: Colors.warning, marginLeft: 6 }]}>No driver assigned</Text>
            </View>
          )}

          {booking.hasSOS && booking.sosMessage && (
            <>
              <Text style={styles.label}>SOS Message</Text>
              <Text style={[styles.value, { color: Colors.danger }]}>{booking.sosMessage}</Text>
            </>
          )}
        </View>

        {!booking.driver && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('AssignDriver', { bookingId: booking.id })}
          >
            <Ionicons name="person-add" color={Colors.white} size={18} />
            <Text style={styles.primaryButtonText}>Assign Driver</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: Colors.ivory },
  content: { padding: 16, paddingTop: 20 },
  sosBanner: {
    backgroundColor: Colors.sos,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sosText: { color: Colors.white, fontWeight: '700' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 20,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.navy, marginBottom: 12 },
  label: { marginTop: 12, fontSize: 12, color: Colors.navy + '80', fontWeight: '600' },
  value: { fontSize: 15, color: Colors.navy, marginTop: 4 },
  warningRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  primaryButton: {
    marginTop: 16,
    backgroundColor: Colors.gold,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: { color: Colors.white, fontWeight: '700', marginLeft: 8 },
});
