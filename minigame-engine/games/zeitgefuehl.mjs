// Zeitgefühl rule module: no DOM, timers, network or storage.
// Times are milliseconds in the shared engine clock.
export const zeitgefuehlGame = {
  id: 'zeitgefuehl',
  createInitialState({ players, now, random }) {
    const targetSeconds = 10 + Math.floor(random() * 11);
    return {
      targetSeconds, targetMs: targetSeconds * 1000,
      startedAt: now + 3000, // three-second countdown
      stopped: {},
      finished: false
    };
  },
  validateAction(state, action, { now }) {
    return action?.type === 'stop'
      && !state.finished
      && now >= state.startedAt
      && now <= state.startedAt + 30000
      && !Object.hasOwn(state.stopped, action.playerId);
  },
  applyAction(state, action, { now, players }) {
    const stopped = { ...state.stopped, [action.playerId]: Math.min(30000, now - state.startedAt) };
    return { ...state, stopped, finished: players.every(p => Object.hasOwn(stopped, p.id)) };
  },
  getBotAction(state, { playerId, now }) {
    // Bot timing strategy will be attached after baseline parity tests.
    return null;
  },
  isFinished(state) { return state.finished; },
  getResult(state) {
    const results = Object.entries(state.stopped).map(([playerId, elapsedMs]) => ({
      playerId, elapsedMs, deviationMs: Math.abs(elapsedMs - state.targetMs)
    })).sort((a, b) => a.deviationMs - b.deviationMs);
    return { targetSeconds: state.targetSeconds, results };
  }
};
