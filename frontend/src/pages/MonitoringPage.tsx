import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockDevices, mockReadings, getLocationName, NOISE_THRESHOLD, type SensorReading } from "@/data/mock-data";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { Volume2, Wifi, WifiOff } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { apiClient } from "@/lib/apiClient";

const WS_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function dbColor(db: number) {
  if (db >= NOISE_THRESHOLD) return "text-destructive";
  if (db >= 70) return "text-amber-600";
  return "text-emerald-600";
}

export default function MonitoringPage() {
  const [devices, setDevices] = useState(mockDevices);
  const [selectedDevice, setSelectedDevice] = useState(mockDevices[0].id);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Load devices from API
  useEffect(() => {
    apiClient.getDevices().then((res: any) => {
      if (res?.devices?.length) setDevices(res.devices);
    }).catch(() => {});
  }, []);

  // Load initial readings for selected device
  useEffect(() => {
    const initial = mockReadings.filter((r) => r.deviceId === selectedDevice).slice(-30);
    setReadings(initial);

    apiClient.getDeviceReadings(selectedDevice, { limit: '60' }).then((res: any) => {
      if (res?.readings?.length) {
        setReadings(res.readings.map((r: any) => ({
          id: String(r.id),
          deviceId: String(r.device_id),
          timestamp: r.timestamp,
          decibels: r.sound_level,
        })));
      }
    }).catch(() => {});
  }, [selectedDevice]);

  // WebSocket connection for live data
  useEffect(() => {
    const socket = io(WS_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setWsConnected(true));
    socket.on('disconnect', () => setWsConnected(false));

    socket.on('live-reading', (reading: any) => {
      if (String(reading.device_id) !== String(selectedDevice)) return;
      const mapped: SensorReading = {
        id: String(reading.id || Date.now()),
        deviceId: String(reading.device_id),
        timestamp: reading.timestamp || new Date().toISOString(),
        decibels: reading.sound_level,
      };
      setReadings((prev) => [...prev.slice(-59), mapped]);
    });

    return () => { socket.disconnect(); };
  }, [selectedDevice]);

  // Fallback: simulate live data every 5s when WebSocket is NOT connected
  useEffect(() => {
    if (wsConnected) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setReadings((prev) => {
        const last = prev[prev.length - 1];
        const baseDb = last ? last.decibels : 70;
        const newReading: SensorReading = {
          id: `sim-${Date.now()}`,
          deviceId: selectedDevice,
          timestamp: new Date().toISOString(),
          decibels: Math.round((baseDb + (Math.random() - 0.5) * 8) * 10) / 10,
        };
        return [...prev.slice(-59), newReading];
      });
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [wsConnected, selectedDevice]);

  const latestDb = readings.length > 0 ? readings[readings.length - 1].decibels : 0;
  const chartData = readings.map((r) => ({
    time: format(new Date(r.timestamp), "HH:mm:ss"),
    dB: r.decibels,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Live Monitoring</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time noise level readings</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={wsConnected ? "default" : "secondary"} className="gap-1 text-xs">
            {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {wsConnected ? "Live" : "Simulated"}
          </Badge>
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {devices.map((d: any) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name} ({d.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Current reading */}
      <Card className="shadow-sm">
        <CardContent className="p-6 flex items-center gap-6">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${latestDb >= NOISE_THRESHOLD ? "bg-destructive/10" : "bg-emerald-500/10"}`}>
            <Volume2 className={`h-8 w-8 ${dbColor(latestDb)}`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Reading</p>
            <p className={`text-4xl font-bold tabular-nums tracking-tight ${dbColor(latestDb)}`}>
              {latestDb} <span className="text-lg font-normal">dB</span>
            </p>
            {latestDb >= NOISE_THRESHOLD && (
              <Badge variant="destructive" className="mt-1">Exceeds threshold</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Noise Level Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} domain={[30, 110]} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                formatter={(v: number) => [`${v} dB`, "Noise"]}
              />
              <ReferenceLine y={NOISE_THRESHOLD} stroke="hsl(var(--destructive))" strokeDasharray="6 3" label={{ value: `${NOISE_THRESHOLD} dB`, position: "right", fontSize: 11 }} />
              <Line type="monotone" dataKey="dB" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* All devices latest reading */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Devices — Latest Reading</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {devices.map((d: any) => (
              <button
                key={d.id}
                onClick={() => setSelectedDevice(String(d.id))}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors hover:bg-muted/50 active:scale-[0.98] ${
                  String(d.id) === String(selectedDevice) ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${(d.status === "online" || d.status === "active") ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{getLocationName(d.locationId || d.location_id)}</p>
                </div>
                <span className={`ml-auto text-sm font-semibold tabular-nums ${dbColor(d.lastReading || d.sound_level || 0)}`}>
                  {d.lastReading || d.sound_level || 0} dB
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
