"use client";

import type { Aircraft, Vessel } from "@/data/mockData";

function categoryBadge(cat: string) {
  const colors: Record<string, string> = {
    military: "bg-red-500/20 text-red-400",
    surveillance: "bg-amber-500/20 text-amber-400",
    civilian: "bg-green-500/20 text-green-400",
    cargo: "bg-green-500/20 text-green-400",
    tanker: "bg-amber-500/20 text-amber-400",
    fishing: "bg-slate-500/20 text-slate-400",
    coast_guard: "bg-blue-500/20 text-blue-400",
  };
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${colors[cat] || "bg-gray-500/20 text-gray-400"}`}
    >
      {cat.replace("_", " ")}
    </span>
  );
}

interface TrafficPanelProps {
  aircraft: Aircraft[];
  vessels: Vessel[];
}

export default function TrafficPanel({ aircraft, vessels }: TrafficPanelProps) {
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
          <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
            ✈ Aircraft ({aircraft.length})
          </div>
          <div className="space-y-1.5">
            {aircraft.map((ac) => (
              <div
                key={ac.id}
                className="flex items-start gap-2 p-2 rounded bg-[var(--bg-secondary)] text-[11px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)]">
                      {ac.callsign}
                    </span>
                    {categoryBadge(ac.category)}
                  </div>
                  <div className="text-[var(--text-secondary)] mt-0.5">
                    {ac.type} · {ac.origin} → {ac.destination}
                  </div>
                  <div className="text-[var(--text-muted)] text-[10px]">
                    FL{Math.round(ac.altitude / 100)} · {ac.speed}kts · HDG{ac.heading}°
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maritime */}
        <div>
          <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
            ⚓ Vessels ({vessels.length})
          </div>
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
                    {v.speed}kts · HDG{v.heading}°
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
