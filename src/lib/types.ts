// ─── Shared types for live data ──────────────────────────────────────────────

export interface NewsItem {
  id: string;
  type: "news" | "tweet" | "social";
  source: string;
  title: string;
  summary: string;
  url: string;
  timestamp: string;
  imageUrl?: string | null;
  sourceCountry?: string | null;
  language?: string | null;
}

export interface Aircraft {
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

export interface Vessel {
  id: string;
  mmsi: string;
  name: string;
  type: string;
  flag: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  category: "military" | "cargo" | "tanker" | "fishing" | "coast_guard" | "other";
}

export interface ProvinceStatus {
  province: string;
  lat: number;
  lng: number;
  status: "online" | "partial" | "blackout";
  loadMW: number;
  capacityMW: number;
  lastUpdated: string;
}

export interface PolymarketMarket {
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
}

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  volume: number;
  marketCount: number;
  url: string;
}

// ─── API response wrappers ───────────────────────────────────────────────────

export interface NewsResponse {
  items: NewsItem[];
  error?: string;
  fetchedAt: string;
}

export interface AircraftResponse {
  aircraft: Aircraft[];
  time?: number;
  error?: string;
  fetchedAt: string;
}

export interface MaritimeResponse {
  vessels: Vessel[];
  configRequired: boolean;
  message?: string;
  error?: string;
  fetchedAt: string;
}

export interface PowerReport {
  id: string;
  title: string;
  source: string;
  url: string;
  timestamp: string;
  language: string | null;
}

export interface PowerResponse {
  reports: PowerReport[];
  provinces: ProvinceStatus[];
  scraperConfigured: boolean;
  scraperError?: string | null;
  configRequired: boolean;
  error?: string;
  fetchedAt: string;
  source?: string;
}

export interface PolymarketResponse {
  markets: PolymarketMarket[];
  events: PolymarketEvent[];
  note?: string;
  error?: string;
  fetchedAt: string;
}
