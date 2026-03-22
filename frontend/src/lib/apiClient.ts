const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface APIError {
  status: number;
  message: string;
  data?: any;
}

class APIClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('auth_token');

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    } as HeadersInit;

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
        throw { status: 401, message: 'Unauthorized' };
      }

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.error || 'An error occurred',
          data,
        };
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.status) {
        throw error;
      }
      throw {
        status: 500,
        message: error.name === 'AbortError' ? 'Request timed out' : (error.message || 'Network error'),
        data: error,
      };
    }
  }

  // Auth endpoints
  login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(email: string, password: string, name: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  refreshToken() {
    return this.request('/auth/refresh', { method: 'POST' });
  }

  // Device endpoints
  getDevices() {
    return this.request('/devices');
  }

  getDevice(id: string) {
    return this.request(`/devices/${id}`);
  }

  createDevice(data: any) {
    return this.request('/devices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateDevice(id: string, data: any) {
    return this.request(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteDevice(id: string) {
    return this.request(`/devices/${id}`, {
      method: 'DELETE',
    });
  }

  // Monitoring endpoints
  getMonitoringData(params?: any) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/monitoring${query ? '?' + query : ''}`);
  }

  recordMonitoring(data: any) {
    return this.request('/monitoring', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Alarm endpoints
  getAlarms(params?: any) {
    const query = params ? new URLSearchParams(params).toString() : '';
    return this.request(`/alarms${query ? '?' + query : ''}`);
  }

  acknowledgeAlarm(id: string) {
    return this.request(`/alarms/${id}/acknowledge`, { method: 'PATCH' });
  }

  resolveAlarm(id: string, data?: any) {
    return this.request(`/alarms/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(data || {}),
    });
  }

  // Report endpoints
  getReports(params?: any) {
    const query = params ? new URLSearchParams(params).toString() : '';
    return this.request(`/reports${query ? '?' + query : ''}`);
  }

  getHourlyReport(params?: any) {
    const query = params ? new URLSearchParams(params).toString() : '';
    return this.request(`/reports/hourly${query ? '?' + query : ''}`);
  }

  getDailyReport(params?: any) {
    const query = params ? new URLSearchParams(params).toString() : '';
    return this.request(`/reports/daily${query ? '?' + query : ''}`);
  }

  generateReport(data: any) {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Location endpoints
  getLocations() {
    return this.request('/locations');
  }

  createLocation(data: any) {
    return this.request('/locations', { method: 'POST', body: JSON.stringify(data) });
  }

  updateLocation(id: string, data: any) {
    return this.request(`/locations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  deleteLocation(id: string) {
    return this.request(`/locations/${id}`, { method: 'DELETE' });
  }

  // Events endpoint
  getEvents(params?: any) {
    const query = params ? new URLSearchParams(params).toString() : '';
    return this.request(`/events${query ? '?' + query : ''}`);
  }

  // Device readings
  getDeviceReadings(id: string, params?: any) {
    const query = params ? new URLSearchParams(params).toString() : '';
    return this.request(`/devices/${id}/readings${query ? '?' + query : ''}`);
  }

  getDeviceLatest(id: string) {
    return this.request(`/devices/${id}/latest`);
  }

  // Health check
  health() {
    return this.request('/health');
  }
}

export const apiClient = new APIClient();
