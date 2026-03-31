import { NextResponse } from "next/server";

// Cuba's power grid has NO public API.
//
// Strategy: Use GDELT to find recent news articles about Cuban power outages,
// blackouts, and electricity issues. This gives us real, sourced reports
// rather than fabricated province-level data.
//
// sourcelang:english restricts results to English articles only.
//
// Optionally, if CUBA_POWER_SCRAPER_URL is set, we also fetch from a
// custom scraper that may provide structured province-level data.

const GDELT_POWER_QUERIES = [
  "https://api.gdeltproject.org/api/v2/doc/doc?query=%22blackout%22%20cuba%20sourcelang:english&mode=ArtList&format=json&maxrecords=10&sort=datedesc",
  "https://api.gdeltproject.org/api/v2/doc/doc?query=cuba%20%22power%20outage%22%20sourcelang:english&mode=ArtList&format=json&maxrecords=10&sort=datedesc",
  "https://api.gdeltproject.org/api/v2/doc/doc?query=cuba%20%22electricity%20crisis%22%20sourcelang:english&mode=ArtList&format=json&maxrecords=5&sort=datedesc",
  "https://api.gdeltproject.org/api/v2/doc/doc?query=cuba%20%22power%20grid%22%20sourcelang:english&mode=ArtList&format=json&maxrecords=5&sort=datedesc",
];

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

interface GdeltResponse {
  articles?: GdeltArticle[];
}

interface PowerReport {
  id: string;
  title: string;
  source: string;
  url: string;
  timestamp: string;
  language: string | null;
}

function parseGdeltDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  try {
    // GDELT format: YYYYMMDDTHHMMSS or YYYYMMDDHHMMSS
    const clean = dateStr.replace("T", "");
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const d = clean.substring(6, 8);
    const h = clean.substring(8, 10) || "00";
    const min = clean.substring(10, 12) || "00";
    const s = clean.substring(12, 14) || "00";
    const date = new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`);
    if (isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const scraperUrl = process.env.CUBA_POWER_SCRAPER_URL;
  const reports: PowerReport[] = [];
  const seenUrls = new Set<string>();
  const diagnostics: Record<string, string> = {};

  // 1. Fetch GDELT power outage reports (always — no key needed)
  const queryResults: string[] = [];

  const fetches = GDELT_POWER_QUERIES.map(async (url, idx) => {
    try {
      const res = await fetchWithTimeout(url, {
        headers: { "User-Agent": "CubaDashboard/1.0" },
      });
      if (!res.ok) {
        queryResults[idx] = `HTTP ${res.status}`;
        return [];
      }
      const text = await res.text();
      try {
        const data: GdeltResponse = JSON.parse(text);
        const articles = data.articles || [];
        queryResults[idx] = `OK — ${articles.length} articles`;
        return articles;
      } catch {
        queryResults[idx] = `Non-JSON response: ${text.substring(0, 100)}`;
        return [];
      }
    } catch (err) {
      queryResults[idx] = `Network error: ${String(err).substring(0, 150)}`;
      return [];
    }
  });

  const results = await Promise.all(fetches);

  for (const articles of results) {
    for (const a of articles) {
      if (!a.url || seenUrls.has(a.url)) continue;
      seenUrls.add(a.url);
      reports.push({
        id: `pwr-${reports.length}`,
        title: a.title || "Untitled",
        source: a.domain || "Unknown",
        url: a.url,
        timestamp: parseGdeltDate(a.seendate),
        language: a.language || null,
      });
    }
  }

  // Sort by timestamp descending
  reports.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  diagnostics.gdelt_queries = queryResults.join(" | ");
  diagnostics.total_reports = String(reports.length);

  // 2. If custom scraper is configured, also fetch structured province data
  let provinces: unknown[] = [];
  let scraperError: string | null = null;

  if (scraperUrl) {
    try {
      const res = await fetchWithTimeout(scraperUrl);
      if (res.ok) {
        const data = await res.json();
        provinces = data.provinces || data || [];
        diagnostics.scraper = `OK — ${Array.isArray(provinces) ? provinces.length : 0} provinces`;
      } else {
        scraperError = `Scraper returned ${res.status}`;
        diagnostics.scraper = scraperError;
      }
    } catch (err) {
      scraperError = String(err);
      diagnostics.scraper = `Error: ${scraperError.substring(0, 200)}`;
    }
  } else {
    diagnostics.scraper = "Not configured (CUBA_POWER_SCRAPER_URL)";
  }

  return NextResponse.json({
    reports,
    provinces,
    scraperConfigured: !!scraperUrl,
    scraperError,
    configRequired: false,
    diagnostics,
    fetchedAt: new Date().toISOString(),
    source:
      "GDELT Project (power outage news)" +
      (scraperUrl ? " + custom scraper" : ""),
  });
}
