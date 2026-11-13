"use client";

import { useEffect, useRef } from "react";
import { mapCamera } from "@/lib/mapLink";

type LatLngPoint = { lat: () => number; lng: () => number };
type MapClick = { latLng?: LatLngPoint | null };
type InnerMap = { addListener: (name: string, handler: (event: MapClick) => void) => { remove: () => void }; panTo: (point: { lat: number; lng: number }) => void };
type MapElement = HTMLElement & { innerMap?: InnerMap };
type MapsNamespace = { importLibrary?: (name: string) => Promise<unknown>; __ib__?: () => void };
type MapsWindow = Window & { google?: { maps?: MapsNamespace } };

function installMapsBootstrap(key: string) {
  const root = window as MapsWindow;
  root.google = root.google || {};
  root.google.maps = root.google.maps || {};
  const maps = root.google.maps;
  if (maps.importLibrary && !maps.__ib__) return;
  const requested = new Set<string>();
  let loading: Promise<void> | undefined;
  const load = () =>
    loading ||
    (loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      const params = new URLSearchParams();
      params.set("libraries", [...requested].join(","));
      params.set("key", key);
      params.set("v", "weekly");
      params.set("callback", "google.maps.__ib__");
      maps.__ib__ = () => resolve();
      script.async = true;
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.onerror = () => {
        loading = undefined;
        reject(new Error("google-maps"));
      };
      document.head.append(script);
    }));
  const bootstrap: NonNullable<MapsNamespace["importLibrary"]> = (name) => {
    requested.add(name);
    return load().then(() => {
      const current = root.google?.maps?.importLibrary;
      if (current && current !== bootstrap) return current(name);
      return undefined;
    });
  };
  maps.importLibrary = bootstrap;
}

async function waitForInner(map: MapElement) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (map.innerMap) return map.innerMap;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  return null;
}

export default function GoogleMap({
  apiKey,
  latitude,
  longitude,
  onChange,
  onFail,
}: {
  apiKey: string;
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
  onFail: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onFailRef = useRef(onFail);
  const initialCamera = useRef(mapCamera(latitude, longitude));
  onChangeRef.current = onChange;
  onFailRef.current = onFail;

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let cancelled = false;
    let listener: { remove: () => void } | undefined;
    const camera = initialCamera.current;
    (async () => {
      try {
        installMapsBootstrap(apiKey);
        const maps = (window as MapsWindow).google?.maps;
        await maps?.importLibrary?.("maps");
        if (cancelled || !host.current) return;
        const map = document.createElement("gmp-map") as MapElement;
        map.setAttribute("center", `${camera.lat},${camera.lng}`);
        map.setAttribute("zoom", String(camera.zoom));
        map.dataset.testid = "google-map";
        map.style.display = "block";
        map.style.width = "100%";
        map.style.height = "100%";
        host.current.replaceChildren(map);
        const inner = await waitForInner(map);
        if (cancelled || !inner) {
          if (!cancelled) onFailRef.current();
          return;
        }
        listener = inner.addListener("click", (event) => {
          const point = event.latLng;
          if (!point) return;
          onChangeRef.current(point.lat().toFixed(6), point.lng().toFixed(6));
        });
      } catch {
        if (!cancelled) onFailRef.current();
      }
    })();
    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, [apiKey]);

  useEffect(() => {
    const map = host.current?.querySelector("gmp-map") as MapElement | null;
    if (!map?.innerMap) return;
    const camera = mapCamera(latitude, longitude);
    map.innerMap.panTo({ lat: camera.lat, lng: camera.lng });
  }, [latitude, longitude]);

  return <div ref={host} data-testid="google-map-host" className="h-64 w-full sm:h-80" />;
}
