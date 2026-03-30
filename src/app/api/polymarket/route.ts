import { NextResponse } from "next/server";

// Polymarket Gamma API — free, no auth required
// https://docs.polymarket.com/
// Search for Cuba-related prediction markets

const GAMMA_EVENTS_URL = "https://gamma-api.polymarket.com/events";
const GAMMA_MARKETS_URL = "https://gamma-api.polymarket.com/markets";

interface GammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomePrices: string; // JSON string like "[\"0.73\",\"0.27\"]"
  outcomes: string; // JSON string like "[\"Yes\",\"No\"]"
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
    // Strategy: search for Cuba-related events and markets
    // Try multiple search approaches
    const searches = [
      fetch(`${GAMMA_EVENTS_URL}?tag=cuba&closed=false`, {
        next: { revalidate: 0 },
      }),
      fetch(
        `${GAMMA_MARKETS_URL}?tag=cuba&closed=false&active=true`,
        { next: { revalidate: 0 } }
      ),
    ];

    const [eventsRes, marketsRes] = await Promise.allSettled(searches);

    const events: GammaEvent[] =
      eventsRes.status === "fulfilled" && eventsRes.value.ok
        ? await eventsRes.value.json()
        : [];

    const standaloneMarkets: GammaMarket[] =
      marketsRes.status === "fulfilled" && marketsRes.value.ok
        ? await marketsRes.value.json()
        : [];

    // Collect all markets from events + standalone
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

    // Extract markets from events
    for (const event of events) {
      for (const m of event.markets || []) {
        allMarkets.push(formatMarket(m));
      }
    }

    // Add standalone markets
    for (const m of standaloneMarkets) {
      if (!allMarkets.find((existing) => existing.id === m.id)) {
        allMarkets.push(formatMarket(m));
      }
    }

    return NextResponse.json({
      markets: allMarkets,
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        description: e.description,
        volume: e.volume,
        marketCount: (e.markets || []).length,
        url: `https://polymarket.com/event/${e.slug}`,
      })),
      fetchedAt: new Date().toISOString(),
      note:
        allMarkets.length === 0
          ? "No active Cuba-related prediction markets found on Polymarket at this time."
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
