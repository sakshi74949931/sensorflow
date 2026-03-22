import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockAlarms as initialAlarms, getDeviceName, getLocationName, type Alarm } from "@/data/mock-data";
import { format } from "date-fns";
import { Bell, CheckCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/apiClient";

export default function AlarmsPage() {
  const [alarms, setAlarms] = useState<Alarm[]>(initialAlarms);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchAlarms = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.getAlarms();
      if (res?.alarms?.length) {
        const mapped: Alarm[] = res.alarms.map((a: any) => ({
          id: String(a.id),
          deviceId: String(a.device_id),
          locationId: String(a.location_id || ''),
          severity: a.severity === 'critical' || a.severity === 'high' ? 'critical' : 'warning',
          status: a.status || (a.is_active ? 'active' : 'resolved'),
          triggeredAt: a.triggered_at || a.triggeredAt || new Date().toISOString(),
          resolvedAt: a.resolved_at || null,
          acknowledgedBy: a.acknowledged_by || null,
          decibels: a.measured_value || a.sound_level || 0,
        }));
        setAlarms(mapped);
      }
    } catch {
      // fallback to mock data already set
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlarms(); }, []);

  const filtered = filter === "all" ? alarms : alarms.filter((a) => a.status === filter);

  const acknowledge = async (id: string) => {
    try {
      await apiClient.acknowledgeAlarm(id);
    } catch {}
    setAlarms((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "acknowledged" as const, acknowledgedBy: user?.name ?? "Unknown" } : a
      )
    );
  };

  const resolve = async (id: string) => {
    try {
      await apiClient.resolveAlarm(id);
    } catch {}
    setAlarms((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "resolved" as const, resolvedAt: new Date().toISOString() } : a
      )
    );
  };

  const activeCount = alarms.filter((a) => a.status === "active").length;
  const ackCount = alarms.filter((a) => a.status === "acknowledged").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Alarm Console</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} active · {ackCount} acknowledged
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAlarms} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Alarms</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Device</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead>dB</TableHead>
                <TableHead className="hidden md:table-cell">Triggered</TableHead>
                <TableHead className="hidden md:table-cell">Ack By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Badge variant={a.severity === "critical" ? "destructive" : "secondary"} className="text-[10px]">
                      {a.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{getDeviceName(a.deviceId)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{getLocationName(a.locationId)}</TableCell>
                  <TableCell className="font-semibold tabular-nums">{a.decibels}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                    {format(new Date(a.triggeredAt), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                    {a.acknowledgedBy || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={a.status === "active" ? "destructive" : a.status === "acknowledged" ? "secondary" : "outline"}
                      className="text-[10px]"
                    >
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {a.status === "active" && (
                      <Button variant="outline" size="sm" onClick={() => acknowledge(a.id)}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Ack
                      </Button>
                    )}
                    {(a.status === "active" || a.status === "acknowledged") && (
                      <Button variant="outline" size="sm" onClick={() => resolve(a.id)}>
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No alarms to display
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
