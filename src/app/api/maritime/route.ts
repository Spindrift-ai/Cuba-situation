import { NextResponse } from "next/server";
import WebSocket from "ws";

// ─── AISstream.io — WebSocket API ────────────────────────────────────────────
// AISstream is WebSocket-only. We open a connection, subscribe to a bounding
// box around Cuba, collect vessel position messages for a few seconds, then
// close and return the results.
//
// ─── MyShipTracking.com ──────────────────────────────────────────────────────
// Provides a public embeddable map. We include it as a source link.
// No public REST API is available for programmatic access.

const AISSTREAM_WS_URL = "wss://stream.aisstream.io/v0/stream";

// 200NM bounding box around Cuba (matches aircraft coverage)
const BOUNDING_BOX = [
  [
    [16.5, -88.5],
    [26.5, -70.5],
  ],
];

// How long to listen for vessel messages (milliseconds)
const LISTEN_DURATION_MS = 5000;

interface AISMessage {
  MessageType: string;
  MetaData: {
    MMSI: number;
    MMSI_String: string;
    ShipName: string;
    latitude: number;
    longitude: number;
    time_utc: string;
  };
  Message: {
    PositionReport?: {
      Sog: number;
      Cog: number;
      TrueHeading: number;
      NavigationalStatus: number;
    };
    ShipStaticData?: {
      Type: number;
      Name: string;
      CallSign: string;
      Destination: string;
      Dimension: {
        A: number;
        B: number;
        C: number;
        D: number;
      };
    };
  };
}

interface VesselInfo {
  id: string;
  mmsi: string;
  name: string;
  type: string;
  flag: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  course: number | null;
  destination: string;
  category: string;
  lastSeen: string;
}

function getShipTypeName(typeCode: number): string {
  // AIS ship type codes
  if (typeCode >= 70 && typeCode <= 79) return "Cargo";
  if (typeCode >= 80 && typeCode <= 89) return "Tanker";
  if (typeCode >= 60 && typeCode <= 69) return "Passenger";
  if (typeCode >= 40 && typeCode <= 49) return "High-Speed Craft";
  if (typeCode >= 30 && typeCode <= 39) return "Fishing";
  if (typeCode >= 50 && typeCode <= 59) return "Special Craft";
  if (typeCode >= 20 && typeCode <= 29) return "WIG";
  if (typeCode === 0) return "Unknown";
  return `Type ${typeCode}`;
}

function categorizeByTypeCode(
  typeCode: number
): "military" | "cargo" | "tanker" | "fishing" | "coast_guard" | "passenger" | "other" {
  if (typeCode >= 70 && typeCode <= 79) return "cargo";
  if (typeCode >= 80 && typeCode <= 89) return "tanker";
  if (typeCode >= 30 && typeCode <= 39) return "fishing";
  if (typeCode >= 60 && typeCode <= 69) return "passenger";
  if (typeCode === 55 || typeCode === 35) return "military"; // Law enforcement / military
  return "other";
}

function collectVesselsFromAISstream(
  apiKey: string
): Promise<Map<string, VesselInfo>> {
  return new Promise((resolve) => {
    const vessels = new Map<string, VesselInfo>();
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        resolve(vessels);
      }
    };

    try {
      const ws = new WebSocket(AISSTREAM_WS_URL);

      const timeout = setTimeout(() => {
        try {
          ws.close();
        } catch {
          // ignore
        }
        cleanup();
      }, LISTEN_DURATION_MS);

      ws.on("open", () => {
        // Subscribe to bounding box
        const subscribeMsg = JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: BOUNDING_BOX,
          FilterMessageTypes: ["PositionReport", "ShipStaticData"],
        });
        ws.send(subscribeMsg);
      });

      ws.on("message", (raw: Buffer) => {
        try {
          const msg: AISMessage = JSON.parse(raw.toString());
          const meta = msg.MetaData;
          if (!meta || !meta.MMSI) return;

          const mmsi = String(meta.MMSI);
          const existing = vessels.get(mmsi);

          if (msg.MessageType === "PositionReport" && msg.Message.PositionReport) {
            const pos = msg.Message.PositionReport;
            vessels.set(mmsi, {
              ...(existing || {
                id: `ais-${mmsi}`,
                mmsi,
                name: meta.ShipName?.trim() || "Unknown",
                type: "Unknown",
                flag: "",
                destination: "",
                category: "other",
              }),
              lat: meta.latitude,
              lng: meta.longitude,
              heading: pos.TrueHeading !== 511 ? pos.TrueHeading : null,
              speed: pos.Sog != null ? Math.round(pos.Sog * 10) / 10 : null,
              course: pos.Cog != null ? Math.round(pos.Cog) : null,
              lastSeen: meta.time_utc || new Date().toISOString(),
            });
          } else if (
            msg.MessageType === "ShipStaticData" &&
            msg.Message.ShipStaticData
          ) {
            const stat = msg.Message.ShipStaticData;
            const typeCode = stat.Type || 0;
            vessels.set(mmsi, {
              ...(existing || {
                id: `ais-${mmsi}`,
                mmsi,
                lat: meta.latitude,
                lng: meta.longitude,
                heading: null,
                speed: null,
                course: null,
                lastSeen: meta.time_utc || new Date().toISOString(),
              }),
              name: (stat.Name || meta.ShipName || "Unknown").trim(),
              type: getShipTypeName(typeCode),
              flag: "",
              destination: (stat.Destination || "").trim(),
              category: categorizeByTypeCode(typeCode),
            });
          }
        } catch {
          // skip malformed messages
        }
      });

      ws.on("error", () => {
        clearTimeout(timeout);
        cleanup();
      });

      ws.on("close", () => {
        clearTimeout(timeout);
        cleanup();
      });
    } catch {
      cleanup();
    }
  });
}

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
      additionalSources: [
        {
          name: "MyShipTracking",
          url: "https://www.myshiptracking.com/map?default_map=4&mmsi=&imo=&name=&type=-1&status=-1&port=-1&country=-1&speed_from=0&speed_to=50&fromPortId=-1&toPortId=-1&dwt_from=0&dwt_to=999999&length_from=0&length_to=500&lat=22.0&lng=-79.5&zoom=6",
          type: "embed",
        },
      ],
      fetchedAt: new Date().toISOString(),
    });
  }

  try {
    const vesselMap = await collectVesselsFromAISstream(apiKey);
    const vessels = Array.from(vesselMap.values())
      // Filter out entries without valid coordinates
      .filter((v) => v.lat != null && v.lng != null && v.lat !== 0 && v.lng !== 0);

    return NextResponse.json({
      vessels,
      configRequired: false,
      additionalSources: [
        {
          name: "MyShipTracking",
          url: "https://www.myshiptracking.com/map?default_map=4&mmsi=&imo=&name=&type=-1&status=-1&port=-1&country=-1&speed_from=0&speed_to=50&fromPortId=-1&toPortId=-1&dwt_from=0&dwt_to=999999&length_from=0&length_to=500&lat=22.0&lng=-79.5&zoom=6",
          type: "embed",
        },
      ],
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `AISstream WebSocket error: ${String(err)}`,
        vessels: [],
        configRequired: false,
      },
      { status: 502 }
    );
  }
}
