import { NextResponse } from "next/server";

// AISstream.io requires a free API key obtained at https://aisstream.io
// Since WebSocket is not suitable for a REST route, we use their HTTP snapshot
// endpoint if available, or return an error prompting the user to configure.
//
// Alternative: MarineTraffic API (paid) — https://www.marinetraffic.com/en/ais-api-services

export async function GET() {
  const apiKey = process.env.AISSTREAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      vessels: [],
      error: null,
      configRequired: true,
      message:
        "Maritime tracking requires an AISstream.io API key. " +
        "Get a free key at https://aisstream.io and set AISSTREAM_API_KEY in .env.local",
      fetchedAt: new Date().toISOString(),
    });
  }

  // AISstream REST endpoint for latest positions in bounding box
  // Bounding box: Cuba and surrounding waters
  try {
    const res = await fetch("https://api.aisstream.io/v1/vessels", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": apiKey,
      },
      body: JSON.stringify({
        boundingBoxes: [
          [[19.5, -85.5], [25.0, -74.0]],
        ],
      }),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `AISstream returned ${res.status}`, vessels: [], configRequired: false },
        { status: 502 }
      );
    }

    const data = await res.json();

    const vessels = (data.vessels || data || []).map(
      (v: Record<string, unknown>, i: number) => ({
        id: `ais-${v.mmsi || i}`,
        mmsi: v.mmsi || "",
        name: v.name || v.shipName || "Unknown",
        type: v.shipType || v.type || "Unknown",
        flag: v.flag || v.country || "",
        lat: v.latitude || v.lat,
        lng: v.longitude || v.lng || v.lon,
        heading: v.heading || v.trueHeading || null,
        speed: v.speed || v.sog || null,
        category: categorizeVessel(String(v.shipType || v.type || "")),
      })
    );

    return NextResponse.json({
      vessels,
      configRequired: false,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), vessels: [], configRequired: false },
      { status: 502 }
    );
  }
}

function categorizeVessel(
  type: string
): "military" | "cargo" | "tanker" | "fishing" | "coast_guard" | "other" {
  const t = type.toLowerCase();
  if (t.includes("military") || t.includes("warship")) return "military";
  if (t.includes("tanker")) return "tanker";
  if (t.includes("cargo") || t.includes("bulk") || t.includes("container"))
    return "cargo";
  if (t.includes("fishing")) return "fishing";
  if (t.includes("coast guard") || t.includes("patrol")) return "coast_guard";
  return "other";
}
