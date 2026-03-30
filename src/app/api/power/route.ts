import { NextResponse } from "next/server";

// Cuba's power grid data is NOT available via a public API.
// Unión Eléctrica de Cuba (UNE) publishes outage schedules via:
//   - Their website: https://www.une.cu
//   - State media: Granma, Cubadebate
//   - Social media accounts
//
// To get real data, you would need to:
//   1. Scrape UNE's website or social media posts
//   2. Monitor Twitter/X for "apagón cuba" reports
//   3. Use a custom scraper and set CUBA_POWER_SCRAPER_URL in .env.local
//
// This route supports a custom scraper endpoint if configured.

export async function GET() {
  const scraperUrl = process.env.CUBA_POWER_SCRAPER_URL;

  if (!scraperUrl) {
    return NextResponse.json({
      provinces: [],
      configRequired: true,
      error: null,
      message:
        "No public API exists for Cuba's power grid. Real-time data requires a custom scraper " +
        "monitoring UNE (https://www.une.cu) or social media reports. " +
        "Set CUBA_POWER_SCRAPER_URL in .env.local to connect a scraper endpoint.",
      fetchedAt: new Date().toISOString(),
    });
  }

  try {
    const res = await fetch(scraperUrl, { next: { revalidate: 0 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Scraper returned ${res.status}`, provinces: [], configRequired: false },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      provinces: data.provinces || data,
      configRequired: false,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), provinces: [], configRequired: false },
      { status: 502 }
    );
  }
}
