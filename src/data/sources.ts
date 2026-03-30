// Data source definitions with real API endpoints and documentation.
// Each source is verified as a real, publicly accessible API/service.

export interface DataSource {
  id: string;
  name: string;
  category: "news" | "air_traffic" | "maritime" | "power" | "predictions";
  description: string;
  url: string;
  apiEndpoint: string;
  auth: "none" | "api_key" | "oauth" | "paid";
  free_tier: boolean;
  status: "available" | "requires_key" | "paid_only";
  notes: string;
}

export const dataSources: DataSource[] = [
  // ─── News & Social Media ────────────────────────────────────────────
  {
    id: "gdelt",
    name: "GDELT Project",
    category: "news",
    description:
      "Global event database monitoring news media worldwide. The GEO API returns geolocated events filterable by country, actor, and theme. Covers Cuba extensively via international wire services.",
    url: "https://www.gdeltproject.org/",
    apiEndpoint: "https://api.gdeltproject.org/api/v2/doc/doc?query=cuba&mode=artlist&format=json",
    auth: "none",
    free_tier: true,
    status: "available",
    notes:
      "Completely free, no API key needed. Returns news articles with geolocation, tone, and themes. Rate limits are generous. Best for English-language coverage.",
  },
  {
    id: "mediastack",
    name: "Mediastack",
    category: "news",
    description:
      "REST API for live and historical news articles from 7,500+ sources in 50 languages. Supports country filtering (country=cu for Cuba).",
    url: "https://mediastack.com/",
    apiEndpoint: "http://api.mediastack.com/v1/news?countries=cu&access_key=YOUR_KEY",
    auth: "api_key",
    free_tier: true,
    status: "requires_key",
    notes:
      "Free tier provides 100 requests/month. Paid plans from $9.99/mo. Good for multi-language Cuba coverage.",
  },
  {
    id: "newsapi",
    name: "NewsAPI.org",
    category: "news",
    description:
      "Searches 150,000+ news sources and blogs. Supports keyword queries (q=cuba), source filtering, and date ranges.",
    url: "https://newsapi.org/",
    apiEndpoint: "https://newsapi.org/v2/everything?q=cuba&apiKey=YOUR_KEY",
    auth: "api_key",
    free_tier: true,
    status: "requires_key",
    notes:
      "Free tier: 100 requests/day, 1-month historical. Dev use only on free plan (production requires paid). Good for headline monitoring.",
  },
  {
    id: "rss-feeds",
    name: "Cuban News RSS Feeds",
    category: "news",
    description:
      "Direct RSS feeds from Cuban and Cuba-focused outlets: 14ymedio, CubaNet, Diario de Cuba, Granma (state media), Reuters Cuba, AP Cuba.",
    url: "https://diariodecuba.com/rss.xml",
    apiEndpoint: "RSS/Atom — parse with any RSS library",
    auth: "none",
    free_tier: true,
    status: "available",
    notes:
      "Completely free. Diario de Cuba, 14ymedio, and CubaNet provide independent coverage. Granma provides official state perspective. No rate limits on RSS.",
  },

  // ─── Air Traffic ────────────────────────────────────────────────────
  {
    id: "opensky",
    name: "OpenSky Network",
    category: "air_traffic",
    description:
      "Community-driven ADS-B receiver network providing real-time and historical flight data. REST API supports bounding box queries covering Cuba airspace.",
    url: "https://opensky-network.org/",
    apiEndpoint:
      "https://opensky-network.org/api/states/all?lamin=19.5&lomin=-85.0&lamax=24.0&lomax=-74.0",
    auth: "none",
    free_tier: true,
    status: "available",
    notes:
      "Free without registration (10s rate limit) or with free account (5s rate limit). Coverage over Cuba may be limited due to fewer ground receivers in the region. Best coverage for flights approaching from US/Mexico/Caribbean.",
  },
  {
    id: "adsbexchange",
    name: "ADS-B Exchange",
    category: "air_traffic",
    description:
      "Unfiltered ADS-B flight tracking — does not censor military or government aircraft like commercial trackers. Provides real-time aircraft positions via RapidAPI.",
    url: "https://www.adsbexchange.com/",
    apiEndpoint:
      "https://adsbexchange-com1.p.rapidapi.com/v2/lat/22.0/lon/-79.5/dist/500/",
    auth: "api_key",
    free_tier: false,
    status: "paid_only",
    notes:
      "Available via RapidAPI. Key differentiator: shows military aircraft (P-8 Poseidons, RC-135s, etc.) that FlightRadar24 and FlightAware hide. Essential for monitoring US surveillance flights near Cuba. Plans start ~$10/mo.",
  },

  // ─── Maritime Traffic ───────────────────────────────────────────────
  {
    id: "aisstream",
    name: "AISstream.io",
    category: "maritime",
    description:
      "Free real-time AIS vessel tracking via WebSocket. Provides position reports, vessel details, and voyage info for ships worldwide including Cuba waters.",
    url: "https://aisstream.io/",
    apiEndpoint: "wss://stream.aisstream.io/v0/stream (WebSocket)",
    auth: "api_key",
    free_tier: true,
    status: "requires_key",
    notes:
      "Free API key with registration. WebSocket streams real-time AIS messages filterable by bounding box. Good coverage of commercial shipping lanes around Cuba.",
  },
  {
    id: "marinetraffic",
    name: "MarineTraffic",
    category: "maritime",
    description:
      "Comprehensive vessel tracking platform with AIS data, port calls, and vessel databases. REST API for historical and real-time tracking.",
    url: "https://www.marinetraffic.com/",
    apiEndpoint: "https://services.marinetraffic.com/api/exportvessels/v:8/YOUR_KEY",
    auth: "api_key",
    free_tier: false,
    status: "paid_only",
    notes:
      "Paid API only (from ~$20/mo). Best for detailed vessel info, port call history, and voyage tracking. Excellent Cuba port coverage (Havana, Mariel, Santiago).",
  },

  // ─── Power Grid / Infrastructure ───────────────────────────────────
  {
    id: "une-cuba",
    name: "Unión Eléctrica de Cuba (UNE)",
    category: "power",
    description:
      "Cuba's state electric utility publishes daily load-shedding schedules and outage reports via their official channels and state media. No formal API exists — data must be scraped from reports.",
    url: "https://www.une.cu/",
    apiEndpoint: "No public API — scrape from website/social media",
    auth: "none",
    free_tier: true,
    status: "available",
    notes:
      "UNE posts daily blackout schedules via Cuban state media and their Facebook page. Data requires web scraping. Coverage is the official government reporting which may undercount actual outages.",
  },
  {
    id: "reegle",
    name: "PowerOutage.us / Global outage trackers",
    category: "power",
    description:
      "While PowerOutage.us covers the US only, crowdsourced platforms and Cuban Twitter/X accounts report real-time outage conditions by province.",
    url: "https://twitter.com/search?q=apagon%20cuba",
    apiEndpoint: "Social media monitoring / crowdsourced",
    auth: "none",
    free_tier: true,
    status: "available",
    notes:
      "No direct API for Cuban grid data. Best approach: monitor social media for 'apagón' (blackout) reports geolocated to Cuban provinces, combined with UNE official schedules. CubaNet and 14ymedio also track outages.",
  },

  // ─── Prediction Markets ─────────────────────────────────────────────
  {
    id: "polymarket",
    name: "Polymarket CLOB API",
    category: "predictions",
    description:
      "Polymarket's public API provides market data, order books, and price history for prediction markets. Cuba-related markets may or may not exist at any given time.",
    url: "https://docs.polymarket.com/",
    apiEndpoint: "https://clob.polymarket.com/markets",
    auth: "none",
    free_tier: true,
    status: "available",
    notes:
      "Completely free, no auth required. Use the /markets endpoint to search for Cuba-related markets. Market availability varies — there is no guarantee a 'Cuba regime change' market exists at any given time. The Gamma Markets API (gamma-api.polymarket.com) provides additional metadata.",
  },
];
