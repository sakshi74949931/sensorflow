const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface APIError {
  status: number;
  message: string;
  data?: unknown;
}

export function isAPIError(error: unknown): error is APIError {
  return typeof error === 'object' && error !== null && 'status' in error && typeof (error as APIError).status === 'number';
}

// ── API Response Types ──────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

interface RegisterResponse {
  message: string;
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

interface DevicesResponse {
  devices: Array<Record<string, unknown>>;
  total: number;
}

interface DeviceResponse {
  device: Record<string, unknown>;
}

interface ReadingResponse {
  reading: Record<string, unknown> | null;
}

interface ReadingsResponse {
  readings: Array<Record<string, unknown>>;
  total: number;
}

export interface LocationsResponse {
  locations: Array<{
    id: number;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    type?: string;
  }>;
}

export interface CreateLocationResponse {
  location: { id: number };
  message?: string;
}

interface AlarmsResponse {
  alarms: Array<Record<string, unknown>>;
  total: number;
  active: number;
}

interface AlarmResponse {
  message: string;
  alarm: Record<string, unknown>;
}

interface ReportsResponse {
  reports?: Array<Record<string, unknown>>;
  data?: Array<Record<string, unknown>>;
}

interface EventsResponse {
  events: Array<Record<string, unknown>>;
}

interface HealthResponse {
  status: string;
  message: string;
  timestamp: string;
  environment: string;
}

// ── Request Payload Types ───────────────────────────────────────────────────

interface DevicePayload {
  name: string;
  location: string;
  status?: string;
}

interface LocationPayload {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type?: string;
}

interface MonitoringPayload {
  device_id: number;
  sound_level: number;
  frequency_range?: string;
  timestamp?: string;
}

interface ResolveAlarmPayload {
  resolution_note?: string;
}

interface ReportPayload {
  title: string;
  report_type?: string;
  device_ids?: number[];
  date_range_start?: string;
  date_range_end?: string;
}

type QueryParams = Record<string, string>;

// ── API Client ──────────────────────────────────────────────────────────────

class APIClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('auth_token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('noise_user');
        window.location.href = '/login';
        throw { status: 401, message: 'Unauthorized' } satisfies APIError;
      }

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.error || 'An error occurred',
          data,
        } satisfies APIError;
      }

      return data;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (isAPIError(error)) {
        throw error;
      }
      const message = error instanceof Error
        ? (error.name === 'AbortError' ? 'Request timed out' : error.message)
        : 'Network error';
      throw {
        status: 500,
        message,
        data: error,
      } satisfies APIError;
    }
  }

  // Auth endpoints
  login(email: string, password: string) {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(email: string, password: string, name: string) {
    return this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  logout() {
    return this.request<{ message: string }>('/auth/logout', { method: 'POST' });
  }

  refreshToken() {
    return this.request<{ token: string }>('/auth/refresh', { method: 'POST' });
  }

  // Device endpoints
  getDevices() {
    return this.request<DevicesResponse>('/devices');
  }

  getDevice(id: string) {
    return this.request<DeviceResponse>(`/devices/${id}`);
  }

  createDevice(data: DevicePayload) {
    return this.request<{ message: string; device: Record<string, unknown> }>('/devices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateDevice(id: string, data: Partial<DevicePayload>) {
    return this.request<{ message: string; device: Record<string, unknown> }>(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteDevice(id: string) {
    return this.request<{ message: string }>(`/devices/${id}`, {
      method: 'DELETE',
    });
  }

  // Monitoring endpoints
  getMonitoringData(params?: QueryParams) {
    const query = params ? new URLSearchParams(params).toString() : '';
    return this.request<{ data: Array<Record<string, unknown>> }>(`/monitoring${query ? '?' + query : ''}`);
  }

  recordMonitoring(data: MonitoringPayload) {
    return this.request<{ message: string }>('/monitoring', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Alarm endpoints
  getAlarms(params?: QueryParams) {
    const query = params ? new URLSearchParams(params).toString() : '';
    return this.request<AlarmsResponse>(`/alarms${query ? '?' + query : ''}`);
  }

  acknowledgeAlarm(id: string) {
    return this.request<AlarmResponse>(`/alarms/${id}/acknowledge`, { method: 'PATCH' });
  }

  resolveAlarm(id: string, data?: ResolveAlarmPayload) {
    return this.request<AlarmResponse>(`/alarms/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(data || {}),
    });
  }

  // Report endpoints
  getReports(params?: QueryParams) {
    const query = params ? new URLSearchParams(params).toString() : '';
    return this.request<ReportsResponse>(`/reports${query ? '?' + query : ''}`);
  }

  getHourlyReport(params?: QueryParams) {
    const query = params ? new URLSearchParams(params).toString() : '';
    return this.request<ReportsResponse>(`/reports/hourly${query ? '?' + query : ''}`);
  }

  getDailyReport(params?: QueryParams) {
    const query = params ? new URLSearchParams(params).toString() : '';
    return this.request<ReportsResponse>(`/reports/daily${query ? '?' + query : ''}`);
  }

  generateReport(data: ReportPayload) {
    return this.request<{ message: string }>('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Location endpoints
  getLocations() {
    return this.request<LocationsResponse>('/locations');
  }

  createLocation(data: LocationPayload) {
    return this.request<CreateLocationResponse>('/locations', { method: 'POST', body: JSON.stringify(data) });
  }

  updateLocation(id: string, data: Partial<LocationPayload>) {
    return this.request<{ message: string }>(`/locations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  deleteLocation(id: string) {
    return this.request<{ message: string }>(`/locations/${id}`, { method: 'DELETE' });
  }

  // Events endpoint
  getEvents(params?: QueryParams) {
    const query = params ? new URLSearchParams(params).toString() : '';
    return this.request<EventsResponse>(`/events${query ? '?' + query : ''}`);
  }

  // Device readings
  getDeviceReadings(id: string, params?: QueryParams) {
    const query = params ? new URLSearchParams(params).toString() : '';
    return this.request<ReadingsResponse>(`/devices/${id}/readings${query ? '?' + query : ''}`);
  }

  getDeviceLatest(id: string) {
    return this.request<ReadingResponse>(`/devices/${id}/latest`);
  }

  // Health check
  health() {
    return this.request<HealthResponse>('/health');
  }
}

export const apiClient = new APIClient();
