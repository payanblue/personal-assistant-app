import { NextResponse } from 'next/server';
import { verifiedRestaurant, regionMatches, restaurantNameMatches, addressRegionPath, candidateAddressScore, type RestaurantCandidate } from '../../../lib/restaurant-identification';

const attribution = '클라리오 플레이스 · 지방행정 인허가 공공데이터';
const food = new Set(['restaurant', 'chinese', 'meat', 'bunsik', 'western', 'japanese', 'fish', 'cafe', 'bakery', 'chicken', 'food', 'bar', 'bbq']);
type Place = { name?: string; road_address?: string; lot_address?: string; lat?: number; lng?: number; path?: string; category_slug?: string; source_category?: string; geo_confidence?: number; status?: string; region_code?: string };
export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: unknown; address?: unknown };
    if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.length > 80 || (body.address !== undefined && typeof body.address !== 'string'))
      return NextResponse.json({ error: 'invalid-query' }, { status: 400 });
    const name = body.name.trim(), address = typeof body.address === 'string' ? body.address.slice(0, 180) : '';
    const headers = { 'User-Agent': 'personal-assistant-app/3.0 (+https://github.com/payanblue/personal-assistant-app)', Accept: 'application/json' };
    // All additional lookups share a bounded request deadline; retain name results on failure.
    const signal = AbortSignal.timeout(20000);
    const search = async (region?: string, scope = 'nation') => {
      const url = new URL('https://place.clariosync.com/api/town/places/search');
      url.searchParams.set('q', name); url.searchParams.set('scope', scope);
      if (region) url.searchParams.set('region', region);
      const response = await fetch(url, { next: { revalidate: 86400 }, signal, headers });
      if (!response.ok) throw new Error('provider-unavailable');
      const payload = await response.json() as { data?: { items?: Place[] } };
      if (!Array.isArray(payload.data?.items)) throw new Error('provider-format-changed');
      return payload.data.items;
    };
    let items = await search();
    let addressSearched = false;
    let addressSearchFailed = false;
    const path = addressRegionPath(address);
    if (path) {
      try {
        let region: { code?: string; level?: string } | undefined;
        const paths = path.split('/').length === 3 ? [path, path.split('/').slice(0, 2).join('/')] : [path];
        for (const regionPath of paths) {
          const url = new URL('https://place.clariosync.com/api/town/regions/by-path');
          url.searchParams.set('path', regionPath);
          const response = await fetch(url, { next: { revalidate: 86400 }, signal, headers });
          const data = response.ok ? await response.json() as { data?: { region?: { code?: string; level?: string } } } : null;
          region = data?.data?.region;
          if (region?.code) break;
        }
        // If the dong is not available, a matching district from name results can still narrow the search.
        const code = region?.code ?? items.find((item) => item.region_code && regionMatches(address, item.road_address || item.lot_address || ''))?.region_code;
        if (code && /^\d{10}$/.test(code)) {
          const extra = await search(code, region?.level === 'dong' ? 'dong' : 'sigungu');
          items = [...new Map([...items, ...extra].map((item) => [item.path, item])).values()];
          addressSearched = true;
        } else addressSearchFailed = true;
      } catch { addressSearchFailed = true; }
    }
    const candidates: RestaurantCandidate[] = items.filter((item) =>
      item.name && /^\/p\/\d+\//.test(item.path ?? '') && food.has(item.category_slug ?? '') && typeof item.lat === 'number' && typeof item.lng === 'number' &&
      Number.isFinite(item.lat) && Number.isFinite(item.lng) && Math.abs(item.lat) <= 90 && Math.abs(item.lng) <= 180 &&
      (item.geo_confidence === 1 || item.geo_confidence === 2) && (item.road_address || item.lot_address),
    ).map((item) => ({
      name: item.name!, address: item.road_address || item.lot_address!, lotAddress: item.lot_address, latitude: item.lat!, longitude: item.lng!,
      category: item.source_category ?? '', sourceUrl: `https://place.clariosync.com/p/${item.path?.split('/')[2] ?? ''}/${encodeURIComponent(item.name!)}`,
      sourceAttribution: attribution, originalCoordinates: item.geo_confidence === 2, open: item.status === 'open',
    }));
    candidates.sort((a, b) => Number(restaurantNameMatches(name, b.name)) - Number(restaurantNameMatches(name, a.name)) ||
      candidateAddressScore(address, b) - candidateAddressScore(address, a));
    const verified = verifiedRestaurant(name, address, candidates);
    const addressMatches = candidates.filter((item) => item.open && restaurantNameMatches(name, item.name) && candidateAddressScore(address, item) > 0);
    return NextResponse.json({ verified, candidates: addressMatches.length ? addressMatches : candidates, attribution, addressSearched, addressSearchFailed });
  } catch {
    return NextResponse.json({ error: 'provider-unavailable' }, { status: 502 });
  }
}
