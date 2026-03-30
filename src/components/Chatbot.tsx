"use client";

import { useState, useRef, useEffect } from "react";
import type {
  NewsItem,
  Aircraft,
  Vessel,
  ProvinceStatus,
  PolymarketMarket,
} from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatbotProps {
  news: NewsItem[];
  aircraft: Aircraft[];
  vessels: Vessel[];
  power: ProvinceStatus[];
  markets: PolymarketMarket[];
}

function buildContext(props: ChatbotProps): string {
  const newsSection =
    props.news.length > 0
      ? `NEWS (${props.news.length} live articles from GDELT):\n${props.news.slice(0, 10).map((n) => `- ${n.source}: ${n.title}`).join("\n")}`
      : "NEWS: No articles currently loaded.";

  const aircraftSection =
    props.aircraft.length > 0
      ? `AIR TRAFFIC (${props.aircraft.length} aircraft from OpenSky Network):\n${props.aircraft.slice(0, 10).map((a) => `- ${a.callsign || a.icao24} (${a.originCountry}) ${a.category} ${a.altitude ? a.altitude + "ft" : "ground"}`).join("\n")}`
      : "AIR TRAFFIC: No aircraft currently detected in Cuba airspace via OpenSky.";

  const vesselSection =
    props.vessels.length > 0
      ? `MARITIME (${props.vessels.length} vessels from AISstream):\n${props.vessels.slice(0, 10).map((v) => `- ${v.name} (${v.type}, ${v.flag}) ${v.category}`).join("\n")}`
      : "MARITIME: No vessel data available (API key may be required).";

  const powerSection =
    props.power.length > 0
      ? `POWER GRID:\n${props.power.map((p) => `- ${p.province}: ${p.status} (${p.loadMW}/${p.capacityMW} MW)`).join("\n")}`
      : "POWER GRID: No data available (requires custom scraper).";

  const marketSection =
    props.markets.length > 0
      ? `POLYMARKET:\n${props.markets.map((m) => `- "${m.question}" at ${m.probability}% (Vol: $${Number(m.volume).toLocaleString()})`).join("\n")}`
      : "POLYMARKET: No active Cuba-related prediction markets found.";

  return `You are a Cuba situation analyst. Here is the LIVE dashboard state (all data from real APIs):

${newsSection}

${aircraftSection}

${vesselSection}

${powerSection}

${marketSection}

Answer concisely based ONLY on the data shown above. If a data source is unavailable, say so honestly. Do not fabricate information.`;
}

