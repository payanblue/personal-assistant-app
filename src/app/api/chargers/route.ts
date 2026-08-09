import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type OverpassElement = {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function socketCount(tags: Record<string, string>, names: string[]) {
  return Object.entries(tags).reduce((total, [key, value]) => {
    if (!names.some((name) => key.toLowerCase().includes(name))) return total;
    const count = Number.parseInt(value, 10);
    return total + (Number.isFinite(count) ? count : value === "yes" ? 1 : 0);
  }, 0);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lng"));
  const radius = Math.min(8000, Math.max(500, Number(searchParams.get("radius")) || 5000));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
    return Response.json({ error: "invalid location" }, { status: 400 });

  const query = `[out:json][timeout:18];(node(around:${radius},${latitude},${longitude})["amenity"="charging_station"];way(around:${radius},${latitude},${longitude})["amenity"="charging_station"];relation(around:${radius},${latitude},${longitude})["amenity"="charging_station"];);out center tags;`;
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "MY-Assistant personal EV finder" },
      body: new URLSearchParams({ data: query }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("overpass unavailable");
    const payload = (await response.json()) as { elements?: OverpassElement[] };
    const chargers = (payload.elements ?? []).flatMap((element) => {
      const tags = element.tags ?? {};
      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;
      if (lat === undefined || lng === undefined) return [];
      const slowCount = socketCount(tags, ["type2", "schuko", "iec62196_t2", "domestic"]);
      const fastCount = socketCount(tags, ["ccs", "chademo", "combo", "tesla"]);
      const address = [tags["addr:city"], tags["addr:district"], tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
      return [{
        id: `${element.type}-${lat}-${lng}`,
        name: tags.name ?? tags.operator ?? "전기차 충전소",
        operator: tags.operator ?? "운영사 정보 없음",
        address: address || tags["addr:full"] || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        latitude: lat,
        longitude: lng,
        slowCount,
        fastCount,
        memberPrice: tags["charging:cost"] ?? tags.charge ?? "요금 확인",
        guestPrice: tags.fee === "no" ? "무료" : "요금 확인",
      }];
    });
    return Response.json({ chargers });
  } catch {
    return Response.json({ chargers: [], error: "nearby search unavailable" }, { status: 502 });
  }
}
