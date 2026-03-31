import { NextResponse } from "next/server";

// Cuba's power grid has NO public API.
//
// Strategy: Use GDELT to find recent news articles about Cuban power outages,
// blackouts, and electricity issues. This gives us real, sourced reports
// rather than fabricated province-level data.
//
// We search for English-language terms related to Cuban blackouts:
// "blackout cuba", "power outage cuba", "electricity crisis cuba"
//
// sourcelang:english restricts results to English articles only.
//
// Optionally, if CUBA_POWER_SCRAPER_URL is set, we also fetch from a
// custom scraper that may provide structured province-level data.

const GDELT_POWER_QUERIES = [
  "https://api.gdeltproject.org/api/v2/doc/doc?query=%22blackout%22%20cuba%20sourcelang:english&mode=artlist&format=json&maxrecords=10&sort=datedesc",
  "https://api.gdeltproject.org/api/v2/doc/doc?query=cuba%20%22power%20outage%22%20sourcelang:english&mode=artlist&format=json&maxrecords=10&sort=datedesc",
  "https://api.gdeltproject.org/api/v2/doc/doc?query=cuba%20%22electricity%20crisis%22%20sourcelang:english&mode=artlist&format=json&maxrecords=5&sort=datedesc",
];

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  language: string;
  sourcecountry: string;
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
    const y = dateStr.substring(0, 4);
    const m = dateStr.substring(4, 6);
    const d = dateStr.substring(6, 8);
    const h = dateStr.substring(9, 11) || "00";
    const min = dateStr.substring(11, 13) || "00";
    const s = dateStr.substring(13, 15) || "00";
    return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export async function GET() {
  const scraperUrl = process.env.CUBA_POWER_SCRAPER_URL;
  const reports: PowerReport[] = [];
  const seenUrls = new Set<string>();

  // 1. Fetch GDELT power outage reports (always — no key needed)
  try {
    const fetches = GDELT_POWER_QUERIES.map((url) =>
      fetch(url, {
        next: { revalidate: 0 },
        headers: { "User-Agent": "CubaDashboard/1.0" },
      })
        .then((res) => (res.ok ? res.json() : { articles: [] }))
        .catch(() => ({ articles: [] }))
    );

    const results = await Promise.all(fetches);

    for (const data of results) {
      for (const a of data.articles || []) {
        if (seenUrls.has(a.url)) continue;
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
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch {
    // GDELT fetch failed — continue with empty reports
  }

  // 2. If custom scraper is configured, also fetch structured province data
  let provinces: unknown[] = [];
  let scraperError: string | null = null;

  if (scraperUrl) {
    try {
      const res = await fetch(scraperUrl, { next: { revalidate: 0 } });
      if (res.ok) {
        const data = await res.json();
        provinces = data.provinces || data || [];
      } else {
        scraperError = `Scraper returned ${res.status}`;
      }
    } catch (err) {
      scraperError = String(err);
    }
  }

  return NextResponse.json({
    // News reports about power outages (always available via GDELT)
    reports,
    // Structured province data (only if scraper is configured)
    provinces,
    scraperConfigured: !!scraperUrl,
    scraperError,
    configRequired: false, // We always have GDELT reports as fallback
    fetchedAt: new Date().toISOString(),
    source: "GDELT Project (power outage news)" + (scraperUrl ? " + custom scraper" : ""),
  });
}
