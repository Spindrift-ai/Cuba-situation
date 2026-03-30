"use client";

import { useState, useRef, useEffect } from "react";
import type {
  NewsItem,
  Aircraft,
  Vessel,
  ProvinceStatus,
  PolymarketPoint,
} from "@/data/mockData";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatbotProps {
  news: NewsItem[];
  aircraft: Aircraft[];
  vessels: Vessel[];
  power: ProvinceStatus[];
  polymarket: PolymarketPoint[];
}

function buildContext(props: ChatbotProps): string {
  const blackouts = props.power.filter((p) => p.status === "blackout");
  const partials = props.power.filter((p) => p.status === "partial");
  const milAircraft = props.aircraft.filter((a) => a.category !== "civilian");
  const milVessels = props.vessels.filter((v) => v.category === "military");
  const latest = props.polymarket[props.polymarket.length - 1];

  return `You are a Cuba situation analyst. Here is the current dashboard state:

NEWS (${props.news.length} items):
${props.news.map((n) => `- [${n.type}] ${n.source}: ${n.title}`).join("\n")}

POWER GRID:
- ${blackouts.length} provinces in blackout: ${blackouts.map((p) => p.province).join(", ")}
- ${partials.length} provinces with partial power: ${partials.map((p) => p.province).join(", ")}

AIR TRAFFIC (${props.aircraft.length} tracked):
${milAircraft.map((a) => `- ${a.callsign} (${a.type}) - ${a.category} - ${a.origin}→${a.destination}`).join("\n")}

MARITIME (${props.vessels.length} tracked):
${milVessels.map((v) => `- ${v.name} (${v.type}, ${v.flag}) - ${v.category}`).join("\n")}

POLYMARKET: Cuba regime change 2026 at ${latest.probability}% ($${(latest.volume / 1000).toFixed(0)}k volume)

Answer concisely based on this data. If asked about something not in the data, say what you know and note the limitation.`;
}

// Simple local response generator (no API needed)
function generateResponse(query: string, context: string): string {
  const q = query.toLowerCase();

  if (q.includes("blackout") || q.includes("power") || q.includes("electricity") || q.includes("grid")) {
    return "Based on current monitoring, 4 provinces are experiencing full blackouts: Matanzas, Camagüey, Holguín, and Santiago de Cuba. Another 6 provinces have partial power with rolling outages. Total national grid load is at approximately 37% of capacity. Santiago de Cuba has seen protests related to 48+ hours without electricity. The national utility UNE has published rolling blackout schedules affecting all 15 provinces with 8-12 hour daily outages expected.";
  }

  if (q.includes("military") || q.includes("russia") || q.includes("naval") || q.includes("ship")) {
    return "Two Russian naval vessels are currently docked in Havana harbor: the frigate Admiral Gorshkov and the replenishment oiler Akademik Pashin, described as a 'goodwill visit.' On the US side, USCGC Stone (Coast Guard cutter) is positioned in the Florida Straits. Additionally, a US P-8A Poseidon maritime patrol aircraft (callsign EPIC21) and an RC-135V reconnaissance aircraft (callsign COBRA11) are conducting patrol operations in the area.";
  }

  if (q.includes("polymarket") || q.includes("regime") || q.includes("prediction") || q.includes("bet")) {
    return "The Polymarket prediction market for 'Cuba Regime Change in 2026' currently sits at 26% probability with $290k in trading volume. This has risen sharply from 3% at the start of January, with the steepest increases in March correlating with the power grid crisis and protest activity. The market saw a brief dip to 19% around March 25 before rebounding to current levels.";
  }

  if (q.includes("protest") || q.includes("unrest") || q.includes("santiago")) {
    return "Protests have been reported in Santiago de Cuba following 48+ hours without electricity. Security forces have reportedly been deployed to main intersections. Additionally, an unusual military convoy was spotted near Camagüey moving eastward on the central highway, with unconfirmed reports suggesting troop redeployments. The combination of power outages, food shortages, and military movements suggests elevated internal tensions.";
  }

  if (q.includes("flight") || q.includes("aircraft") || q.includes("air")) {
    return "Currently tracking 5 aircraft in the Cuba area: A Russian Il-96 (RFF7012) inbound from Moscow to Havana, a Cuban AN-158 on a Havana-Cancún route, a US Navy P-8A Poseidon (EPIC21) on maritime patrol from NAS Jacksonville, an American Airlines B737-800 on the Miami-Havana route, and a US Air Force RC-135V (COBRA11) reconnaissance aircraft on patrol from Offutt AFB. The military/surveillance aircraft suggest heightened US intelligence interest in the region.";
  }

  if (q.includes("summary") || q.includes("overview") || q.includes("situation") || q.includes("what's happening")) {
    return "Current Cuba situation summary:\n\n• POWER CRISIS: 4 of 16 provinces in full blackout (Matanzas, Camagüey, Holguín, Santiago de Cuba), 6 more with partial power. Grid at ~37% capacity.\n\n• UNREST: Protests in Santiago de Cuba over power cuts. Military convoy spotted near Camagüey suggesting troop movements.\n\n• GEOPOLITICS: Russian naval vessels (frigate + oiler) docked in Havana. US surveillance aircraft actively patrolling. China offering $100M credit line for fuel.\n\n• ECONOMY: Worst economic crisis in decades with deepening food shortages. Cuban migrants intercepted in Florida Straits.\n\n• PREDICTION MARKETS: Regime change probability at 26% on Polymarket, up from 3% in January.\n\nThe convergence of infrastructure collapse, social unrest, and great-power military positioning suggests an elevated risk environment.";
  }

  if (q.includes("china") || q.includes("fuel") || q.includes("economic")) {
    return "China has extended a $100M credit line to Cuba for emergency fuel purchases, signaling deepening economic ties. This comes amid Cuba's worst economic crisis in decades, with widespread food shortages and insufficient fuel supplies to maintain the power grid. Venezuela has also been supplying fuel via tanker (the Pegas is currently en route). The economic situation is compounded by tightening sanctions and dwindling foreign reserves.";
  }

  if (q.includes("migrant") || q.includes("refugee") || q.includes("coast guard") || q.includes("florida")) {
    return "The US Coast Guard recently intercepted a makeshift raft carrying 23 Cuban migrants approximately 40 miles south of Key West. The migrants reported deteriorating conditions on the island. The USCGC Stone is currently operating in the Florida Straits. Continued economic deterioration and power outages are likely driving increased migration attempts.";
  }

  return "Based on the current dashboard data, the Cuba situation involves multiple converging crises: widespread power blackouts affecting 4 provinces, an economic crisis with food shortages, Russian naval presence in Havana, US surveillance aircraft activity, protests in Santiago de Cuba, and prediction markets pricing regime change risk at 26%. Could you ask about a specific aspect — power grid, military activity, protests, economics, or predictions?";
}

export default function Chatbot(props: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Situation analyst online. I have access to the current dashboard data including news, power grid status, air/maritime traffic, and prediction markets. What would you like to know about the Cuba situation?",
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

    // Simulate response delay
    setTimeout(() => {
      const context = buildContext(props);
      const response = generateResponse(userMsg.content, context);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-cyan)] pulse-dot" />
        Situation Analyst
        <span className="ml-auto text-[var(--text-muted)] text-[10px] font-normal normal-case tracking-normal">
          AI
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
              Analyzing situation data…
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
