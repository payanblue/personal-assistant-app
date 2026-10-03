"use client";

import { useEffect, useRef, useState } from "react";

export type MapBounds = { getWest: () => number; getSouth: () => number; getEast: () => number; getNorth: () => number };
type PickEvent = { latlng: { lat: number; lng: number } };
export type RestaurantMapController = {
  setView: (center: [number, number], zoom: number) => void;
  getBounds: () => MapBounds;
  on: (event: string, handler: (event: PickEvent) => void) => void;
  off: (event: string, handler: (event: PickEvent) => void) => void;
  invalidateSize: () => void;
};
export type MapRestaurant = { id: number; name: string; latitude: number; longitude: number; visited: boolean };
type MapEvent = { lngLat?: { lat: number; lng: number }; features?: { geometry: { coordinates: [number, number] }; properties: Record<string, unknown> }[] };
type GeoData = { type: "FeatureCollection"; features: { type: "Feature"; geometry: { type: "Point"; coordinates: [number, number] }; properties: Record<string, unknown> }[] };
type GLMap = {
  on: (event: string, handler: (event: MapEvent) => void) => void;
  off: (event: string, handler: (event: MapEvent) => void) => void;
  getBounds: () => MapBounds;
  getZoom: () => number;
  easeTo: (options: Record<string, unknown>) => void;
  addSource: (id: string, options: Record<string, unknown>) => void;
  getSource: (id: string) => { setData: (data: GeoData) => void; getClusterExpansionZoom: (id: number) => Promise<number> } | undefined;
  addLayer: (options: Record<string, unknown>) => void;
  queryRenderedFeatures: (point: unknown, options: { layers: string[] }) => MapEvent["features"];
  addControl: (control: unknown, position: string) => void;
  resize: () => void;
  remove: () => void;
};
type GLApi = { Map: new (options: Record<string, unknown>) => GLMap; NavigationControl: new (options: Record<string, unknown>) => unknown; supported: () => boolean };
let libraryPromise: Promise<GLApi> | null = null;
function loadMapLibrary(): Promise<GLApi> {
  const global = window as unknown as { maplibregl?: GLApi };
  if (global.maplibregl) return Promise.resolve(global.maplibregl);
  if (libraryPromise) return libraryPromise;
  libraryPromise = new Promise<GLApi>((resolve, reject) => {
    if (!document.querySelector("link[data-vector-map]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.css";
      link.dataset.vectorMap = "true";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.js";
    script.onload = () => global.maplibregl ? resolve(global.maplibregl) : reject(new Error("library unavailable"));
    script.onerror = () => { script.remove(); reject(new Error("library load failed")); };
    document.head.appendChild(script);
  }).catch((error) => { libraryPromise = null; throw error; });
  return libraryPromise;
}
const emptyData: GeoData = { type: "FeatureCollection", features: [] };
export function distanceKm(from: [number, number], to: [number, number]): number {
  const radians = Math.PI / 180;
  const a = Math.sin((to[0] - from[0]) * radians / 2) ** 2 + Math.cos(from[0] * radians) * Math.cos(to[0] * radians) * Math.sin((to[1] - from[1]) * radians / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function validMapPoint(point: MapRestaurant) {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}

export default function RestaurantVectorMap({ restaurants, position, selectedId, picking, onSelect, onBounds, onReady }: {
  restaurants: MapRestaurant[];
  position: [number, number] | null;
  selectedId?: number;
  picking: boolean;
  onSelect: (id: number) => void;
  onBounds: (bounds: MapBounds) => void;
  onReady: (controller: RestaurantMapController | null) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GLMap | null>(null);
  const latest = useRef({ restaurants, position, selectedId, picking, onSelect, onBounds, onReady });
  useEffect(() => { latest.current = { restaurants, position, selectedId, picking, onSelect, onBounds, onReady }; });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let loaded = false;
    let observer: ResizeObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const showFailure = () => { if (!cancelled && !loaded) setError("지도를 불러오지 못했어요. 인터넷 연결과 브라우저의 그래픽 가속을 확인해 주세요."); };
    loadMapLibrary().then((gl) => {
      if (cancelled || !element.current) return;
      if (!gl.supported()) throw new Error("WebGL unavailable");
      const initial = latest.current.position;
      const map = new gl.Map({ container: element.current, style: "https://tiles.openfreemap.org/styles/liberty", center: initial ? [initial[1], initial[0]] : [129.326, 35.576], zoom: 13, maxZoom: 19, attributionControl: true, dragRotate: false, pitchWithRotate: false, touchPitch: false });
      mapRef.current = map;
      map.addControl(new gl.NavigationControl({ showCompass: false }), "top-left");
      timer = setTimeout(showFailure, 20000);
      map.on("error", showFailure);
      map.on("load", () => {
        if (cancelled) return;
        loaded = true;
        clearTimeout(timer);
        setError("");
        map.addSource("saved-restaurants", { type: "geojson", data: emptyData, cluster: true, clusterRadius: 48, clusterMaxZoom: 14 });
        map.addLayer({ id: "restaurant-clusters", type: "circle", source: "saved-restaurants", filter: ["has", "point_count"], paint: { "circle-color": "#237d68", "circle-radius": ["step", ["get", "point_count"], 21, 20, 26, 100, 32], "circle-stroke-color": "#fff", "circle-stroke-width": 3 } });
        map.addLayer({ id: "restaurant-counts", type: "symbol", source: "saved-restaurants", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 14 }, paint: { "text-color": "#fff" } });
        map.addLayer({ id: "restaurant-points", type: "circle", source: "saved-restaurants", filter: ["!", ["has", "point_count"]], paint: { "circle-radius": ["case", ["get", "selected"], 13, 9], "circle-color": ["case", ["get", "selected"], "#df7636", ["get", "visited"], "#657c89", "#237d68"], "circle-stroke-color": "#fff", "circle-stroke-width": 3 } });
        map.addLayer({ id: "restaurant-names", type: "symbol", source: "saved-restaurants", minzoom: 15, filter: ["!", ["has", "point_count"]], layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 13, "text-offset": [0, 1.4], "text-anchor": "top", "text-max-width": 9 }, paint: { "text-color": "#183e30", "text-halo-color": "#fff", "text-halo-width": 2 } });
        map.addSource("my-position", { type: "geojson", data: emptyData });
        map.addLayer({ id: "my-position-dot", type: "circle", source: "my-position", paint: { "circle-radius": 8, "circle-color": "#287bef", "circle-stroke-color": "#fff", "circle-stroke-width": 3 } });
        const handlers = new Map<(event: PickEvent) => void, (event: MapEvent) => void>();
        latest.current.onReady({
          setView: ([lat, lng], zoom) => map.easeTo({ center: [lng, lat], zoom, duration: 450 }),
          getBounds: () => map.getBounds(),
          invalidateSize: () => map.resize(),
          on: (event, handler) => { const wrapped = (e: MapEvent) => { if (e.lngLat) handler({ latlng: e.lngLat }); }; handlers.set(handler, wrapped); map.on(event, wrapped); },
          off: (event, handler) => { const wrapped = handlers.get(handler); if (wrapped) map.off(event, wrapped); handlers.delete(handler); },
        });
        const reportBounds = () => latest.current.onBounds(map.getBounds());
        map.on("moveend", reportBounds);
        reportBounds();
        map.on("click", (event) => {
          if (latest.current.picking) return;
          const point = (event as MapEvent & { point?: unknown }).point;
          const feature = map.queryRenderedFeatures(point, { layers: ["restaurant-clusters", "restaurant-points"] })?.[0];
          if (!feature) return;
          if (feature.properties.cluster_id !== undefined) {
            void map.getSource("saved-restaurants")?.getClusterExpansionZoom(Number(feature.properties.cluster_id)).then((zoom) => { if (!cancelled) map.easeTo({ center: feature.geometry.coordinates, zoom, duration: 450 }); }).catch(() => undefined);
          } else latest.current.onSelect(Number(feature.properties.id));
        });
        setReady(true);
      });
      observer = new ResizeObserver(() => map.resize());
      observer.observe(element.current);
    }).catch(showFailure);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      observer?.disconnect();
      latest.current.onReady(null);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    if (!ready) return;
    mapRef.current?.getSource("saved-restaurants")?.setData({ type: "FeatureCollection", features: restaurants.filter(validMapPoint).map((item) => ({ type: "Feature", geometry: { type: "Point", coordinates: [item.longitude, item.latitude] }, properties: { id: item.id, name: item.name, visited: item.visited, selected: item.id === selectedId } })) });
    mapRef.current?.getSource("my-position")?.setData({ type: "FeatureCollection", features: position ? [{ type: "Feature", geometry: { type: "Point", coordinates: [position[1], position[0]] }, properties: {} }] : [] });
  }, [ready, restaurants, position, selectedId]);
  return <><div className="restaurant-map" ref={element} aria-label="저장한 맛집 지도" />{!ready && !error && <div className="vector-map-status" role="status">지도를 불러오는 중…</div>}{error && <div className="vector-map-status" role="alert"><p>{error}</p><button onClick={() => { setError(""); setReady(false); setAttempt((value) => value + 1); }}>다시 시도</button></div>}</>;
}
