import { NextResponse } from "next/server";

// Polymarket Gamma API — free, no auth required
// https://docs.polymarket.com/
// Search specifically for Cuba geopolitics/regime-related prediction markets

const GAMMA_EVENTS_URL = "https://gamma-api.polymarket.com/events";
const GAMMA_MARKETS_URL = "https://gamma-api.polymarket.com/markets";

// Multiple search queries to cast a wide net, then filter strictly
const SEARCH_QUERIES = [
  `${GAMMA_EVENTS_URL}?tag=cuba&closed=false`,
  `${GAMMA_MARKETS_URL}?tag=cuba&closed=false&active=true`,
  // Text searches for Cuba geopolitics keywords
  `${GAMMA_EVENTS_URL}?slug_contains=cuba&closed=false`,
  `${GAMMA_MARKETS_URL}?closed=false&active=true&tag=latin-america`,
  `${GAMMA_MARKETS_URL}?closed=false&active=true&tag=regime-change`,
];

// Strict keyword filter: the market question or description must reference Cuba
// AND relate to geopolitics/regime/sanctions/etc.
const CUBA_KEYWORDS = [
  "cuba",
  "cuban",
  "havana",
  "habana",
  "castro",
  "díaz-canel",
  "diaz-canel",
];

const GEO_KEYWORDS = [
  "regime",
  "government",
  "sanctions",
  "embargo",
  "revolution",
  "protest",
  "collapse",
  "overthrow",
  "military",
  "intervention",
  "democracy",
  "dictator",
  "communist",
  "socialist",
  "political",
  "leader",
  "president",
  "power",
  "crisis",
  "unrest",
  "coup",
  "transition",
  "election",
  "reform",
  "diplomacy",
  "relations",
  "migration",
  "refugee",
  "blackout",
  "energy",
  "oil",
  "russia",
  "china",
  "venezuela",
];

function isCubaGeopolitics(question: string, description: string): boolean {
  const text = `${question} ${description}`.toLowerCase();

  // Must mention Cuba
  const hasCuba = CUBA_KEYWORDS.some((kw) => text.includes(kw));
  if (!hasCuba) return false;

  // Must relate to geopolitics (not sports, entertainment, etc.)
  const hasGeo = GEO_KEYWORDS.some((kw) => text.includes(kw));
  return hasGeo;
}

interface GammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomePrices: string;
  outcomes: string;
  volume: string;
  active: boolean;
  closed: boolean;
  startDate: string;
  endDate: string;
  description: string;
  image: string;
}

interface GammaEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  markets: GammaMarket[];
  startDate: string;
  endDate: string;
  image: string;
  active: boolean;
  closed: boolean;
  commentCount: number;
  volume: number;
}

export async function GET() {
  try {
    const fetches = SEARCH_QUERIES.map((url) =>
      fetch(url, { next: { revalidate: 0 } })
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => [])
    );

    const results = await Promise.all(fetches);

    // Deduplicate and collect all markets
    const seenIds = new Set<string>();
    const allMarkets: Array<{
      id: string;
      question: string;
      slug: string;
      probability: number | null;
      volume: string;
      active: boolean;
      closed: boolean;
      endDate: string;
      description: string;
      url: string;
    }> = [];

    function addMarket(m: GammaMarket) {
      if (seenIds.has(m.id)) return;
      if (!isCubaGeopolitics(m.question || "", m.description || "")) return;
      seenIds.add(m.id);
      allMarkets.push(formatMarket(m));
    }

    for (const data of results) {
      if (Array.isArray(data)) {
        // Could be array of events or array of markets
        for (const item of data) {
          if (item.markets && Array.isArray(item.markets)) {
            // It's an event
            for (const m of item.markets) addMarket(m);
          } else if (item.question) {
            // It's a market
            addMarket(item);
          }
        }
      }
    }

    // Sort by volume descending
    allMarkets.sort(
      (a, b) => (parseFloat(b.volume) || 0) - (parseFloat(a.volume) || 0)
    );

    return NextResponse.json({
      markets: allMarkets,
      fetchedAt: new Date().toISOString(),
      note:
        allMarkets.length === 0
          ? "No active Cuba geopolitics prediction markets found on Polymarket. " +
            "Markets are user-created and may not exist for every topic at all times."
          : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), markets: [], events: [] },
      { status: 502 }
    );
  }
}

function formatMarket(m: GammaMarket) {
  let probability: number | null = null;
  try {
    const prices = JSON.parse(m.outcomePrices);
    probability = Math.round(parseFloat(prices[0]) * 100);
  } catch {
    // ignore parse errors
  }

  return {
    id: m.id,
    question: m.question,
    slug: m.slug,
    probability,
    volume: m.volume,
    active: m.active,
    closed: m.closed,
    endDate: m.endDate,
    description: m.description,
    url: `https://polymarket.com/event/${m.slug}`,
  };
}
