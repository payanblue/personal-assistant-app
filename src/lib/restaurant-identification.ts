export type RestaurantCandidate = {
  name: string; address: string; lotAddress?: string; latitude: number; longitude: number;
  category: string; sourceUrl: string; sourceAttribution: string;
  originalCoordinates: boolean; open: boolean;
};
export const normalizeIdentity = (value: string) => value.normalize('NFKC').replace(/[^가-힣a-z0-9]/gi, '').toLowerCase();
const provinces: Record<string, string> = {
  서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시', 광주: '광주광역시', 대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시',
  경기: '경기도', 강원: '강원특별자치도', 충북: '충청북도', 충남: '충청남도', 전북: '전북특별자치도', 전남: '전라남도', 경북: '경상북도', 경남: '경상남도', 제주: '제주특별자치도',
};
export function addressRegionPath(address: string) {
  const match = address.match(/서울(?:특별시)?|부산(?:광역시)?|대구(?:광역시)?|인천(?:광역시)?|광주(?:광역시)?|대전(?:광역시)?|울산(?:광역시)?|세종(?:특별자치시)?|경기(?:도)?|강원(?:특별자치도|도)?|충청북도|충청남도|전북(?:특별자치도)?|전라북도|전라남도|경상북도|경상남도|제주(?:특별자치도|도)?|충북|충남|전남|경북|경남/);
  if (!match) return null;
  const aliases: Record<string, string> = { 충청북도: '충북', 충청남도: '충남', 전라북도: '전북', 전라남도: '전남', 경상북도: '경북', 경상남도: '경남' };
  const province = provinces[aliases[match[0]] ?? match[0].slice(0, 2)];
  const start = match.index ?? 0;
  // 부산진구 includes the province name within the district; do not shorten it to 진구.
  const rest = address.slice(start).startsWith('부산진구') ? address.slice(start).trim() : address.slice(start + match[0].length).trim();
  const districts = rest.match(/^[가-힣]+(?:시|군|구)(?:\s+[가-힣]+구)?(?=\s|$)/)?.[0];
  if (!districts) return province === provinces.세종 ? province : null;
  const dong = rest.slice(districts.length).match(/(?:^|\s)([가-힣]+(?:동|읍|면))(?=\s|\d|$)/)?.[1];
  return [province, districts, dong].filter(Boolean).join('/');
}
export function candidateAddressScore(address: string, item: RestaurantCandidate) {
  if (!address.trim() || !regionMatches(address, item.address)) return 0;
  const road = roadIdentity(address);
  const lot = normalizeIdentity(address.match(/[가-힣]+(?:동|읍|면|리)\s*\d+(?:-\d+)?/)?.[0] ?? '');
  const exact = (road && roadIdentity(item.address) === road) || (lot && normalizeIdentity(item.lotAddress?.match(/[가-힣]+(?:동|읍|면|리)\s*\d+(?:-\d+)?/)?.[0] ?? '') === lot);
  return exact ? 3 : addressRegionPath(address) ? 1 : 0;
}
export function roadIdentity(value: string) {
  return normalizeIdentity(value.replace(/([로길])\s+(?=\d+번길)/g, '$1').match(/[가-힣0-9·]+(?:로|길)\s*\d+(?:-\d+)?/)?.[0] ?? '');
}
export function restaurantNameMatches(a: string, b: string) {
  const clean = (value: string) => value.replace(/\s+[가-힣]+(?:본점|직영점|점)$/, '').replace(/수제(?=버거)/g, '');
  a = normalizeIdentity(clean(a)); b = normalizeIdentity(clean(b));
  if (a === b && a.length >= 2) return true;
  if (Math.min(a.length, b.length) < 5) return false;
  // A single OCR character error may be corrected only with an exact address below.
  if (Math.min(a.length, b.length) >= 6 && (a.slice(0, 5) === b.slice(0, 5) || Math.min(a.length, b.length) >= 8)) {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return matrix[a.length][b.length] <= 2;
  }
  if (a.length === b.length) return [...a].filter((char, i) => char !== b[i]).length <= 1;
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  if (long.length - short.length === 1)
    return [...long].some((_, i) => long.slice(0, i) + long.slice(i + 1) === short);
  return false;
}
export function regionMatches(address: string, actual: string) {
  const requestedProvince = addressRegionPath(address)?.split('/')[0];
  const actualProvince = addressRegionPath(actual)?.split('/')[0];
  if (requestedProvince && requestedProvince !== actualProvince) return false;
  const region = address.match(/서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주/)?.[0];
  if (!requestedProvince && region && actualProvince !== provinces[region]) return false;
  const district = addressRegionPath(address)?.split('/')[1]?.split(/\s+/) ??
    address.match(/[가-힣]+(?:시|군|구)(?=\s|$)/g)?.filter((word) => !/광역시|특별시|특별자치시/.test(word)) ?? [];
  const actualDistrict = addressRegionPath(actual)?.split('/')[1]?.split(/\s+/) ?? [];
  return district.every((word) => actualDistrict.includes(word));
}
export function verifiedRestaurant(name: string, address: string, candidates: RestaurantCandidate[]) {
  const road = roadIdentity(address);
  const lot = normalizeIdentity(address.match(/[가-힣]+(?:동|읍|면|리)\s*\d+(?:-\d+)?/)?.[0] ?? '');
  if (!road && !lot) return null;
  const matches = candidates.filter((item) => item.open && item.originalCoordinates &&
    restaurantNameMatches(name, item.name) && ((road && roadIdentity(item.address) === road) || (lot && normalizeIdentity(item.lotAddress?.match(/[가-힣]+(?:동|읍|면|리)\s*\d+(?:-\d+)?/)?.[0] ?? '') === lot)) && regionMatches(address, item.address));
  // Multiple businesses/branches with matching text require user review.
  return matches.length === 1 ? matches[0] : null;
}
