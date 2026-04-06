"use client";

import { useState } from "react";
import type { ProvinceStatus, PowerReport } from "@/lib/types";
import { LoadingState, ErrorState, EmptyState, FetchTimestamp } from "./StatusBar";

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const RELEVANCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  outage: { bg: "bg-red-500/20", text: "text-red-400", label: "OUTAGE" },
  infrastructure: { bg: "bg-amber-500/20", text: "text-amber-400", label: "INFRA" },
  policy: { bg: "bg-blue-500/20", text: "text-blue-400", label: "POLICY" },
};

interface PowerPanelProps {
  reports: PowerReport[];
  provinces: ProvinceStatus[];
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  scraperConfigured: boolean;
  source?: string;
  aiEnabled?: boolean;
}

export default function PowerPanel({
  reports,
  provinces,
  loading,
  error,
  fetchedAt,
  scraperConfigured,
  source,
  aiEnabled,
}: PowerPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const hasProvinces = provinces.length > 0;
  const hasReports = reports.length > 0;

  const totalLoad = provinces.reduce((s, p) => s + p.loadMW, 0);
  const totalCapacity = provinces.reduce((s, p) => s + p.capacityMW, 0);
  const blackoutCount = provinces.filter((p) => p.status === "blackout").length;
  const partialCount = provinces.filter((p) => p.status === "partial").length;

  // Count by relevance
  const outageCount = reports.filter((r) => r.relevance === "outage").length;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-red)] pulse-dot" />
        Power Grid / Outage Reports
        <span className="ml-auto flex items-center gap-2">
          <FetchTimestamp fetchedAt={fetchedAt} />
          {hasReports && (
            <span className="text-[var(--text-muted)] text-[10px] font-normal normal-case tracking-normal">
              {reports.length} reports{outageCount > 0 ? ` (${outageCount} outage)` : ""}
            </span>
          )}
        </span>
      </div>
      <div className="panel-body flex-1 overflow-y-auto">
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} />}

        {/* Source attribution */}
        {!loading && source && (
          <div className="text-[9px] text-[var(--text-muted)] mb-2 px-1 flex items-center gap-1.5">
            Source: {source}
            {aiEnabled && (
              <span className="inline-block px-1 py-0.5 rounded bg-purple-500/15 text-purple-400 text-[8px] font-bold">
                AI FILTERED
              </span>
            )}
          </div>
        )}

        {/* Province-level data (from custom scraper, if configured) */}
        {!loading && hasProvinces && (
          <>
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

            <div className="space-y-1 mb-4">
              {provinces.map((p) => (
                <div
                  key={p.province}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-[var(--bg-secondary)] text-[11px]"
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      p.status === "online"
                        ? "bg-green-500"
                        : p.status === "partial"
                          ? "bg-amber-500"
                          : "bg-red-500"
                    } ${p.status === "blackout" ? "pulse-dot" : ""}`}
                  />
                  <span className="flex-1 text-[var(--text-primary)] truncate">
                    {p.province}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase ${
                      p.status === "online"
                        ? "text-green-400"
                        : p.status === "partial"
                          ? "text-amber-400"
                          : "text-red-400"
                    }`}
                  >
                    {p.status}
                  </span>
                  <span className="text-[var(--text-muted)] text-[10px] w-20 text-right">
                    {p.loadMW}/{p.capacityMW} MW
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Scraper setup hint if no province data */}
        {!loading && !hasProvinces && (
          <div className="p-3 mb-3 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-[10px] text-[var(--text-muted)] leading-relaxed">
            <span className="text-amber-400 font-bold">Province-level grid data</span>{" "}
            requires a custom scraper (no public API exists for UNE).
            {!scraperConfigured && (
              <>
                {" "}Set <code className="bg-[var(--bg-primary)] px-1 rounded">CUBA_POWER_SCRAPER_URL</code> in{" "}
                <code className="bg-[var(--bg-primary)] px-1 rounded">.env.local</code> to enable.
              </>
            )}
          </div>
        )}

        {/* Power outage news reports */}
        {!loading && hasReports && (
          <div>
            <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              {aiEnabled ? "AI-Filtered Outage Reports" : "Outage Reports from News Sources"}
            </div>
            <div className="space-y-1.5">
              {reports.map((r) => {
                const isExpanded = expandedId === r.id;
                const style = RELEVANCE_STYLES[r.relevance || "infrastructure"] || RELEVANCE_STYLES.infrastructure;

                return (
                  <div
                    key={r.id}
                    className={`w-full text-left p-2.5 rounded border transition-all cursor-pointer ${
                      isExpanded
                        ? "bg-[var(--bg-panel-hover)] border-[var(--border-bright)]"
                        : "bg-[var(--bg-secondary)] border-transparent hover:bg-[var(--bg-panel-hover)] hover:border-[var(--border-bright)]"
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}
                      >
                        {style.label}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">
                        {r.source}
                      </span>
                      <span className="ml-auto flex items-center gap-1.5">
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {timeAgo(r.timestamp)}
                        </span>
                        <span
                          className={`text-[10px] text-[var(--text-muted)] transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          ▾
                        </span>
                      </span>
                    </div>
                    <div className="text-[12px] font-medium leading-tight text-[var(--text-primary)]">
                      {r.title}
                    </div>

                    {/* AI summary line */}
                    {r.aiSummary && (
                      <div className="text-[10px] text-purple-300/80 mt-1 italic">
                        {r.aiSummary}
                      </div>
                    )}

                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center gap-3">
                        <span className="text-[9px] text-[var(--text-muted)]">
                          {new Date(r.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZoneName: "short",
                          })}
                        </span>
                        {r.language && (
                          <span className="text-[9px] text-[var(--text-muted)] uppercase">
                            {r.language}
                          </span>
                        )}
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-[var(--accent-cyan)] hover:underline ml-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Read full article →
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && !hasReports && !hasProvinces && !error && (
          <EmptyState message="No power outage reports found at this time." />
        )}
      </div>
    </div>
  );
}
