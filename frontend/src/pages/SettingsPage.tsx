import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { mockLocations } from "@/data/mock-data";
import { Plus, Pencil, Trash2, Settings, MapPin, Sun, Moon, Monitor } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";

interface LocationRow {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type?: string;
}

const emptyLoc: LocationRow = { id: "", name: "", address: "", lat: 0, lng: 0, type: "urban" };

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { theme, setTheme } = useTheme();

  // Thresholds (stored in localStorage for demo when no DB)
  const [warningThreshold, setWarningThreshold] = useState(() => {
    return parseInt(localStorage.getItem("threshold_warning") || "75");
  });
  const [criticalThreshold, setCriticalThreshold] = useState(() => {
    return parseInt(localStorage.getItem("threshold_critical") || "85");
  });
  const [thresholdSaved, setThresholdSaved] = useState(false);

  const saveThresholds = () => {
    localStorage.setItem("threshold_warning", String(warningThreshold));
    localStorage.setItem("threshold_critical", String(criticalThreshold));
    setThresholdSaved(true);
    setTimeout(() => setThresholdSaved(false), 2000);
  };

  // Locations management
  const [locations, setLocations] = useState<LocationRow[]>(
    mockLocations.map(l => ({ id: l.id, name: l.name, address: l.address, lat: l.lat, lng: l.lng, type: "urban" }))
  );
  const [locDialog, setLocDialog] = useState(false);
  const [editingLoc, setEditingLoc] = useState<LocationRow | null>(null);
  const [locForm, setLocForm] = useState<LocationRow>(emptyLoc);

  useEffect(() => {
    apiClient.getLocations().then((res) => {
      if (res?.locations?.length) {
        setLocations(res.locations.map((l) => ({
          id: String(l.id),
          name: l.name,
          address: l.address || "",
          lat: l.latitude || l.lat || 0,
          lng: l.longitude || l.lng || 0,
          type: l.type || "urban",
        })));
      }
    }).catch(() => {});
  }, []);

  const openAddLoc = () => {
    setEditingLoc(null);
    setLocForm(emptyLoc);
    setLocDialog(true);
  };

  const openEditLoc = (l: LocationRow) => {
    setEditingLoc(l);
    setLocForm({ ...l });
    setLocDialog(true);
  };

  const saveLoc = async () => {
    try {
      const payload = { name: locForm.name, address: locForm.address, latitude: locForm.lat, longitude: locForm.lng, type: locForm.type };
      if (editingLoc) {
        await apiClient.updateLocation(editingLoc.id, payload);
        setLocations(prev => prev.map(l => l.id === editingLoc.id ? { ...l, ...locForm } : l));
      } else {
        const res = await apiClient.createLocation(payload);
        setLocations(prev => [...prev, { ...locForm, id: String(res?.location?.id || Date.now()) }]);
      }
    } catch {
      // optimistic already applied
    }
    setLocDialog(false);
  };

  const deleteLoc = async (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    try { await apiClient.deleteLocation(id); } catch {}
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure thresholds, locations, and system preferences</p>
      </div>

      {/* Appearance */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="h-4 w-4" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Dark Mode</Label>
              <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
              <Moon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
              className="gap-1.5"
            >
              <Sun className="h-3.5 w-3.5" /> Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
              className="gap-1.5"
            >
              <Moon className="h-3.5 w-3.5" /> Dark
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("system")}
              className="gap-1.5"
            >
              <Monitor className="h-3.5 w-3.5" /> System
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Threshold Configuration */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" /> Noise Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 max-w-md">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Warning Threshold
                <Badge variant="secondary" className="text-[10px]">dB</Badge>
              </Label>
              <Input
                type="number"
                min={50}
                max={130}
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(parseInt(e.target.value))}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">Alarms triggered above this level</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Critical Threshold
                <Badge variant="destructive" className="text-[10px]">dB</Badge>
              </Label>
              <Input
                type="number"
                min={50}
                max={130}
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(parseInt(e.target.value))}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">Critical alarms triggered above this level</p>
            </div>
          </div>
          {isAdmin && (
            <Button className="mt-4" onClick={saveThresholds} size="sm">
              {thresholdSaved ? "Saved!" : "Save Thresholds"}
            </Button>
          )}
          {!isAdmin && (
            <p className="text-xs text-muted-foreground mt-3">Admin access required to change thresholds.</p>
          )}
        </CardContent>
      </Card>

      {/* Location Management */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Location Master
            </CardTitle>
            {isAdmin && (
              <Button size="sm" onClick={openAddLoc}>
                <Plus className="h-4 w-4 mr-1" /> Add Location
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden lg:table-cell">Coordinates</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{l.address || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] capitalize">{l.type || "urban"}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
                    {l.lat}, {l.lng}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditLoc(l)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteLoc(l.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {locations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-8">
                    No locations configured
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Location Dialog */}
      <Dialog open={locDialog} onOpenChange={setLocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLoc ? "Edit Location" : "Add Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} placeholder="e.g. Andheri West" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={locForm.address} onChange={(e) => setLocForm({ ...locForm, address: e.target.value })} placeholder="Full address" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Input value={locForm.type || ""} onChange={(e) => setLocForm({ ...locForm, type: e.target.value })} placeholder="urban / industrial / transit" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input type="number" step="0.0001" value={locForm.lat} onChange={(e) => setLocForm({ ...locForm, lat: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input type="number" step="0.0001" value={locForm.lng} onChange={(e) => setLocForm({ ...locForm, lng: parseFloat(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocDialog(false)}>Cancel</Button>
            <Button onClick={saveLoc}>{editingLoc ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
