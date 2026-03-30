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

// Group markets by their parent event
function groupByEvent(markets: PolymarketMarket[]) {
  const groups: Record<
    string,
    { eventTitle: string; eventSlug: string; url: string; markets: PolymarketMarket[] }
  > = {};

  for (const m of markets) {
    const key = m.eventSlug || m.slug;
    if (!groups[key]) {
      groups[key] = {
        eventTitle: m.eventTitle || m.question,
        eventSlug: m.eventSlug,
        url: m.url,
        markets: [],
      };
    }
    groups[key].markets.push(m);
  }

  // Sort each group's markets by probability descending
  for (const g of Object.values(groups)) {
    g.markets.sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));
  }

  // Sort groups by highest market volume
  return Object.values(groups).sort((a, b) => {
    const aVol = Math.max(...a.markets.map((m) => parseFloat(m.volume) || 0));
    const bVol = Math.max(...b.markets.map((m) => parseFloat(m.volume) || 0));
    return bVol - aVol;
  });
}

function ProbBar({ probability }: { probability: number | null }) {
  if (probability == null) return null;
  const color =
    probability >= 50
      ? "bg-[var(--accent-red)]"
      : probability >= 20
        ? "bg-[var(--accent-amber)]"
        : "bg-[var(--accent-purple)]";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${probability}%` }}
        />
      </div>
      <span className="text-[11px] font-bold text-[var(--text-primary)] w-10 text-right">
        {probability}%
      </span>
    </div>
  );
}

export default function PolymarketChart({
  markets,
  loading,
  error,
  fetchedAt,
  note,
}: PolymarketChartProps) {
  const groups = groupByEvent(markets);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-purple)] pulse-dot" />
        Polymarket — Cuba Bets
        <span className="ml-auto flex items-center gap-2">
          <FetchTimestamp fetchedAt={fetchedAt} />
          {markets.length > 0 && (
            <span className="text-[var(--text-muted)] text-[10px] font-normal normal-case tracking-normal">
              {groups.length} events · {markets.length} markets
            </span>
          )}
        </span>
      </div>
      <div className="panel-body flex-1 overflow-y-auto">
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} />}
        {!loading && !error && markets.length === 0 && (
          <EmptyState
            message={
              note ||
              "Could not load tracked Cuba prediction markets from Polymarket."
            }
          />
        )}

        {!loading && groups.length > 0 && (
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.eventSlug}
                className="rounded bg-[var(--bg-secondary)] border border-[var(--border)] overflow-hidden"
              >
                {/* Event header */}
                <a
                  href={group.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 hover:bg-[var(--bg-panel-hover)] transition-colors border-b border-[var(--border)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[12px] font-semibold text-[var(--text-primary)] leading-tight">
                      {group.eventTitle}
                    </span>
                    <span className="text-[9px] text-[var(--accent-cyan)] whitespace-nowrap shrink-0 mt-0.5">
                      Polymarket →
                    </span>
                  </div>
                </a>

                {/* Markets within this event */}
                <div className="divide-y divide-[var(--border)]">
                  {group.markets.map((m) => (
                    <div key={m.id} className="px-3 py-2">
                      {/* Show sub-question if it differs from event title */}
                      {group.markets.length > 1 && (
                        <div className="text-[10px] text-[var(--text-secondary)] mb-1">
                          {m.groupItemTitle || m.question}
                        </div>
                      )}

                      <ProbBar probability={m.probability} />

                      <div className="flex items-center gap-3 mt-1.5 text-[9px] text-[var(--text-muted)]">
                        {m.volume && (
                          <span>
                            Vol: ${Number(m.volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                        <span
                          className={
                            m.active && !m.closed ? "text-green-400" : "text-red-400"
                          }
                        >
                          {m.closed ? "CLOSED" : m.active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
