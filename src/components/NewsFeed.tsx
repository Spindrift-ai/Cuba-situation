"use client";

import { useState } from "react";
import type { NewsItem } from "@/data/mockData";

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function typeTag(type: NewsItem["type"]) {
  const styles: Record<string, string> = {
    news: "bg-blue-500/20 text-blue-400",
    tweet: "bg-cyan-500/20 text-cyan-400",
    social: "bg-purple-500/20 text-purple-400",
  };
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${styles[type]}`}
    >
      {type}
    </span>
  );
}

interface NewsFeedProps {
  items: NewsItem[];
  onSelect?: (item: NewsItem) => void;
}

export default function NewsFeed({ items, onSelect }: NewsFeedProps) {
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
        <span className="ml-auto text-[var(--text-muted)] text-[10px] font-normal normal-case tracking-normal">
          {items.length} items
        </span>
      </div>
      <div className="panel-body flex-1 overflow-y-auto space-y-2" style={{ maxHeight: "calc(100vh - 400px)" }}>
        {items.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <button
              key={item.id}
              className={`w-full text-left p-2.5 rounded border transition-all cursor-pointer ${
                isExpanded
                  ? "bg-[var(--bg-panel-hover)] border-[var(--border-bright)]"
                  : "bg-[var(--bg-secondary)] border-transparent hover:bg-[var(--bg-panel-hover)] hover:border-[var(--border-bright)]"
              }`}
              onClick={() => handleClick(item)}
            >
              <div className="flex items-center gap-2 mb-1">
                {typeTag(item.type)}
                <span className="text-[10px] text-[var(--text-muted)]">
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

              {/* Collapsed: truncated summary */}
              {!isExpanded && (
                <div className="text-[10px] leading-snug text-[var(--text-secondary)] line-clamp-2">
                  {item.summary}
                </div>
              )}

              {/* Expanded: full content */}
              {isExpanded && (
                <div className="mt-2 space-y-2">
                  <div className="text-[11px] leading-relaxed text-[var(--text-primary)]">
                    {item.summary}
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
                    {item.locationLabel && (
                      <span className="text-[9px] text-[var(--accent-cyan)]">
                        📍 {item.locationLabel}
                      </span>
                    )}
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {new Date(item.timestamp).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZoneName: "short",
                      })}
                    </span>
                    <span className="text-[9px] text-[var(--accent-blue)] ml-auto">
                      View source →
                    </span>
                  </div>
                </div>
              )}

              {/* Collapsed location tag */}
              {!isExpanded && item.locationLabel && (
                <div className="mt-1 text-[9px] text-[var(--accent-cyan)]">
                  📍 {item.locationLabel}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
