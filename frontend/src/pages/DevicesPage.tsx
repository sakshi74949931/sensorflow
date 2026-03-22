import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockDevices as initialDevices, mockLocations, type Device } from "@/data/mock-data";
import { Plus, Pencil, Trash2, Search, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

const emptyForm = { id: "", name: "", locationId: "", status: "online" as "online" | "offline", firmwareVersion: "2.4.1" };

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [locations, setLocations] = useState(mockLocations);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [devRes, locRes]: [any, any] = await Promise.all([
        apiClient.getDevices(),
        apiClient.getLocations(),
      ]);
      if (devRes?.devices?.length) {
        setDevices(devRes.devices.map((d: any) => ({
          id: String(d.id),
          name: d.name,
          locationId: String(d.location_id || d.locationId || ''),
          status: (d.status === 'active' || d.status === 'online') ? 'online' : 'offline',
          firmwareVersion: d.firmware_version || d.firmwareVersion || '—',
          lastReading: d.sound_level || d.lastReading || 0,
          lat: d.latitude || 0,
          lng: d.longitude || 0,
        })));
      }
      if (locRes?.locations?.length) {
        setLocations(locRes.locations.map((l: any) => ({
          id: String(l.id),
          name: l.name,
          address: l.address || '',
          lat: l.latitude || 0,
          lng: l.longitude || 0,
        })));
      }
    } catch {
      // fallback to mock data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = devices.filter(
    (d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, id: `NM-${String(devices.length + 1).padStart(3, "0")}` });
    setDialogOpen(true);
  };

  const openEdit = (d: Device) => {
    setEditing(d);
    setForm({ id: d.id, name: d.name, locationId: d.locationId, status: d.status, firmwareVersion: d.firmwareVersion });
    setDialogOpen(true);
  };

  const save = async () => {
    const loc = locations.find((l) => l.id === form.locationId);
    try {
      if (editing) {
        await apiClient.updateDevice(editing.id, {
          name: form.name,
          location: form.locationId,
          status: form.status === 'online' ? 'active' : 'offline',
        });
        setDevices((prev) =>
          prev.map((d) => (d.id === editing.id ? { ...d, ...form, lat: loc?.lat ?? d.lat, lng: loc?.lng ?? d.lng } : d))
        );
      } else {
        const res: any = await apiClient.createDevice({
          name: form.name,
          location: form.locationId,
          status: form.status === 'online' ? 'active' : 'offline',
        });
        const newDev: Device = {
          id: String(res?.device?.id || form.id),
          name: form.name,
          locationId: form.locationId,
          status: form.status,
          firmwareVersion: form.firmwareVersion,
          lastReading: 0,
          lat: loc?.lat ?? 0,
          lng: loc?.lng ?? 0,
        };
        setDevices((prev) => [...prev, newDev]);
      }
    } catch {
      // optimistic update already applied above
    }
    setDialogOpen(false);
  };

  const remove = async (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    try { await apiClient.deleteDevice(id); } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Devices</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your noise sensor network</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={openAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Device
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devices…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Firmware</TableHead>
                <TableHead className="hidden md:table-cell">Last dB</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.id}</TableCell>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {locations.find((l) => l.id === d.locationId)?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.status === "online" ? "default" : "secondary"} className="text-[10px]">
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-xs">{d.firmwareVersion}</TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums">{d.lastReading} dB</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(d.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No devices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Device" : "Add Device"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Device ID</Label>
              <Input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={!!editing} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={form.locationId} onValueChange={(v) => setForm({ ...form, locationId: v })}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "online" | "offline" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Firmware Version</Label>
              <Input value={form.firmwareVersion} onChange={(e) => setForm({ ...form, firmwareVersion: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
