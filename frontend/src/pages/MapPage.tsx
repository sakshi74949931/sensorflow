import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockDevices, mockAlarms, getLocationName, NOISE_THRESHOLD } from "@/data/mock-data";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function markerColor(device: typeof mockDevices[0]) {
  const hasAlarm = mockAlarms.some((a) => a.deviceId === device.id && a.status === "active");
  if (hasAlarm) return "#eab308"; // yellow
  if (device.status === "offline") return "#ef4444"; // red
  return "#22c55e"; // green
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current).setView([19.076, 72.877], 12);
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mockDevices.forEach((d) => {
      const color = markerColor(d);
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      L.marker([d.lat, d.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui;min-width:140px">
            <strong>${d.name}</strong><br/>
            <span style="font-size:12px;color:#666">${getLocationName(d.locationId)}</span><br/>
            <span style="font-size:12px">Status: <b>${d.status}</b></span><br/>
            <span style="font-size:12px">Last: <b>${d.lastReading} dB</b></span>
            ${d.lastReading >= NOISE_THRESHOLD ? '<br/><span style="font-size:11px;color:#ef4444;font-weight:600">⚠ Above threshold</span>' : ""}
          </div>`
        );
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Map View</h2>
        <p className="text-sm text-muted-foreground mt-1">Device locations with status indicators</p>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        {[
          { color: "bg-emerald-500", label: "Online" },
          { color: "bg-red-500", label: "Offline" },
          { color: "bg-yellow-500", label: "Alert" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-full ${item.color}`} />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div ref={mapRef} className="h-[500px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
