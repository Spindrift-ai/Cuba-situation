// ─── News & Social Media ─────────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  type: "news" | "tweet" | "social";
  source: string;
  title: string;
  summary: string;
  url: string;
  timestamp: string;
  lat?: number;
  lng?: number;
  locationLabel?: string;
}

export const newsItems: NewsItem[] = [
  {
    id: "n1",
    type: "news",
    source: "Reuters",
    title: "Cuba faces worst economic crisis in decades as food shortages deepen",
    summary:
      "Widespread food shortages have intensified across Cuba as the government struggles to import basic goods amid tightening sanctions and dwindling foreign reserves.",
    url: "#",
    timestamp: "2026-03-30T08:15:00Z",
    lat: 23.1136,
    lng: -82.3666,
    locationLabel: "Havana",
  },
  {
    id: "n2",
    type: "tweet",
    source: "@CubaMonitor",
    title: "Protests reported in Santiago de Cuba over power cuts",
    summary:
      "Residents in Santiago de Cuba took to the streets after 48+ hours without electricity. Security forces reportedly deployed to main intersections.",
    url: "#",
    timestamp: "2026-03-30T06:42:00Z",
    lat: 20.0247,
    lng: -75.8219,
    locationLabel: "Santiago de Cuba",
  },
  {
    id: "n3",
    type: "news",
    source: "AP News",
    title: "Russian naval vessels dock in Havana harbor",
    summary:
      "A Russian frigate and support vessel arrived in Havana harbor for a scheduled 'goodwill visit', raising tensions with US officials monitoring the region.",
    url: "#",
    timestamp: "2026-03-29T22:30:00Z",
    lat: 23.145,
    lng: -82.345,
    locationLabel: "Havana Harbor",
  },
  {
    id: "n4",
    type: "social",
    source: "Facebook / Cuba Libre",
    title: "Matanzas refinery fire reportedly contained",
    summary:
      "Local sources report the Matanzas supertanker base fire has been brought under control after 3 days of continuous firefighting efforts.",
    url: "#",
    timestamp: "2026-03-29T18:00:00Z",
    lat: 23.0411,
    lng: -81.5775,
    locationLabel: "Matanzas",
  },
  {
    id: "n5",
    type: "tweet",
    source: "@OSINTCuba",
    title: "Unusual military convoy spotted near Camagüey",
    summary:
      "Multiple military vehicles observed moving eastward on the central highway near Camagüey. Unconfirmed reports suggest troop redeployments.",
    url: "#",
    timestamp: "2026-03-29T14:20:00Z",
    lat: 21.3809,
    lng: -77.9167,
    locationLabel: "Camagüey",
  },
  {
    id: "n6",
    type: "news",
    source: "Miami Herald",
    title: "US Coast Guard intercepts migrant vessel south of Key West",
    summary:
      "A makeshift raft carrying 23 Cuban migrants was intercepted 40 miles south of Key West. Migrants reported deteriorating conditions on the island.",
    url: "#",
    timestamp: "2026-03-29T10:45:00Z",
    lat: 24.0,
    lng: -81.5,
    locationLabel: "Florida Straits",
  },
  {
    id: "n7",
    type: "tweet",
    source: "@CubaEnergía",
    title: "National grid load shedding schedule released",
    summary:
      "Cuba's electric utility UNE published rolling blackout schedule affecting all 15 provinces. Outages expected 8-12 hours daily.",
    url: "#",
    timestamp: "2026-03-28T20:00:00Z",
    lat: 22.4,
    lng: -79.95,
    locationLabel: "Santa Clara",
  },
  {
    id: "n8",
    type: "news",
    source: "BBC",
    title: "China offers Cuba $100M credit line for fuel imports",
    summary:
      "Beijing has extended a new credit facility to Havana for emergency fuel purchases, signaling deepening economic ties between the two nations.",
    url: "#",
    timestamp: "2026-03-28T16:30:00Z",
  },
];

// ─── Air Traffic ─────────────────────────────────────────────────────────────

export interface Aircraft {
  id: string;
  callsign: string;
  type: string;
  origin: string;
  destination: string;
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  speed: number;
  category: "military" | "civilian" | "surveillance";
}

export const aircraftData: Aircraft[] = [
  {
    id: "a1",
    callsign: "RFF7012",
    type: "Il-96",
    origin: "Moscow (VKO)",
    destination: "Havana (HAV)",
    lat: 24.3,
    lng: -80.5,
    altitude: 36000,
    heading: 210,
    speed: 490,
    category: "military",
  },
  {
    id: "a2",
    callsign: "CU455",
    type: "AN-158",
    origin: "Havana (HAV)",
    destination: "Cancún (CUN)",
    lat: 22.3,
    lng: -86.0,
    altitude: 32000,
    heading: 270,
    speed: 420,
    category: "civilian",
  },
  {
    id: "a3",
    callsign: "EPIC21",
    type: "P-8A Poseidon",
    origin: "NAS Jacksonville",
    destination: "Patrol",
    lat: 23.9,
    lng: -81.0,
    altitude: 25000,
    heading: 180,
    speed: 380,
    category: "surveillance",
  },
  {
    id: "a4",
    callsign: "AAL1487",
    type: "B737-800",
    origin: "Miami (MIA)",
    destination: "Havana (HAV)",
    lat: 23.5,
    lng: -81.5,
    altitude: 28000,
    heading: 200,
    speed: 450,
    category: "civilian",
  },
  {
    id: "a5",
    callsign: "COBRA11",
    type: "RC-135V",
    origin: "Offutt AFB",
    destination: "Patrol",
    lat: 24.2,
    lng: -83.0,
    altitude: 34000,
    heading: 160,
    speed: 400,
    category: "surveillance",
  },
];

