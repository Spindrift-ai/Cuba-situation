import { NextResponse } from "next/server";

// GDELT DOC 2.0 API — free, no auth required
// https://blog.gdeltproject.org/gdelt-doc-2-0-api-exploring-the-worlds-news-fulltext-api/
const GDELT_URL =
  "https://api.gdeltproject.org/api/v2/doc/doc?query=cuba&mode=artlist&format=json&maxrecords=30&sort=datedesc";

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

export async function GET() {
  try {
    const res = await fetch(GDELT_URL, {
      next: { revalidate: 0 },
      headers: { "User-Agent": "CubaDashboard/1.0" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `GDELT returned ${res.status}`, items: [] },
        { status: 502 }
      );
    }

    const data: GdeltResponse = await res.json();

    const items = (data.articles || []).map((a, i) => ({
      id: `gdelt-${i}`,
      type: "news" as const,
      source: a.domain || "Unknown",
      title: a.title || "Untitled",
      summary: "", // GDELT artlist mode doesn't return body text
      url: a.url,
      timestamp: parseGdeltDate(a.seendate),
      imageUrl: a.socialimage || null,
      sourceCountry: a.sourcecountry || null,
      language: a.language || null,
    }));

    return NextResponse.json({ items, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), items: [] },
      { status: 502 }
    );
  }
}

function parseGdeltDate(dateStr: string): string {
  // GDELT dates look like "20260330T083000Z"
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
