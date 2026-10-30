import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameRunner } from '../core/game-runner.mjs';

// Architecture probes, intentionally independent from the production game rules.
// Each fixture uses the same runner contract and isolates a different game family.
const roster = [{ id: 'h', type: 'human' }, { id: 'b', type: 'bot' }];
const base = {
  getBotAction: () => null,
  getResult: s => s,
  isFinished: s => s.finished
};

test('round-based quiz: answers advance phases without engine-specific quiz code', () => {
  const quiz = {
    ...base, id: 'quiz-fixture',
    createInitialState: () => ({ round: 1, answers: [], finished: false }),
    validateAction: (s, a) => a.type === 'answer' && !s.answers.includes(a.playerId),
    applyAction: (s, a) => {
      const answers = [...s.answers, a.playerId];
      return answers.length === 2
        ? { round: s.round + 1, answers: [], finished: s.round === 3 }
        : { ...s, answers };
    }
  };
  const runner = createGameRunner(quiz, { players: roster });
  runner.startGame();
  for (let round = 1; round <= 3; round++) {
    assert.equal(runner.dispatchAction({ type: 'answer', playerId: 'h' }).accepted, true);
    assert.equal(runner.dispatchAction({ type: 'answer', playerId: 'h' }).accepted, false);
    assert.equal(runner.dispatchAction({ type: 'answer', playerId: 'b' }).accepted, true);
  }
  assert.equal(runner.getState().status, 'finished');
  assert.equal(runner.restartGame().gameData.round, 1);
});

test('grid simulation: scheduled steps work without DOM or browser timers', () => {
  const snake = {
    ...base, id: 'snake-fixture',
    createInitialState: () => ({ x: 0, tick: 0, finished: false }),
    validateAction: (s, a) => a.type === 'tick' && a.playerId === 'h',
    applyAction: s => ({ x: s.x + 1, tick: s.tick + 1, finished: s.tick + 1 === 3 }),
    getScheduledActions: s => s.finished ? [] : [{ at: (s.tick + 1) * 100, action: { type: 'tick', playerId: 'h' } }]
  };
  const runner = createGameRunner(snake, { players: [{ id: 'h', type: 'human' }] });
  runner.startGame();
  assert.equal(runner.advanceTime(300).gameData.x, 3);
  assert.equal(runner.getState().status, 'finished');
});

test('arena simulation: same-time scheduled events execute without lost actions', () => {
  const arena = {
    ...base, id: 'arena-fixture',
    createInitialState: () => ({ hits: [], finished: false }),
    validateAction: (s, a) => a.type === 'blast' && !s.hits.includes(a.playerId),
    applyAction: (s, a) => ({ hits: [...s.hits, a.playerId], finished: s.hits.length === 1 }),
    getScheduledActions: s => roster.filter(p => !s.hits.includes(p.id))
      .map(p => ({ at: 100, action: { type: 'blast', playerId: p.id } }))
  };
  const runner = createGameRunner(arena, { players: roster });
  runner.startGame();
  assert.deepEqual(runner.advanceTime(100).gameData.hits, ['h', 'b']);
});
