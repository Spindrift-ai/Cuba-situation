import { NextResponse } from "next/server";

// ─── Data Sources (tried in parallel, all results merged) ───────────────────
// 1. Google News RSS — fast, free, no auth (PRIMARY)
// 2. GDELT DOC 2.0 API — free, no auth (slow — 5s timeout, bonus source)
// 3. Mediastack API — free tier with API key
// 4. GNews API — free tier with API key
// 5. Currents API — free tier with API key

// Google News RSS feeds for Cuba
const GNEWS_RSS_URLS = [
  "https://news.google.com/rss/search?q=cuba&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=cuba+havana&hl=en-US&gl=US&ceid=US:en",
];

const GDELT_URL =
  "https://api.gdeltproject.org/api/v2/doc/doc?query=cuba%20sourcelang:english&mode=ArtList&format=json&maxrecords=10&sort=datedesc";

const MEDIASTACK_URL = "http://api.mediastack.com/v1/news";
const GNEWS_API_URL = "https://gnews.io/api/v4/search";
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

interface MediastackResponse {
  data?: Array<{
    title: string;
    description: string;
    url: string;
    source: string;
    published_at: string;
    language: string;
    country: string;
    image: string | null;
  }>;
  error?: { message: string; code: string };
}

interface GNewsApiResponse {
  articles?: Array<{
    title: string;
    description: string;
    url: string;
    image: string | null;
    publishedAt: string;
    source: { name: string };
  }>;
}

interface CurrentsResponse {
  news?: Array<{
    title: string;
    description: string;
    url: string;
    image: string;
    published: string;
    author: string;
    language: string;
  }>;
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

// Parse RSS XML manually (no external XML parser needed)
function parseRssItems(
  xml: string
): Array<{ title: string; link: string; pubDate: string; source: string; description: string }> {
  const items: Array<{
    title: string;
    link: string;
    pubDate: string;
    source: string;
    description: string;
  }> = [];

  // Split on <item> tags
  const itemMatches = xml.split("<item>").slice(1);
  for (const chunk of itemMatches) {
    const endIdx = chunk.indexOf("</item>");
    if (endIdx === -1) continue;
    const itemXml = chunk.substring(0, endIdx);

    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");
    const source = extractTag(itemXml, "source");
    const description = extractTag(itemXml, "description");

    if (title && link) {
      items.push({
        title: decodeHtmlEntities(title),
        link,
        pubDate: pubDate || "",
        source: source ? decodeHtmlEntities(source) : "",
        description: description ? decodeHtmlEntities(stripHtml(description)) : "",
      });
    }
  }
  return items;
}

function extractTag(xml: string, tag: string): string {
  // Handle CDATA: <tag><![CDATA[content]]></tag>
  const cdataRegex = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  );
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle regular: <tag>content</tag>
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  if (match) return match[1].trim();

  // Handle self-closing or empty
  return "";
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, "").trim();
}

