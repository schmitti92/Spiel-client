import { normalizeComicSnapshot, layoutForComicSeats } from './skyjo_comic_adapter.mjs';

function assert(condition, message) { if (!condition) throw new Error(message); }
function equal(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message + ': ' + JSON.stringify(actual));
}
function expectThrow(fn, message) {
  let threw = false;
  try { fn(); } catch (_) { threw = true; }
  assert(threw, message);
}

export function runComicAdapterTests() {
  let checks = 0;
  for (const count of [3, 4, 5]) {
    for (let self = 0; self < count; self++) {
      const layout = layoutForComicSeats(count, self);
      const expectedPositions = {
        3: ['enemy-left-top', 'enemy-right-top'],
        4: ['enemy-left-top', 'enemy-right-top', 'enemy-right-bottom'],
        5: ['enemy-left-top', 'enemy-right-top', 'enemy-left-bottom', 'enemy-right-bottom']
      }[count];
      equal(layout.opponents.map(p => p.position), expectedPositions, 'Position order');
      equal(layout.opponents.map(p => p.index),
        Array.from({ length: count - 1 }, (_, i) => (self + i + 1) % count),
        'Rotating opponent indices');
      assert(!layout.opponents.some(p => p.index === self), 'Own board must not be an opponent');
      checks += 3;
    }
    const players = Array.from({ length: count }, (_, i) => ({ id: 'seat-' + i, name: 'Player ' + i }));
    const snapshot = normalizeComicSnapshot({
      kind: 'skyjo-room-v2', version: 2,
      lobby: { players, status: 'playing', settings: {} },
      game: { players: players.map(p => ({ id: p.id })), phase: 'playing' }
    });
    assert(snapshot.players.length === count && snapshot.phase === 'playing', 'Valid snapshot');
    checks++;
  }
  expectThrow(() => layoutForComicSeats(2, 0), '2-player layout rejected');
  expectThrow(() => layoutForComicSeats(6, 0), '6-player layout rejected');
  expectThrow(() => layoutForComicSeats(3, 3), 'Invalid self index rejected');
  expectThrow(() => normalizeComicSnapshot({ kind: 'wrong', version: 2 }), 'Wrong schema rejected');
  expectThrow(() => normalizeComicSnapshot({
    kind: 'skyjo-room-v2', version: 2,
    lobby: { players: [{ id: '1' }, { id: '2' }, { id: '3' }] },
    game: { players: [] }
  }), 'Player mismatch rejected');
  checks += 5;
  return { ok: true, checks };
}

if (typeof document !== 'undefined') {
  const target = document.getElementById('test-results');
  if (target) {
    try { const result = runComicAdapterTests(); target.textContent = 'PASS: ' + result.checks + ' adapter checks'; }
    catch (error) { target.textContent = 'FAIL: ' + error.message; target.style.color = '#f44'; }
  }
}
