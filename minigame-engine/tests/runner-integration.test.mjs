import test from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../core/clock.mjs';
import { createRandom } from '../core/random.mjs';
import { createGameRunner } from '../core/game-runner.mjs';
import { createBotManager } from '../core/bot-manager.mjs';

const game = {
  id: 'integration-fixture',
  createInitialState: ({ players, seed, now }) => ({
    startedAt: now,
    seed,
    pending: players.map(p => p.id),
    actions: []
  }),
  validateAction: (state, action, { now }) =>
    action?.type === 'finish' && state.pending.includes(action.playerId) && now >= state.startedAt,
  applyAction: (state, action, { now }) => ({
    ...state,
    pending: state.pending.filter(id => id !== action.playerId),
    actions: [...state.actions, { playerId: action.playerId, at: now }]
  }),
  getBotAction: (state, { playerId, now }) =>
    state.pending.includes(playerId) && now >= state.startedAt + 1000
      ? { type: 'finish', playerId } : null,
  isFinished: state => state.pending.length === 0,
  getResult: state => ({ actions: state.actions })
};

test('clock, runner and bots work together without timers or network', () => {
  const clock = createClock(5000);
  const runner = createGameRunner(game, {
    players: [{ id: 'h', type: 'human' }, { id: 'b', type: 'bot' }],
    seed: 17,
    now: clock.now()
  });
  const bots = createBotManager(runner);
  assert.equal(runner.startGame(clock.now()).gameData.seed, 17);
  assert.equal(bots.step('b', { at: clock.now() }).reason, 'no-action');
  clock.advanceBy(1000);
  assert.equal(bots.step('b', { at: clock.now() }).accepted, true);
  assert.equal(runner.dispatchAction({ type: 'finish', playerId: 'h' }, { at: clock.now() }).accepted, true);
  assert.equal(runner.getState().status, 'finished');
  assert.deepEqual(runner.getState().result.actions.map(x => x.playerId), ['b', 'h']);
});

test('seeded random is reproducible across independent instances', () => {
  const a = createRandom(17), b = createRandom(17);
  assert.deepEqual(Array.from({ length: 5 }, () => a.next()), Array.from({ length: 5 }, () => b.next()));
});

test('restart keeps configured roster and seed', () => {
  const runner = createGameRunner(game, { players: [{ id: 'solo', type: 'human' }], seed: 42 });
  const first = runner.startGame(9000);
  const restarted = runner.restartGame(0);
  assert.equal(restarted.gameData.seed, first.gameData.seed);
  assert.deepEqual(restarted.players, first.players);
  assert.ok(restarted.revision > first.revision);
});

test('runner provides deterministic advancing random stream on restart', () => {
  const randomGame = {
    ...game,
    createInitialState: ({ random }) => ({ target: 10 + Math.floor(random() * 11) }),
    isFinished: () => false,
    getResult: state => state
  };
  const make = () => createGameRunner(randomGame, { players: [{ id: 'h', type: 'human' }], seed: 41 });
  const a = make(), b = make();
  const aValues = [a.startGame().gameData.target, ...Array.from({ length: 8 }, () => a.restartGame().gameData.target)];
  const bValues = [b.startGame().gameData.target, ...Array.from({ length: 8 }, () => b.restartGame().gameData.target)];
  assert.deepEqual(aValues, bValues);
  assert.ok(aValues.every(x => x >= 10 && x <= 20));
  assert.ok(new Set(aValues).size > 1);
});
test('failed restart does not consume random values', () => {
  let fail = false;
  const randomGame = {
    ...game,
    createInitialState: ({ random }) => {
      const target = random();
      if (fail) throw new Error('failed');
      return { target };
    },
    isFinished: () => false,
    getResult: state => state
  };
  const a = createGameRunner(randomGame, { players: [{ type: 'human' }], seed: 12 });
  const b = createGameRunner(randomGame, { players: [{ type: 'human' }], seed: 12 });
  a.startGame(); b.startGame();
  fail = true;
  assert.throws(() => a.restartGame(), /failed/);
  fail = false;
  assert.equal(a.restartGame().gameData.target, b.restartGame().gameData.target);
});

test('accepted actions advance random stream, rejected actions do not', () => {
  const actionGame = {
    ...game,
    createInitialState: () => ({ values: [] }),
    validateAction: (state, action, context) => {
      context.random(); // even an impure validator must not commit random on rejection
      return action.type === 'roll';
    },
    applyAction: (state, action, context) => ({ values: [...state.values, context.random()] }),
    getBotAction: (state, context) => { context.random(); return null; },
    isFinished: () => false,
    getResult: state => state
  };
  const make = () => createGameRunner(actionGame, { players: [{ id: 'h', type: 'human' }, { id: 'b', type: 'bot' }], seed: 7 });
  const a = make(), b = make();
  a.startGame(); b.startGame();
  a.getBotAction('b');
  assert.equal(a.dispatchAction({ type: 'skip', playerId: 'h' }).accepted, false);
  const resultA = a.dispatchAction({ type: 'roll', playerId: 'h' });
  const resultB = b.dispatchAction({ type: 'roll', playerId: 'h' });
  assert.deepEqual(resultA.state.gameData.values, resultB.state.gameData.values);
});
