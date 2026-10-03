import { NextResponse } from 'next/server';
import { verifiedRestaurant, regionMatches, roadIdentity, restaurantNameMatches, type RestaurantCandidate } from '../../../lib/restaurant-identification';

const attribution = '클라리오 플레이스 · 지방행정 인허가 공공데이터';
const food = new Set(['restaurant', 'chinese', 'meat', 'bunsik', 'western', 'japanese', 'fish', 'cafe', 'bakery', 'chicken', 'food', 'bar', 'bbq']);
type Place = { name?: string; road_address?: string; lot_address?: string; lat?: number; lng?: number; path?: string; category_slug?: string; source_category?: string; geo_confidence?: number; status?: string };
export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: unknown; address?: unknown };
    if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.length > 80 || (body.address !== undefined && typeof body.address !== 'string'))
      return NextResponse.json({ error: 'invalid-query' }, { status: 400 });
    const name = body.name.trim(), address = typeof body.address === 'string' ? body.address.slice(0, 180) : '';
    const url = new URL('https://place.clariosync.com/api/town/places/search');
    url.searchParams.set('q', name); url.searchParams.set('scope', 'nation');
    const response = await fetch(url, {
      next: { revalidate: 86400 }, signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'personal-assistant-app/3.0 (+https://github.com/payanblue/personal-assistant-app)', Accept: 'application/json' },
    });
    if (!response.ok) return NextResponse.json({ error: 'provider-unavailable' }, { status: 502 });
    const payload = await response.json() as { data?: { items?: Place[] } };
    if (!Array.isArray(payload.data?.items)) return NextResponse.json({ error: 'provider-format-changed' }, { status: 502 });
    const candidates: RestaurantCandidate[] = payload.data.items.filter((item) =>
      item.name && /^\/p\/\d+\//.test(item.path ?? '') && food.has(item.category_slug ?? '') && typeof item.lat === 'number' && typeof item.lng === 'number' &&
      Number.isFinite(item.lat) && Number.isFinite(item.lng) && Math.abs(item.lat) <= 90 && Math.abs(item.lng) <= 180 &&
      (item.geo_confidence === 1 || item.geo_confidence === 2) && (item.road_address || item.lot_address),
    ).map((item) => ({
      name: item.name!, address: item.road_address || item.lot_address!, lotAddress: item.lot_address, latitude: item.lat!, longitude: item.lng!,
      category: item.source_category ?? '', sourceUrl: `https://place.clariosync.com/p/${item.path?.split('/')[2] ?? ''}/${encodeURIComponent(item.name!)}`,
      sourceAttribution: attribution, originalCoordinates: item.geo_confidence === 2, open: item.status === 'open',
    }));
    candidates.sort((a, b) => Number(restaurantNameMatches(name, b.name)) - Number(restaurantNameMatches(name, a.name)) ||
      Number(regionMatches(address, b.address)) - Number(regionMatches(address, a.address)) ||
      Number(Boolean(roadIdentity(address)) && roadIdentity(b.address) === roadIdentity(address)) - Number(Boolean(roadIdentity(address)) && roadIdentity(a.address) === roadIdentity(address)));
    return NextResponse.json({ verified: verifiedRestaurant(name, address, candidates), candidates, attribution });
  } catch {
    return NextResponse.json({ error: 'provider-unavailable' }, { status: 502 });
  }
}
