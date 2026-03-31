"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ApiTestResult {
  status: "loading" | "ok" | "error" | "empty";
  statusCode?: number;
  itemCount?: number;
  diagnostics?: Record<string, string>;
  error?: string;
  raw?: unknown;
  elapsed?: number;
}

function StatusBadge({ status }: { status: ApiTestResult["status"] }) {
  const colors = {
    loading: "bg-blue-500/20 text-blue-400",
    ok: "bg-green-500/20 text-green-400",
    error: "bg-red-500/20 text-red-400",
    empty: "bg-amber-500/20 text-amber-400",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${colors[status]}`}
    >
      {status}
    </span>
  );
}

function ApiCard({
  name,
  path,
  result,
  onTest,
}: {
  name: string;
  path: string;
  result: ApiTestResult;
  onTest: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="panel p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
          {name}
        </span>
        <StatusBadge status={result.status} />
        {result.elapsed != null && (
          <span className="text-[10px] text-[var(--text-muted)]">
            {result.elapsed}ms
          </span>
        )}
        <span className="ml-auto flex gap-2">
          <a
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[var(--accent-cyan)] hover:underline font-mono"
          >
            {path}
          </a>
          <button
            onClick={onTest}
            className="text-[10px] px-2 py-0.5 rounded bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/30"
          >
            Test
          </button>
        </span>
      </div>

      {result.status !== "loading" && (
        <>
          <div className="text-[11px] text-[var(--text-secondary)] space-y-1">
            {result.statusCode != null && (
              <div>
                HTTP {result.statusCode} · {result.itemCount ?? 0} items
              </div>
            )}
            {result.error && (
              <div className="text-red-400">{result.error}</div>
            )}
          </div>

          {result.diagnostics &&
            Object.keys(result.diagnostics).length > 0 && (
              <div className="mt-2 space-y-0.5">
                <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">
                  Diagnostics
                </div>
                {Object.entries(result.diagnostics).map(([key, val]) => (
                  <div key={key} className="text-[10px] font-mono">
                    <span className="text-[var(--accent-cyan)]">{key}:</span>{" "}
                    <span className="text-[var(--text-secondary)]">
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            {expanded ? "▼ Hide raw JSON" : "▶ Show raw JSON"}
          </button>
          {expanded && (
            <pre className="mt-1 p-2 rounded bg-black/30 text-[9px] text-[var(--text-muted)] overflow-x-auto max-h-[300px] overflow-y-auto">
              {JSON.stringify(result.raw, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

const API_ENDPOINTS = [
  { name: "News (GDELT + Mediastack + GNews + Currents)", path: "/api/news", countKey: "items" },
  { name: "Aircraft (OpenSky + AirLabs)", path: "/api/aircraft", countKey: "aircraft" },
  { name: "Maritime (AISstream)", path: "/api/maritime", countKey: "vessels" },
  { name: "Power Outages (GDELT)", path: "/api/power", countKey: "reports" },
  { name: "Polymarket (Gamma + CLOB)", path: "/api/polymarket", countKey: "markets" },
];

export default function DebugPage() {
  const [results, setResults] = useState<Record<string, ApiTestResult>>({});

  useEffect(() => {
    // Load eruda for mobile debugging
    import("eruda").then((eruda) => {
      eruda.default.init();
    });
  }, []);

  async function testEndpoint(path: string, countKey: string) {
    setResults((prev) => ({
      ...prev,
      [path]: { status: "loading" },
    }));

    const start = Date.now();
    try {
      const res = await fetch(path, { cache: "no-store" });
      const elapsed = Date.now() - start;
      const json = await res.json();

      const itemCount = Array.isArray(json[countKey])
        ? json[countKey].length
        : 0;

      setResults((prev) => ({
        ...prev,
        [path]: {
          status: res.ok && itemCount > 0 ? "ok" : itemCount === 0 ? "empty" : "error",
          statusCode: res.status,
          itemCount,
          diagnostics: json.diagnostics || {},
          error: json.error || undefined,
          raw: json,
          elapsed,
        },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [path]: {
          status: "error",
          error: String(err),
          elapsed: Date.now() - start,
        },
      }));
    }
  }

  function testAll() {
    for (const ep of API_ENDPOINTS) {
      testEndpoint(ep.path, ep.countKey);
    }
  }

  return (
    <div
      className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 overflow-y-auto"
      style={{ height: "100vh" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/"
          className="text-[11px] text-[var(--accent-cyan)] hover:underline"
        >
          ← Back
        </Link>
        <h1 className="text-[16px] font-bold">
          <span className="text-[var(--accent-red)]">◉</span> API Diagnostics
        </h1>
        <button
          onClick={testAll}
          className="ml-auto text-[11px] px-3 py-1 rounded bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/30 font-semibold"
        >
          Test All APIs
        </button>
      </div>

      <div className="space-y-3 max-w-2xl">
        {API_ENDPOINTS.map((ep) => (
          <ApiCard
            key={ep.path}
            name={ep.name}
            path={ep.path}
            result={results[ep.path] || { status: "loading" }}
            onTest={() => testEndpoint(ep.path, ep.countKey)}
          />
        ))}

        <div className="panel p-3">
          <div className="text-[12px] font-semibold text-[var(--text-primary)] mb-2">
            Environment Keys
          </div>
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            API keys are configured server-side in <code className="bg-[var(--bg-secondary)] px-1 rounded">.env.local</code>.
            The following optional keys enhance data coverage:
          </p>
          <div className="mt-2 space-y-0.5 text-[10px] font-mono">
            <div><span className="text-[var(--accent-cyan)]">AISSTREAM_API_KEY</span> — Maritime vessel tracking (free at aisstream.io)</div>
            <div><span className="text-[var(--accent-cyan)]">AIRLABS_API_KEY</span> — Aircraft tracking fallback (free at airlabs.co)</div>
            <div><span className="text-[var(--accent-cyan)]">MEDIASTACK_API_KEY</span> — News source (free at mediastack.com)</div>
            <div><span className="text-[var(--accent-cyan)]">GNEWS_API_KEY</span> — News source (free at gnews.io)</div>
            <div><span className="text-[var(--accent-cyan)]">CURRENTS_API_KEY</span> — News source (free at currentsapi.services)</div>
            <div><span className="text-[var(--accent-cyan)]">CUBA_POWER_SCRAPER_URL</span> — Custom power data scraper</div>
          </div>
        </div>

        <div className="panel p-3">
          <div className="text-[12px] font-semibold text-[var(--text-primary)] mb-2">
            Eruda Dev Tools
          </div>
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            The Eruda in-browser developer tools console has been loaded. Use the
            floating gear icon to access the console and network inspector.
          </p>
        </div>
      </div>
    </div>
  );
}
