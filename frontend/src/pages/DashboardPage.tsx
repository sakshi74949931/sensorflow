import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockDevices, mockAlarms, mockReadings, mockLocations, getLocationName, NOISE_THRESHOLD } from "@/data/mock-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Activity, Router, Bell, Volume2 } from "lucide-react";
import { format } from "date-fns";

function StatCard({ title, value, subtitle, icon: Icon, accent }: {
  title: string; value: string | number; subtitle: string; icon: React.ElementType; accent?: string;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent ?? "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const onlineCount = mockDevices.filter((d) => d.status === "online").length;
  const offlineCount = mockDevices.length - onlineCount;
  const activeAlarms = mockAlarms.filter((a) => a.status === "active").length;

  // avg noise today
  const todayReadings = mockReadings.filter(
    (r) => new Date(r.timestamp).toDateString() === new Date().toDateString()
  );
  const avgNoise =
    todayReadings.length > 0
      ? (todayReadings.reduce((s, r) => s + r.decibels, 0) / todayReadings.length).toFixed(1)
      : "—";

  // top noisy locations
  const locNoise = mockLocations.map((loc) => {
    const devIds = mockDevices.filter((d) => d.locationId === loc.id).map((d) => d.id);
    const readings = mockReadings.filter((r) => devIds.includes(r.deviceId));
    const avg = readings.length > 0 ? readings.reduce((s, r) => s + r.decibels, 0) / readings.length : 0;
    return { name: loc.name, avg: Math.round(avg * 10) / 10 };
  }).sort((a, b) => b.avg - a.avg);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Real-time overview of your noise monitoring network</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Router} title="Total Devices" value={mockDevices.length} subtitle={`${onlineCount} online · ${offlineCount} offline`} />
        <StatCard icon={Activity} title="Online Now" value={onlineCount} subtitle={`${Math.round((onlineCount / mockDevices.length) * 100)}% uptime`} accent="bg-emerald-500/10 text-emerald-600" />
        <StatCard icon={Bell} title="Active Alarms" value={activeAlarms} subtitle={`${mockAlarms.length} total today`} accent="bg-destructive/10 text-destructive" />
        <StatCard icon={Volume2} title="Avg Noise Today" value={`${avgNoise} dB`} subtitle={`Threshold: ${NOISE_THRESHOLD} dB`} accent="bg-amber-500/10 text-amber-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Noisy Locations</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locNoise} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  formatter={(v: number) => [`${v} dB`, "Avg Noise"]}
                />
                <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent alarms */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Alarms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockAlarms.slice(0, 5).map((alarm) => (
              <div key={alarm.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{getLocationName(alarm.locationId)}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(alarm.triggeredAt), "MMM d, HH:mm")}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs font-semibold tabular-nums">{alarm.decibels} dB</span>
                  <Badge
                    variant={alarm.status === "active" ? "destructive" : alarm.status === "acknowledged" ? "secondary" : "outline"}
                    className="text-[10px] px-1.5"
                  >
                    {alarm.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
