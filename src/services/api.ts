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
  Expense,
  ExpenseStatus,
} from '../types';

// Get base URL from environment or use default
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://bestaerolimo.online/api';

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

const shouldLogHttp =
  (__DEV__ && (process.env.EXPO_PUBLIC_DEBUG_HTTP === '1' || process.env.EXPO_PUBLIC_DEBUG_HTTP === 'true'));

const getRequestLabel = (config: any) => {
  const method = String(config?.method ?? 'GET').toUpperCase();
  const url = String(config?.baseURL ? `${config.baseURL}${config.url ?? ''}` : config?.url ?? '');
  return `${method} ${url}`.trim();
};

const normalizeBookingStatus = (rawStatus: any): BookingStatus => {
  switch (String(rawStatus ?? '').toUpperCase()) {
    case 'ASSIGNED':
      return BookingStatus.DRIVER_ASSIGNED;
    case 'EN_ROUTE':
    case 'ARRIVED':
    case 'PICKED_UP':
      return BookingStatus.IN_PROGRESS;
    case 'COMPLETED':
      return BookingStatus.COMPLETED;
    case 'CANCELLED':
    case 'NO_SHOW':
      return BookingStatus.CANCELLED;
    case 'REQUESTED':
    case 'ACCEPTED':
    default:
      return BookingStatus.PENDING;
  }
};

const normalizeBookingSource = (rawSource: any): BookingSource => {
  switch (String(rawSource ?? '').toUpperCase()) {
    case 'HOTEL_PORTAL':
    case 'HOTEL':
      return BookingSource.HOTEL;
    case 'KIOSK':
      return BookingSource.KIOSK;
    case 'CUSTOMER_APP':
    case 'CUSTOMER':
      return BookingSource.CUSTOMER;
    case 'WALK_IN':
      return BookingSource.WALK_IN;
    default:
      return BookingSource.CUSTOMER;
  }
};

