import { NextResponse } from "next/server";

// OpenSky Network REST API — free, no auth required for anonymous access
// https://openskynetwork.github.io/opensky-api/rest.html
// Bounding box covers 200 NM (nautical miles) from Cuba's coastline.
// Cuba spans ~19.8-23.2N, ~84.9-74.1W. 200NM ≈ 3.34° latitude.
const OPENSKY_URL =
  "https://opensky-network.org/api/states/all?lamin=16.5&lomin=-88.5&lamax=26.5&lomax=-70.5";

// State vector indices from OpenSky docs:
// 0: icao24, 1: callsign, 2: origin_country, 3: time_position,
// 4: last_contact, 5: longitude, 6: latitude, 7: baro_altitude,
// 8: on_ground, 9: velocity, 10: true_track, 11: vertical_rate,
// 12: sensors, 13: geo_altitude, 14: squawk, 15: spi, 16: position_source, 17: category

export async function GET() {
  try {
    const res = await fetch(OPENSKY_URL, {
      next: { revalidate: 0 },
      headers: { "User-Agent": "CubaDashboard/1.0" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenSky returned ${res.status}`, aircraft: [] },
        { status: 502 }
      );
    }

    const data = await res.json();

    const aircraft = (data.states || [])
      .filter((s: (string | number | boolean | null)[]) => s[5] != null && s[6] != null)
      .map((s: (string | number | boolean | null)[], i: number) => ({
        id: `osky-${s[0] || i}`,
        icao24: s[0] || "",
        callsign: typeof s[1] === "string" ? s[1].trim() : "",
        originCountry: s[2] || "",
        lat: s[6] as number,
        lng: s[5] as number,
        altitude: s[7] != null ? Math.round((s[7] as number) * 3.28084) : null, // meters → feet
        onGround: s[8] as boolean,
        speed: s[9] != null ? Math.round((s[9] as number) * 1.94384) : null, // m/s → knots
        heading: s[10] != null ? Math.round(s[10] as number) : null,
        verticalRate: s[11] as number | null,
        squawk: s[14] || null,
        category: categorizeAircraft(s[1] as string | null, s[2] as string | null),
      }));

    return NextResponse.json({
      aircraft,
      time: data.time,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), aircraft: [] },
      { status: 502 }
    );
  }
}

function categorizeAircraft(
  callsign: string | null,
  country: string | null
): "military" | "surveillance" | "civilian" {
  const cs = (callsign || "").toUpperCase().trim();
  // Common US military/govt prefixes
  const milPrefixes = [
    "RCH", "REACH", "DUKE", "KING", "EVAC", "NAVY", "MARS",
    "RFF", "EPIC", "COBRA", "JAKE", "TOPCT", "ORDER", "GONKY",
    "SPAR", "SAM", "EXEC", "VALOR", "HAWK", "BLADE",
  ];
  if (milPrefixes.some((p) => cs.startsWith(p))) return "military";

  // Surveillance aircraft callsigns
  const survPrefixes = ["AE", "IRON", "BRIO", "JULIET"];
  if (survPrefixes.some((p) => cs.startsWith(p))) return "surveillance";

  return "civilian";
}
