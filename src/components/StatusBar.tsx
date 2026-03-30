"use client";

// Reusable loading/error/empty state component for panels

interface StatusBarProps {
  loading: boolean;
  error: string | null;
  configRequired?: boolean;
  configMessage?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
  fetchedAt?: string | null;
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center space-y-2">
        <div className="inline-block w-5 h-5 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] text-[var(--text-muted)]">Fetching live data…</div>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-4 m-3 rounded bg-red-500/10 border border-red-500/30">
      <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">
        Data Source Error
      </div>
      <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
        {message}
      </div>
    </div>
  );
}

export function ConfigRequired({ message }: { message: string }) {
  return (
    <div className="p-4 m-3 rounded bg-amber-500/10 border border-amber-500/30">
      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
        Configuration Required
      </div>
      <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
        {message}
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-4 m-3 rounded bg-[var(--bg-secondary)] border border-[var(--border)]">
      <div className="text-[11px] text-[var(--text-muted)] text-center">
        {message}
      </div>
    </div>
  );
}

export function FetchTimestamp({ fetchedAt }: { fetchedAt: string | null }) {
  if (!fetchedAt) return null;
  return (
    <span className="text-[9px] text-[var(--text-muted)]">
      Updated{" "}
      {new Date(fetchedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </span>
  );
}