const normalizeBooking = (raw: any): Booking => {
  const id = String(raw?.id ?? '');
  const bookingId = String(raw?.bookingId ?? (id ? id.slice(-8).toUpperCase() : ''));
  const pickupAddress = String(raw?.pickup?.address ?? raw?.pickupLocation ?? '');
  const dropAddress = String(raw?.drop?.address ?? raw?.dropLocation ?? '');

  const customerName =
    String(raw?.guestName ?? raw?.customerName ?? raw?.customer?.name ?? '');
  const customerPhone =
    String(raw?.guestPhone ?? raw?.customerPhone ?? raw?.customer?.phone ?? '');
  const customerEmail =
    raw?.guestEmail ?? raw?.customerEmail ?? raw?.customer?.email ?? undefined;

  const fareCandidate =
    raw?.finalAmount ?? raw?.finalPrice ?? raw?.paymentAmount ?? raw?.quotedPrice ?? raw?.fare;
  const fare = fareCandidate !== undefined && fareCandidate !== null ? Number(fareCandidate) : undefined;

  return {
    id,
    bookingId,
    pickup: {
      address: pickupAddress,
      lat: Number(raw?.pickup?.lat ?? raw?.pickup?.latitude ?? 0),
      lng: Number(raw?.pickup?.lng ?? raw?.pickup?.longitude ?? 0),
    },
    drop: {
      address: dropAddress,
      lat: Number(raw?.drop?.lat ?? raw?.drop?.latitude ?? 0),
      lng: Number(raw?.drop?.lng ?? raw?.drop?.longitude ?? 0),
    },
    source: normalizeBookingSource(raw?.source),
    vehicleCategory:
      (raw?.vehicleCategory as VehicleCategory) ??
      (raw?.vehicle?.category?.name as VehicleCategory) ??
      VehicleCategory.SEDAN,
    status: normalizeBookingStatus(raw?.status),
    driver: raw?.driver
      ? {
        id: String(raw.driver.id ?? ''),
        name: String(raw.driver.name ?? ''),
        phone: String(raw.driver.phone ?? ''),
        vehicleNumber: String(raw.driver.vehicleNumber ?? ''),
        vehicleCategory:
          (raw.driver.vehicleCategory as VehicleCategory) ?? VehicleCategory.SEDAN,
        rating: Number(raw.driver.rating ?? 0),
        status: (raw.driver.status as any) ?? 'AVAILABLE',
      }
      : undefined,
    customerName,
    customerPhone,
    customerEmail,
    scheduledTime: String(raw?.scheduledTime ?? raw?.pickupTime ?? raw?.createdAt ?? ''),
    createdAt: String(raw?.createdAt ?? ''),
    hasSOS: Boolean(raw?.hasSOS ?? (Array.isArray(raw?.sosAlerts) && raw.sosAlerts.length > 0)),
    sosMessage: raw?.sosMessage,
    hotelName: raw?.hotelName ?? raw?.hotel?.name ?? undefined,
    kioskLocation: raw?.kioskLocation ?? undefined,
    fare: Number.isFinite(fare) ? fare : undefined,
    // Timing fields
    pickupTime: raw?.pickupTime ?? undefined,
    dropTime: raw?.dropTime ?? undefined,
    enRouteAt: raw?.enRouteAt ?? undefined,
    arrivedAt: raw?.arrivedAt ?? undefined,
    rideStartedAt: raw?.rideStartedAt ?? undefined,
    completedAt: raw?.completedAt ?? undefined,
    // Flight info
    flightNumber: raw?.flightNumber ?? undefined,
    flightEta: raw?.flightEta ?? undefined,
    // Hotel/Kiosk specific
    hotelId: raw?.hotelId ?? undefined,
    kioskId: raw?.kioskId ?? undefined,
    guestName: raw?.guestName ?? undefined,
    guestPhone: raw?.guestPhone ?? undefined,
    guestEmail: raw?.guestEmail ?? undefined,
    roomNumber: raw?.roomNumber ?? undefined,
    notes: raw?.notes ?? undefined,
    // Customer specific
    customerId: raw?.customerId ?? raw?.customer?.id ?? undefined,
    // Vehicle info
    vehicleCategoryId: raw?.vehicleCategoryId ?? raw?.vehicle?.categoryId ?? undefined,
    vehicle: raw?.vehicle ? {
      id: String(raw.vehicle.id ?? ''),
      registrationNumber: raw.vehicle.registrationNumber ?? raw.vehicle.plateNumber ?? undefined,
      make: raw.vehicle.make ?? undefined,
      model: raw.vehicle.model ?? undefined,
    } : undefined,
    // Ride type
    rideType: raw?.rideType ?? undefined,
    tourPackageId: raw?.tourPackageId ?? undefined,
  };
};

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
  if (shouldLogHttp) {
    (config as any).metadata = { startTime: Date.now() };
    console.log(`[HTTP] → ${getRequestLabel(config)}`);
  }
  if (authToken) {
    config.headers = config.headers ?? {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    if (shouldLogHttp) {
      const meta = (response.config as any)?.metadata;
      const ms = meta?.startTime ? Date.now() - meta.startTime : undefined;
      const suffix = ms !== undefined ? ` (${ms}ms)` : '';
      console.log(`[HTTP] ← ${response.status} ${getRequestLabel(response.config)}${suffix}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    if (shouldLogHttp) {
      const cfg: any = error.config;
      const meta = cfg?.metadata;
      const ms = meta?.startTime ? Date.now() - meta.startTime : undefined;
      const suffix = ms !== undefined ? ` (${ms}ms)` : '';
      const status = error.response?.status;
      console.log(`[HTTP] ← ${status ?? 'ERR'} ${getRequestLabel(cfg)}${suffix}`);
    }
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');

    if (error.response?.status === 401 && !isAuthEndpoint && originalRequest) {
      const hadAuthHeader = Boolean((originalRequest as any)?.headers?.Authorization);
      const hadAnyAuth = Boolean(authToken || refreshTokenValue || hadAuthHeader);

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
        // Only treat as an auth failure if we were actually authenticated.
        if (hadAnyAuth && onAuthFailed) {
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
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      const fromDate = startOfMonth || from;
      const toDate = endOfToday || to;

      const response = await this.api.get('/dashboard/bookings-summary', {
        params: { from: fromDate, to: toDate },
      });

      // Backend returns an aggregated array like:
      // [{ date, total, requested, accepted, assigned, completed }]
      const rows = Array.isArray(response.data) ? response.data : [];
      const todayKey = new Date().toISOString().slice(0, 10);
      const latestRow = rows.length ? rows[rows.length - 1] : null;
      const todayRow = rows.find((row: any) => row?.date === todayKey) ?? latestRow;

      const total = Number(todayRow?.total ?? 0);
      const requested = Number(todayRow?.requested ?? 0);
      const accepted = Number(todayRow?.accepted ?? 0);
      const assigned = Number(todayRow?.assigned ?? 0);
      const completed = Number(todayRow?.completed ?? 0);

      return {
        // Use total as the "today" count (falls back to latest available day).
        newBookingsToday: total,
        // Approximate ongoing rides from assigned+accepted (backend does not expose IN_PROGRESS here).
        ongoingRides: accepted + assigned,
        pendingUnassigned: requested,
        completedRides: completed,
        // Not provided by this endpoint.
        sosTickets: 0,
        totalRevenue: 0,
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

      // Backend expects BookingStatus values like REQUESTED/ASSIGNED/EN_ROUTE/etc.
      if (filters?.status) {
        params.status =
          filters.status === BookingStatus.PENDING
            ? 'REQUESTED'
            : filters.status === BookingStatus.DRIVER_ASSIGNED
              ? 'ASSIGNED'
              : filters.status === BookingStatus.IN_PROGRESS
                ? 'EN_ROUTE'
                : filters.status === BookingStatus.COMPLETED
                  ? 'COMPLETED'
                  : filters.status === BookingStatus.CANCELLED
                    ? 'CANCELLED'
                    : undefined;
      }
      if (filters?.driver) params.driverId = filters.driver;
      if (filters?.hotel) params.hotelId = filters.hotel;

      const response = await this.api.get('/bookings', { params });
      const items = Array.isArray(response.data) ? response.data : [];
      return items.map(normalizeBooking);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  }

  async getBookingById(bookingId: string): Promise<Booking> {
    try {
      const response = await this.api.get(`/bookings/${bookingId}`);
      return normalizeBooking(response.data);
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
  async getAvailableDrivers(options?: { vehicleCategoryId?: string }): Promise<Driver[]> {
    try {
      const params: Record<string, string> = {};
      if (options?.vehicleCategoryId) {
        params.vehicleCategoryId = options.vehicleCategoryId;
      }
      const response = await this.api.get('/dispatch/available-drivers', { params });
      // Backend returns { data: [...], meta: {...} } format
      const rawData = response.data?.data ?? response.data ?? [];
      const items = Array.isArray(rawData) ? rawData : [];
      // Normalize driver data to match frontend Driver type
      return items.map((d: any) => ({
        id: String(d.id ?? ''),
        name: String(d.name ?? ''),
        phone: String(d.phone ?? ''),
        vehicleNumber: d.vehicles?.[0]?.registrationNumber ?? '',
        vehicleCategory: d.vehicles?.[0]?.category?.name ?? 'SEDAN',
        rating: Number(d.rating ?? 4.5),
        status: d.status === 'ACTIVE' ? 'AVAILABLE' : d.status ?? 'AVAILABLE',
      }));
    } catch (error) {
      console.error('Error fetching available drivers:', error);
      throw error;
    }
  }

  async reassignDriver(bookingId: string, driverId: string, vehicleId?: string): Promise<Booking> {
    try {
      const response = await this.api.post(`/bookings/${bookingId}/assign`, {
        driverId,
        vehicleId,
      });
      return response.data;
    } catch (error) {
      console.error('Error reassigning driver:', error);
      throw error;
    }
  }

  // Expenses (Admin)
  async getAdminExpenses(filters?: {
    status?: ExpenseStatus;
    startDate?: string;
    endDate?: string;
    driverId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Expense[]; meta: { total: number; limit: number; offset: number } }> {
    const params: any = {
      limit: filters?.limit ?? 50,
      offset: filters?.offset ?? 0,
    };
    if (filters?.status) params.status = filters.status;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.driverId) params.driverId = filters.driverId;

    const response = await this.api.get('/admin/expenses', { params });
    return {
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      meta: response.data?.meta ?? { total: 0, limit: params.limit, offset: params.offset },
    };
  }

  async updateAdminExpense(
    id: string,
    payload: { status: 'APPROVED' | 'REJECTED'; adminComment?: string }
  ): Promise<Expense> {
    const response = await this.api.patch(`/admin/expenses/${id}`, payload);
    return response.data;
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
