"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Aircraft, Vessel, ProvinceStatus } from "@/lib/types";

// ─── SVG icon generators ────────────────────────────────────────────────────

function aircraftSvg(cat: string, heading: number | null): string {
  const color =
    cat === "military" ? "#ef4444" : cat === "surveillance" ? "#f59e0b" : "#38bdf8";
  const rotation = heading != null ? heading : 0;
  // Airplane shape pointing up
  return `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(${rotation} 14 14)">
      <path d="M14 3 L17 12 L25 14 L17 16 L14 25 L11 16 L3 14 L11 12 Z"
        fill="${color}" stroke="white" stroke-width="1.2" opacity="0.95"/>
    </g>
  </svg>`;
}

function vesselSvg(cat: string, heading: number | null): string {
  const color =
    cat === "military"
      ? "#ef4444"
      : cat === "coast_guard"
        ? "#3b82f6"
        : cat === "tanker"
          ? "#f59e0b"
          : cat === "cargo"
            ? "#a78bfa"
            : "#22c55e";
  const rotation = heading != null ? heading : 0;
  // Diamond/ship shape
  return `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(${rotation} 11 11)">
      <path d="M11 2 L17 11 L11 20 L5 11 Z"
        fill="${color}" stroke="white" stroke-width="1.2" opacity="0.9"/>
    </g>
  </svg>`;
}

function powerSvg(status: string): string {
  const color =
    status === "online" ? "#22c55e" : status === "partial" ? "#f59e0b" : "#ef4444";
  const radius = status === "blackout" ? 10 : status === "partial" ? 8 : 6;
  const opacity = status === "blackout" ? 0.7 : 0.5;
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="${radius}" fill="${color}" opacity="${opacity}" stroke="${color}" stroke-width="2" stroke-opacity="0.4"/>
    <text x="12" y="16" text-anchor="middle" font-size="10" fill="white" font-weight="bold">⚡</text>
  </svg>`;
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createHtmlElement(html: string): HTMLElement {
  const div = document.createElement("div");
  div.innerHTML = html;
  div.style.cursor = "pointer";
  return div;
}

// ─── Map component ──────────────────────────────────────────────────────────

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

export default function CubaMap({
  aircraft,
  vessels,
  power,
  layers,
}: CubaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mounted, setMounted] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        name: "Dark",
        sources: {
          "carto-dark": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          },
        },
        layers: [
          {
            id: "carto-dark-layer",
            type: "raster",
            source: "carto-dark",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [-79.5, 22.0],
      zoom: 5.5,
      minZoom: 4,
      maxZoom: 12,
      maxBounds: [
        [-95, 14],
        [-65, 28],
      ],
    });

    // Better touch handling
    map.touchZoomRotate.enableRotation();
    map.dragRotate.disable();

    // Compact attribution
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    // Zoom controls
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    mapRef.current = map;
    setMounted(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when data or layers change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mounted) return;

    // Clear old markers
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];

    // Aircraft markers
    if (layers.showAir) {
      for (const ac of aircraft) {
        const svg = aircraftSvg(ac.category, ac.heading);
        const el = createHtmlElement(svg);

        const popup = new maplibregl.Popup({ offset: 12, maxWidth: "220px" }).setHTML(`
          <div style="font-size:12px;color:#e2e8f0">
            <strong>${ac.callsign || ac.icao24}</strong><br/>
            <span style="color:#94a3b8">${ac.originCountry}</span><br/>
            ${ac.altitude != null ? `${ac.altitude.toLocaleString()} ft` : "—"}
            ${ac.speed != null ? ` · ${ac.speed} kts` : ""}
            ${ac.heading != null ? ` · HDG ${ac.heading}°` : ""}
            ${ac.squawk ? `<br/>Squawk: ${ac.squawk}` : ""}
            <br/><span style="color:#64748b;font-size:10px">✈ ${ac.category} · OpenSky</span>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([ac.lng, ac.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      }
    }

    // Vessel markers
    if (layers.showMaritime) {
      for (const v of vessels) {
        const svg = vesselSvg(v.category, v.heading);
        const el = createHtmlElement(svg);

        const popup = new maplibregl.Popup({ offset: 12, maxWidth: "220px" }).setHTML(`
          <div style="font-size:12px;color:#e2e8f0">
            <strong>${v.name}</strong><br/>
            <span style="color:#94a3b8">${v.type} · ${v.flag}</span><br/>
            ${v.speed != null ? `${v.speed} kts` : "—"}
            ${v.heading != null ? ` · HDG ${v.heading}°` : ""}
            <br/><span style="color:#64748b;font-size:10px">◆ ${v.category} · AISstream</span>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([v.lng, v.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      }
    }

    // Power markers
    if (layers.showPower) {
      for (const p of power) {
        const svg = powerSvg(p.status);
        const el = createHtmlElement(svg);

        const popup = new maplibregl.Popup({ offset: 12, maxWidth: "200px" }).setHTML(`
          <div style="font-size:12px;color:#e2e8f0">
            <strong>${p.province}</strong><br/>
            Status: <span style="color:${
              p.status === "online" ? "#22c55e" : p.status === "partial" ? "#f59e0b" : "#ef4444"
            }">${p.status.toUpperCase()}</span><br/>
            Load: ${p.loadMW} / ${p.capacityMW} MW
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      }
    }
  }, [aircraft, vessels, power, layers, mounted]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}
