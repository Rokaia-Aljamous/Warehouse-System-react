import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

const TRUCK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

function makeIcon(color: string, pulse: boolean, html: string): L.DivIcon {
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="position:relative;display:grid;place-items:center;width:32px;height:32px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);${pulse ? "animation:pulse-ring 2s ease-out infinite;" : ""}">${html}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

const driverIcon = makeIcon(
  "#2563eb",
  true,
  TRUCK_SVG,
);
const destinationIcon = makeIcon(
  "#dc2626",
  false,
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
);

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    const valid = points.filter(
      (p) => Number.isFinite(p[0]) && Number.isFinite(p[1]),
    );
    if (valid.length === 0) return;

    const bounds = L.latLngBounds(valid);
    if (!bounds.isValid()) return;

    if (valid.length === 1) {
      map.setView(valid[0], 15);
    } else {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 17 });
    }
  }, [map, points]);

  return null;
}

export interface DriverTrackingMapProps {
  position: { latitude: number; longitude: number } | null;
  route: { latitude: number; longitude: number }[];
  destination: { latitude: number; longitude: number } | null;
  driverName?: string;
  className?: string;
}

export function DriverTrackingMap({
  position,
  route,
  destination,
  driverName,
  className,
}: DriverTrackingMapProps) {
  const points = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    if (position) pts.push([position.latitude, position.longitude]);
    for (const w of route) pts.push([w.latitude, w.longitude]);
    if (destination) pts.push([destination.latitude, destination.longitude]);
    return pts;
  }, [position, route, destination]);

  const center = useMemo<[number, number]>(() => {
    const first = points[0];
    return first ?? [30.0444, 31.2357];
  }, [points]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className={cn("z-0 h-full w-full", className)}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {route.length > 1 && (
        <Polyline
          positions={route.map((w) => [w.latitude, w.longitude] as [number, number])}
          pathOptions={{ color: "#2563eb", weight: 3, opacity: 0.8 }}
        />
      )}
      {destination && (
        <Marker
          position={[destination.latitude, destination.longitude]}
          icon={destinationIcon}
        >
          <Popup>Destination</Popup>
        </Marker>
      )}
      {position && (
        <Marker
          position={[position.latitude, position.longitude]}
          icon={driverIcon}
        >
          <Popup>{driverName ?? "Driver"}</Popup>
        </Marker>
      )}
      <FitBounds points={points} />
    </MapContainer>
  );
}
