"use client";

import { useState, useRef, useEffect } from "react";
import type {
  NewsItem,
  Aircraft,
  Vessel,
  PowerReport,
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
  powerReports: PowerReport[];
  markets: PolymarketMarket[];
}

function buildContext(props: ChatbotProps): string {
  const newsSection =
    props.news.length > 0
      ? `NEWS (${props.news.length} articles):\n${props.news.slice(0, 10).map((n) => `- [${n.provider || "GDELT"}] ${n.source}: ${n.title}`).join("\n")}`
      : "NEWS: No articles currently loaded.";

  const aircraftSection =
    props.aircraft.length > 0
      ? `AIR TRAFFIC (${props.aircraft.length} aircraft via OpenSky):\n${props.aircraft.slice(0, 15).map((a) => `- ${a.callsign || a.icao24} (${a.originCountry}) ${a.category} ${a.altitude ? a.altitude + "ft" : "ground"} ${a.speed ? a.speed + "kts" : ""}`).join("\n")}`
      : "AIR TRAFFIC: No aircraft detected via OpenSky.";

  const vesselSection =
    props.vessels.length > 0
      ? `MARITIME (${props.vessels.length} vessels via AISstream):\n${props.vessels.slice(0, 10).map((v) => `- ${v.name} (${v.type}, ${v.flag}) ${v.category}`).join("\n")}`
      : "MARITIME: No vessel data — AISstream may be unconfigured.";

  const powerSection =
    props.powerReports.length > 0
      ? `POWER REPORTS (${props.powerReports.length}):\n${props.powerReports.slice(0, 10).map((r) => `- [${r.relevance || "unknown"}] ${r.source}: ${r.title}${r.aiSummary ? " — " + r.aiSummary : ""}`).join("\n")}`
      : "POWER REPORTS: No recent outage news.";

  const marketSection =
    props.markets.length > 0
      ? `POLYMARKET (${props.markets.length} markets):\n${props.markets.map((m) => `- "${m.question}" → ${m.probability}% (Vol: $${Number(m.volume).toLocaleString()})`).join("\n")}`
      : "POLYMARKET: No active Cuba markets.";

  return `${newsSection}\n\n${aircraftSection}\n\n${vesselSection}\n\n${powerSection}\n\n${marketSection}`;
}

// Simple markdown: **bold** and bullet points
function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function Chatbot(props: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Situation analyst online. I have access to live dashboard feeds. Ask me anything — situation summary, threat analysis, specific flights, market odds, or power status.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);
    setApiError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: buildContext(props),
        }),
      });

      const data = await res.json();

      if (data.error) {
        setApiError(data.error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${data.error}`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
      }
    } catch (err) {
      setApiError(String(err));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Connection error: ${String(err)}. Check your network.`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-cyan)] pulse-dot" />
        AI Situation Analyst
        <span className="ml-auto text-[var(--text-muted)] text-[10px] font-normal normal-case tracking-normal">
          Claude Haiku
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
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
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]"
              }`}
            >
              {msg.role === "assistant"
                ? renderMarkdown(msg.content)
                : msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[11px] text-[var(--text-muted)] animate-pulse">
              Analyzing live data…
            </div>
          </div>
        )}
      </div>

      {/* API key warning */}
      {apiError && apiError.includes("ANTHROPIC_API_KEY") && (
        <div className="mx-2 mb-1 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] text-amber-400">
          Set ANTHROPIC_API_KEY in your environment to enable the AI analyst.
        </div>
      )}

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
