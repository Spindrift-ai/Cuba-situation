"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import NewsFeed from "@/components/NewsFeed";
import TrafficPanel from "@/components/TrafficPanel";
import PowerPanel from "@/components/PowerPanel";
import PolymarketChart from "@/components/PolymarketChart";
import Chatbot from "@/components/Chatbot";
import MapLayerControls from "@/components/MapLayerControls";
import { useDataFeed } from "@/lib/useDataFeed";
import type {
  NewsResponse,
  AircraftResponse,
  MaritimeResponse,
  PowerResponse,
  PolymarketResponse,
} from "@/lib/types";

// Dynamic import for Leaflet (SSR incompatible)
const CubaMap = dynamic(() => import("@/components/CubaMap"), { ssr: false });

type Tab = "news" | "traffic" | "power" | "polymarket" | "chat";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("news");
  const [showMap, setShowMap] = useState(true);
  const [showLayers, setShowLayers] = useState(false);
  const [layers, setLayers] = useState({
    showAir: true,
    showMaritime: true,
    showPower: true,
  });

  // Live data feeds — fetched on every page load (cache: "no-store")
  const newsFeed = useDataFeed<NewsResponse>("/api/news");
  const aircraftFeed = useDataFeed<AircraftResponse>("/api/aircraft");
  const maritimeFeed = useDataFeed<MaritimeResponse>("/api/maritime");
  const powerFeed = useDataFeed<PowerResponse>("/api/power");
  const polymarketFeed = useDataFeed<PolymarketResponse>("/api/polymarket");

  // Extract arrays safely
  const newsItems = newsFeed.data?.items || [];
  const aircraft = aircraftFeed.data?.aircraft || [];
  const vessels = maritimeFeed.data?.vessels || [];
  const powerData = powerFeed.data?.provinces || [];
  const powerReports = powerFeed.data?.reports || [];
  const markets = polymarketFeed.data?.markets || [];

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const tabs: { id: Tab; label: string; color: string }[] = [
    { id: "news", label: "Intel", color: "var(--accent-blue)" },
    { id: "traffic", label: "Traffic", color: "var(--accent-green)" },
    { id: "power", label: "Power", color: "var(--accent-red)" },
    { id: "polymarket", label: "Markets", color: "var(--accent-purple)" },
    { id: "chat", label: "AI", color: "var(--accent-cyan)" },
  ];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 md:px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)] gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-[13px] md:text-[15px] font-bold tracking-wide whitespace-nowrap">
            <span className="text-[var(--accent-red)]">◉</span>{" "}
            <span className="hidden sm:inline">Monitoring la situación</span>
            <span className="sm:hidden">La situación</span>
          </div>
          <span className="text-[8px] md:text-[9px] text-[var(--text-muted)] bg-[var(--bg-panel)] px-1.5 py-0.5 rounded border border-[var(--border)] whitespace-nowrap">
            CUBA · LIVE
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile: map toggle */}
          <button
            onClick={() => setShowMap((p) => !p)}
            className="md:hidden text-[10px] text-[var(--text-muted)] border border-[var(--border)] rounded px-2 py-1 hover:text-[var(--text-primary)]"
          >
            {showMap ? "Hide Map" : "Show Map"}
          </button>
          {/* Mobile: layers toggle */}
          <button
            onClick={() => setShowLayers((p) => !p)}
            className="md:hidden text-[10px] text-[var(--text-muted)] border border-[var(--border)] rounded px-2 py-1 hover:text-[var(--text-primary)]"
          >
            Layers
          </button>
          {/* Desktop: always show layers */}
          <div className="hidden md:block">
            <MapLayerControls layers={layers} onToggle={toggleLayer} />
          </div>
          <Link
            href="/sources"
            className="text-[10px] text-[var(--accent-cyan)] hover:underline uppercase tracking-wider whitespace-nowrap"
          >
            Sources
          </Link>
          <span className="hidden sm:inline text-[10px] text-[var(--text-muted)] whitespace-nowrap">
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

      {/* Mobile: layer controls dropdown */}
      {showLayers && (
        <div className="md:hidden px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <MapLayerControls layers={layers} onToggle={toggleLayer} />
        </div>
      )}

      {/* Main content — side by side on desktop, stacked on mobile */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Map */}
        <div
          className={`relative ${
            showMap ? "h-[45vh] md:h-auto" : "h-0"
          } md:!h-auto w-full md:w-[60%] transition-all overflow-hidden`}
        >
          <CubaMap
            aircraft={aircraft}
            vessels={vessels}
            power={powerData}
            layers={layers}
          />
          {/* Map legend — hidden on small mobile */}
          <div className="absolute bottom-3 left-3 bg-[var(--bg-panel)]/90 backdrop-blur border border-[var(--border)] rounded px-2 py-1.5 text-[8px] md:text-[9px] space-y-0.5 z-[1000] hidden sm:block">
            <div className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Legend</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Military</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Surveillance</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Civilian/Cargo</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" />Coast Guard</div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 opacity-50" />Blackout zone
            </div>
          </div>

          {/* Data source attribution */}
          <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-[var(--bg-panel)]/90 backdrop-blur border border-[var(--border)] rounded px-1.5 py-1 text-[7px] md:text-[8px] text-[var(--text-muted)] z-[1000]">
            Air: OpenSky · Maritime: AISstream · News: Google+GDELT
          </div>
        </div>

        {/* Right panels */}
        <div className="flex-1 md:w-[40%] flex flex-col border-t md:border-t-0 md:border-l border-[var(--border)] min-h-0">
          {/* Tab bar — scrollable on mobile */}
          <div className="flex border-b border-[var(--border)] bg-[var(--bg-secondary)] overflow-x-auto shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-0 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
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
              <NewsFeed
                items={newsItems}
                loading={newsFeed.loading}
                error={newsFeed.error}
                fetchedAt={newsFeed.fetchedAt}
              />
            </div>
            <div className={activeTab === "traffic" ? "h-full" : "hidden"}>
              <TrafficPanel
                aircraft={aircraft}
                vessels={vessels}
                aircraftLoading={aircraftFeed.loading}
                aircraftError={aircraftFeed.error}
                aircraftFetchedAt={aircraftFeed.fetchedAt}
                vesselsLoading={maritimeFeed.loading}
                vesselsError={maritimeFeed.error}
                vesselsFetchedAt={maritimeFeed.fetchedAt}
                maritimeConfigRequired={maritimeFeed.data?.configRequired || false}
                maritimeConfigMessage={maritimeFeed.data?.message}
              />
            </div>
            <div className={activeTab === "power" ? "h-full" : "hidden"}>
              <PowerPanel
                reports={powerReports}
                provinces={powerData}
                loading={powerFeed.loading}
                error={powerFeed.error}
                fetchedAt={powerFeed.fetchedAt}
                scraperConfigured={powerFeed.data?.scraperConfigured || false}
                source={powerFeed.data?.source}
              />
            </div>
            <div className={activeTab === "polymarket" ? "h-full" : "hidden"}>
              <PolymarketChart
                markets={markets}
                loading={polymarketFeed.loading}
                error={polymarketFeed.error}
                fetchedAt={polymarketFeed.fetchedAt}
                note={polymarketFeed.data?.note}
              />
            </div>
            <div className={activeTab === "chat" ? "h-full" : "hidden"}>
              <Chatbot
                news={newsItems}
                aircraft={aircraft}
                vessels={vessels}
                powerReports={powerReports}
                markets={markets}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
