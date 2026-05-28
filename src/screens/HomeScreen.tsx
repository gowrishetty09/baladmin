import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabParamList, BookingStatus, RootStackParamList } from '../types';
import { StatCard } from '../components/StatCard';
import { QuickActionCard } from '../components/QuickActionCard';
import { ActivityItem } from '../components/ActivityItem';
import {
  DashboardSummary,
  DashboardOverview,
  DashboardTotals,
  OverviewRangeMonths,
} from '../types';
import { Colors } from '../constants/colors';
import ApiService from '../services/api';
import { useThemeContext } from '../hooks/ThemeContext';
import { useNotificationsContext } from '../hooks/NotificationsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const OVERVIEW_RANGE_OPTIONS: Array<{ value: OverviewRangeMonths; label: string }> = [
  { value: 1, label: 'Last 1 Month' },
  { value: 2, label: 'Last 2 Months' },
  { value: 3, label: 'Last 3 Months' },
  { value: 6, label: 'Last 6 Months' },
  { value: 12, label: 'Last 1 Year' },
];

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNav>();
  const { isDark } = useThemeContext();
  const { unreadCount } = useNotificationsContext();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [totals, setTotals] = useState<DashboardTotals | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [overviewRange, setOverviewRange] = useState<OverviewRangeMonths>(1);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [isRangePickerVisible, setIsRangePickerVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const overviewRangeLabel = useMemo(
    () => OVERVIEW_RANGE_OPTIONS.find((opt) => opt.value === overviewRange)?.label ?? 'Last 1 Month',
    [overviewRange]
  );

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadOverview(overviewRange);
  }, [overviewRange]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [summaryData, totalsData, overviewData] = await Promise.all([
        ApiService.getDashboardSummary(),
        ApiService.getDashboardTotals(),
        ApiService.getDashboardOverview(overviewRange),
      ]);
      setSummary(summaryData);
      setTotals(totalsData);
      setOverview(overviewData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOverview = async (months: OverviewRangeMonths) => {
    try {
      setIsOverviewLoading(true);
      const data = await ApiService.getDashboardOverview(months);
      setOverview(data);
    } catch (error) {
      console.error('Error loading overview:', error);
    } finally {
      setIsOverviewLoading(false);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading && !summary) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? Colors.navy : '#F5F7FA' }]}>
        <View style={[styles.loadingContainer]}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={[styles.loadingText, { color: isDark ? Colors.ivory : Colors.navy }]}>
            Loading dashboard...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.navy : '#F5F7FA' }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? [Colors.navy, Colors.navy + 'EE'] : [Colors.navy, '#1E3A5F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color={Colors.white} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Revenue Card - Hero */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <View style={styles.revenueIconContainer}>
              <Ionicons name="wallet" size={20} color={Colors.navy} />
            </View>
            <Text style={styles.revenueLabel}>Total Revenue</Text>
          </View>
          <Text style={styles.revenueValue}>
            RM {formatCurrency(totals?.totalRevenue ?? 0)}
          </Text>
          <View style={styles.revenueFooter}>
            <View style={styles.revenueStat}>
              <Ionicons name="car" size={14} color={Colors.navy + '99'} />
              <Text style={styles.revenueStatText}>
                {totals?.completedRides ?? 0} rides completed
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh}
            tintColor={Colors.gold}
          />
        }
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? Colors.ivory : Colors.navy }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              title="Pending"
              subtitle={`${summary?.pendingUnassigned ?? 0} rides`}
              icon="time-outline"
              color={Colors.warning}
              badge={summary?.pendingUnassigned}
              onPress={() => navigateToBookings(BookingStatus.PENDING)}
            />
            <QuickActionCard
              title="Live Rides"
              subtitle="Monitor"
              icon="location"
              color={Colors.info}
              onPress={() => navigation.navigate('Monitoring')}
            />
            <QuickActionCard
              title="SOS Alerts"
              subtitle={`${summary?.sosTickets ?? 0} active`}
              icon="warning"
              color={Colors.danger}
              badge={summary?.sosTickets}
              onPress={() => navigation.navigate('Bookings', { filterSOS: true })}
            />
            <QuickActionCard
              title="Expenses"
              subtitle="Review"
              icon="receipt-outline"
              color={Colors.success}
              onPress={() => navigation.navigate('Expenses')}
            />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.ivory : Colors.navy, marginBottom: 0 }]}>
              Overview
            </Text>
            <TouchableOpacity
              style={[
                styles.rangeSelector,
                { backgroundColor: isDark ? '#2A2A2A' : Colors.white },
              ]}
              onPress={() => setIsRangePickerVisible(true)}
              activeOpacity={0.8}
            >
              {isOverviewLoading ? (
                <ActivityIndicator size="small" color={Colors.gold} style={{ marginRight: 6 }} />
              ) : null}
              <Text style={[styles.rangeSelectorText, { color: isDark ? Colors.ivory : Colors.navy }]}>
                {overviewRangeLabel}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={isDark ? Colors.ivory : Colors.navy}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statHalf}>
              <StatCard
                title="New Bookings"
                value={overview?.newBookings ?? 0}
                icon="add-circle"
                compact
                onPress={() => navigateToBookings()}
              />
            </View>
            <View style={styles.statHalf}>
              <StatCard
                title="Ongoing Rides"
                value={overview?.ongoingRides ?? 0}
                icon="car-sport"
                compact
                onPress={() => navigateToBookings(BookingStatus.IN_PROGRESS)}
              />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statHalf}>
              <StatCard
                title="Completed"
                value={overview?.completedRides ?? 0}
                icon="checkmark-circle"
                compact
                onPress={() => navigateToBookings(BookingStatus.COMPLETED)}
              />
            </View>
            <View style={styles.statHalf}>
              <StatCard
                title="Cancelled"
                value={overview?.cancelledRides ?? 0}
                icon="close-circle"
                compact
                onPress={() => navigateToBookings(BookingStatus.CANCELLED)}
              />
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.ivory : Colors.navy }]}>
              Recent Activity
            </Text>
            <TouchableOpacity onPress={() => navigateToBookings()}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.activityCard, { backgroundColor: isDark ? '#2A2A2A' : Colors.white }]}>
            <ActivityItem
              icon="car"
              iconColor={Colors.success}
              title="New booking received"
              subtitle="Airport Transfer - Premium"
              time="2m ago"
              onPress={() => navigateToBookings()}
            />
            <ActivityItem
              icon="checkmark-done"
              iconColor={Colors.info}
              title="Driver assigned"
              subtitle="Ahmad - Toyota Camry"
              time="15m ago"
            />
            <ActivityItem
              icon="flag"
              iconColor={Colors.success}
              title="Ride completed"
              subtitle="RM 85.00 - 5★ rating"
              time="32m ago"
            />
            <ActivityItem
              icon="cash"
              iconColor={Colors.warning}
              title="Expense submitted"
              subtitle="Fuel - RM 120.00"
              time="1h ago"
              onPress={() => navigation.navigate('Expenses')}
            />
          </View>
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Overview range picker */}
      <Modal
        visible={isRangePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRangePickerVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsRangePickerVisible(false)}
        >
          <Pressable
            style={[
              styles.rangeMenu,
              { backgroundColor: isDark ? '#1F1F1F' : Colors.white },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.rangeMenuTitle, { color: isDark ? Colors.ivory : Colors.navy }]}>
              Select range
            </Text>
            {OVERVIEW_RANGE_OPTIONS.map((opt) => {
              const selected = opt.value === overviewRange;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.rangeMenuItem,
                    selected && {
                      backgroundColor: (isDark ? Colors.gold : Colors.gold) + '20',
                    },
                  ]}
                  onPress={() => {
                    setOverviewRange(opt.value);
                    setIsRangePickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.rangeMenuItemText,
                      { color: isDark ? Colors.ivory : Colors.navy },
                      selected && { color: Colors.gold, fontWeight: '700' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={Colors.gold} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: Colors.gold,
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.white + '15',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  revenueCard: {
    backgroundColor: Colors.gold,
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  revenueIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  revenueLabel: {
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '600',
  },
  revenueValue: {
    fontSize: 38,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -1,
    marginBottom: 12,
  },
  revenueFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  revenueStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  revenueStatText: {
    fontSize: 13,
    color: Colors.navy + '99',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    marginTop: -12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.gold,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statHalf: {
    flex: 1,
  },
  activityCard: {
    borderRadius: 20,
    padding: 8,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  rangeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  rangeSelectorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  rangeMenu: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  rangeMenuTitle: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rangeMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  rangeMenuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
