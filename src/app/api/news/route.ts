import { NextResponse } from "next/server";

// ─── Data Sources ────────────────────────────────────────────────────────────
// 1. GDELT DOC 2.0 API — free, no auth
//    sourcelang:english restricts to English-language articles
// 2. Mediastack API — free tier with API key (100 req/month)

const GDELT_URL =
  "https://api.gdeltproject.org/api/v2/doc/doc?query=cuba%20sourcelang:english&mode=artlist&format=json&maxrecords=20&sort=datedesc";

const MEDIASTACK_URL = "http://api.mediastack.com/v1/news";

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
  const items: Array<{
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
  }> = [];
  const seenUrls = new Set<string>();
  const errors: string[] = [];

  // 1. Fetch from GDELT (English only)
  try {
    const res = await fetch(GDELT_URL, {
      next: { revalidate: 0 },
      headers: { "User-Agent": "CubaDashboard/1.0" },
    });

    if (res.ok) {
      const data: GdeltResponse = await res.json();
      for (const a of data.articles || []) {
        if (seenUrls.has(a.url)) continue;
        seenUrls.add(a.url);
        items.push({
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
    } else {
      errors.push(`GDELT returned ${res.status}`);
    }
  } catch (err) {
    errors.push(`GDELT: ${String(err)}`);
  }

  // 2. Fetch from Mediastack (English only, Cuba keyword)
  const mediastackKey = process.env.MEDIASTACK_API_KEY;
  if (mediastackKey) {
    try {
      const url = `${MEDIASTACK_URL}?access_key=${mediastackKey}&keywords=cuba&languages=en&sort=published_desc&limit=15`;
      const res = await fetch(url, { next: { revalidate: 0 } });

      if (res.ok) {
        const data: MediastackResponse = await res.json();
        for (const a of data.data || []) {
          if (!a.url || seenUrls.has(a.url)) continue;
          seenUrls.add(a.url);
          items.push({
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
      } else {
        errors.push(`Mediastack returned ${res.status}`);
      }
    } catch (err) {
      errors.push(`Mediastack: ${String(err)}`);
    }
  }

  // Sort all items by timestamp descending
  items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return NextResponse.json({
    items,
    sources: [
      "GDELT",
      ...(mediastackKey ? ["Mediastack"] : []),
    ],
    fetchedAt: new Date().toISOString(),
    error: errors.length > 0 ? errors.join("; ") : undefined,
  });
}
