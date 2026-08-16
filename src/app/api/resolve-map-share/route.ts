import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const allowedRedirectHosts = new Set(["naver.me", "map.naver.com"]);

function decodeEmbeddedJsonString(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replaceAll("\\u002F", "/");
  }
}

async function resolveNaverPlaceId(sharedUrl: URL) {
  let current = sharedUrl;
  for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
    if (!allowedRedirectHosts.has(current.hostname)) return null;
    const directId = current.searchParams.get("pinId") ??
      current.pathname.match(/\/entry\/place\/(\d+)/)?.[1];
    if (directId) return directId;
    const response = await fetch(current, {
      redirect: "manual",
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 Chrome/151 Mobile Safari/537.36" },
    });
    const location = response.headers.get("location");
    if (!location) return null;
    current = new URL(location, current);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown };
    if (typeof body.url !== "string")
      return NextResponse.json({ error: "invalid-url" }, { status: 400 });
    const sharedUrl = new URL(body.url);
    if (!allowedRedirectHosts.has(sharedUrl.hostname) || sharedUrl.protocol !== "https:")
      return NextResponse.json({ error: "unsupported-map" }, { status: 400 });

    const placeId = await resolveNaverPlaceId(sharedUrl);
    if (!placeId) return NextResponse.json({ error: "place-not-found" }, { status: 404 });

    const response = await fetch(`https://pcmap.place.naver.com/place/${placeId}`, {
      cache: "no-store",
      headers: {
        Accept: "text/html",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "User-Agent": "Mozilla/5.0 Chrome/151 Mobile Safari/537.36",
      },
    });
    if (!response.ok) return NextResponse.json({ error: "place-request-failed" }, { status: 502 });
    const html = await response.text();
    const markerIndex = html.indexOf(`"PlaceDetailBase:${placeId}"`);
    if (markerIndex < 0) return NextResponse.json({ error: "place-data-missing" }, { status: 404 });
    const placeData = html.slice(markerIndex, markerIndex + 20000);
    const name = placeData.match(/"name":"((?:\\.|[^"\\])*)"/)?.[1] ?? "";
    const roadAddress = placeData.match(/"roadAddress":"((?:\\.|[^"\\])*)"/)?.[1] ?? "";
    const address = placeData.match(/"address":"((?:\\.|[^"\\])*)"/)?.[1] ?? "";
    const coordinate = placeData.match(/"coordinate":\{"__typename":"Coordinate","x":"([0-9.]+)","y":"([0-9.]+)"/);
    if (!name) return NextResponse.json({ error: "place-name-missing" }, { status: 404 });

    return NextResponse.json({
      placeId,
      name: decodeEmbeddedJsonString(name),
      address: decodeEmbeddedJsonString(roadAddress || address),
      longitude: coordinate ? Number(coordinate[1]) : null,
      latitude: coordinate ? Number(coordinate[2]) : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "resolve-failed" }, { status: 500 });
  }
}
