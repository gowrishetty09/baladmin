import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { BottomTabParamList, BookingStatus } from '../types';
import { DashboardCard } from '../components/DashboardCard';
import { GradientBackground } from '../components/GradientBackground';
import { DashboardSummary } from '../types';
import { Colors } from '../constants/colors';
import ApiService from '../services/api';
import { useThemeContext } from '../hooks/ThemeContext';

type HomeNav = BottomTabNavigationProp<BottomTabParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNav>();
  const { isDark } = useThemeContext();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await ApiService.getDashboardSummary();
      setSummary(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const navigateToBookings = (status?: BookingStatus) => {
    navigation.navigate('Bookings', { filter: status });
  };

  if (isLoading && !summary) {
    return (
      <GradientBackground style={styles.container}>
        <View style={[styles.header, !isDark && { backgroundColor: Colors.white }]}>
          <Text style={[styles.headerTitle, !isDark && { color: Colors.navy }]}>Admin Dashboard</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={styles.container}>
      <View style={[styles.header, !isDark && { backgroundColor: Colors.white }]}>
        <Text style={[styles.headerTitle, !isDark && { color: Colors.navy }]}>Admin Dashboard</Text>
        <Text style={[styles.headerSubtitle, !isDark && { color: Colors.gold }]}>Monitor & Manage Rides</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Today's Revenue */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Today's Revenue</Text>
          <Text style={styles.revenueValue}>
            RM {(summary?.totalRevenue ?? 0).toFixed(2)}
          </Text>
        </View>

        {/* Analytics Cards */}
        <DashboardCard
          title="New Bookings (Today)"
          value={summary?.newBookingsToday || 0}
          icon="add-circle"
          color={Colors.info}
          onPress={() => navigateToBookings()}
        />

        <DashboardCard
          title="Ongoing Rides"
          value={summary?.ongoingRides || 0}
          icon="car"
          color={Colors.inProgress}
          onPress={() => navigateToBookings(BookingStatus.IN_PROGRESS)}
        />

        <DashboardCard
          title="Pending / Unassigned"
          value={summary?.pendingUnassigned || 0}
          icon="alert-circle"
          color={Colors.warning}
          onPress={() => navigateToBookings(BookingStatus.PENDING)}
        />

        <DashboardCard
          title="Completed Rides"
          value={summary?.completedRides || 0}
          icon="checkmark-circle"
          color={Colors.success}
          onPress={() => navigateToBookings(BookingStatus.COMPLETED)}
        />

        <DashboardCard
          title="SOS / Tickets Raised"
          value={summary?.sosTickets || 0}
          icon="warning"
          color={Colors.sos}
          onPress={() => navigation.navigate('Bookings', { filterSOS: true })}
        />
      </ScrollView>
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
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.ivory,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.ivory,
  },
  revenueCard: {
    backgroundColor: Colors.gold,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  revenueLabel: {
    fontSize: 16,
    color: Colors.navy,
    opacity: 0.9,
    marginBottom: 8,
  },
  revenueValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: Colors.navy,
  },
});
