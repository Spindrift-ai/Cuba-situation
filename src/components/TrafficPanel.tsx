"use client";

import type { Aircraft, Vessel } from "@/lib/types";
import { LoadingState, ErrorState, ConfigRequired, EmptyState, FetchTimestamp } from "./StatusBar";

function categoryBadge(cat: string) {
  const colors: Record<string, string> = {
    military: "bg-red-500/20 text-red-400",
    surveillance: "bg-amber-500/20 text-amber-400",
    civilian: "bg-green-500/20 text-green-400",
    cargo: "bg-green-500/20 text-green-400",
    tanker: "bg-amber-500/20 text-amber-400",
    fishing: "bg-slate-500/20 text-slate-400",
    coast_guard: "bg-blue-500/20 text-blue-400",
    other: "bg-gray-500/20 text-gray-400",
  };
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${colors[cat] || colors.other}`}
    >
      {cat.replace("_", " ")}
    </span>
  );
}

interface TrafficPanelProps {
  aircraft: Aircraft[];
  vessels: Vessel[];
  aircraftLoading: boolean;
  aircraftError: string | null;
  aircraftFetchedAt: string | null;
  vesselsLoading: boolean;
  vesselsError: string | null;
  vesselsFetchedAt: string | null;
  maritimeConfigRequired: boolean;
  maritimeConfigMessage?: string;
}

export default function TrafficPanel({
  aircraft,
  vessels,
  aircraftLoading,
  aircraftError,
  aircraftFetchedAt,
  vesselsLoading,
  vesselsError,
  vesselsFetchedAt,
  maritimeConfigRequired,
  maritimeConfigMessage,
}: TrafficPanelProps) {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-green)] pulse-dot" />
        Air & Maritime Traffic
        <span className="ml-auto text-[var(--text-muted)] text-[10px] font-normal normal-case tracking-normal">
          {aircraft.length + vessels.length} tracked
        </span>
      </div>
      <div className="panel-body flex-1 overflow-y-auto space-y-3">
        {/* Air */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              ✈ Aircraft — OpenSky Network
            </span>
            <FetchTimestamp fetchedAt={aircraftFetchedAt} />
          </div>

          {aircraftLoading && <LoadingState />}
          {!aircraftLoading && aircraftError && <ErrorState message={aircraftError} />}
          {!aircraftLoading && !aircraftError && aircraft.length === 0 && (
            <EmptyState message="No aircraft detected in Cuba airspace. OpenSky coverage may be limited in this region." />
          )}

          <div className="space-y-1.5">
            {aircraft.map((ac) => (
              <div
                key={ac.id}
                className="flex items-start gap-2 p-2 rounded bg-[var(--bg-secondary)] text-[11px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)]">
                      {ac.callsign || ac.icao24}
                    </span>
                    {categoryBadge(ac.category)}
                  </div>
                  <div className="text-[var(--text-secondary)] mt-0.5">
                    {ac.originCountry}
                    {ac.onGround ? " · On ground" : ""}
                  </div>
                  <div className="text-[var(--text-muted)] text-[10px]">
                    {ac.altitude != null ? `${ac.altitude.toLocaleString()}ft` : "—"}
                    {ac.speed != null ? ` · ${ac.speed}kts` : ""}
                    {ac.heading != null ? ` · HDG${ac.heading}°` : ""}
                    {ac.squawk ? ` · SQK${ac.squawk}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maritime */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              ⚓ Vessels — AISstream.io
            </span>
            <FetchTimestamp fetchedAt={vesselsFetchedAt} />
          </div>

          {vesselsLoading && <LoadingState />}
          {!vesselsLoading && maritimeConfigRequired && (
            <ConfigRequired message={maritimeConfigMessage || "API key required"} />
          )}
          {!vesselsLoading && !maritimeConfigRequired && vesselsError && (
            <ErrorState message={vesselsError} />
          )}
          {!vesselsLoading && !maritimeConfigRequired && !vesselsError && vessels.length === 0 && (
            <EmptyState message="No vessels detected in Cuba waters." />
          )}

          <div className="space-y-1.5">
            {vessels.map((v) => (
              <div
                key={v.id}
                className="flex items-start gap-2 p-2 rounded bg-[var(--bg-secondary)] text-[11px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)]">
                      {v.name}
                    </span>
                    {categoryBadge(v.category)}
                  </div>
                  <div className="text-[var(--text-secondary)] mt-0.5">
                    {v.type} · {v.flag}
                  </div>
                  <div className="text-[var(--text-muted)] text-[10px]">
                    {v.speed != null ? `${v.speed}kts` : "—"}
                    {v.heading != null ? ` · HDG${v.heading}°` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
