import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameRunner } from '../core/game-runner.mjs';
import { zeitgefuehlGame } from '../games/zeitgefuehl.mjs';
const players = [{ id: 'a', type: 'human' }, { id: 'b', type: 'human' }];
test('Zeitgefühl initial target is between 10 and 20 seconds', () => {
  for (let seed = 0; seed < 200; seed++) {
    const runner = createGameRunner(zeitgefuehlGame, { players, seed });
    const s = runner.startGame().gameData;
    assert.ok(Number.isInteger(s.targetSeconds) && s.targetSeconds >= 10 && s.targetSeconds <= 20);
    assert.equal(s.startedAt, 3000);
  }
});
test('cannot stop during countdown, stop twice, or after finish', () => {
  const runner = createGameRunner(zeitgefuehlGame, { players, seed: 4 });
  runner.startGame();
  assert.equal(runner.dispatchAction({ type: 'stop', playerId: 'a' }, { at: 2999 }).accepted, false);
  assert.equal(runner.dispatchAction({ type: 'stop', playerId: 'a' }, { at: 13000 }).accepted, true);
  assert.equal(runner.dispatchAction({ type: 'stop', playerId: 'a' }, { at: 13000 }).accepted, false);
  assert.equal(runner.dispatchAction({ type: 'stop', playerId: 'b' }, { at: 14000 }).accepted, true);
  assert.equal(runner.getState().status, 'finished');
  assert.equal(runner.dispatchAction({ type: 'stop', playerId: 'a' }, { at: 15000 }).accepted, false);
});
test('Zeitgefühl restarts entire round and draws next seeded target', () => {
  const runner = createGameRunner(zeitgefuehlGame, { players, seed: 3 });
  const first = runner.startGame();
  runner.dispatchAction({ type: 'stop', playerId: 'a' }, { at: 10000 });
  const next = runner.restartGame(0);
  assert.deepEqual(next.gameData.stopped, {});
  assert.deepEqual(next.players, first.players);
  assert.equal(next.epoch, first.epoch + 1);
});

test('deviations under 5ms tie, exactly 5ms do not', () => {
  const state = { targetSeconds: 10, targetMs: 10000, stopped: { a: 10100, b: 10103, c: 10105, d: 10250 }, finished: true };
  const result = zeitgefuehlGame.getResult(state);
  assert.deepEqual(result.results.map(x => x.rank), [1, 1, 3, 4]);
});
test('tied groups compare with group best rather than chaining close gaps', () => {
  const state = { targetSeconds: 10, targetMs: 10000, stopped: { a: 10100, b: 10104, c: 10108 }, finished: true };
  const result = zeitgefuehlGame.getResult(state);
  assert.deepEqual(result.results.map(x => x.rank), [1, 1, 3]);
});