export async function GET() {
  const items: NewsItem[] = [];
  const seenUrls = new Set<string>();
  const diagnostics: Record<string, string> = {};

  function addItem(item: NewsItem) {
    if (seenUrls.has(item.url)) return;
    seenUrls.add(item.url);
    items.push(item);
  }

  // Run all fetches in parallel for speed
  const fetches: Promise<void>[] = [];

  // ── 1. Google News RSS (PRIMARY — fast, free, no auth) ────────────────────
  fetches.push(
    (async () => {
      let totalArticles = 0;
      const errors: string[] = [];

      for (const rssUrl of GNEWS_RSS_URLS) {
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
          totalArticles += rssItems.length;

          for (const item of rssItems) {
            addItem({
              id: `gn-${items.length}`,
              type: "news",
              source: item.source || "Google News",
              title: item.title,
              summary: item.description,
              url: item.link,
              timestamp: item.pubDate
                ? new Date(item.pubDate).toISOString()
                : new Date().toISOString(),
              imageUrl: null,
              sourceCountry: null,
              language: "English",
              provider: "Google News",
            });
          }
        } catch (err) {
          errors.push(String(err).substring(0, 100));
        }
      }

      diagnostics.google_news =
        errors.length > 0 && totalArticles === 0
          ? `Error: ${errors.join("; ")}`
          : `OK — ${totalArticles} articles`;
    })()
  );

  // ── 2. GDELT (secondary — slow, 5s timeout) ──────────────────────────────
  fetches.push(
    (async () => {
      try {
        const res = await fetchWithTimeout(
          GDELT_URL,
          { headers: { "User-Agent": "CubaDashboard/1.0" } },
          5000 // shorter timeout — GDELT is slow
        );

        if (!res.ok) {
          diagnostics.gdelt = `HTTP ${res.status}`;
          return;
        }

        const text = await res.text();
        try {
          const data: GdeltResponse = JSON.parse(text);
          const articles = data.articles || [];
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
        } catch {
          diagnostics.gdelt = `Non-JSON: ${text.substring(0, 80)}`;
        }
      } catch (err) {
        diagnostics.gdelt = `Timeout/Error: ${String(err).substring(0, 100)}`;
      }
    })()
  );

  // ── 3. Mediastack (if key provided) ───────────────────────────────────────
  const mediastackKey = process.env.MEDIASTACK_API_KEY;
  if (mediastackKey) {
    fetches.push(
      (async () => {
        try {
          const url = `${MEDIASTACK_URL}?access_key=${mediastackKey}&keywords=cuba&languages=en&sort=published_desc&limit=15`;
          const res = await fetchWithTimeout(url);
          if (!res.ok) {
            diagnostics.mediastack = `HTTP ${res.status}`;
            return;
          }
          const data: MediastackResponse = await res.json();
          if (data.error) {
            diagnostics.mediastack = `API error: ${data.error.message}`;
            return;
          }
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
        } catch (err) {
          diagnostics.mediastack = `Error: ${String(err).substring(0, 100)}`;
        }
      })()
    );
  } else {
    diagnostics.mediastack = "Skipped — no MEDIASTACK_API_KEY";
  }

  // ── 4. GNews API (if key provided) ────────────────────────────────────────
  const gnewsKey = process.env.GNEWS_API_KEY;
  if (gnewsKey) {
    fetches.push(
      (async () => {
        try {
          const url = `${GNEWS_API_URL}?q=cuba&lang=en&max=15&apikey=${gnewsKey}`;
          const res = await fetchWithTimeout(url);
          if (!res.ok) {
            diagnostics.gnews_api = `HTTP ${res.status}`;
            return;
          }
          const data: GNewsApiResponse = await res.json();
          for (const a of data.articles || []) {
            addItem({
              id: `gnapi-${items.length}`,
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
          diagnostics.gnews_api = `OK — ${data.articles?.length ?? 0} articles`;
        } catch (err) {
          diagnostics.gnews_api = `Error: ${String(err).substring(0, 100)}`;
        }
      })()
    );
  } else {
    diagnostics.gnews_api = "Skipped — no GNEWS_API_KEY";
  }

  // ── 5. Currents API (if key provided) ─────────────────────────────────────
  const currentsKey = process.env.CURRENTS_API_KEY;
  if (currentsKey) {
    fetches.push(
      (async () => {
        try {
          const url = `${CURRENTS_URL}?keywords=cuba&language=en&apiKey=${currentsKey}`;
          const res = await fetchWithTimeout(url);
          if (!res.ok) {
            diagnostics.currents = `HTTP ${res.status}`;
            return;
          }
          const data: CurrentsResponse = await res.json();
          for (const a of data.news || []) {
            addItem({
              id: `curr-${items.length}`,
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
        } catch (err) {
          diagnostics.currents = `Error: ${String(err).substring(0, 100)}`;
        }
      })()
    );
  } else {
    diagnostics.currents = "Skipped — no CURRENTS_API_KEY";
  }

  // Wait for all sources
  await Promise.all(fetches);

  // Sort by timestamp descending
  items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return NextResponse.json({
    items,
    sources: [
      "Google News",
      "GDELT",
      ...(mediastackKey ? ["Mediastack"] : []),
      ...(gnewsKey ? ["GNews"] : []),
      ...(currentsKey ? ["Currents"] : []),
    ],
    diagnostics,
    fetchedAt: new Date().toISOString(),
    error:
      items.length === 0
        ? "No news returned from any source. Check diagnostics."
        : undefined,
  });
}