// ─── Maritime Traffic ────────────────────────────────────────────────────────

export interface Vessel {
  id: string;
  name: string;
  type: string;
  flag: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  category: "military" | "cargo" | "tanker" | "fishing" | "coast_guard";
}

export const vesselData: Vessel[] = [
  {
    id: "v1",
    name: "Admiral Gorshkov",
    type: "Frigate",
    flag: "Russia",
    lat: 23.145,
    lng: -82.355,
    heading: 45,
    speed: 0,
    category: "military",
  },
  {
    id: "v2",
    name: "Akademik Pashin",
    type: "Replenishment Oiler",
    flag: "Russia",
    lat: 23.15,
    lng: -82.365,
    heading: 50,
    speed: 0,
    category: "military",
  },
  {
    id: "v3",
    name: "Pegas",
    type: "Tanker",
    flag: "Venezuela",
    lat: 22.5,
    lng: -85.2,
    heading: 90,
    speed: 12,
    category: "tanker",
  },
  {
    id: "v4",
    name: "Chang Hang Zhi Xing",
    type: "Bulk Carrier",
    flag: "China",
    lat: 23.6,
    lng: -80.0,
    heading: 270,
    speed: 14,
    category: "cargo",
  },
  {
    id: "v5",
    name: "USCGC Stone",
    type: "Cutter",
    flag: "USA",
    lat: 24.1,
    lng: -81.2,
    heading: 180,
    speed: 15,
    category: "coast_guard",
  },
  {
    id: "v6",
    name: "Maria Teresa",
    type: "Fishing Vessel",
    flag: "Cuba",
    lat: 20.8,
    lng: -79.8,
    heading: 310,
    speed: 5,
    category: "fishing",
  },
];

// ─── Power Outage Data ───────────────────────────────────────────────────────

export interface ProvinceStatus {
  province: string;
  lat: number;
  lng: number;
  status: "online" | "partial" | "blackout";
  loadMW: number;
  capacityMW: number;
  lastUpdated: string;
}

export const powerData: ProvinceStatus[] = [
  { province: "Pinar del Río", lat: 22.4175, lng: -83.6978, status: "partial", loadMW: 85, capacityMW: 180, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Artemisa", lat: 22.8136, lng: -82.7622, status: "online", loadMW: 110, capacityMW: 150, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "La Habana", lat: 23.0536, lng: -82.3453, status: "partial", loadMW: 450, capacityMW: 800, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Mayabeque", lat: 22.8925, lng: -81.9556, status: "online", loadMW: 60, capacityMW: 100, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Matanzas", lat: 22.4108, lng: -81.5731, status: "blackout", loadMW: 0, capacityMW: 250, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Villa Clara", lat: 22.4065, lng: -79.9643, status: "partial", loadMW: 95, capacityMW: 200, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Cienfuegos", lat: 22.1462, lng: -80.4361, status: "online", loadMW: 130, capacityMW: 180, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Sancti Spíritus", lat: 21.9303, lng: -79.4422, status: "partial", loadMW: 55, capacityMW: 120, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Ciego de Ávila", lat: 21.84, lng: -78.7628, status: "online", loadMW: 70, capacityMW: 100, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Camagüey", lat: 21.3809, lng: -77.9167, status: "blackout", loadMW: 0, capacityMW: 300, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Las Tunas", lat: 20.9618, lng: -76.9544, status: "partial", loadMW: 40, capacityMW: 90, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Holguín", lat: 20.7205, lng: -76.2639, status: "blackout", loadMW: 0, capacityMW: 220, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Granma", lat: 20.3844, lng: -76.6433, status: "partial", loadMW: 30, capacityMW: 80, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Santiago de Cuba", lat: 20.0247, lng: -75.8219, status: "blackout", loadMW: 0, capacityMW: 350, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Guantánamo", lat: 20.1448, lng: -75.2091, status: "partial", loadMW: 25, capacityMW: 70, lastUpdated: "2026-03-30T09:00:00Z" },
  { province: "Isla de la Juventud", lat: 21.7064, lng: -82.8222, status: "online", loadMW: 15, capacityMW: 30, lastUpdated: "2026-03-30T09:00:00Z" },
];

// ─── Polymarket Data ─────────────────────────────────────────────────────────

export interface PolymarketPoint {
  date: string;
  probability: number;
  volume: number;
}

export const polymarketData: PolymarketPoint[] = [
  { date: "Jan 1", probability: 3, volume: 12000 },
  { date: "Jan 15", probability: 4, volume: 18000 },
  { date: "Feb 1", probability: 5, volume: 25000 },
  { date: "Feb 15", probability: 7, volume: 45000 },
  { date: "Mar 1", probability: 12, volume: 89000 },
  { date: "Mar 8", probability: 15, volume: 120000 },
  { date: "Mar 15", probability: 18, volume: 156000 },
  { date: "Mar 20", probability: 22, volume: 210000 },
  { date: "Mar 25", probability: 19, volume: 175000 },
  { date: "Mar 28", probability: 24, volume: 248000 },
  { date: "Mar 30", probability: 26, volume: 290000 },
];
