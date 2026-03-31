import { NextResponse } from "next/server";

// ─── Data Sources ────────────────────────────────────────────────────────────
// 1. OpenSky Network REST API — free, no auth required for anonymous access
//    (Poor coverage in Caribbean — may return 0 aircraft)
// 2. AirLabs Data API — free tier 1000 calls/month, needs AIRLABS_API_KEY
//    (Better global coverage, REST-based)
//
// We try both and merge results, deduplicating by callsign/icao24.

// 200NM bounding box around Cuba
const OPENSKY_URL =
  "https://opensky-network.org/api/states/all?lamin=16.5&lomin=-88.5&lamax=26.5&lomax=-70.5";

// AirLabs bbox: lat range 16.5-26.5, lng range -88.5 to -70.5
const AIRLABS_URL = "https://airlabs.co/api/v9/flights";

interface AircraftInfo {
  id: string;
  icao24: string;
  callsign: string;
  originCountry: string;
  lat: number;
  lng: number;
  altitude: number | null;
  onGround: boolean;
  speed: number | null;
  heading: number | null;
  verticalRate: number | null;
  squawk: string | null;
  category: "military" | "surveillance" | "civilian";
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function categorizeAircraft(
  callsign: string | null,
  country: string | null
): "military" | "surveillance" | "civilian" {
  const cs = (callsign || "").toUpperCase().trim();
  const milPrefixes = [
    "RCH", "REACH", "DUKE", "KING", "EVAC", "NAVY", "MARS",
    "RFF", "EPIC", "COBRA", "JAKE", "TOPCT", "ORDER", "GONKY",
    "SPAR", "SAM", "EXEC", "VALOR", "HAWK", "BLADE",
  ];
  if (milPrefixes.some((p) => cs.startsWith(p))) return "military";

  const survPrefixes = ["AE", "IRON", "BRIO", "JULIET"];
  if (survPrefixes.some((p) => cs.startsWith(p))) return "surveillance";

  return "civilian";
}

async function fetchOpenSky(): Promise<{
  aircraft: AircraftInfo[];
  diagnostic: string;
}> {
  try {
    const res = await fetchWithTimeout(OPENSKY_URL, {
      headers: { "User-Agent": "CubaDashboard/1.0" },
    });

    if (!res.ok) {
      return {
        aircraft: [],
        diagnostic: `HTTP ${res.status} ${res.statusText}`,
      };
    }

    const data = await res.json();
    const states = data.states || [];

    const aircraft: AircraftInfo[] = states
      .filter(
        (s: (string | number | boolean | null)[]) =>
          s[5] != null && s[6] != null
      )
      .map(
        (s: (string | number | boolean | null)[], i: number): AircraftInfo => ({
          id: `osky-${s[0] || i}`,
          icao24: String(s[0] || ""),
          callsign: typeof s[1] === "string" ? s[1].trim() : "",
          originCountry: String(s[2] || ""),
          lat: s[6] as number,
          lng: s[5] as number,
          altitude:
            s[7] != null ? Math.round((s[7] as number) * 3.28084) : null,
          onGround: s[8] as boolean,
          speed:
            s[9] != null ? Math.round((s[9] as number) * 1.94384) : null,
          heading: s[10] != null ? Math.round(s[10] as number) : null,
          verticalRate: s[11] as number | null,
          squawk: s[14] ? String(s[14]) : null,
          category: categorizeAircraft(
            s[1] as string | null,
            s[2] as string | null
          ),
        })
      );

    return {
      aircraft,
      diagnostic: `OK — ${aircraft.length} aircraft from ${states.length} states`,
    };
  } catch (err) {
    return {
      aircraft: [],
      diagnostic: `Network error: ${String(err).substring(0, 200)}`,
    };
  }
}

async function fetchAirLabs(apiKey: string): Promise<{
  aircraft: AircraftInfo[];
  diagnostic: string;
}> {
  try {
    // AirLabs bbox params
    const url =
      `${AIRLABS_URL}?api_key=${apiKey}` +
      `&bbox=16.5,-88.5,26.5,-70.5`;

    const res = await fetchWithTimeout(url, {
      headers: { "User-Agent": "CubaDashboard/1.0" },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        aircraft: [],
        diagnostic: `HTTP ${res.status}: ${text.substring(0, 200)}`,
      };
    }

    const data = await res.json();

    if (data.error) {
      return {
        aircraft: [],
        diagnostic: `API error: ${JSON.stringify(data.error).substring(0, 200)}`,
      };
    }

    const flights = data.response || [];
    const aircraft: AircraftInfo[] = flights
      .filter(
        (f: Record<string, unknown>) => f.lat != null && f.lng != null
      )
      .map(
        (f: Record<string, unknown>, i: number): AircraftInfo => ({
          id: `alab-${f.hex || f.icao_24 || i}`,
          icao24: String(f.hex || f.icao_24 || ""),
          callsign: String(f.flight_number || f.flight_iata || f.callsign || "").trim(),
          originCountry: String(f.flag || f.airline_iata || ""),
          lat: f.lat as number,
          lng: f.lng as number,
          altitude: f.alt != null ? Math.round((f.alt as number) * 3.28084) : null,
          onGround: (f.status === "landed") as boolean,
          speed: f.speed != null ? Math.round((f.speed as number) * 0.539957) : null, // km/h → knots
          heading: f.dir != null ? Math.round(f.dir as number) : null,
          verticalRate: (f.v_speed as number | null) ?? null,
          squawk: f.squawk ? String(f.squawk) : null,
          category: categorizeAircraft(
            String(f.flight_number || f.callsign || ""),
            String(f.flag || "")
          ),
        })
      );

    return {
      aircraft,
      diagnostic: `OK — ${aircraft.length} aircraft from ${flights.length} flights`,
    };
  } catch (err) {
    return {
      aircraft: [],
      diagnostic: `Network error: ${String(err).substring(0, 200)}`,
    };
  }
}

export async function GET() {
  const diagnostics: Record<string, string> = {};
  const seenIcao = new Set<string>();
  const allAircraft: AircraftInfo[] = [];

  // Fetch from all available sources in parallel
  const airlabsKey = process.env.AIRLABS_API_KEY;

  const fetches: Promise<void>[] = [];

  // Always try OpenSky (free, no auth)
  fetches.push(
    fetchOpenSky().then(({ aircraft, diagnostic }) => {
      diagnostics.opensky = diagnostic;
      for (const ac of aircraft) {
        const key = ac.icao24 || ac.callsign || ac.id;
        if (!seenIcao.has(key)) {
          seenIcao.add(key);
          allAircraft.push(ac);
        }
      }
    })
  );

  // Try AirLabs if key is available
  if (airlabsKey) {
    fetches.push(
      fetchAirLabs(airlabsKey).then(({ aircraft, diagnostic }) => {
        diagnostics.airlabs = diagnostic;
        for (const ac of aircraft) {
          const key = ac.icao24 || ac.callsign || ac.id;
          if (!seenIcao.has(key)) {
            seenIcao.add(key);
            allAircraft.push(ac);
          }
        }
      })
    );
  } else {
    diagnostics.airlabs = "Skipped — no AIRLABS_API_KEY";
  }

  await Promise.all(fetches);

  return NextResponse.json({
    aircraft: allAircraft,
    diagnostics,
    fetchedAt: new Date().toISOString(),
    sources: ["OpenSky", ...(airlabsKey ? ["AirLabs"] : [])],
  });
}
