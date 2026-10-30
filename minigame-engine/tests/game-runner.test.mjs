import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameRunner, assertGameContract } from '../core/game-runner.mjs';
const game = {
  id: 'contract-fixture',
  createInitialState: ({ players }) => ({ points: Object.fromEntries(players.map(p => [p.id, 0])) }),
  validateAction: (s, a, c) => c.players.some(p => p.id === a?.playerId) && a?.type === 'score' && s.points[a.playerId] === 0,
  applyAction: (s, a) => ({ ...s, points: { ...s.points, [a.playerId]: 1 } }),
  getBotAction: (s, c) => ({ type: 'score', playerId: c.playerId }),
  isFinished: s => Object.values(s.points).every(x => x === 1),
  getResult: s => ({ points: s.points })
};
test('game contract requires all six methods', () => {
  assert.throws(() => assertGameContract({ id: 'bad' }), /Missing game contract/);
});
for (let count = 1; count <= 4; count++) {
  test('supports ' + count + ' mixed players', () => {
    const players = Array.from({ length: count }, (_, i) => ({ id: String(i + 1), type: i % 2 ? 'bot' : 'human' }));
    const runner = createGameRunner(game, { players });
    assert.equal(runner.startGame().status, 'playing');
    for (const p of players) {
      const action = p.type === 'bot' ? runner.getBotAction(p.id) : { type: 'score', playerId: p.id };
      assert.equal(runner.dispatchAction(action).accepted, true);
    }
    assert.equal(runner.getState().status, 'finished');
    assert.equal(Object.keys(runner.getState().result.points).length, count);
    assert.equal(runner.restartGame().status, 'playing');
  });
}
test('invalid and stale actions do not change revision', () => {
  const runner = createGameRunner(game, { players: [{ id: 'a', type: 'human' }] });
  const first = runner.startGame();
  assert.equal(runner.dispatchAction({ type: 'bad', playerId: 'a' }).accepted, false);
  assert.equal(runner.getState().revision, first.revision);
  assert.equal(runner.dispatchAction({ type: 'score', playerId: 'a' }, { expectedRevision: 0 }).reason, 'stale-revision');
  assert.equal(runner.dispatchAction({ type: 'score', playerId: 'a' }).accepted, true);
  assert.equal(runner.dispatchAction({ type: 'score', playerId: 'a' }).reason, 'not-playing');
});
test('snapshots cannot mutate internal state', () => {
  const runner = createGameRunner(game, { players: [{ id: 'a', type: 'human' }] });
  const snapshot = runner.startGame(); snapshot.gameData.points.a = 99;
  assert.equal(runner.getState().gameData.points.a, 0);
});
test('rejects duplicate players and invalid sizes', () => {
  assert.throws(() => createGameRunner(game, { players: [] }), /1–4/);
  assert.throws(() => createGameRunner(game, { players: Array(5).fill({ type: 'bot' }) }), /1–4/);
  assert.throws(() => createGameRunner(game, { players: [{ id: 'x', type: 'bot' }, { id: 'x', type: 'bot' }] }), /Duplicate/);
});
