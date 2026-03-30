"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import type { PolymarketPoint } from "@/data/mockData";

interface PolymarketChartProps {
  data: PolymarketPoint[];
}

export default function PolymarketChart({ data }: PolymarketChartProps) {
  const latest = data[data.length - 1];

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-purple)] pulse-dot" />
        Polymarket — Cuba Regime Change 2026
        <span className="ml-auto text-[var(--text-muted)] text-[10px] font-normal normal-case tracking-normal">
          PREDICTION
        </span>
      </div>
      <div className="panel-body flex-1 flex flex-col">
        {/* Current price */}
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-2xl font-bold text-[var(--accent-purple)]">
            {latest.probability}%
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">
            probability · ${(latest.volume / 1000).toFixed(0)}k vol
          </span>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0" style={{ minHeight: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={{ stroke: "#1e293b" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={{ stroke: "#1e293b" }}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 40]}
              />
              <Tooltip
                contentStyle={{
                  background: "#151d2e",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "#e2e8f0",
                }}
                formatter={(value) => [`${value}%`, "Probability"]}
              />
              <Area
                type="monotone"
                dataKey="probability"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#probGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
