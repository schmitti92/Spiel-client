import test from 'node:test';
import assert from 'node:assert/strict';
import { createRandom } from '../core/random.mjs';
import { createGameRunner } from '../core/game-runner.mjs';
import { createBotManager } from '../core/bot-manager.mjs';
const game = {
  id: 'bot-test',
  createInitialState: ({ players }) => ({ remaining: players.map(p => p.id) }),
  validateAction: (state, action) => action?.type === 'stop' && state.remaining.includes(action.playerId),
  applyAction: (state, action) => ({ remaining: state.remaining.filter(id => id !== action.playerId) }),
  getBotAction: (state, context) => state.remaining.includes(context.playerId) ? { type: 'stop', playerId: context.playerId } : null,
  isFinished: state => state.remaining.length === 0,
  getResult: state => ({ finished: state.remaining.length === 0 })
};
test('same seed produces same random sequence', () => {
  const a = createRandom(123), b = createRandom(123);
  assert.deepEqual(Array.from({ length: 20 }, () => a.next()), Array.from({ length: 20 }, () => b.next()));
});
test('random values are in [0,1) and different seeds diverge', () => {
  const a = createRandom(0), b = createRandom(1);
  const x = Array.from({ length: 100 }, () => a.next());
  assert.ok(x.every(n => n >= 0 && n < 1));
  assert.notDeepEqual(x, Array.from({ length: 100 }, () => b.next()));
});
test('bot action is validated, dispatched once, and cannot repeat after finish', () => {
  const runner = createGameRunner(game, { players: [{ id: 'bot', type: 'bot' }] });
  runner.startGame();
  const bots = createBotManager(runner);
  const revision = runner.getState().revision;
  assert.equal(bots.step('bot', { at: 100, expectedRevision: revision }).accepted, true);
  assert.equal(bots.step('bot', { at: 100, expectedRevision: revision }).accepted, false);
  assert.equal(runner.getState().status, 'finished');
});
test('human players cannot be executed by bot manager', () => {
  const runner = createGameRunner(game, { players: [{ id: 'human', type: 'human' }] });
  runner.startGame();
  assert.equal(createBotManager(runner).step('human').reason, 'not-bot');
});
test('bot actions cannot impersonate another participant', () => {
  const dishonest = { ...game, getBotAction: () => ({ type: 'stop', playerId: 'human' }) };
  const runner = createGameRunner(dishonest, { players: [{ id: 'bot', type: 'bot' }, { id: 'human', type: 'human' }] });
  runner.startGame();
  const initial = runner.getState().revision;
  assert.equal(createBotManager(runner).step('bot').reason, 'wrong-actor');
  assert.equal(runner.getState().revision, initial);
});
