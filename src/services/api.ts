import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
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

// Get base URL from environment or use default
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

let authToken: string | null = null;
let refreshTokenValue: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];
let onRefreshToken: ((refreshToken: string) => Promise<{ accessToken: string; refreshToken: string } | null>) | null = null;
let onAuthFailed: (() => void) | null = null;

export const setAuthToken = (token?: string | null) => {
  authToken = token ?? null;
  if (authToken) {
    http.defaults.headers.common.Authorization = `Bearer ${authToken}`;
  } else {
    // In some runtimes (notably bridgeless/new-arch), deleting a property can throw
    // if it was defined as non-configurable. Prefer best-effort removal.
    try {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (http.defaults.headers.common as any).Authorization;
    } catch {
      try {
        (http.defaults.headers.common as any).Authorization = undefined;
      } catch {
        // ignore
      }
    }
  }
};

export const setRefreshToken = (token?: string | null) => {
  refreshTokenValue = token ?? null;
};

export const getRefreshToken = () => refreshTokenValue;

export const setRefreshHandler = (handler: typeof onRefreshToken) => {
  onRefreshToken = handler;
};

export const setAuthFailedHandler = (handler: typeof onAuthFailed) => {
  onAuthFailed = handler;
};

const subscribeToRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onRefreshComplete = (newToken: string) => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
};

http.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');

    if (error.response?.status === 401 && !isAuthEndpoint && originalRequest) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeToRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(http(originalRequest));
          });
        });
      }

      if (refreshTokenValue && onRefreshToken) {
        isRefreshing = true;
        try {
          const result = await onRefreshToken(refreshTokenValue);
          if (result) {
            setAuthToken(result.accessToken);
            setRefreshToken(result.refreshToken);
            onRefreshComplete(result.accessToken);
            originalRequest.headers.Authorization = `Bearer ${result.accessToken}`;
            return http(originalRequest);
          }
        } catch (refreshError) {
          if (onAuthFailed) {
            onAuthFailed();
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        if (onAuthFailed) {
          onAuthFailed();
        }
      }
    }

    return Promise.reject(error);
  }
);

class ApiService {
  private api = http;

  // Auth
  async loginAdmin(email: string, password: string) {
    const { data } = await this.api.post('/auth/login', { email, password });
    return data;
  }

  async refreshAdminToken(refreshToken: string) {
    const { data } = await this.api.post('/auth/refresh', { refreshToken });
    return data;
  }

  async fetchCurrentAdmin() {
    const { data } = await this.api.get('/auth/me');
    return data;
  }

  // Dashboard
  async getDashboardSummary(from?: string, to?: string): Promise<DashboardSummary> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      const fromDate = from || startOfDay;
      const toDate = to || endOfDay;

      const response = await this.api.get('/dashboard/bookings-summary', {
        params: { from: fromDate, to: toDate },
      });

      const bookings = response.data || [];
      return {
        newBookingsToday: bookings.filter((b: any) => b.status === 'PENDING').length,
        ongoingRides: bookings.filter((b: any) => b.status === 'IN_PROGRESS').length,
        pendingUnassigned: bookings.filter((b: any) => b.status === 'PENDING' && !b.driver).length,
        completedRides: bookings.filter((b: any) => b.status === 'COMPLETED').length,
        sosTickets: bookings.filter((b: any) => b.hasSOS).length,
        totalRevenue: bookings.reduce((sum: number, b: any) => sum + (b.fare || 0), 0),
      };
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
    limit?: number;
    offset?: number;
  }): Promise<Booking[]> {
    try {
      const params: any = {
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      };

      if (filters?.status) params.status = filters.status;
      if (filters?.driver) params.driverId = filters.driver;
      if (filters?.hotel) params.hotelId = filters.hotel;

      const response = await this.api.get('/bookings', { params });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  }

  async getBookingById(bookingId: string): Promise<Booking> {
    try {
      const response = await this.api.get(`/bookings/${bookingId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching booking:', error);
      throw error;
    }
  }

  async assignDriver(bookingId: string, driverId: string, vehicleId?: string): Promise<Booking> {
    try {
      const response = await this.api.post(`/bookings/${bookingId}/assign`, {
        driverId,
        vehicleId,
      });
      return response.data;
    } catch (error) {
      console.error('Error assigning driver:', error);
      throw error;
    }
  }

  // Notifications
  async getNotifications(limit: number = 50, offset: number = 0): Promise<Notification[]> {
    try {
      const response = await this.api.get('/notifications', {
        params: { limit, offset },
      });
      return response.data?.notifications || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await this.api.patch(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async getUnreadNotificationCount(): Promise<number> {
    try {
      const response = await this.api.get('/notifications/unread-count');
      return response.data?.count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  // Drivers
  async getAvailableDrivers(): Promise<Driver[]> {
    try {
      const response = await this.api.get('/dispatch/available-drivers');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching available drivers:', error);
      throw error;
    }
  }

  // Push notifications - FCM
  async registerFCMToken(token: string): Promise<void> {
    try {
      const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
      await this.api.post('/notifications/register-device', {
        token,
        platform,
      });
      console.log(`FCM token registered successfully on ${platform}`);
    } catch (error) {
      console.error('Error registering FCM token:', error);
    }
  }

  async unregisterFCMToken(token: string): Promise<void> {
    try {
      await this.api.delete('/notifications/unregister-device', {
        data: { token },
      });
      console.log('FCM token unregistered successfully');
    } catch (error) {
      console.error('Error unregistering FCM token:', error);
    }
  }
}

const apiService = new ApiService();

export default apiService;
