import { NextResponse } from "next/server";

// Polymarket Gamma API — free, no auth required
// https://docs.polymarket.com/
//
// Fetch specific Cuba geopolitics events by their known slugs.

const GAMMA_EVENTS_URL = "https://gamma-api.polymarket.com/events";

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
    // Fetch each tracked event by slug in parallel
    const fetches = TRACKED_EVENT_SLUGS.map((slug) =>
      fetch(`${GAMMA_EVENTS_URL}?slug=${slug}`, {
        next: { revalidate: 0 },
        headers: { "User-Agent": "CubaDashboard/1.0" },
      })
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => [])
    );

    const results = await Promise.all(fetches);

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
    }> = [];

    const seenIds = new Set<string>();

    for (const data of results) {
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
          });
        }
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
