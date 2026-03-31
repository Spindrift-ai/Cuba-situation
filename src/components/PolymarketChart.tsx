"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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

  for (const g of Object.values(groups)) {
    g.markets.sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));
  }

  return Object.values(groups).sort((a, b) => {
    const aVol = Math.max(...a.markets.map((m) => parseFloat(m.volume) || 0));
    const bVol = Math.max(...b.markets.map((m) => parseFloat(m.volume) || 0));
    return bVol - aVol;
  });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function MiniLineChart({
  data,
}: {
  data: Array<{ timestamp: number; probability: number }>;
}) {
  if (data.length < 2) return null;

  // Downsample for performance if too many points
  const sampled =
    data.length > 100
      ? data.filter((_, i) => i % Math.ceil(data.length / 100) === 0 || i === data.length - 1)
      : data;

  return (
    <div className="h-24 mt-1">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <LineChart data={sampled} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="timestamp"
            tick={{ fill: "#64748b", fontSize: 9 }}
            axisLine={{ stroke: "#1e293b" }}
            tickLine={false}
            tickFormatter={formatDate}
            minTickGap={40}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 9 }}
            axisLine={{ stroke: "#1e293b" }}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "#151d2e",
              border: "1px solid #334155",
              borderRadius: 6,
              fontSize: 10,
              color: "#e2e8f0",
            }}
            labelFormatter={(ts) =>
              new Date(ts).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            }
            formatter={(value) => [`${value}%`, "Probability"]}
          />
          <Line
            type="monotone"
            dataKey="probability"
            stroke="#a855f7"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "#a855f7" }}
          />
        </LineChart>
      </ResponsiveContainer>
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
              {groups.length} events
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
                      {/* Sub-question label if multiple markets in event */}
                      {group.markets.length > 1 && (
                        <div className="text-[10px] text-[var(--text-secondary)] mb-1">
                          {m.groupItemTitle || m.question}
                        </div>
                      )}

                      {/* Current probability + metadata row */}
                      <div className="flex items-baseline gap-2">
                        {m.probability != null && (
                          <span className="text-[18px] font-bold text-[var(--accent-purple)]">
                            {m.probability}%
                          </span>
                        )}
                        <div className="flex items-center gap-2 text-[9px] text-[var(--text-muted)]">
                          {m.volume && (
                            <span>
                              ${Number(m.volume).toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })}
                            </span>
                          )}
                          {m.endDate && (
                            <span>
                              Ends{" "}
                              {new Date(m.endDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                          <span
                            className={
                              m.active && !m.closed
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          >
                            {m.closed ? "CLOSED" : m.active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>
                      </div>

                      {/* Price history line chart */}
                      <MiniLineChart data={m.priceHistory} />

                      {/* No history fallback */}
                      {m.priceHistory.length < 2 && (
                        <div className="text-[9px] text-[var(--text-muted)] mt-1 italic">
                          Price history not available
                        </div>
                      )}
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
