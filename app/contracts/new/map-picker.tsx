"use client";

import { useMemo, useRef, useState } from "react";
import { MapPin, Minus, Plus } from "lucide-react";
import { latLngToWorld, worldToLatLng } from "@/lib/mapLink";
import GoogleMap from "./google-map";

const TILE = 256;
const FALLBACK = { lat: 13.7563, lng: 100.5018 };

function centerOf(latitude: string, longitude: string, zoom: number) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -85 || lat > 85 || lng < -180 || lng > 180) {
    return latLngToWorld(FALLBACK.lat, FALLBACK.lng, zoom);
  }
  return latLngToWorld(lat, lng, zoom);
}

const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

export default function MapPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
}) {
  const [keyless, setKeyless] = useState(!mapsKey);
  if (keyless) {
    return (
      <div className="flex flex-col gap-2">
        <p data-testid="map-key-note" className="text-sm text-amber-100">
          {mapsKey ? "โหลดแผนที่ Google ไม่สำเร็จ ใช้หมุดแบบไม่ใช้คีย์" : "ยังไม่ได้ตั้งคีย์แผนที่ Google ใช้หมุดแบบไม่ใช้คีย์"}
        </p>
        <KeylessMap latitude={latitude} longitude={longitude} onChange={onChange} />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
      <GoogleMap apiKey={mapsKey} latitude={latitude} longitude={longitude} onChange={onChange} onFail={() => setKeyless(true)} />
      <p className="px-3 py-2 text-xs text-emerald-100/70">แตะแผนที่เพื่อปักหมุดที่ดิน</p>
    </div>
  );
}

function KeylessMap({
  latitude,
  longitude,
  onChange,
}: {
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
}) {
  const [zoom, setZoom] = useState(15);
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const center = useMemo(() => centerOf(latitude, longitude, zoom), [latitude, longitude, zoom]);
  const tileX = Math.floor(center.x / TILE);
  const tileY = Math.floor(center.y / TILE);
  const tiles = [];
  for (let y = tileY - 2; y <= tileY + 2; y += 1) {
    for (let x = tileX - 2; x <= tileX + 2; x += 1) {
      tiles.push({ x, y });
    }
  }

  function commit(dx: number, dy: number) {
    const next = worldToLatLng(center.x - dx, center.y - dy, zoom);
    const lat = Math.min(85, Math.max(-85, next.lat));
    const lng = Math.min(180, Math.max(-180, next.lng));
    onChange(lat.toFixed(6), lng.toFixed(6));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
      <div
        ref={frame}
        data-testid="map-picker"
        className="relative h-64 cursor-crosshair touch-none sm:h-80"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const x = event.clientX - drag.current.x;
          const y = event.clientY - drag.current.y;
          if (Math.hypot(x, y) > 4) drag.current.moved = true;
          setShift({ x, y });
        }}
        onPointerUp={(event) => {
          const start = drag.current;
          drag.current = null;
          setShift({ x: 0, y: 0 });
          if (!start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (start.moved) {
            commit(dx, dy);
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          commit(rect.width / 2 - (event.clientX - rect.left), rect.height / 2 - (event.clientY - rect.top));
        }}
        onPointerCancel={() => {
          drag.current = null;
          setShift({ x: 0, y: 0 });
        }}
      >
        {tiles.map((tile) => (
          <img
            key={`${tile.x}-${tile.y}-${zoom}`}
            alt=""
            draggable={false}
            className="absolute max-w-none select-none"
            style={{
              width: TILE,
              height: TILE,
              left: `calc(50% + ${tile.x * TILE - center.x + shift.x}px)`,
              top: `calc(50% + ${tile.y * TILE - center.y + shift.y}px)`,
            }}
            src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
          />
        ))}
        <MapPin className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-full text-emerald-300 drop-shadow" />
        <div className="absolute right-2 top-2 flex flex-col gap-2" onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" className="rounded-lg bg-black/70 p-2" aria-label="ขยายแผนที่" onClick={() => setZoom((value) => Math.min(18, value + 1))}>
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-lg bg-black/70 p-2" aria-label="ย่อแผนที่" onClick={() => setZoom((value) => Math.max(5, value - 1))}>
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="px-3 py-2 text-xs text-emerald-100/70">
        แตะหรือลากแผนที่เพื่อปักหมุดที่ดิน · แผนที่ © OpenStreetMap
      </p>
    </div>
  );
}
