"use client";

interface MapLayers {
  showNews: boolean;
  showAir: boolean;
  showMaritime: boolean;
  showPower: boolean;
}

interface MapLayerControlsProps {
  layers: MapLayers;
  onToggle: (layer: keyof MapLayers) => void;
}

function Toggle({
  label,
  color,
  active,
  onToggle,
}: {
  label: string;
  color: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-all border ${
        active
          ? "border-current opacity-100"
          : "border-[var(--border)] opacity-40 hover:opacity-70"
      }`}
      style={{ color: active ? color : "var(--text-muted)" }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: active ? color : "var(--text-muted)" }}
      />
      {label}
    </button>
  );
}

export default function MapLayerControls({
  layers,
  onToggle,
}: MapLayerControlsProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      <Toggle
        label="Intel"
        color="#3b82f6"
        active={layers.showNews}
        onToggle={() => onToggle("showNews")}
      />
      <Toggle
        label="Air"
        color="#22c55e"
        active={layers.showAir}
        onToggle={() => onToggle("showAir")}
      />
      <Toggle
        label="Maritime"
        color="#06b6d4"
        active={layers.showMaritime}
        onToggle={() => onToggle("showMaritime")}
      />
      <Toggle
        label="Power"
        color="#ef4444"
        active={layers.showPower}
        onToggle={() => onToggle("showPower")}
      />
    </div>
  );
}
