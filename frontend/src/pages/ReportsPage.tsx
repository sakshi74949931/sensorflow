import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockReadings, mockDevices, mockLocations, getLocationName } from "@/data/mock-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Download, FileText, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { apiClient } from "@/lib/apiClient";

type HourRow = { hour: string; avg_db: number; max_db: number; min_db: number; reading_count: number };
type DayRow = { date: string; avg_db: number; max_db: number; min_db: number; reading_count: number };

export default function ReportsPage() {
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"hourly" | "daily" | "location">("hourly");

  const [hourlyData, setHourlyData] = useState<HourRow[]>([]);
  const [dailyData, setDailyData] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [apiLocations, setApiLocations] = useState(mockLocations);

  useEffect(() => {
    apiClient.getLocations().then((res: any) => {
      if (res?.locations?.length) {
        setApiLocations(res.locations.map((l: any) => ({ id: String(l.id), name: l.name, address: l.address || '', lat: l.latitude || 0, lng: l.longitude || 0 })));
      }
    }).catch(() => {});
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (locationFilter !== "all") params.location_id = locationFilter;
      if (dateFrom) params.date = dateFrom;
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;

      const [hourlyRes, dailyRes]: [any, any] = await Promise.all([
        apiClient.getHourlyReport(dateFrom ? { date: dateFrom, ...(locationFilter !== "all" ? { location_id: locationFilter } : {}) } : {}),
        apiClient.getDailyReport({ ...(dateFrom ? { start_date: dateFrom } : {}), ...(dateTo ? { end_date: dateTo } : {}), ...(locationFilter !== "all" ? { location_id: locationFilter } : {}) }),
      ]);
      if (hourlyRes?.data) setHourlyData(hourlyRes.data);
      if (dailyRes?.data) setDailyData(dailyRes.data);
    } catch {
      // fallback to computed mock data below
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  // Fallback: compute from mock data
  const filteredReadings = useMemo(() => {
    let data = mockReadings;
    if (locationFilter !== "all") {
      const devIds = mockDevices.filter((d) => d.locationId === locationFilter).map((d) => d.id);
      data = data.filter((r) => devIds.includes(r.deviceId));
    }
    if (dateFrom) data = data.filter((r) => new Date(r.timestamp) >= new Date(dateFrom));
    if (dateTo) { const to = new Date(dateTo); to.setHours(23,59,59); data = data.filter((r) => new Date(r.timestamp) <= to); }
    return data;
  }, [locationFilter, dateFrom, dateTo]);

  const fallbackHourly = useMemo(() => {
    const buckets: Record<number, number[]> = {};
    filteredReadings.forEach((r) => { const h = new Date(r.timestamp).getHours(); (buckets[h] ??= []).push(r.decibels); });
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, "0")}:00`,
      avg_db: buckets[h] ? Math.round((buckets[h].reduce((s, v) => s + v, 0) / buckets[h].length) * 10) / 10 : 0,
      max_db: buckets[h] ? Math.max(...buckets[h]) : 0,
      min_db: buckets[h] ? Math.min(...buckets[h]) : 0,
      reading_count: buckets[h]?.length || 0,
    }));
  }, [filteredReadings]);

  const displayHourly = hourlyData.length > 0 ? hourlyData : fallbackHourly;

  const locationSummary = useMemo(() => {
    return apiLocations.map((loc) => {
      const devIds = mockDevices.filter((d) => d.locationId === loc.id).map((d) => d.id);
      const readings = filteredReadings.filter((r) => devIds.includes(r.deviceId));
      const avg = readings.length ? readings.reduce((s, r) => s + r.decibels, 0) / readings.length : 0;
      const max = readings.length ? Math.max(...readings.map((r) => r.decibels)) : 0;
      const min = readings.length ? Math.min(...readings.map((r) => r.decibels)) : 0;
      const breaches = readings.filter((r) => r.decibels >= 85).length;
      return { name: loc.name, readings: readings.length, avg: Math.round(avg * 10) / 10, max: Math.round(max * 10) / 10, min: Math.round(min * 10) / 10, breaches };
    });
  }, [filteredReadings, apiLocations]);

  const exportCSV = () => {
    let csv = "";
    if (activeTab === "hourly") {
      csv = "Hour,Avg dB,Max dB,Min dB,Readings\n" + displayHourly.map(r => `${r.hour},${r.avg_db},${r.max_db},${r.min_db},${r.reading_count}`).join("\n");
    } else if (activeTab === "daily") {
      const data = dailyData.length > 0 ? dailyData : [];
      csv = "Date,Avg dB,Max dB,Min dB,Readings\n" + data.map(r => `${r.date},${r.avg_db},${r.max_db},${r.min_db},${r.reading_count}`).join("\n");
    } else {
      csv = "Location,Readings,Avg dB,Max dB,Min dB,Breaches\n" + locationSummary.map(r => `${r.name},${r.readings},${r.avg},${r.max},${r.min},${r.breaches}`).join("\n");
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noise-report-${activeTab}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">Analyze noise data by location, date, and hour</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileText className="h-4 w-4 mr-1" /> Print / PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {apiLocations.map((l) => (<SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab buttons */}
      <div className="flex gap-2">
        {(["hourly", "daily", "location"] as const).map((tab) => (
          <Button key={tab} variant={activeTab === tab ? "default" : "outline"} size="sm" onClick={() => setActiveTab(tab)} className="capitalize">
            {tab === "location" ? "Location Summary" : `${tab.charAt(0).toUpperCase() + tab.slice(1)} Report`}
          </Button>
        ))}
      </div>

      {/* Hourly */}
      {activeTab === "hourly" && (
        <>
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Hourly Average Noise Levels</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayHourly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(v: number) => [`${v} dB`, "Avg"]} />
                  <Bar dataKey="avg_db" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hour</TableHead>
                    <TableHead>Readings</TableHead>
                    <TableHead>Avg dB</TableHead>
                    <TableHead>Max dB</TableHead>
                    <TableHead>Min dB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayHourly.filter(r => r.reading_count > 0).map((row) => (
                    <TableRow key={row.hour}>
                      <TableCell className="font-medium">{row.hour}</TableCell>
                      <TableCell className="tabular-nums">{row.reading_count}</TableCell>
                      <TableCell className="tabular-nums">{row.avg_db}</TableCell>
                      <TableCell className="tabular-nums">{row.max_db}</TableCell>
                      <TableCell className="tabular-nums">{row.min_db}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Daily */}
      {activeTab === "daily" && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Daily Report</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Readings</TableHead>
                  <TableHead>Avg dB</TableHead>
                  <TableHead>Max dB</TableHead>
                  <TableHead>Min dB</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyData.length > 0 ? dailyData.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell className="font-medium">{row.date}</TableCell>
                    <TableCell className="tabular-nums">{row.reading_count}</TableCell>
                    <TableCell className="tabular-nums">{row.avg_db}</TableCell>
                    <TableCell className="tabular-nums">{row.max_db}</TableCell>
                    <TableCell className="tabular-nums">{row.min_db}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No daily data available. Select a date range and refresh.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Location summary */}
      {activeTab === "location" && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Location Summary</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Readings</TableHead>
                  <TableHead>Avg dB</TableHead>
                  <TableHead>Min dB</TableHead>
                  <TableHead>Max dB</TableHead>
                  <TableHead>Breaches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locationSummary.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="tabular-nums">{row.readings}</TableCell>
                    <TableCell className="tabular-nums">{row.avg}</TableCell>
                    <TableCell className="tabular-nums">{row.min}</TableCell>
                    <TableCell className="tabular-nums">{row.max}</TableCell>
                    <TableCell className="tabular-nums text-destructive font-medium">{row.breaches}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
