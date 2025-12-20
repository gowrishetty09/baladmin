// Booking related types
export enum BookingStatus {
  PENDING = 'PENDING',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum BookingSource {
  HOTEL = 'HOTEL',
  KIOSK = 'KIOSK',
  WALK_IN = 'WALK_IN',
  CUSTOMER = 'CUSTOMER',
}

export enum VehicleCategory {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  LUXURY = 'LUXURY',
  VAN = 'VAN',
  LIMOUSINE = 'LIMOUSINE',
}

export interface Location {
  address: string;
  lat: number;
  lng: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleCategory: VehicleCategory;
  rating: number;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
}

export interface Booking {
  id: string;
  bookingId: string;
  pickup: Location;
  drop: Location;
  source: BookingSource;
  vehicleCategory: VehicleCategory;
  status: BookingStatus;
  driver?: Driver;
  customerName: string;
  customerPhone: string;
  scheduledTime: string;
  createdAt: string;
  hasSOS: boolean;
  sosMessage?: string;
  hotelName?: string;
  kioskLocation?: string;
  fare?: number;
}

// Dashboard types
export interface DashboardSummary {
  newBookingsToday: number;
  ongoingRides: number;
  pendingUnassigned: number;
  completedRides: number;
  sosTickets: number;
  totalRevenue: number;
}

// Notification types
export enum NotificationType {
  NEW_BOOKING = 'NEW_BOOKING',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  RIDE_STARTED = 'RIDE_STARTED',
  RIDE_COMPLETED = 'RIDE_COMPLETED',
  SOS_RAISED = 'SOS_RAISED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  bookingId?: string;
  isRead: boolean;
  createdAt: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Filter types
export interface BookingFilters {
  hotel?: string;
  driver?: string;
  status?: BookingStatus;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Navigation types
export type RootStackParamList = {
  MainTabs: undefined;
  BookingDetails: { bookingId: string };
  AssignDriver: { bookingId: string };
};

export type BottomTabParamList = {
  Home: undefined;
  Bookings: { filter?: BookingStatus; filterSOS?: boolean } | undefined;
  Notifications: undefined;
  Profile: undefined;
};
