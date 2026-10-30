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

test('rejects actions with missing or unknown player id without changing state', () => {
  const runner = createGameRunner(game, { players: [{ id: 'a', type: 'human' }] });
  const initial = runner.startGame();
  for (const action of [null, {}, { type: 'score' }, { type: 'score', playerId: 'outsider' }]) {
    const result = runner.dispatchAction(action);
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'unknown-player');
    assert.equal(runner.getState().revision, initial.revision);
  }
});

test('runner rejects backwards time after an accepted action', () => {
  const runner = createGameRunner(game, { players: [{ id: 'a', type: 'human' }, { id: 'b', type: 'human' }] });
  runner.startGame(1000);
  assert.equal(runner.dispatchAction({ type: 'score', playerId: 'a' }, { at: 2000 }).accepted, true);
  assert.throws(() => runner.dispatchAction({ type: 'score', playerId: 'b' }, { at: 1500 }), /backwards/);
  assert.equal(runner.getState().gameData.points.b, 0);
});
test('restart begins new time epoch but keeps revision increasing', () => {
  const runner = createGameRunner(game, { players: [{ id: 'a', type: 'human' }] });
  const before = runner.startGame(10000);
  const after = runner.restartGame(0);
  assert.ok(after.revision > before.revision);
  assert.equal(after.gameData.points.a, 0);
});

test('one human stays alone: no bots are added automatically', () => {
  const runner = createGameRunner(game, { players: [{ id: 'solo', type: 'human' }] });
  const state = runner.startGame();
  assert.equal(state.players.length, 1);
  assert.deepEqual(state.players.map(p => p.type), ['human']);
});
test('configured player and bot counts are preserved exactly', () => {
  for (const [humans, bots] of [[1, 0], [1, 1], [1, 3], [2, 2], [4, 0], [0, 4]]) {
    const players = [
      ...Array.from({ length: humans }, (_, i) => ({ id: 'h' + i, type: 'human' })),
      ...Array.from({ length: bots }, (_, i) => ({ id: 'b' + i, type: 'bot' }))
    ];
    const state = createGameRunner(game, { players }).startGame();
    assert.equal(state.players.length, humans + bots);
    assert.equal(state.players.filter(p => p.type === 'bot').length, bots);
  }
});

test('failed restart preserves running game and its revision', () => {
  let fail = false;
  const fragile = { ...game, createInitialState: ctx => {
    if (fail) throw new Error('start failed');
    return game.createInitialState(ctx);
  } };
  const runner = createGameRunner(fragile, { players: [{ id: 'a', type: 'human' }, { id: 'b', type: 'bot' }] });
  runner.startGame(100);
  runner.dispatchAction({ type: 'score', playerId: 'a' }, { at: 200 });
  const before = runner.getState();
  fail = true;
  assert.throws(() => runner.restartGame(0), /start failed/);
  assert.deepEqual(runner.getState(), before);
});
test('restarting four participants resets all scores and advances round epoch', () => {
  const players = [{ id: 'h1', type: 'human' }, { id: 'h2', type: 'human' }, { id: 'b1', type: 'bot' }, { id: 'b2', type: 'bot' }];
  const runner = createGameRunner(game, { players });
  const first = runner.startGame();
  for (const p of players) assert.equal(runner.dispatchAction({ type: 'score', playerId: p.id }).accepted, true);
  assert.equal(runner.getState().status, 'finished');
  const restarted = runner.restartGame();
  assert.equal(restarted.status, 'playing');
  assert.equal(restarted.epoch, first.epoch + 1);
  assert.deepEqual(restarted.players.map(p => p.id), players.map(p => p.id));
  assert.deepEqual(Object.values(restarted.gameData.points), [0, 0, 0, 0]);
});
test('getResult cannot mutate runner state', () => {
  const impure = { ...game, getResult: state => {
    state.points.a = 999;
    return { points: state.points };
  } };
  const runner = createGameRunner(impure, { players: [{ id: 'a', type: 'human' }] });
  runner.startGame();
  runner.dispatchAction({ type: 'score', playerId: 'a' });
  assert.equal(runner.getState().result.points.a, 999);
  assert.equal(runner.getState().gameData.points.a, 1);
});

test('omitted action time follows last accepted logical time', () => {
  const runner = createGameRunner(game, { players: [{ id: 'a', type: 'human' }, { id: 'b', type: 'human' }] });
  runner.startGame(100);
  assert.equal(runner.dispatchAction({ type: 'score', playerId: 'a' }, { at: 200 }).accepted, true);
  assert.equal(runner.dispatchAction({ type: 'score', playerId: 'b' }).accepted, true);
});
test('failed isFinished leaves state, revision and random unchanged', () => {
  let fail = false;
  const fragile = { ...game, applyAction: (state, action, ctx) => {
    ctx.random();
    return game.applyAction(state, action, ctx);
  }, isFinished: state => {
    if (fail && Object.values(state.points).some(x => x === 1)) throw new Error('finish failed');
    return game.isFinished(state);
  } };
  const runner = createGameRunner(fragile, { players: [{ id: 'a', type: 'human' }] });
  const before = runner.startGame();
  fail = true;
  assert.throws(() => runner.dispatchAction({ type: 'score', playerId: 'a' }), /finish failed/);
  assert.deepEqual(runner.getState(), before);
});
test('failed getResult leaves state unchanged', () => {
  const fragile = { ...game, getResult: () => { throw new Error('result failed'); } };
  const runner = createGameRunner(fragile, { players: [{ id: 'a', type: 'human' }] });
  const before = runner.startGame();
  assert.throws(() => runner.dispatchAction({ type: 'score', playerId: 'a' }), /result failed/);
  assert.deepEqual(runner.getState(), before);
});
