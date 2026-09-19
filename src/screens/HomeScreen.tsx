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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
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
} from '../types';
import { Colors } from '../constants/colors';
import ApiService from '../services/api';
import { useThemeContext } from '../hooks/ThemeContext';
import { useNotificationsContext } from '../hooks/NotificationsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

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
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isRangePickerVisible, setIsRangePickerVisible] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customRangeLabel, setCustomRangeLabel] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (opts?: { from?: string; to?: string }) => {
    try {
      setIsLoading(true);

      // Use explicit opts when provided (custom range), otherwise default to current month
      const now = new Date();
      const from = opts?.from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const to = opts?.to ?? now.toISOString().slice(0, 10);

      const [summaryData, overviewData] = await Promise.all([
        ApiService.getDashboardSummary(from, to),
        ApiService.getDashboardOverview(1, from, to),
      ]);
      setSummary(summaryData);
      setOverview(overviewData);
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
            <TouchableOpacity
              style={styles.revenueCalendarBtn}
              onPress={() => setIsRangePickerVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color={Colors.navy} />
            </TouchableOpacity>
          </View>
          <Text style={styles.revenueValue}>
            RM {formatCurrency(overview?.totalRevenue ?? 0)}
          </Text>
          <View style={styles.revenueFooter}>
            <View style={styles.revenueStat}>
              <Ionicons name="car" size={14} color={Colors.navy + '99'} />
              <Text style={styles.revenueStatText}>
                {overview?.newBookings ?? 0} bookings
              </Text>
            </View>
            {customRangeLabel && (
              <Text style={styles.revenueRangeText}>{customRangeLabel}</Text>
            )}
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
              style={styles.overviewCalendarBtn}
              onPress={() => setIsRangePickerVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={isDark ? Colors.ivory : Colors.navy} />
              {customRangeLabel ? (
                <Text style={[styles.overviewRangeLabel, { color: isDark ? Colors.gold : Colors.navy }]}>
                  {customRangeLabel}
                </Text>
              ) : null}
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
            <Text style={[styles.rangeMenuTitle, { color: isDark ? Colors.ivory : Colors.navy }]}>Select date range</Text>

            {/* FROM picker */}
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerLabelRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.gold} />
                <Text style={[styles.datePickerLabel, { color: isDark ? Colors.ivory + 'AA' : Colors.navy + 'AA' }]}>From</Text>
                {customFrom ? <Text style={[styles.datePickerValue, { color: isDark ? Colors.ivory : Colors.navy }]}>{customFrom}</Text> : null}
              </View>
              <DateTimePicker
                value={customFrom ? new Date(customFrom) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                maximumDate={new Date()}
                onChange={(_e, selected) => {
                  if (selected) setCustomFrom(selected.toISOString().slice(0, 10));
                }}
              />
            </View>

            {/* TO picker */}
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerLabelRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.gold} />
                <Text style={[styles.datePickerLabel, { color: isDark ? Colors.ivory + 'AA' : Colors.navy + 'AA' }]}>To</Text>
                {customTo ? <Text style={[styles.datePickerValue, { color: isDark ? Colors.ivory : Colors.navy }]}>{customTo}</Text> : null}
              </View>
              <DateTimePicker
                value={customTo ? new Date(customTo) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                maximumDate={new Date()}
                onChange={(_e, selected) => {
                  if (selected) setCustomTo(selected.toISOString().slice(0, 10));
                }}
              />
            </View>

            <View style={styles.datePickerActions}>
              <TouchableOpacity
                onPress={() => {
                  setCustomFrom('');
                  setCustomTo('');
                  setCustomRangeLabel(null);
                  setIsRangePickerVisible(false);
                  loadDashboardData();
                }}
                style={styles.datePickerCancelBtn}
              >
                <Text style={{ color: isDark ? Colors.ivory : Colors.navy, fontWeight: '600' }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!customFrom || !customTo || new Date(customFrom) > new Date(customTo)) return;
                  setCustomRangeLabel(`${customFrom} → ${customTo}`);
                  setIsRangePickerVisible(false);
                  loadDashboardData({ from: customFrom, to: customTo });
                }}
                style={[styles.datePickerApplyBtn, (!customFrom || !customTo) && { opacity: 0.4 }]}
              >
                <Text style={{ color: Colors.white, fontWeight: '700' }}>Apply</Text>
              </TouchableOpacity>
            </View>
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
    flex: 1,
  },
  revenueCalendarBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.white + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueRangeText: {
    fontSize: 11,
    color: Colors.navy + 'BB',
    fontWeight: '500',
    marginTop: 4,
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
  overviewCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
  },
  overviewRangeLabel: {
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 120,
  },
  datePickerRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  datePickerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  datePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  datePickerValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 16,
  },
  datePickerCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  datePickerApplyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.gold,
    borderRadius: 10,
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
