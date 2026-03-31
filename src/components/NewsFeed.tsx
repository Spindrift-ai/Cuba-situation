"use client";

import { useState } from "react";
import type { NewsItem } from "@/lib/types";
import { LoadingState, ErrorState, EmptyState, FetchTimestamp } from "./StatusBar";

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NewsFeedProps {
  items: NewsItem[];
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  onSelect?: (item: NewsItem) => void;
}

export default function NewsFeed({ items, loading, error, fetchedAt, onSelect }: NewsFeedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleClick = (item: NewsItem) => {
    setExpandedId((prev) => (prev === item.id ? null : item.id));
    onSelect?.(item);
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-blue)] pulse-dot" />
        Intel Feed
        <span className="ml-auto flex items-center gap-2">
          <FetchTimestamp fetchedAt={fetchedAt} />
          <span className="text-[var(--text-muted)] text-[10px] font-normal normal-case tracking-normal">
            {items.length} items
          </span>
        </span>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && items.length === 0 && (
        <EmptyState message="No Cuba-related news found. Visit /debug to check API diagnostics." />
      )}

      {!loading && items.length > 0 && (
        <div className="panel-body flex-1 overflow-y-auto space-y-2">
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className={`w-full text-left p-2.5 rounded border transition-all cursor-pointer ${
                  isExpanded
                    ? "bg-[var(--bg-panel-hover)] border-[var(--border-bright)]"
                    : "bg-[var(--bg-secondary)] border-transparent hover:bg-[var(--bg-panel-hover)] hover:border-[var(--border-bright)]"
                }`}
                onClick={() => handleClick(item)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    item.provider === "Google News"
                      ? "bg-sky-500/20 text-sky-400"
                      : item.provider === "Mediastack"
                        ? "bg-purple-500/20 text-purple-400"
                        : item.provider === "GNews"
                          ? "bg-green-500/20 text-green-400"
                          : item.provider === "Currents"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-blue-500/20 text-blue-400"
                  }`}>
                    {item.provider || "GDELT"}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">
                    {item.source}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {timeAgo(item.timestamp)}
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
                <div className="text-[12px] font-medium leading-tight text-[var(--text-primary)] mb-1">
                  {item.title}
                </div>

                {/* Expanded: full content with source link */}
                {isExpanded && (
                  <div className="mt-2 space-y-2">
                    {item.summary && (
                      <div className="text-[11px] leading-relaxed text-[var(--text-primary)]">
                        {item.summary}
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
                      <span className="text-[9px] text-[var(--text-muted)]">
                        {new Date(item.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZoneName: "short",
                        })}
                      </span>
                      {item.sourceCountry && (
                        <span className="text-[9px] text-[var(--text-muted)]">
                          {item.sourceCountry}
                        </span>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-[var(--accent-cyan)] hover:underline ml-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Read full article →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
