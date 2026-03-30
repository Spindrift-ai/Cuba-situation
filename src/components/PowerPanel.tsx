"use client";

import type { ProvinceStatus } from "@/lib/types";
import { LoadingState, ErrorState, ConfigRequired, FetchTimestamp } from "./StatusBar";

function statusDot(status: ProvinceStatus["status"]) {
  const color =
    status === "online"
      ? "bg-green-500"
      : status === "partial"
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color} ${status === "blackout" ? "pulse-dot" : ""}`}
    />
  );
}

function statusLabel(status: ProvinceStatus["status"]) {
  const styles =
    status === "online"
      ? "text-green-400"
      : status === "partial"
        ? "text-amber-400"
        : "text-red-400";
  return (
    <span className={`text-[9px] font-bold uppercase ${styles}`}>{status}</span>
  );
}

interface PowerPanelProps {
  data: ProvinceStatus[];
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  configRequired: boolean;
  configMessage?: string;
}

export default function PowerPanel({
  data,
  loading,
  error,
  fetchedAt,
  configRequired,
  configMessage,
}: PowerPanelProps) {
  const totalLoad = data.reduce((s, p) => s + p.loadMW, 0);
  const totalCapacity = data.reduce((s, p) => s + p.capacityMW, 0);
  const blackoutCount = data.filter((p) => p.status === "blackout").length;
  const partialCount = data.filter((p) => p.status === "partial").length;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-red)] pulse-dot" />
        Power Grid Status
        <span className="ml-auto">
          <FetchTimestamp fetchedAt={fetchedAt} />
        </span>
      </div>
      <div className="panel-body flex-1 overflow-y-auto">
        {loading && <LoadingState />}
        {!loading && configRequired && (
          <ConfigRequired
            message={
              configMessage ||
              "No public API exists for Cuba's power grid. Real-time data requires a custom scraper " +
              "monitoring UNE (https://www.une.cu) or social media reports. " +
              "Set CUBA_POWER_SCRAPER_URL in .env.local to connect a scraper endpoint."
            }
          />
        )}
        {!loading && !configRequired && error && <ErrorState message={error} />}

        {!loading && !configRequired && data.length > 0 && (
          <>
            {/* Summary bar */}
            <div className="flex gap-3 mb-3 text-[10px]">
              <div className="flex-1 p-2 rounded bg-[var(--bg-secondary)] text-center">
                <div className="text-[var(--text-muted)]">Grid Load</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">
                  {totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0}%
                </div>
                <div className="text-[var(--text-muted)]">
                  {totalLoad} / {totalCapacity} MW
                </div>
              </div>
              <div className="flex-1 p-2 rounded bg-[var(--bg-secondary)] text-center">
                <div className="text-[var(--text-muted)]">Blackouts</div>
                <div className="text-lg font-bold text-red-400">{blackoutCount}</div>
                <div className="text-[var(--text-muted)]">provinces</div>
              </div>
              <div className="flex-1 p-2 rounded bg-[var(--bg-secondary)] text-center">
                <div className="text-[var(--text-muted)]">Partial</div>
                <div className="text-lg font-bold text-amber-400">{partialCount}</div>
                <div className="text-[var(--text-muted)]">provinces</div>
              </div>
            </div>

            {/* Province list */}
            <div className="space-y-1">
              {data.map((p) => (
                <div
                  key={p.province}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-[var(--bg-secondary)] text-[11px]"
                >
                  {statusDot(p.status)}
                  <span className="flex-1 text-[var(--text-primary)] truncate">
                    {p.province}
                  </span>
                  {statusLabel(p.status)}
                  <span className="text-[var(--text-muted)] text-[10px] w-20 text-right">
                    {p.loadMW}/{p.capacityMW} MW
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
