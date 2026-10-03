"use client";

import { useRef, useState } from "react";
import RestaurantVectorMap, { type MapBounds, type RestaurantMapController } from "../../components/restaurant-vector-map";

const samples = Array.from({ length: 1000 }, (_, index) => ({
  id: index, name: `테스트 맛집 ${index + 1}`, visited: index % 3 === 0,
  latitude: 35.576 + Math.sin(index * 2.39996) * Math.sqrt(index / 1000) * 0.06,
  longitude: 129.326 + Math.cos(index * 2.39996) * Math.sqrt(index / 1000) * 0.075,
}));
export default function MapCheck() {
  const map = useRef<RestaurantMapController | null>(null);
  const [count, setCount] = useState(100);
  const [selected, setSelected] = useState<number>();
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const points = samples.slice(0, count);
  const visible = bounds ? points.filter((point) => point.latitude >= bounds.getSouth() && point.latitude <= bounds.getNorth() && point.longitude >= bounds.getWest() && point.longitude <= bounds.getEast()).length : 0;
  return <main style={{ maxWidth: 600, margin: "auto", padding: 16 }}>
    <h1 style={{ fontSize: 20 }}>무료 지도 동작 확인</h1>
    <p style={{ fontSize: 12, margin: "12px 0" }}>가상 맛집을 표시합니다. 기존 저장 자료는 읽거나 변경하지 않습니다.</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      {[100, 500, 1000].map((value) => <button key={value} aria-pressed={count === value} onClick={() => setCount(value)} style={{ padding: 12 }}>{value}개</button>)}
      <button style={{ padding: 12 }} onClick={() => map.current?.setView([35.576, 129.326], 16.5)}>가까이 보기</button>
      <button style={{ padding: 12 }} onClick={() => map.current?.setView([35.576, 129.326], 11.5)}>넓게 보기</button>
    </div>
    <section className="restaurant-map-card" style={{ margin: 0 }}><RestaurantVectorMap restaurants={points} position={[35.576, 129.326]} selectedId={selected} picking={false} onSelect={setSelected} onBounds={setBounds} onReady={(controller) => { map.current = controller; }} /></section>
    <p style={{ margin: "12px 0" }} role="status">전체 {count}개 · 지도 범위 {visible}개{selected !== undefined ? ` · 선택: 테스트 맛집 ${selected + 1}` : ""}</p>
    <a href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`}>비서앱으로 돌아가기</a>
  </main>;
}
