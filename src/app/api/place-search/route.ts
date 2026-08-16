import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const query = incoming.searchParams.get("q")?.trim() ?? "";
  const latitude = incoming.searchParams.get("lat")?.trim() ?? "";
  const longitude = incoming.searchParams.get("lon")?.trim() ?? "";
  const reverse = Boolean(latitude && longitude);
  if (!reverse && query.length < 2)
    return NextResponse.json({ error: "query-too-short" }, { status: 400 });

  const endpoint = reverse ? "reverse" : "search";
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    "accept-language": "ko",
  });
  if (reverse) {
    params.set("lat", latitude);
    params.set("lon", longitude);
  } else {
    params.set("q", query);
    params.set("countrycodes", "kr");
    params.set("limit", incoming.searchParams.get("limit") === "20" ? "20" : "8");
    const viewbox = incoming.searchParams.get("viewbox")?.trim();
    if (viewbox) params.set("viewbox", viewbox);
    if (incoming.searchParams.get("bounded") === "1") params.set("bounded", "1");
  }

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/${endpoint}?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
      headers: {
        Accept: "application/json",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "User-Agent": "personal-assistant-app/2.0 (private personal map)",
      },
    });
    if (!response.ok)
      return NextResponse.json({ error: "map-provider-failed" }, { status: 502 });
    return NextResponse.json(await response.json(), {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ error: "map-provider-unavailable" }, { status: 502 });
  }
}
