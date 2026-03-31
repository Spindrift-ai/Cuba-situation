import { NextResponse } from "next/server";

// ─── Data Sources (tried in order, all results merged) ──────────────────────
// 1. GDELT DOC 2.0 API — free, no auth
// 2. Mediastack API — free tier with API key (100 req/month)
// 3. GNews API — free tier with API key (100 req/day)
// 4. Currents API — free tier with API key (600 req/day)
//
// If ALL external APIs fail (network issues, rate limits, etc.), we return
// a diagnostic error so the user knows what happened.

const GDELT_URL =
  "https://api.gdeltproject.org/api/v2/doc/doc?query=cuba%20sourcelang:english&mode=ArtList&format=json&maxrecords=20&sort=datedesc";

// Alternate GDELT query (broader, in case the first returns nothing)
const GDELT_FALLBACK_URL =
  "https://api.gdeltproject.org/api/v2/doc/doc?query=cuba&mode=ArtList&format=json&maxrecords=15&sort=datedesc";

const MEDIASTACK_URL = "http://api.mediastack.com/v1/news";
const GNEWS_URL = "https://gnews.io/api/v4/search";
const CURRENTS_URL = "https://api.currentsapi.services/v1/search";

interface NewsItem {
  id: string;
  type: "news";
  source: string;
  title: string;
  summary: string;
  url: string;
  timestamp: string;
  imageUrl: string | null;
  sourceCountry: string | null;
  language: string | null;
  provider: string;
}

interface GdeltArticle {
  url: string;
  url_mobile: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

interface GdeltResponse {
  articles?: GdeltArticle[];
}

interface MediastackArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  language: string;
  country: string;
  image: string | null;
}

interface MediastackResponse {
  data?: MediastackArticle[];
  error?: { message: string; code: string };
}

interface GNewsArticle {
  title: string;
  description: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
}

interface GNewsResponse {
  totalArticles?: number;
  articles?: GNewsArticle[];
}

interface CurrentsArticle {
  title: string;
  description: string;
  url: string;
  image: string;
  published: string;
  author: string;
  language: string;
}

interface CurrentsResponse {
  news?: CurrentsArticle[];
  status?: string;
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
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const items: NewsItem[] = [];
  const seenUrls = new Set<string>();
  const diagnostics: Record<string, string> = {};

  // Helper to add items and deduplicate
  function addItem(item: NewsItem) {
    if (seenUrls.has(item.url)) return;
    seenUrls.add(item.url);
    items.push(item);
  }

  // ── 1. GDELT (primary — free, no auth) ────────────────────────────────────
  try {
    const res = await fetchWithTimeout(GDELT_URL, {
      headers: { "User-Agent": "CubaDashboard/1.0" },
    });

    if (res.ok) {
      const text = await res.text();
      try {
        const data: GdeltResponse = JSON.parse(text);
        const articles = data.articles || [];
        if (articles.length === 0) {
          // Try fallback GDELT query
          diagnostics.gdelt = "Primary query returned 0 articles, trying fallback";
          const res2 = await fetchWithTimeout(GDELT_FALLBACK_URL, {
            headers: { "User-Agent": "CubaDashboard/1.0" },
          });
          if (res2.ok) {
            const text2 = await res2.text();
            try {
              const data2: GdeltResponse = JSON.parse(text2);
              for (const a of data2.articles || []) {
                addItem({
                  id: `gdelt-${items.length}`,
                  type: "news",
                  source: a.domain || "Unknown",
                  title: a.title || "Untitled",
                  summary: "",
                  url: a.url,
                  timestamp: parseGdeltDate(a.seendate),
                  imageUrl: a.socialimage || null,
                  sourceCountry: a.sourcecountry || null,
                  language: a.language || "English",
                  provider: "GDELT",
                });
              }
              diagnostics.gdelt += ` → fallback returned ${data2.articles?.length ?? 0}`;
            } catch {
              diagnostics.gdelt += " → fallback returned non-JSON";
            }
          }
        } else {
          for (const a of articles) {
            addItem({
              id: `gdelt-${items.length}`,
              type: "news",
              source: a.domain || "Unknown",
              title: a.title || "Untitled",
              summary: "",
              url: a.url,
              timestamp: parseGdeltDate(a.seendate),
              imageUrl: a.socialimage || null,
              sourceCountry: a.sourcecountry || null,
              language: a.language || "English",
              provider: "GDELT",
            });
          }
          diagnostics.gdelt = `OK — ${articles.length} articles`;
        }
      } catch {
        // GDELT sometimes returns HTML error pages instead of JSON
        diagnostics.gdelt = `Returned non-JSON (${text.substring(0, 120)}...)`;
      }
    } else {
      diagnostics.gdelt = `HTTP ${res.status} ${res.statusText}`;
    }
  } catch (err) {
    diagnostics.gdelt = `Network error: ${String(err).substring(0, 200)}`;
  }

