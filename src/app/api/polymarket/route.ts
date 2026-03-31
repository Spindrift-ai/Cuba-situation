import { NextResponse } from "next/server";

// Polymarket Gamma API + CLOB API — free, no auth required
//
// 1. Fetch specific Cuba events from Gamma API by slug
// 2. For each market, fetch price history from CLOB API using the condition_id

const GAMMA_EVENTS_URL = "https://gamma-api.polymarket.com/events";
const CLOB_PRICES_URL = "https://clob.polymarket.com/prices-history";

// Exact event slugs from Polymarket to track
const TRACKED_EVENT_SLUGS = [
  "us-strike-on-cuba-by",
  "will-the-us-invade-cuba-in-2026",
  "miguel-daz-canel-out-as-leader-of-cuba-by-june-30",
  "us-x-cuba-economic-deal-by",
  "us-x-cuba-military-clash-in-2026",
  "miguel-daz-canel-out-as-president-of-cuba-by-june-30",
  "us-federally-charges-cuba-leader-raul-castro",
  "us-federally-charges-cuba-leader-miguel-diaz-canel",
  "cuban-regime-falls-in-2026",
];

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
  groupItemTitle: string;
  clobTokenIds: string; // JSON array like "[\"token1\",\"token2\"]"
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

interface PricePoint {
  t: number; // unix timestamp
  p: number; // price 0-1
}

async function fetchPriceHistory(
  tokenId: string
): Promise<Array<{ timestamp: number; probability: number }>> {
  try {
    const url = `${CLOB_PRICES_URL}?market=${tokenId}&interval=all&fidelity=60`;
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: { "User-Agent": "CubaDashboard/1.0" },
    });
    if (!res.ok) return [];
    const data = await res.json();

    // CLOB returns { history: [{ t, p }] }
    const history: PricePoint[] = data.history || data || [];
    if (!Array.isArray(history)) return [];

    return history.map((pt) => ({
      timestamp: pt.t * 1000, // convert to ms
      probability: Math.round(pt.p * 100),
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // 1. Fetch each tracked event by slug in parallel
    const eventFetches = TRACKED_EVENT_SLUGS.map((slug) =>
      fetch(`${GAMMA_EVENTS_URL}?slug=${slug}`, {
        next: { revalidate: 0 },
        headers: { "User-Agent": "CubaDashboard/1.0" },
      })
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => [])
    );

    const eventResults = await Promise.all(eventFetches);

    // 2. Collect all markets
    const allMarkets: Array<{
      id: string;
      question: string;
      slug: string;
      eventSlug: string;
      eventTitle: string;
      probability: number | null;
      volume: string;
      active: boolean;
      closed: boolean;
      endDate: string;
      description: string;
      url: string;
      groupItemTitle: string;
      conditionId: string;
      clobTokenId: string | null;
      priceHistory: Array<{ timestamp: number; probability: number }>;
    }> = [];

    const seenIds = new Set<string>();
    const tokenIds: Array<{ marketIdx: number; tokenId: string }> = [];

    for (const data of eventResults) {
      const events: GammaEvent[] = Array.isArray(data) ? data : [];
      for (const event of events) {
        for (const m of event.markets || []) {
          if (seenIds.has(m.id)) continue;
          seenIds.add(m.id);

          let probability: number | null = null;
          try {
            const prices = JSON.parse(m.outcomePrices);
            probability = Math.round(parseFloat(prices[0]) * 100);
          } catch {
            // ignore
          }

          // Extract the first CLOB token ID (Yes outcome) for price history
          let clobTokenId: string | null = null;
          try {
            const tokens = JSON.parse(m.clobTokenIds);
            if (Array.isArray(tokens) && tokens.length > 0) {
              clobTokenId = tokens[0];
            }
          } catch {
            // ignore
          }

          const idx = allMarkets.length;
          allMarkets.push({
            id: m.id,
            question: m.question,
            slug: m.slug,
            eventSlug: event.slug,
            eventTitle: event.title,
            probability,
            volume: m.volume,
            active: m.active,
            closed: m.closed,
            endDate: m.endDate,
            description: m.description || event.description,
            url: `https://polymarket.com/event/${event.slug}`,
            groupItemTitle: m.groupItemTitle || "",
            conditionId: m.conditionId,
            clobTokenId,
            priceHistory: [],
          });

          if (clobTokenId) {
            tokenIds.push({ marketIdx: idx, tokenId: clobTokenId });
          }
        }
      }
    }

    // 3. Fetch price history for all markets in parallel
    const historyFetches = tokenIds.map(({ marketIdx, tokenId }) =>
      fetchPriceHistory(tokenId).then((history) => ({
        marketIdx,
        history,
      }))
    );

    const historyResults = await Promise.all(historyFetches);

    for (const { marketIdx, history } of historyResults) {
      if (allMarkets[marketIdx]) {
        allMarkets[marketIdx].priceHistory = history;
      }
    }

    // Sort by volume descending
    allMarkets.sort(
      (a, b) => (parseFloat(b.volume) || 0) - (parseFloat(a.volume) || 0)
    );

    return NextResponse.json({
      markets: allMarkets,
      trackedSlugs: TRACKED_EVENT_SLUGS,
      fetchedAt: new Date().toISOString(),
      note:
        allMarkets.length === 0
          ? "Could not fetch data for tracked Cuba markets from Polymarket. The events may have been removed or the API may be temporarily unavailable."
          : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), markets: [] },
      { status: 502 }
    );
  }
}
