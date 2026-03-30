"use client";

import Link from "next/link";
import { dataSources } from "@/data/sources";

const categoryLabels: Record<string, { label: string; color: string }> = {
  news: { label: "News & Social Media", color: "#3b82f6" },
  air_traffic: { label: "Air Traffic", color: "#22c55e" },
  maritime: { label: "Maritime Traffic", color: "#06b6d4" },
  power: { label: "Power Grid / Infrastructure", color: "#ef4444" },
  predictions: { label: "Prediction Markets", color: "#a855f7" },
};

const statusBadge: Record<string, { label: string; className: string }> = {
  available: {
    label: "FREE / NO AUTH",
    className: "bg-green-500/20 text-green-400",
  },
  requires_key: {
    label: "FREE API KEY",
    className: "bg-amber-500/20 text-amber-400",
  },
  paid_only: {
    label: "PAID",
    className: "bg-red-500/20 text-red-400",
  },
};

export default function SourcesPage() {
  const categories = [...new Set(dataSources.map((s) => s.category))];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <Link
              href="/"
              className="text-[11px] text-[var(--accent-cyan)] hover:underline"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-[18px] font-bold mt-1 tracking-wide">
              <span className="text-[var(--accent-red)]">◉</span> Data Sources
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Verified data sources powering the Monitoring la situación
              dashboard. All endpoints are real and publicly documented.
            </p>
          </div>
          <div className="text-right text-[10px] text-[var(--text-muted)]">
            {dataSources.length} sources confirmed
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-8">
        {categories.map((cat) => {
          const info = categoryLabels[cat] || {
            label: cat,
            color: "#94a3b8",
          };
          const sources = dataSources.filter((s) => s.category === cat);

          return (
            <section key={cat}>
              <h2
                className="text-[13px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ color: info.color }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: info.color }}
                />
                {info.label}
              </h2>

              <div className="space-y-3">
                {sources.map((src) => {
                  const badge = statusBadge[src.status];
                  return (
                    <div
                      key={src.id}
                      className="panel p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-[var(--text-primary)]">
                              {src.name}
                            </span>
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed max-w-2xl">
                            {src.description}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10px]">
                        <div>
                          <span className="text-[var(--text-muted)] uppercase tracking-wider">
                            Docs / URL
                          </span>
                          <div className="mt-0.5">
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--accent-cyan)] hover:underline break-all"
                            >
                              {src.url}
                            </a>
                          </div>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] uppercase tracking-wider">
                            API Endpoint
                          </span>
                          <div className="mt-0.5 font-mono text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-1 rounded break-all">
                            {src.apiEndpoint}
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-3 py-2 rounded leading-relaxed">
                        {src.notes}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Disclaimer */}
        <div className="border-t border-[var(--border)] pt-4 text-[10px] text-[var(--text-muted)] leading-relaxed">
          <strong className="text-[var(--text-secondary)]">Note:</strong> The
          dashboard currently uses mock data for demonstration. To connect live
          sources, add the required API keys to your{" "}
          <code className="bg-[var(--bg-secondary)] px-1 rounded">
            .env.local
          </code>{" "}
          file and update the service layer in{" "}
          <code className="bg-[var(--bg-secondary)] px-1 rounded">
            src/data/
          </code>
          . Some sources (UNE power grid data) require custom scrapers as no
          formal API exists. Polymarket markets for Cuba are not guaranteed to
          exist — check the CLOB API for current availability.
        </div>
      </main>
    </div>
  );
}
