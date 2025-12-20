import axios, { AxiosInstance } from 'axios';
import {
  Booking,
  BookingStatus,
  BookingSource,
  VehicleCategory,
  DashboardSummary,
  Notification,
  NotificationType,
  ApiResponse,
  Driver,
} from '../types';

// Mock base URL - replace with actual API URL when ready
const BASE_URL = 'https://api.yourdomain.com/admin';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth token
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token here when available
        // const token = await getAuthToken();
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      // const response = await this.api.get<ApiResponse<DashboardSummary>>('/dashboard/summary');
      // return response.data.data;

      // Mock data for now
      return this.getMockDashboardSummary();
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      throw error;
    }
  }

  // Bookings
  async getBookings(filters?: {
    hotel?: string;
    driver?: string;
    status?: BookingStatus;
  }): Promise<Booking[]> {
    try {
      // const response = await this.api.get<ApiResponse<Booking[]>>('/bookings', { params: filters });
      // return response.data.data;

      // Mock data for now
      return this.getMockBookings(filters);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  }

  async getBookingById(bookingId: string): Promise<Booking> {
    try {
      // const response = await this.api.get<ApiResponse<Booking>>(`/bookings/${bookingId}`);
      // return response.data.data;

      // Mock data for now
      const bookings = this.getMockBookings();
      const booking = bookings.find(b => b.id === bookingId || b.bookingId === bookingId);
      if (!booking) throw new Error('Booking not found');
      return booking;
    } catch (error) {
      console.error('Error fetching booking:', error);
      throw error;
    }
  }

  async assignDriver(bookingId: string, driverId: string): Promise<Booking> {
    try {
      // const response = await this.api.post<ApiResponse<Booking>>('/assign-driver', {
      //   bookingId,
      //   driverId,
      // });
      // return response.data.data;

      // Mock response
      console.log(`Assigning driver ${driverId} to booking ${bookingId}`);
      const booking = await this.getBookingById(bookingId);
      return {
        ...booking,
        status: BookingStatus.DRIVER_ASSIGNED,
        driver: this.getMockDrivers().find(d => d.id === driverId),
      };
    } catch (error) {
      console.error('Error assigning driver:', error);
      throw error;
    }
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    try {
      // const response = await this.api.get<ApiResponse<Notification[]>>('/notifications');
      // return response.data.data;

      // Mock data for now
      return this.getMockNotifications();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      // await this.api.put(`/notifications/${notificationId}/read`);
      console.log(`Marking notification ${notificationId} as read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Drivers
  async getAvailableDrivers(): Promise<Driver[]> {
    try {
      // const response = await this.api.get<ApiResponse<Driver[]>>('/drivers/available');
      // return response.data.data;

      // Mock data for now
      return this.getMockDrivers().filter(d => d.status === 'AVAILABLE');
    } catch (error) {
      console.error('Error fetching available drivers:', error);
      throw error;
    }
  }

  // Push notifications - FCM
  async registerPushToken(token: string): Promise<void> {
    try {
      // const response = await this.api.post('/admin/register-push-token', {
      //   token,
      //   role: 'ADMIN',
      // });
      // Log for now; replace with real endpoint once backend is ready
      console.log('FCM push token registered:', token);
    } catch (error) {
      console.error('Error registering FCM push token:', error);
      // Don't throw; it's non-critical
    }
  }

  /**
   * Register FCM device token with backend
   * @param token FCM device token from Firebase Cloud Messaging
   * @param role User role (ADMIN, DRIVER, CUSTOMER)
   */
  async registerFCMToken(token: string, role: string = 'ADMIN'): Promise<void> {
    try {
      // const response = await this.api.post('/device/register-fcm-token', {
      //   token,
      //   role,
      //   deviceType: Platform.OS,
      //   timestamp: new Date().toISOString(),
      // });
      // Log for now; replace with real endpoint once backend is ready
      console.log(`FCM token registered for role ${role}:`, token);
    } catch (error) {
      console.error('Error registering FCM token:', error);
      // Don't throw; it's non-critical
    }
  }

  // Mock data methods
  private getMockDashboardSummary(): DashboardSummary {
    return {
      newBookingsToday: 12,
      ongoingRides: 8,
      pendingUnassigned: 5,
      completedRides: 34,
      sosTickets: 2,
      totalRevenue: 4250.50,
    };
  }

  private getMockDrivers(): Driver[] {
    return [
      {
        id: 'D001',
        name: 'John Smith',
        phone: '+1-555-0101',
        vehicleNumber: 'ABC-1234',
        vehicleCategory: VehicleCategory.SEDAN,
        rating: 4.8,
        status: 'AVAILABLE',
      },
      {
        id: 'D002',
        name: 'Mike Johnson',
        phone: '+1-555-0102',
        vehicleNumber: 'XYZ-5678',
        vehicleCategory: VehicleCategory.SUV,
        rating: 4.6,
        status: 'BUSY',
      },
      {
        id: 'D003',
        name: 'Robert Davis',
        phone: '+1-555-0103',
        vehicleNumber: 'LMN-9012',
        vehicleCategory: VehicleCategory.LUXURY,
        rating: 4.9,
        status: 'AVAILABLE',
      },
      {
        id: 'D004',
        name: 'David Wilson',
        phone: '+1-555-0104',
        vehicleNumber: 'PQR-3456',
        vehicleCategory: VehicleCategory.LIMOUSINE,
        rating: 4.7,
        status: 'AVAILABLE',
      },
    ];
  }

  private getMockBookings(filters?: {
    hotel?: string;
    driver?: string;
    status?: BookingStatus;
  }): Booking[] {
    const allBookings: Booking[] = [
      {
        id: '1',
        bookingId: 'BK-001',
        pickup: { address: 'Grand Hyatt Hotel, Downtown', lat: 40.7589, lng: -73.9851 },
        drop: { address: 'JFK Airport, Terminal 4', lat: 40.6413, lng: -73.7781 },
        source: BookingSource.HOTEL,
        vehicleCategory: VehicleCategory.SEDAN,
        status: BookingStatus.DRIVER_ASSIGNED,
        driver: this.getMockDrivers()[0],
        customerName: 'Sarah Williams',
        customerPhone: '+1-555-1001',
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        hasSOS: false,
        hotelName: 'Grand Hyatt',
        fare: 85.00,
      },
      {
        id: '2',
        bookingId: 'BK-002',
        pickup: { address: 'Marriott Hotel, Midtown', lat: 40.7589, lng: -73.9851 },
        drop: { address: 'LaGuardia Airport', lat: 40.7769, lng: -73.8740 },
        source: BookingSource.HOTEL,
        vehicleCategory: VehicleCategory.SUV,
        status: BookingStatus.PENDING,
        customerName: 'James Anderson',
        customerPhone: '+1-555-1002',
        scheduledTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        hasSOS: false,
        hotelName: 'Marriott',
        fare: 95.00,
      },
      {
        id: '3',
        bookingId: 'BK-003',
        pickup: { address: 'Times Square Kiosk', lat: 40.758, lng: -73.9855 },
        drop: { address: 'Central Park West', lat: 40.7829, lng: -73.9654 },
        source: BookingSource.KIOSK,
        vehicleCategory: VehicleCategory.SEDAN,
        status: BookingStatus.IN_PROGRESS,
        driver: this.getMockDrivers()[1],
        customerName: 'Emily Brown',
        customerPhone: '+1-555-1003',
        scheduledTime: new Date().toISOString(),
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        hasSOS: false,
        kioskLocation: 'Times Square',
        fare: 45.00,
      },
      {
        id: '4',
        bookingId: 'BK-004',
        pickup: { address: 'The Plaza Hotel', lat: 40.7644, lng: -73.9747 },
        drop: { address: 'Newark Airport', lat: 40.6895, lng: -74.1745 },
        source: BookingSource.HOTEL,
        vehicleCategory: VehicleCategory.LUXURY,
        status: BookingStatus.PENDING,
        customerName: 'Michael Chen',
        customerPhone: '+1-555-1004',
        scheduledTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        hasSOS: false,
        hotelName: 'The Plaza',
        fare: 150.00,
      },
      {
        id: '5',
        bookingId: 'BK-005',
        pickup: { address: 'Waldorf Astoria', lat: 40.7565, lng: -73.9735 },
        drop: { address: 'Madison Square Garden', lat: 40.7505, lng: -73.9934 },
        source: BookingSource.HOTEL,
        vehicleCategory: VehicleCategory.LIMOUSINE,
        status: BookingStatus.IN_PROGRESS,
        driver: this.getMockDrivers()[3],
        customerName: 'Jennifer Martinez',
        customerPhone: '+1-555-1005',
        scheduledTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        hasSOS: true,
        sosMessage: 'Vehicle breakdown - need immediate assistance',
        hotelName: 'Waldorf Astoria',
        fare: 200.00,
      },
      {
        id: '6',
        bookingId: 'BK-006',
        pickup: { address: 'Penn Station', lat: 40.7505, lng: -73.9934 },
        drop: { address: 'Brooklyn Bridge', lat: 40.7061, lng: -73.9969 },
        source: BookingSource.WALK_IN,
        vehicleCategory: VehicleCategory.SEDAN,
        status: BookingStatus.COMPLETED,
        driver: this.getMockDrivers()[0],
        customerName: 'Robert Taylor',
        customerPhone: '+1-555-1006',
        scheduledTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        hasSOS: false,
        fare: 55.00,
      },
      {
        id: '7',
        bookingId: 'BK-007',
        pickup: { address: 'Hilton Hotel, Financial District', lat: 40.7089, lng: -74.0090 },
        drop: { address: 'Statue of Liberty Ferry', lat: 40.7033, lng: -74.0170 },
        source: BookingSource.HOTEL,
        vehicleCategory: VehicleCategory.SUV,
        status: BookingStatus.PENDING,
        customerName: 'Lisa Garcia',
        customerPhone: '+1-555-1007',
        scheduledTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        hasSOS: false,
        hotelName: 'Hilton',
        fare: 40.00,
      },
      {
        id: '8',
        bookingId: 'BK-008',
        pickup: { address: 'Columbus Circle Kiosk', lat: 40.7681, lng: -73.9819 },
        drop: { address: 'Empire State Building', lat: 40.7484, lng: -73.9857 },
        source: BookingSource.KIOSK,
        vehicleCategory: VehicleCategory.SEDAN,
        status: BookingStatus.PENDING,
        customerName: 'Daniel Lee',
        customerPhone: '+1-555-1008',
        scheduledTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        hasSOS: true,
        sosMessage: 'Customer unable to locate pickup point',
        kioskLocation: 'Columbus Circle',
        fare: 30.00,
      },
    ];

    // Apply filters
    let filteredBookings = allBookings;

    if (filters?.status) {
      filteredBookings = filteredBookings.filter(b => b.status === filters.status);
    }

    if (filters?.hotel) {
      filteredBookings = filteredBookings.filter(b => b.hotelName === filters.hotel);
    }

    if (filters?.driver) {
      filteredBookings = filteredBookings.filter(b => b.driver?.id === filters.driver);
    }

    return filteredBookings;
  }

  private getMockNotifications(): Notification[] {
    return [
      {
        id: 'N001',
        type: NotificationType.SOS_RAISED,
        title: 'SOS Alert',
        message: 'Vehicle breakdown reported for booking BK-005',
        bookingId: 'BK-005',
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        priority: 'HIGH',
      },
      {
        id: 'N002',
        type: NotificationType.NEW_BOOKING,
        title: 'New Booking',
        message: 'New booking received from Grand Hyatt Hotel',
        bookingId: 'BK-001',
        isRead: false,
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        priority: 'MEDIUM',
      },
      {
        id: 'N003',
        type: NotificationType.DRIVER_ASSIGNED,
        title: 'Driver Assigned',
        message: 'Driver John Smith assigned to booking BK-001',
        bookingId: 'BK-001',
        isRead: true,
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        priority: 'MEDIUM',
      },
      {
        id: 'N004',
        type: NotificationType.RIDE_STARTED,
        title: 'Ride Started',
        message: 'Ride for booking BK-003 has started',
        bookingId: 'BK-003',
        isRead: true,
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        priority: 'LOW',
      },
      {
        id: 'N005',
        type: NotificationType.RIDE_COMPLETED,
        title: 'Ride Completed',
        message: 'Ride for booking BK-006 completed successfully',
        bookingId: 'BK-006',
        isRead: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        priority: 'LOW',
      },
      {
        id: 'N006',
        type: NotificationType.SOS_RAISED,
        title: 'SOS Alert',
        message: 'Customer unable to locate pickup point - BK-008',
        bookingId: 'BK-008',
        isRead: false,
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        priority: 'HIGH',
      },
      {
        id: 'N007',
        type: NotificationType.NEW_BOOKING,
        title: 'New Booking',
        message: 'New booking from Marriott Hotel requiring immediate attention',
        bookingId: 'BK-002',
        isRead: false,
        createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        priority: 'MEDIUM',
      },
    ];
  }
}

export default new ApiService();
