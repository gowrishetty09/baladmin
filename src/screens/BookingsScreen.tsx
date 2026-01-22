import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingCard } from '../components/BookingCard';
import { FilterDropdown } from '../components/FilterDropdown';
import { Booking, BookingStatus, BottomTabParamList, RootStackParamList } from '../types';
import { Colors } from '../constants/colors';
import ApiService from '../services/api';
import { useThemeContext } from '../hooks/ThemeContext';

type BookingsNav = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Bookings'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type BookingsRoute = RouteProp<BottomTabParamList, 'Bookings'>;

export const BookingsScreen: React.FC = () => {
  const navigation = useNavigation<BookingsNav>();
  const route = useRoute<BookingsRoute>();
  const { isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [selectedHotel, setSelectedHotel] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | ''>('');

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    const params = route.params;
    if (params?.filter) {
      setSelectedStatus(params.filter);
    }
    if (params?.filterSOS) {
      const sosBookings = bookings.filter((b) => b.hasSOS);
      setFilteredBookings(sosBookings);
    }
  }, [route.params, bookings]);

  useEffect(() => {
    applyFilters();
  }, [bookings, selectedHotel, selectedDriver, selectedStatus, searchQuery]);

  const loadBookings = async () => {
    try {
      setIsLoading(true);
      const data = await ApiService.getBookings();
      setBookings(data);
      setFilteredBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadBookings();
    setIsRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    if (selectedHotel) {
      filtered = filtered.filter((b) => b.hotelName === selectedHotel);
    }

    if (selectedDriver) {
      filtered = filtered.filter((b) => b.driver?.id === selectedDriver);
    }

    if (selectedStatus) {
      filtered = filtered.filter((b) => b.status === selectedStatus);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((b) => {
        const haystack = [
          b.bookingId,
          b.id,
          b.customerName,
          b.customerPhone,
          b.driver?.name,
          b.driver?.vehicleNumber,
          b.pickup?.address,
          b.drop?.address,
          b.hotelName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    setFilteredBookings(filtered);
  };

  const clearFilters = () => {
    setSelectedHotel('');
    setSelectedDriver('');
    setSelectedStatus('');
    setSearchQuery('');
  };

  const handleAssignDriver = (booking: Booking) => {
    navigation.navigate('AssignDriver', { bookingId: booking.id });
  };

  const handleViewDetails = (booking: Booking) => {
    navigation.navigate('BookingDetails', { bookingId: booking.id });
  };

  // Generate filter options from bookings
  const hotelOptions = [
    { label: 'All Hotels', value: '' },
    ...Array.from(new Set(bookings.filter((b) => b.hotelName).map((b) => b.hotelName!)))
      .map((hotel) => ({ label: hotel, value: hotel })),
  ];

  const driverOptions = [
    { label: 'All Drivers', value: '' },
    ...Array.from(
      new Set(
        bookings
          .filter((b) => b.driver)
          .map((b) => JSON.stringify({ id: b.driver!.id, name: b.driver!.name }))
      )
    )
      .map((str) => JSON.parse(str))
      .map((driver) => ({ label: driver.name, value: driver.id })),
  ];

  const statusOptions = [
    { label: 'All Status', value: '' },
    { label: 'Pending', value: BookingStatus.PENDING },
    { label: 'Driver Assigned', value: BookingStatus.DRIVER_ASSIGNED },
    { label: 'In Progress', value: BookingStatus.IN_PROGRESS },
    { label: 'Completed', value: BookingStatus.COMPLETED },
    { label: 'Cancelled', value: BookingStatus.CANCELLED },
  ];

  const hasActiveFilters = selectedHotel || selectedDriver || selectedStatus;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.navy : '#F5F7FA' }]}>
      {/* Modern Header */}
      <LinearGradient
        colors={isDark ? [Colors.navy, Colors.navy + 'EE'] : [Colors.navy, '#1E3A5F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Bookings</Text>
            <Text style={styles.headerSubtitle}>
              {filteredBookings.length} {filteredBookings.length === 1 ? 'ride' : 'rides'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name={showFilters ? 'close' : 'options-outline'}
              size={22}
              color={Colors.white}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {showFilters && (
        <View style={[styles.filtersContainer, { backgroundColor: isDark ? Colors.navy + 'DD' : Colors.white }]}>
          <FilterDropdown
            label="Hotel"
            value={selectedHotel}
            options={hotelOptions}
            onSelect={setSelectedHotel}
            placeholder="All Hotels"
          />

          <FilterDropdown
            label="Driver"
            value={selectedDriver}
            options={driverOptions}
            onSelect={setSelectedDriver}
            placeholder="All Drivers"
          />

          <FilterDropdown
            label="Status"
            value={selectedStatus}
            options={statusOptions}
            onSelect={(value) => setSelectedStatus(value as BookingStatus | '')}
            placeholder="All Status"
          />

          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Ionicons name="refresh" size={18} color={Colors.white} />
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={Colors.navy + '80'} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search bookings"
            placeholderTextColor={Colors.navy + '66'}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={Colors.navy + '80'} />
            </TouchableOpacity>
          )}
        </View>
        {hasActiveFilters && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>Filtered</Text>
          </View>
        )}
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onAssignDriver={() => handleAssignDriver(item)}
            onViewDetails={() => handleViewDetails(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={Colors.ivory} />
            <Text style={styles.emptyText}>No bookings found</Text>
            {hasActiveFilters && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.white + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.gold,
  },
  filtersContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: -12,
    borderRadius: 16,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  clearButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  clearButtonText: {
    color: Colors.white,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchHeader: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.navy,
    marginLeft: 8,
    paddingVertical: 0,
  },
  filterBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterBadgeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
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
  clearFiltersButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: Colors.white,
    fontWeight: '600',
  },
});
