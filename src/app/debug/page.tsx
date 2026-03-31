"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DebugPage() {
  useEffect(() => {
    import("eruda").then((eruda) => {
      eruda.default.init();
    });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 overflow-y-auto" style={{ height: "100vh" }}>
      <Link
        href="/"
        className="text-[11px] text-[var(--accent-cyan)] hover:underline"
      >
        ← Back to Dashboard
      </Link>
      <h1 className="text-[18px] font-bold mt-3 mb-4">
        <span className="text-[var(--accent-red)]">◉</span> Debug Console
      </h1>

      <div className="space-y-4 max-w-2xl">
        <div className="panel p-4">
          <div className="text-[12px] font-semibold text-[var(--text-primary)] mb-2">
            Eruda Dev Tools
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            The Eruda in-browser developer tools console has been loaded. Use the
            floating gear icon to access the console, network inspector, element
            inspector, and more.
          </p>
        </div>

        <div className="panel p-4">
          <div className="text-[12px] font-semibold text-[var(--text-primary)] mb-2">
            API Endpoints
          </div>
          <div className="space-y-1.5 text-[11px]">
            {[
              { path: "/api/news", label: "News (GDELT)" },
              { path: "/api/aircraft", label: "Aircraft (OpenSky — 200NM)" },
              { path: "/api/maritime", label: "Maritime (AISstream)" },
              { path: "/api/power", label: "Power Outages (GDELT)" },
              { path: "/api/polymarket", label: "Polymarket (Gamma + CLOB)" },
            ].map((ep) => (
              <div key={ep.path} className="flex items-center gap-2">
                <a
                  href={ep.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-cyan)] hover:underline font-mono"
                >
                  {ep.path}
                </a>
                <span className="text-[var(--text-muted)]">{ep.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-4">
          <div className="text-[12px] font-semibold text-[var(--text-primary)] mb-2">
            Bundle Analyzer
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            Run <code className="bg-[var(--bg-secondary)] px-1 rounded">npm run analyze</code> to
            generate an interactive bundle size visualization.
          </p>
        </div>
      </div>
    </div>
  );
}
