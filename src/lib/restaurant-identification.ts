export type RestaurantCandidate = {
  name: string; address: string; lotAddress?: string; latitude: number; longitude: number;
  category: string; sourceUrl: string; sourceAttribution: string;
  originalCoordinates: boolean; open: boolean;
};
export const normalizeIdentity = (value: string) => value.normalize('NFKC').replace(/[^가-힣a-z0-9]/gi, '').toLowerCase();
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
  const region = address.match(/서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주/)?.[0];
  if (region && !actual.includes(region)) return false;
  const district = address.match(/[가-힣]+(?:시|군|구)(?=\s)/g)?.filter((word) => !/광역시|특별시/.test(word)) ?? [];
  return district.every((word) => actual.includes(word));
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
