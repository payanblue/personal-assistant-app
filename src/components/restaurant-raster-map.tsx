"use client";
import { useEffect, useRef, useState } from "react";
import type { MapBounds, MapRestaurant, RestaurantMapController } from "./restaurant-vector-map";

type RasterMap = RestaurantMapController & { getZoom: () => number; remove: () => void };
type Layer = { clearLayers: () => void; addTo: (map: RasterMap) => Layer };
type Marker = { addTo: (layer: Layer) => Marker; on: (event: string, handler: () => void) => Marker; bindTooltip: (content: HTMLElement, options: Record<string, unknown>) => Marker };
type RasterApi = {
  map: (element: HTMLElement, options: Record<string, unknown>) => RasterMap;
  tileLayer: (url: string, options: Record<string, unknown>) => { addTo: (map: RasterMap) => void };
  layerGroup: () => Layer;
  marker: (coordinates: [number, number], options: Record<string, unknown>) => Marker;
  circleMarker: (coordinates: [number, number], options: Record<string, unknown>) => Marker;
  divIcon: (options: Record<string, unknown>) => unknown;
};
let promise: Promise<RasterApi> | null = null;
function loadRaster(): Promise<RasterApi> {
  const global = window as unknown as { L?: RasterApi };
  if (global.L) return Promise.resolve(global.L);
  if (promise) return promise;
  promise = new Promise<RasterApi>((resolve, reject) => {
    if (!document.querySelector("link[data-raster-map]")) {
      const css = document.createElement("link"); css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; css.dataset.rasterMap = "true"; document.head.appendChild(css);
    }
    const script = document.createElement("script"); script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    const timer = setTimeout(() => { script.remove(); reject(new Error("raster load timed out")); }, 15000);
    script.onload = () => { clearTimeout(timer); if (global.L) resolve(global.L); else reject(new Error("raster unavailable")); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error("raster load failed")); };
    document.head.appendChild(script);
  }).catch((error) => { promise = null; throw error; });
  return promise;
}
export default function RestaurantRasterMap({ restaurants, position, selectedId, picking, onSelect, onBounds, onReady, retry }: {
  restaurants: MapRestaurant[]; position: [number, number] | null; selectedId?: number; picking: boolean;
  onSelect: (id: number) => void; onBounds: (bounds: MapBounds) => void; onReady: (map: RestaurantMapController | null) => void; retry: () => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const latest = useRef({ restaurants, position, selectedId, picking, onSelect, onBounds, onReady });
  useEffect(() => { latest.current = { restaurants, position, selectedId, picking, onSelect, onBounds, onReady }; });
  const redraw = useRef<(() => void) | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false; let map: RasterMap | undefined; let observer: ResizeObserver | undefined;
    loadRaster().then((api) => {
      if (cancelled || !element.current) return;
      map = api.map(element.current, { zoomControl: true, zoomSnap: 1 });
      map.setView(latest.current.position ?? [35.576, 129.326], 13);
      api.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      const layer = api.layerGroup().addTo(map);
      const currentMap = map;
      redraw.current = () => {
        layer.clearLayers();
        const zoom = currentMap.getZoom();
        const cell = 360 / 2 ** zoom * 64 / 256;
        const groups = new Map<string, MapRestaurant[]>();
        for (const item of latest.current.restaurants) {
          const key = zoom < 15 ? `${Math.floor(item.latitude / cell)}:${Math.floor(item.longitude / cell)}` : `id:${item.id}`;
          const group = groups.get(key) ?? []; group.push(item); groups.set(key, group);
        }
        for (const group of groups.values()) {
          if (group.length > 1) {
            const center: [number, number] = [group.reduce((sum, item) => sum + item.latitude, 0) / group.length, group.reduce((sum, item) => sum + item.longitude, 0) / group.length];
            api.marker(center, { icon: api.divIcon({ className: "raster-cluster", html: `<span>${group.length}</span>`, iconSize: [42, 42], iconAnchor: [21, 21] }) }).addTo(layer).on("click", () => { if (!latest.current.picking) currentMap.setView(center, Math.min(19, zoom + 2)); });
          } else {
            const item = group[0];
            const marker = api.circleMarker([item.latitude, item.longitude], { radius: item.id === latest.current.selectedId ? 13 : 10, color: "#fff", weight: 3, fillColor: item.id === latest.current.selectedId ? "#df7636" : item.visited ? "#657c89" : "#237d68", fillOpacity: 1 }).addTo(layer).on("click", () => { if (!latest.current.picking) latest.current.onSelect(item.id); });
            if (zoom >= 15) { const text = document.createElement("span"); text.textContent = item.name; marker.bindTooltip(text, { permanent: false, direction: "top" }); }
          }
        }
        if (latest.current.position) api.circleMarker(latest.current.position, { radius: 8, color: "#fff", weight: 3, fillColor: "#287bef", fillOpacity: 1 }).addTo(layer);
      };
      currentMap.on("moveend", () => { latest.current.onBounds(currentMap.getBounds()); redraw.current?.(); });
      latest.current.onReady(currentMap);
      latest.current.onBounds(currentMap.getBounds()); redraw.current();
      observer = new ResizeObserver(() => currentMap.invalidateSize()); observer.observe(element.current);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; observer?.disconnect(); redraw.current = null; latest.current.onReady(null); map?.remove(); };
  }, []);
  useEffect(() => { redraw.current?.(); }, [restaurants, position, selectedId]);
  return <><div className="restaurant-map" ref={element} aria-label="저장한 맛집 기본 지도" />{error ? <div className="vector-map-status" role="alert">지도를 불러오지 못했어요.<button onClick={retry}>다시 시도</button></div> : <span className="raster-map-notice">기본 지도 모드</span>}</>;
}
