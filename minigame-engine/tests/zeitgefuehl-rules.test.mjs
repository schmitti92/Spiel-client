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

test('timeout stops all remaining players at exactly 30000ms and scores normally', () => {
  const runner = createGameRunner(zeitgefuehlGame, { players, seed: 5 });
  const initial = runner.startGame();
  runner.dispatchAction({ type: 'stop', playerId: 'a' }, { at: 11000 });
  assert.equal(runner.dispatchAction({ type: 'timeout', playerId: 'a' }, { at: 32999 }).accepted, false);
  const done = runner.dispatchAction({ type: 'timeout', playerId: 'a' }, { at: 33000 });
  assert.equal(done.accepted, true);
  assert.equal(done.state.status, 'finished');
  assert.equal(done.state.gameData.stopped.b, 30000);
  assert.equal(done.state.gameData.stopped.a, 8000);
  const b = done.state.result.results.find(p => p.playerId === 'b');
  assert.equal(b.deviationMs, Math.abs(30000 - initial.gameData.targetMs));
});
test('timeout applies to bot and human participants identically', () => {
  const roster = [{ id: 'h', type: 'human' }, { id: 'bot', type: 'bot' }];
  const runner = createGameRunner(zeitgefuehlGame, { players: roster });
  runner.startGame();
  const done = runner.dispatchAction({ type: 'timeout', playerId: 'h' }, { at: 33000 });
  assert.equal(done.accepted, true);
  assert.deepEqual(done.state.gameData.stopped, { h: 30000, bot: 30000 });
});

test('shared engine clock triggers timeout automatically when advanced', () => {
  const runner = createGameRunner(zeitgefuehlGame, { players });
  runner.startGame();
  assert.equal(runner.advanceTime(32999).status, 'playing');
  const done = runner.advanceTime(33000);
  assert.equal(done.status, 'finished');
  assert.deepEqual(done.gameData.stopped, { a: 30000, b: 30000 });
});
test('shared clock does not overwrite a prior stop', () => {
  const runner = createGameRunner(zeitgefuehlGame, { players });
  runner.startGame();
  runner.dispatchAction({ type: 'stop', playerId: 'a' }, { at: 12000 });
  const done = runner.advanceTime(33000);
  assert.equal(done.gameData.stopped.a, 9000);
  assert.equal(done.gameData.stopped.b, 30000);
});

test('bots stop through the same action mechanism as humans', () => {
  const roster = [{ id: 'h', type: 'human' }, { id: 'b', type: 'bot' }];
  const runner = createGameRunner(zeitgefuehlGame, { players: roster, seed: 11 });
  const started = runner.startGame();
  const stopAt = started.gameData.botStopAt.b;
  assert.ok(stopAt >= started.gameData.startedAt + 3200);
  assert.equal(runner.getBotAction('b', stopAt - 1), null);
  const action = runner.getBotAction('b', stopAt);
  assert.deepEqual(action, { type: 'stop', playerId: 'b' });
  assert.equal(runner.dispatchAction(action, { at: stopAt }).accepted, true);
  assert.equal(runner.getBotAction('b', stopAt), null);
});
test('bot stop schedule is deterministic and reset on restart', () => {
  const roster = [{ id: 'b', type: 'bot' }];
  const a = createGameRunner(zeitgefuehlGame, { players: roster, seed: 9 });
  const b = createGameRunner(zeitgefuehlGame, { players: roster, seed: 9 });
  assert.deepEqual(a.startGame().gameData, b.startGame().gameData);
  assert.deepEqual(a.restartGame().gameData, b.restartGame().gameData);
});
