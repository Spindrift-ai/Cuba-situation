import { NextResponse } from "next/server";

// Cuba's power grid has NO public API.
//
// Strategy: Use Google News RSS + GDELT to find recent news about Cuban
// power outages, blackouts, and electricity issues.
//
// Google News RSS is fast and reliable (no auth needed).
// GDELT is a bonus source (5s timeout — it's slow).

const POWER_RSS_QUERIES = [
  "https://news.google.com/rss/search?q=cuba+blackout&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=cuba+power+outage&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=cuba+electricity+crisis&hl=en-US&gl=US&ceid=US:en",
];

const GDELT_POWER_URL =
  "https://api.gdeltproject.org/api/v2/doc/doc?query=(%22blackout%22%20OR%20%22power%20outage%22%20OR%20%22electricity%22)%20cuba%20sourcelang:english&mode=ArtList&format=json&maxrecords=10&sort=datedesc";

interface PowerReport {
  id: string;
  title: string;
  source: string;
  url: string;
  timestamp: string;
  language: string | null;
  provider: string;
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 6000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractTag(xml: string, tag: string): string {
  const cdataRegex = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  );
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function parseRssItems(
  xml: string
): Array<{ title: string; link: string; pubDate: string; source: string }> {
  const items: Array<{
    title: string;
    link: string;
    pubDate: string;
    source: string;
  }> = [];

  const chunks = xml.split("<item>").slice(1);
  for (const chunk of chunks) {
    const endIdx = chunk.indexOf("</item>");
    if (endIdx === -1) continue;
    const itemXml = chunk.substring(0, endIdx);

    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");
    const source = extractTag(itemXml, "source");

    if (title && link) {
      items.push({
        title: decodeHtmlEntities(title),
        link,
        pubDate: pubDate || "",
        source: source ? decodeHtmlEntities(source) : "",
      });
    }
  }
  return items;
}

function parseGdeltDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  try {
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

export async function GET() {
  const scraperUrl = process.env.CUBA_POWER_SCRAPER_URL;
  const reports: PowerReport[] = [];
  const seenUrls = new Set<string>();
  const diagnostics: Record<string, string> = {};

  function addReport(r: PowerReport) {
    if (seenUrls.has(r.url)) return;
    seenUrls.add(r.url);
    reports.push(r);
  }

  const fetches: Promise<void>[] = [];

  // ── 1. Google News RSS (fast, reliable) ───────────────────────────────────
  fetches.push(
    (async () => {
      let total = 0;
      const errors: string[] = [];

      for (const rssUrl of POWER_RSS_QUERIES) {
        try {
          const res = await fetchWithTimeout(rssUrl, {
            headers: {
              "User-Agent": "CubaDashboard/1.0",
              Accept: "application/rss+xml, application/xml, text/xml",
            },
          });
          if (!res.ok) {
            errors.push(`HTTP ${res.status}`);
            continue;
          }
          const xml = await res.text();
          const rssItems = parseRssItems(xml);
          total += rssItems.length;

          for (const item of rssItems) {
            addReport({
              id: `pwr-gn-${reports.length}`,
              title: item.title,
              source: item.source || "Google News",
              url: item.link,
              timestamp: item.pubDate
                ? new Date(item.pubDate).toISOString()
                : new Date().toISOString(),
              language: "English",
              provider: "Google News",
            });
          }
        } catch (err) {
          errors.push(String(err).substring(0, 80));
        }
      }

      diagnostics.google_news =
        errors.length > 0 && total === 0
          ? `Error: ${errors.join("; ")}`
          : `OK — ${total} articles`;
    })()
  );

  // ── 2. GDELT (bonus — 5s timeout) ────────────────────────────────────────
  fetches.push(
    (async () => {
      try {
        const res = await fetchWithTimeout(
          GDELT_POWER_URL,
          { headers: { "User-Agent": "CubaDashboard/1.0" } },
          5000
        );
        if (!res.ok) {
          diagnostics.gdelt = `HTTP ${res.status}`;
          return;
        }
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          const articles = data.articles || [];
          for (const a of articles) {
            if (!a.url) continue;
            addReport({
              id: `pwr-gdelt-${reports.length}`,
              title: a.title || "Untitled",
              source: a.domain || "Unknown",
              url: a.url,
              timestamp: parseGdeltDate(a.seendate),
              language: a.language || null,
              provider: "GDELT",
            });
          }
          diagnostics.gdelt = `OK — ${articles.length} articles`;
        } catch {
          diagnostics.gdelt = `Non-JSON: ${text.substring(0, 80)}`;
        }
      } catch (err) {
        diagnostics.gdelt = `Timeout/Error: ${String(err).substring(0, 100)}`;
      }
    })()
  );

  await Promise.all(fetches);

  // Sort by timestamp descending
  reports.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  diagnostics.total_reports = String(reports.length);

  // 3. Custom scraper (if configured)
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
      diagnostics.scraper = `Error: ${scraperError.substring(0, 150)}`;
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
    source: "Google News RSS + GDELT" + (scraperUrl ? " + custom scraper" : ""),
  });
}
