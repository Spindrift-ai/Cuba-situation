import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Cuba's power grid has NO public API.
//
// Strategy:
// 1. Fetch news via Google News RSS + GDELT
// 2. Use Claude Haiku to classify each article:
//    - "outage"         → active/recent blackout or power failure
//    - "infrastructure" → grid repairs, generation capacity, fuel supply
//    - "policy"         → energy policy, regulation, aid
//    - "unrelated"      → not about Cuban power/electricity
// 3. Only show relevant articles, sorted by relevance then date

const POWER_RSS_QUERIES = [
  "https://news.google.com/rss/search?q=cuba+blackout&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=cuba+power+outage&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=cuba+electricity+crisis&hl=en-US&gl=US&ceid=US:en",
];

const GDELT_POWER_URL =
  "https://api.gdeltproject.org/api/v2/doc/doc?query=(%22blackout%22%20OR%20%22power%20outage%22%20OR%20%22electricity%22)%20cuba%20sourcelang:english&mode=ArtList&format=json&maxrecords=10&sort=datedesc";

interface RawReport {
  id: string;
  title: string;
  source: string;
  url: string;
  timestamp: string;
  language: string | null;
  provider: string;
}

interface ClassifiedReport extends RawReport {
  relevance: "outage" | "infrastructure" | "policy" | "unrelated";
  aiSummary: string;
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

// ── Claude-powered article classification ───────────────────────────────────

async function classifyArticles(
  reports: RawReport[],
  apiKey: string
): Promise<ClassifiedReport[]> {
  if (reports.length === 0) return [];

  const client = new Anthropic({ apiKey });

  // Build a numbered list of titles for the prompt
  const titleList = reports
    .map((r, i) => `${i + 1}. "${r.title}" (${r.source}, ${new Date(r.timestamp).toLocaleDateString()})`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are classifying news articles about Cuba's power/electricity situation.

For each article below, determine:
1. **relevance**: one of "outage" (active/recent blackout, power failure, grid collapse), "infrastructure" (repairs, generation capacity, fuel supply, grid upgrades), "policy" (energy policy, regulation, international aid for power), or "unrelated" (not about Cuban power/electricity at all — e.g. sports, politics, migration, other Cuba topics)
2. **summary**: A 5-15 word summary of what the article is about, focused on the power situation

Articles:
${titleList}

Respond ONLY with a JSON array. Each element: {"i": <1-based index>, "r": "<relevance>", "s": "<summary>"}
Example: [{"i":1,"r":"outage","s":"Massive blackout hits western Cuba after plant failure"},{"i":2,"r":"unrelated","s":"Cuban baseball team wins tournament"}]

JSON array:`,
      },
    ],
  });

  // Parse Claude's response
  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // Extract JSON array from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return reports.map((r) => ({ ...r, relevance: "unrelated" as const, aiSummary: "" }));

    const parsed: Array<{ i: number; r: string; s: string }> = JSON.parse(
      jsonMatch[0]
    );

    return reports.map((report, idx) => {
      const match = parsed.find((p) => p.i === idx + 1);
      const relevance =
        match?.r === "outage"
          ? "outage"
          : match?.r === "infrastructure"
            ? "infrastructure"
            : match?.r === "policy"
              ? "policy"
              : "unrelated";
      return {
        ...report,
        relevance: relevance as ClassifiedReport["relevance"],
        aiSummary: match?.s || "",
      };
    });
  } catch {
    // If parsing fails, return all as unclassified
    return reports.map((r) => ({
      ...r,
      relevance: "infrastructure" as const,
      aiSummary: "",
    }));
  }
}

export async function GET() {
  const scraperUrl = process.env.CUBA_POWER_SCRAPER_URL;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const reports: RawReport[] = [];
  const seenUrls = new Set<string>();
  const diagnostics: Record<string, string> = {};

  function addReport(r: RawReport) {
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

  // Sort by timestamp descending before classification
  reports.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  diagnostics.total_raw = String(reports.length);

  // ── 3. Classify with Claude (if ANTHROPIC_API_KEY is set) ─────────────────
  let classifiedReports: ClassifiedReport[];

  if (anthropicKey && reports.length > 0) {
    try {
      classifiedReports = await classifyArticles(reports, anthropicKey);
      const counts = {
        outage: classifiedReports.filter((r) => r.relevance === "outage").length,
        infrastructure: classifiedReports.filter((r) => r.relevance === "infrastructure").length,
        policy: classifiedReports.filter((r) => r.relevance === "policy").length,
        unrelated: classifiedReports.filter((r) => r.relevance === "unrelated").length,
      };
      diagnostics.ai_classification = `OK — ${counts.outage} outage, ${counts.infrastructure} infra, ${counts.policy} policy, ${counts.unrelated} unrelated`;
    } catch (err) {
      diagnostics.ai_classification = `Error: ${String(err).substring(0, 150)}`;
      // Fall through without classification
      classifiedReports = reports.map((r) => ({
        ...r,
        relevance: "infrastructure" as const,
        aiSummary: "",
      }));
    }
  } else {
    diagnostics.ai_classification = anthropicKey
      ? "Skipped — no articles to classify"
      : "Skipped — no ANTHROPIC_API_KEY";
    classifiedReports = reports.map((r) => ({
      ...r,
      relevance: "infrastructure" as const,
      aiSummary: "",
    }));
  }

  // Filter out unrelated articles and sort: outage first, then infra, then policy
  const relevanceOrder = { outage: 0, infrastructure: 1, policy: 2, unrelated: 3 };
  const filteredReports = classifiedReports
    .filter((r) => r.relevance !== "unrelated")
    .sort((a, b) => {
      const orderDiff = relevanceOrder[a.relevance] - relevanceOrder[b.relevance];
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  diagnostics.filtered_reports = String(filteredReports.length);

  // 4. Custom scraper (if configured)
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
    reports: filteredReports,
    provinces,
    scraperConfigured: !!scraperUrl,
    scraperError,
    configRequired: false,
    diagnostics,
    aiEnabled: !!anthropicKey,
    fetchedAt: new Date().toISOString(),
    source:
      "Google News RSS + GDELT" +
      (anthropicKey ? " (AI-filtered)" : "") +
      (scraperUrl ? " + custom scraper" : ""),
  });
}