function generateResponse(query: string, props: ChatbotProps): string {
  const q = query.toLowerCase();
  const context = buildContext(props);

  if (q.includes("summary") || q.includes("overview") || q.includes("situation") || q.includes("what's happening") || q.includes("brief")) {
    const parts: string[] = [];
    if (props.news.length > 0) {
      parts.push(`**News**: ${props.news.length} live articles from GDELT. Top story: "${props.news[0]?.title}"`);
    } else {
      parts.push("**News**: No articles currently loaded from GDELT.");
    }
    if (props.aircraft.length > 0) {
      const mil = props.aircraft.filter(a => a.category !== "civilian");
      parts.push(`**Air Traffic**: ${props.aircraft.length} aircraft tracked via OpenSky (${mil.length} military/surveillance).`);
    } else {
      parts.push("**Air Traffic**: No aircraft detected via OpenSky. Coverage may be limited over Cuba.");
    }
    if (props.vessels.length > 0) {
      parts.push(`**Maritime**: ${props.vessels.length} vessels tracked via AISstream.`);
    } else {
      parts.push("**Maritime**: No vessel data — AISstream API key may not be configured.");
    }
    if (props.power.length > 0) {
      const blackouts = props.power.filter(p => p.status === "blackout").length;
      parts.push(`**Power Grid**: ${blackouts} provinces in blackout.`);
    } else {
      parts.push("**Power Grid**: No data — requires custom scraper (no public API exists).");
    }
    if (props.markets.length > 0) {
      parts.push(`**Polymarket**: ${props.markets.length} active Cuba market(s). Top: "${props.markets[0]?.question}" at ${props.markets[0]?.probability}%.`);
    } else {
      parts.push("**Polymarket**: No active Cuba prediction markets found.");
    }
    return parts.join("\n\n");
  }

  if (q.includes("news") || q.includes("article") || q.includes("headline")) {
    if (props.news.length === 0) return "No news articles are currently loaded from GDELT. Try refreshing the page.";
    return `Currently showing ${props.news.length} articles from GDELT about Cuba. Recent headlines:\n\n${props.news.slice(0, 5).map((n) => `- **${n.title}** (${n.source})`).join("\n")}`;
  }

  if (q.includes("flight") || q.includes("aircraft") || q.includes("air") || q.includes("plane")) {
    if (props.aircraft.length === 0) return "No aircraft currently detected in Cuba airspace via OpenSky Network. Coverage can be limited in this region due to fewer ground receivers.";
    const mil = props.aircraft.filter(a => a.category !== "civilian");
    return `Tracking ${props.aircraft.length} aircraft via OpenSky Network (${mil.length} military/surveillance, ${props.aircraft.length - mil.length} civilian).\n\n${props.aircraft.slice(0, 5).map((a) => `- **${a.callsign || a.icao24}** (${a.originCountry}) — ${a.category} — ${a.altitude ? a.altitude.toLocaleString() + "ft" : "ground"}`).join("\n")}`;
  }

  if (q.includes("ship") || q.includes("vessel") || q.includes("maritime") || q.includes("navy") || q.includes("boat")) {
    if (props.vessels.length === 0) return "No maritime data available. The AISstream.io API key may not be configured. Set AISSTREAM_API_KEY in .env.local to enable vessel tracking.";
    return `Tracking ${props.vessels.length} vessels via AISstream:\n\n${props.vessels.slice(0, 5).map((v) => `- **${v.name}** (${v.type}, ${v.flag}) — ${v.category}`).join("\n")}`;
  }

  if (q.includes("power") || q.includes("blackout") || q.includes("electric") || q.includes("grid")) {
    if (props.power.length === 0) return "No power grid data available. Cuba's UNE does not provide a public API. Data requires a custom scraper monitoring UNE's website or social media. Set CUBA_POWER_SCRAPER_URL in .env.local to connect one.";
    const blackouts = props.power.filter(p => p.status === "blackout");
    return `Power grid data from scraper:\n\n- ${blackouts.length} provinces in blackout: ${blackouts.map(p => p.province).join(", ") || "None"}\n- Total load: ${props.power.reduce((s, p) => s + p.loadMW, 0)} / ${props.power.reduce((s, p) => s + p.capacityMW, 0)} MW`;
  }

  if (q.includes("polymarket") || q.includes("prediction") || q.includes("bet") || q.includes("regime")) {
    if (props.markets.length === 0) return "No active Cuba-related prediction markets found on Polymarket. Markets are user-created and may not exist for every topic at all times. Data is fetched live from the Polymarket Gamma API.";
    return `Active Cuba markets on Polymarket:\n\n${props.markets.map((m) => `- **${m.question}** — ${m.probability}% probability (Vol: $${Number(m.volume).toLocaleString()})\n  [View on Polymarket](${m.url})`).join("\n\n")}`;
  }

  if (q.includes("source") || q.includes("where") || q.includes("data from") || q.includes("api")) {
    return "Dashboard data sources:\n\n- **News**: GDELT Project (api.gdeltproject.org) — free, no auth\n- **Air Traffic**: OpenSky Network (opensky-network.org) — free, no auth\n- **Maritime**: AISstream.io — free API key required\n- **Power Grid**: No public API — requires custom scraper\n- **Polymarket**: Gamma API (gamma-api.polymarket.com) — free, no auth\n\nAll data refreshes on each page load. Visit the /sources page for full details.";
  }

  // Default: summarize what's available
  return `I have access to live dashboard data. Currently loaded:\n\n- ${props.news.length} news articles (GDELT)\n- ${props.aircraft.length} aircraft (OpenSky)\n- ${props.vessels.length} vessels (AISstream)\n- ${props.power.length} power grid entries\n- ${props.markets.length} prediction markets (Polymarket)\n\nAsk me about any of these — news, flights, ships, power, predictions, or a full situation summary.`;
}

export default function Chatbot(props: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Situation analyst online. I have access to live dashboard data from GDELT, OpenSky, AISstream, and Polymarket. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = generateResponse(userMsg.content, props);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      setIsTyping(false);
    }, 400);
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-cyan)] pulse-dot" />
        Situation Analyst
        <span className="ml-auto text-[var(--text-muted)] text-[10px] font-normal normal-case tracking-normal">
          LIVE DATA
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
        style={{ maxHeight: "calc(100vh - 400px)" }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg text-[11px] leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[var(--accent-blue)] text-white"
                  : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[11px] text-[var(--text-muted)]">
              Analyzing live data…
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the situation…"
            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-3 py-2 text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)]"
          />
          <button
            type="submit"
            disabled={isTyping}
            className="px-3 py-2 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 disabled:opacity-50 text-white text-[11px] font-bold rounded transition-colors"
          >
            SEND
          </button>
        </div>
      </form>
    </div>
  );
}
