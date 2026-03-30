"use client";

import type { PolymarketMarket } from "@/lib/types";
import { LoadingState, ErrorState, EmptyState, FetchTimestamp } from "./StatusBar";

interface PolymarketChartProps {
  markets: PolymarketMarket[];
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  note?: string;
}

export default function PolymarketChart({
  markets,
  loading,
  error,
  fetchedAt,
  note,
}: PolymarketChartProps) {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-purple)] pulse-dot" />
        Polymarket — Cuba
        <span className="ml-auto">
          <FetchTimestamp fetchedAt={fetchedAt} />
        </span>
      </div>
      <div className="panel-body flex-1 overflow-y-auto">
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} />}
        {!loading && !error && markets.length === 0 && (
          <EmptyState
            message={
              note ||
              "No active Cuba-related prediction markets found on Polymarket. Markets are created by users and may not always exist for every topic."
            }
          />
        )}

        {!loading && markets.length > 0 && (
          <div className="space-y-3">
            {markets.map((m) => (
              <a
                key={m.id}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-panel-hover)] border border-transparent hover:border-[var(--border-bright)] transition-all"
              >
                <div className="text-[12px] font-medium text-[var(--text-primary)] mb-2">
                  {m.question}
                </div>

                {/* Probability bar */}
                {m.probability != null && (
                  <div className="mb-2">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-2xl font-bold text-[var(--accent-purple)]">
                        {m.probability}%
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        probability
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-purple)] rounded-full transition-all"
                        style={{ width: `${m.probability}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                  {m.volume && (
                    <span>
                      Vol: ${Number(m.volume).toLocaleString()}
                    </span>
                  )}
                  {m.endDate && (
                    <span>
                      Ends:{" "}
                      {new Date(m.endDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  <span className={m.active ? "text-green-400" : "text-red-400"}>
                    {m.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                  <span className="text-[var(--accent-cyan)] ml-auto">
                    View on Polymarket →
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
