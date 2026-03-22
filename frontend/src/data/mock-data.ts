// ── Types ──
export type UserRole = "admin" | "authority" | "support";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface Device {
  id: string;
  name: string;
  locationId: string;
  status: "online" | "offline";
  firmwareVersion: string;
  lastReading: number;
  lat: number;
  lng: number;
}

export interface SensorReading {
  id: string;
  deviceId: string;
  timestamp: string;
  decibels: number;
}

export type AlarmSeverity = "warning" | "critical";
export type AlarmStatus = "active" | "acknowledged" | "resolved";

export interface Alarm {
  id: string;
  deviceId: string;
  locationId: string;
  severity: AlarmSeverity;
  status: AlarmStatus;
  triggeredAt: string;
  resolvedAt: string | null;
  acknowledgedBy: string | null;
  decibels: number;
}

// ── Mock Users ──
export const mockUsers: User[] = [
  { id: "u1", email: "admin@inditronics.io", name: "Priya Sharma", role: "admin" },
  { id: "u2", email: "authority@inditronics.io", name: "Raj Mehta", role: "authority" },
  { id: "u3", email: "support@inditronics.io", name: "Anita Desai", role: "support" },
];

// ── Mock Locations ──
export const mockLocations: Location[] = [
  { id: "loc1", name: "Andheri West", address: "SV Road, Andheri West, Mumbai", lat: 19.1364, lng: 72.8296 },
  { id: "loc2", name: "Bandra Station", address: "Hill Road, Bandra, Mumbai", lat: 19.0544, lng: 72.8402 },
  { id: "loc3", name: "Powai Tech Park", address: "Hiranandani Gardens, Powai", lat: 19.1176, lng: 72.9060 },
  { id: "loc4", name: "Dadar Bridge", address: "Tilak Bridge, Dadar East", lat: 19.0178, lng: 72.8478 },
  { id: "loc5", name: "Juhu Beach Road", address: "Juhu Tara Road, Juhu", lat: 19.0883, lng: 72.8264 },
  { id: "loc6", name: "Churchgate Plaza", address: "Veer Nariman Road, Fort", lat: 18.9352, lng: 72.8272 },
];

// ── Mock Devices ──
export const mockDevices: Device[] = [
  { id: "NM-001", name: "Sensor Alpha", locationId: "loc1", status: "online", firmwareVersion: "2.4.1", lastReading: 72.3, lat: 19.1364, lng: 72.8296 },
  { id: "NM-002", name: "Sensor Beta", locationId: "loc2", status: "online", firmwareVersion: "2.4.1", lastReading: 88.1, lat: 19.0544, lng: 72.8402 },
  { id: "NM-003", name: "Sensor Gamma", locationId: "loc3", status: "offline", firmwareVersion: "2.3.8", lastReading: 45.6, lat: 19.1176, lng: 72.9060 },
  { id: "NM-004", name: "Sensor Delta", locationId: "loc4", status: "online", firmwareVersion: "2.4.1", lastReading: 91.2, lat: 19.0178, lng: 72.8478 },
  { id: "NM-005", name: "Sensor Epsilon", locationId: "loc5", status: "online", firmwareVersion: "2.4.0", lastReading: 67.8, lat: 19.0883, lng: 72.8264 },
  { id: "NM-006", name: "Sensor Zeta", locationId: "loc1", status: "offline", firmwareVersion: "2.3.5", lastReading: 52.1, lat: 19.1380, lng: 72.8310 },
  { id: "NM-007", name: "Sensor Eta", locationId: "loc6", status: "online", firmwareVersion: "2.4.1", lastReading: 78.4, lat: 18.9352, lng: 72.8272 },
  { id: "NM-008", name: "Sensor Theta", locationId: "loc2", status: "online", firmwareVersion: "2.4.1", lastReading: 83.9, lat: 19.0560, lng: 72.8415 },
];

// ── Generate time-series readings ──
function generateReadings(deviceId: string, baseDb: number, count: number): SensorReading[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `r-${deviceId}-${i}`,
    deviceId,
    timestamp: new Date(now - (count - i) * 60_000).toISOString(),
    decibels: Math.round((baseDb + (Math.random() - 0.5) * 20) * 10) / 10,
  }));
}

export const mockReadings: SensorReading[] = [
  ...generateReadings("NM-001", 72, 60),
  ...generateReadings("NM-002", 88, 60),
  ...generateReadings("NM-003", 45, 60),
  ...generateReadings("NM-004", 91, 60),
  ...generateReadings("NM-005", 68, 60),
  ...generateReadings("NM-006", 52, 60),
  ...generateReadings("NM-007", 78, 60),
  ...generateReadings("NM-008", 84, 60),
];

// ── Mock Alarms ──
export const mockAlarms: Alarm[] = [
  { id: "a1", deviceId: "NM-002", locationId: "loc2", severity: "critical", status: "active", triggeredAt: new Date(Date.now() - 1800000).toISOString(), resolvedAt: null, acknowledgedBy: null, decibels: 92.4 },
  { id: "a2", deviceId: "NM-004", locationId: "loc4", severity: "critical", status: "active", triggeredAt: new Date(Date.now() - 3600000).toISOString(), resolvedAt: null, acknowledgedBy: null, decibels: 95.1 },
  { id: "a3", deviceId: "NM-008", locationId: "loc2", severity: "warning", status: "acknowledged", triggeredAt: new Date(Date.now() - 7200000).toISOString(), resolvedAt: null, acknowledgedBy: "Priya Sharma", decibels: 87.3 },
  { id: "a4", deviceId: "NM-007", locationId: "loc6", severity: "warning", status: "resolved", triggeredAt: new Date(Date.now() - 14400000).toISOString(), resolvedAt: new Date(Date.now() - 10800000).toISOString(), acknowledgedBy: "Raj Mehta", decibels: 86.1 },
  { id: "a5", deviceId: "NM-001", locationId: "loc1", severity: "warning", status: "resolved", triggeredAt: new Date(Date.now() - 28800000).toISOString(), resolvedAt: new Date(Date.now() - 25200000).toISOString(), acknowledgedBy: "Anita Desai", decibels: 85.8 },
];

// ── Helpers ──
export const NOISE_THRESHOLD = 85;

export function getLocationName(locationId: string): string {
  return mockLocations.find((l) => l.id === locationId)?.name ?? "Unknown";
}

export function getDeviceName(deviceId: string): string {
  return mockDevices.find((d) => d.id === deviceId)?.name ?? "Unknown";
}
