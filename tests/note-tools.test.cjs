const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('fs');
const vm = require('vm');
function load(path) {
  const exports = {};
  vm.runInNewContext(ts.transpile(fs.readFileSync(path, 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }), { exports });
  return exports;
}
const { rememberRevision, noteActions } = load('src/lib/note-tools.ts');
const { addressRegionPath, regionMatches } = load('src/lib/restaurant-identification.ts');
test('legacy records keep dates, position metadata and states when editing or restoring', () => {
  const original = { id: 7, title: '방문처 A', content: '이전 내용', createdAt: '방금 전', completed: true, deleted: false, pinned: true, todayDate: '2026-10-15' };
  const changed = rememberRevision(original, { title: '방문처 B', content: '수정 내용' });
  assert.equal(original.revisions, undefined);
  assert.equal(changed.revisions[0].content, '이전 내용');
  assert.equal(changed.revisions[0].title, '방문처 A');
  const restored = rememberRevision(changed, { title: changed.revisions[0].title, content: changed.revisions[0].content });
  assert.equal(restored.revisions[0].title, '방문처 B');
  for (const key of ['id', 'createdAt', 'completed', 'deleted', 'pinned', 'todayDate']) assert.equal(restored[key], original[key]);
});
test('unchanged saves do not create history and revisions stop at ten', () => {
  let note = { title: '0', details: '업무 내용', project: '생활', archived: true };
  assert.equal(rememberRevision(note, { title: '0' }).revisions, undefined);
  for (let i = 1; i <= 15; i++) note = rememberRevision(note, { title: String(i) });
  assert.equal(note.revisions.length, 10);
  assert.equal(note.revisions[0].title, '14');
  assert.equal(note.revisions[9].title, '5');
  assert.equal(note.project, '생활'); assert.equal(note.archived, true);
  const roundTrip = JSON.parse(JSON.stringify(note)); assert.equal(roundTrip.revisions.length, 10);
});
test('actions support titles, road addresses and http links without executing arbitrary schemes', () => {
  const actions = noteActions('방문처 010-1234-5678\n울산 중구 테스트로 12-3\nhttps://example.com/info).\njavascript:alert(1)\nHS11012345678');
  assert.equal(actions.phones.length, 1); assert.equal(actions.phones[0], '010-1234-5678');
  assert.equal(actions.addresses[0], '울산 중구 테스트로 12-3');
  assert.equal(actions.urls.length, 1); assert.equal(actions.urls[0], 'https://example.com/info');
});
test('province-only and incomplete regional searches strictly exclude other provinces', () => {
  assert.equal(addressRegionPath('부산'), '부산광역시');
  assert.equal(addressRegionPath('부산진구 업황로 49'), '부산광역시/부산진구');
  assert.equal(regionMatches('부산', '부산광역시 부산진구 테스트로 49'), true);
  assert.equal(regionMatches('부산', '서울특별시 강남구 부산로 49'), false);
  assert.equal(regionMatches('부산 부산진구', '부산광역시 남구 테스트로 49'), false);
  assert.equal(regionMatches('제주', '제주특별자치도 제주시 구좌읍 구좌해안로 64'), true);
});
test('identify API enforces saved region on both initial and name-only retry', async () => {
  const exports = {};
  const regional = load('src/lib/restaurant-identification.ts');
  const calls = [];
  const makePlace = (id, address) => ({ name: '테스트식당', road_address: address, lat: 35.1, lng: 129.1, path: `/p/${id}/test`, category_slug: 'restaurant', geo_confidence: 2, status: 'open' });
  const fetch = async (url) => {
    calls.push(String(url));
    return { ok: true, json: async () => String(url).includes('/regions/') ? { data: { region: { code: '2600000000', level: 'sido' } } } : { data: { items: [makePlace(1, '부산광역시 부산진구 테스트로 49'), makePlace(2, '서울특별시 강남구 테스트로 49')] } } };
  };
  vm.runInNewContext(ts.transpile(fs.readFileSync('src/app/api/restaurant-identify/route.ts', 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }), {
    exports, URL, AbortSignal, fetch,
    require: (name) => name === 'next/server' ? { NextResponse: { json: (data, init) => ({ data, status: init?.status ?? 200 }) } } : regional,
  });
  for (const nameOnly of [false, true]) {
    const result = await exports.POST({ json: async () => ({ name: '테스트식당', address: '테스트로 49', region: '부산', nameOnly }) });
    assert.equal(result.status, 200); assert.equal(result.data.candidates.length, 1);
    assert.match(result.data.candidates[0].address, /^부산/);
    assert.equal(Boolean(result.data.verified), !nameOnly);
  }
  assert(calls.some((url) => url.includes('regions/by-path')));
  const conflict = await exports.POST({ json: async () => ({ name: '테스트식당', address: '서울 강남구 테스트로 49', region: '부산' }) });
  assert.equal(conflict.data.candidates.length, 0); assert.equal(conflict.data.verified, null);
  const invalid = await exports.POST({ json: async () => ({ name: '테스트식당', region: '잘못된지역' }) });
  assert.equal(invalid.status, 400);
});
