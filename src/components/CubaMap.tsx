"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Aircraft, Vessel, ProvinceStatus } from "@/lib/types";

// Fix default marker icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function createSvgIcon(color: string, symbol: string, size: number = 24) {
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:2px solid rgba(255,255,255,0.6);
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:${size * 0.5}px;color:white;
      box-shadow:0 0 8px ${color}80;
    ">${symbol}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function aircraftIcon(cat: string) {
  const color =
    cat === "military" ? "#ef4444" : cat === "surveillance" ? "#f59e0b" : "#22c55e";
  return createSvgIcon(color, "✈", 20);
}

function vesselIcon(cat: string) {
  const color =
    cat === "military"
      ? "#ef4444"
      : cat === "coast_guard"
        ? "#3b82f6"
        : cat === "tanker"
          ? "#f59e0b"
          : "#22c55e";
  return createSvgIcon(color, "⚓", 20);
}

function powerColor(status: string) {
  return status === "online"
    ? "#22c55e"
    : status === "partial"
      ? "#f59e0b"
      : "#ef4444";
}

interface MapLayers {
  showAir: boolean;
  showMaritime: boolean;
  showPower: boolean;
}

interface CubaMapProps {
  aircraft: Aircraft[];
  vessels: Vessel[];
  power: ProvinceStatus[];
  layers: MapLayers;
}

function MapBounds() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds([
      [18.0, -86.0],
      [26.0, -73.0],
    ]);
  }, [map]);
  return null;
}

export default function CubaMap({
  aircraft,
  vessels,
  power,
  layers,
}: CubaMapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)]">
        <span className="text-[var(--text-muted)] text-sm">Loading map…</span>
      </div>
    );
  }

  return (
    <MapContainer
      center={[22.0, -79.5]}
      zoom={6}
      minZoom={5}
      maxZoom={12}
      className="w-full h-full"
      zoomControl={true}
    >
      <MapBounds />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Power outage overlay */}
      {layers.showPower &&
        power.map((p) => (
          <CircleMarker
            key={p.province}
            center={[p.lat, p.lng]}
            radius={p.status === "blackout" ? 18 : p.status === "partial" ? 14 : 10}
            pathOptions={{
              color: powerColor(p.status),
              fillColor: powerColor(p.status),
              fillOpacity: p.status === "blackout" ? 0.45 : 0.25,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ color: "#0a0e17", fontSize: 12 }}>
                <strong>{p.province}</strong>
                <br />
                Status: <span style={{ color: powerColor(p.status) }}>{p.status.toUpperCase()}</span>
                <br />
                Load: {p.loadMW} / {p.capacityMW} MW
              </div>
            </Popup>
          </CircleMarker>
        ))}

      {/* Aircraft from OpenSky */}
      {layers.showAir &&
        aircraft.map((ac) => (
          <Marker
            key={ac.id}
            position={[ac.lat, ac.lng]}
            icon={aircraftIcon(ac.category)}
          >
            <Popup>
              <div style={{ color: "#0a0e17", fontSize: 12 }}>
                <strong>{ac.callsign || ac.icao24}</strong>
                <br />
                {ac.originCountry}
                <br />
                {ac.altitude != null ? `${ac.altitude.toLocaleString()} ft` : "—"}
                {ac.speed != null ? ` · ${ac.speed} kts` : ""}
                {ac.heading != null ? ` · HDG ${ac.heading}°` : ""}
                {ac.squawk ? <><br />Squawk: {ac.squawk}</> : null}
                <br />
                <em style={{ color: "#64748b", fontSize: 10 }}>Source: OpenSky Network</em>
              </div>
            </Popup>
          </Marker>
        ))}

      {/* Vessels from AISstream */}
      {layers.showMaritime &&
        vessels.map((v) => (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={vesselIcon(v.category)}
          >
            <Popup>
              <div style={{ color: "#0a0e17", fontSize: 12 }}>
                <strong>{v.name}</strong>
                <br />
                {v.type} · {v.flag}
                <br />
                {v.speed != null ? `${v.speed} kts` : "—"}
                {v.heading != null ? ` · HDG ${v.heading}°` : ""}
                <br />
                <em style={{ color: "#64748b", fontSize: 10 }}>Source: AISstream.io</em>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