  // ── 2. Mediastack (if key provided) ───────────────────────────────────────
  const mediastackKey = process.env.MEDIASTACK_API_KEY;
  if (mediastackKey) {
    try {
      const url = `${MEDIASTACK_URL}?access_key=${mediastackKey}&keywords=cuba&languages=en&sort=published_desc&limit=15`;
      const res = await fetchWithTimeout(url);

      if (res.ok) {
        const data: MediastackResponse = await res.json();
        if (data.error) {
          diagnostics.mediastack = `API error: ${data.error.message} (${data.error.code})`;
        } else {
          for (const a of data.data || []) {
            if (!a.url) continue;
            addItem({
              id: `mstack-${items.length}`,
              type: "news",
              source: a.source || "Unknown",
              title: a.title || "Untitled",
              summary: a.description || "",
              url: a.url,
              timestamp: a.published_at
                ? new Date(a.published_at).toISOString()
                : new Date().toISOString(),
              imageUrl: a.image || null,
              sourceCountry: a.country || null,
              language: "English",
              provider: "Mediastack",
            });
          }
          diagnostics.mediastack = `OK — ${data.data?.length ?? 0} articles`;
        }
      } else {
        diagnostics.mediastack = `HTTP ${res.status}`;
      }
    } catch (err) {
      diagnostics.mediastack = `Network error: ${String(err).substring(0, 200)}`;
    }
  } else {
    diagnostics.mediastack = "Skipped — no MEDIASTACK_API_KEY";
  }

  // ── 3. GNews (if key provided) ────────────────────────────────────────────
  const gnewsKey = process.env.GNEWS_API_KEY;
  if (gnewsKey) {
    try {
      const url = `${GNEWS_URL}?q=cuba&lang=en&max=15&apikey=${gnewsKey}`;
      const res = await fetchWithTimeout(url);

      if (res.ok) {
        const data: GNewsResponse = await res.json();
        for (const a of data.articles || []) {
          addItem({
            id: `gnews-${items.length}`,
            type: "news",
            source: a.source?.name || "Unknown",
            title: a.title || "Untitled",
            summary: a.description || "",
            url: a.url,
            timestamp: a.publishedAt
              ? new Date(a.publishedAt).toISOString()
              : new Date().toISOString(),
            imageUrl: a.image || null,
            sourceCountry: null,
            language: "English",
            provider: "GNews",
          });
        }
        diagnostics.gnews = `OK — ${data.articles?.length ?? 0} articles`;
      } else {
        diagnostics.gnews = `HTTP ${res.status}`;
      }
    } catch (err) {
      diagnostics.gnews = `Network error: ${String(err).substring(0, 200)}`;
    }
  } else {
    diagnostics.gnews = "Skipped — no GNEWS_API_KEY";
  }

  // ── 4. Currents API (if key provided) ─────────────────────────────────────
  const currentsKey = process.env.CURRENTS_API_KEY;
  if (currentsKey) {
    try {
      const url = `${CURRENTS_URL}?keywords=cuba&language=en&apiKey=${currentsKey}`;
      const res = await fetchWithTimeout(url);

      if (res.ok) {
        const data: CurrentsResponse = await res.json();
        for (const a of data.news || []) {
          addItem({
            id: `currents-${items.length}`,
            type: "news",
            source: a.author || "Unknown",
            title: a.title || "Untitled",
            summary: a.description || "",
            url: a.url,
            timestamp: a.published
              ? new Date(a.published).toISOString()
              : new Date().toISOString(),
            imageUrl: a.image || null,
            sourceCountry: null,
            language: a.language || "English",
            provider: "Currents",
          });
        }
        diagnostics.currents = `OK — ${data.news?.length ?? 0} articles`;
      } else {
        diagnostics.currents = `HTTP ${res.status}`;
      }
    } catch (err) {
      diagnostics.currents = `Network error: ${String(err).substring(0, 200)}`;
    }
  } else {
    diagnostics.currents = "Skipped — no CURRENTS_API_KEY";
  }

  // Sort all items by timestamp descending
  items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const activeSources = [
    "GDELT",
    ...(mediastackKey ? ["Mediastack"] : []),
    ...(gnewsKey ? ["GNews"] : []),
    ...(currentsKey ? ["Currents"] : []),
  ];

  return NextResponse.json({
    items,
    sources: activeSources,
    diagnostics,
    fetchedAt: new Date().toISOString(),
    error:
      items.length === 0
        ? "No news articles returned from any source. Check /api/news diagnostics for details."
        : undefined,
  });
}
