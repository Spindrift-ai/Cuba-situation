"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import NewsFeed from "@/components/NewsFeed";
import TrafficPanel from "@/components/TrafficPanel";
import PowerPanel from "@/components/PowerPanel";
import PolymarketChart from "@/components/PolymarketChart";
import Chatbot from "@/components/Chatbot";
import MapLayerControls from "@/components/MapLayerControls";
import {
  newsItems,
  aircraftData,
  vesselData,
  powerData,
  polymarketData,
} from "@/data/mockData";

// Dynamic import for Leaflet (SSR incompatible)
const CubaMap = dynamic(() => import("@/components/CubaMap"), { ssr: false });

type Tab = "news" | "traffic" | "power" | "polymarket" | "chat";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("news");
  const [layers, setLayers] = useState({
    showNews: true,
    showAir: true,
    showMaritime: true,
    showPower: true,
  });

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const tabs: { id: Tab; label: string; color: string }[] = [
    { id: "news", label: "Intel Feed", color: "var(--accent-blue)" },
    { id: "traffic", label: "Traffic", color: "var(--accent-green)" },
    { id: "power", label: "Power Grid", color: "var(--accent-red)" },
    { id: "polymarket", label: "Polymarket", color: "var(--accent-purple)" },
    { id: "chat", label: "Analyst", color: "var(--accent-cyan)" },
  ];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          <div className="text-[15px] font-bold tracking-wide">
            <span className="text-[var(--accent-red)]">◉</span>{" "}
            Monitoring la situación
          </div>
          <span className="text-[9px] text-[var(--text-muted)] bg-[var(--bg-panel)] px-2 py-0.5 rounded border border-[var(--border)]">
            CUBA · LIVE
          </span>
        </div>
        <div className="flex items-center gap-4">
          <MapLayerControls layers={layers} onToggle={toggleLayer} />
          <span className="text-[10px] text-[var(--text-muted)]">
            {new Date().toLocaleString("en-US", {
              timeZone: "America/Havana",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            })}
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Map — left 60% */}
        <div className="w-[60%] relative">
          <CubaMap
            news={newsItems}
            aircraft={aircraftData}
            vessels={vesselData}
            power={powerData}
            layers={layers}
          />
          {/* Map legend */}
          <div className="absolute bottom-3 left-3 bg-[var(--bg-panel)]/90 backdrop-blur border border-[var(--border)] rounded px-3 py-2 text-[9px] space-y-1 z-[1000]">
            <div className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Legend</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" />News</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" />Tweet</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Military</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Surveillance</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Civilian/Cargo</div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 opacity-50" />Blackout zone
            </div>
          </div>
        </div>

        {/* Right panels — 40% */}
        <div className="w-[40%] flex flex-col border-l border-[var(--border)]">
          {/* Tab bar */}
          <div className="flex border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "border-current opacity-100"
                    : "border-transparent opacity-50 hover:opacity-75"
                }`}
                style={{
                  color: activeTab === tab.id ? tab.color : "var(--text-muted)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className={activeTab === "news" ? "h-full" : "hidden"}>
              <NewsFeed items={newsItems} />
            </div>
            <div className={activeTab === "traffic" ? "h-full" : "hidden"}>
              <TrafficPanel aircraft={aircraftData} vessels={vesselData} />
            </div>
            <div className={activeTab === "power" ? "h-full" : "hidden"}>
              <PowerPanel data={powerData} />
            </div>
            <div className={activeTab === "polymarket" ? "h-full" : "hidden"}>
              <PolymarketChart data={polymarketData} />
            </div>
            <div className={activeTab === "chat" ? "h-full" : "hidden"}>
              <Chatbot
                news={newsItems}
                aircraft={aircraftData}
                vessels={vesselData}
                power={powerData}
                polymarket={polymarketData}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
