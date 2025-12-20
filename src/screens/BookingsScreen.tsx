import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { GradientBackground } from '../components/GradientBackground';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

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
  }, [bookings, selectedHotel, selectedDriver, selectedStatus]);

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

    setFilteredBookings(filtered);
  };

  const clearFilters = () => {
    setSelectedHotel('');
    setSelectedDriver('');
    setSelectedStatus('');
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
    <GradientBackground>
      <View style={[styles.header, !isDark && { backgroundColor: Colors.white }]}>
        <Text style={[styles.headerTitle, !isDark && { color: Colors.navy }]}>Bookings</Text>
        <TouchableOpacity
          style={[styles.filterButton, !isDark && { backgroundColor: Colors.gold + '15' }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? 'close' : 'filter'}
            size={24}
            color={isDark ? Colors.ivory : Colors.gold}
          />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
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

      <View style={styles.resultHeader}>
        <Text style={styles.resultText}>
          {filteredBookings.length} {filteredBookings.length === 1 ? 'Booking' : 'Bookings'}
        </Text>
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
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.ivory,
  },
  filterButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  filtersContainer: {
    backgroundColor: Colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
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
  resultHeader: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  resultText: {
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '500',
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
