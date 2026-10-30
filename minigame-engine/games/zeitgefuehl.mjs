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
      botStopAt: Object.fromEntries(players.filter(p => p.type === 'bot').map(p => {
        const noise = (random() + random() + random() - 1.5) * 1700;
        return [p.id, now + 3000 + Math.max(3200, targetSeconds * 1000 + noise)];
      })),
      finished: false
    };
  },
  validateAction(state, action, { now }) {
    if (action?.type === 'timeout') {
      return !state.finished && now >= state.startedAt + 30000;
    }
    return action?.type === 'stop'
      && !state.finished
      && now >= state.startedAt
      && now < state.startedAt + 30000
      && !Object.hasOwn(state.stopped, action.playerId);
  },
  applyAction(state, action, { now, players }) {
    const stopped = action.type === 'timeout'
      ? Object.fromEntries(players.map(p => [p.id, state.stopped[p.id] ?? 30000]))
      : { ...state.stopped, [action.playerId]: now - state.startedAt };
    return { ...state, stopped, finished: players.every(p => Object.hasOwn(stopped, p.id)) };
  },
  getTimedAction(state, { now, players }) {
    if (state.finished || now < state.startedAt + 30000) return null;
    const pending = players.find(p => !Object.hasOwn(state.stopped, p.id));
    return pending ? { type: 'timeout', playerId: pending.id } : null;
  },
  getBotAction(state, { playerId, now }) {
    if (state.finished || Object.hasOwn(state.stopped, playerId)) return null;
    const stopAt = state.botStopAt[playerId];
    return Number.isFinite(stopAt) && now >= stopAt
      ? { type: 'stop', playerId } : null;
  },
  isFinished(state) { return state.finished; },
  getResult(state) {
    const results = Object.entries(state.stopped).map(([playerId, elapsedMs]) => ({
      playerId, elapsedMs, deviationMs: Math.abs(elapsedMs - state.targetMs)
    })).sort((a, b) => a.deviationMs - b.deviationMs);
    // Compare each result with the best deviation of its tied group.
    // Competition ranking: 1, 1, 3 (not 1, 1, 2).
    let groupBest = null;
    let groupRank = 0;
    results.forEach((entry, index) => {
      if (groupBest === null || entry.deviationMs - groupBest >= 5) {
        groupBest = entry.deviationMs;
        groupRank = index + 1;
      }
      entry.rank = groupRank;
    });
    return { targetSeconds: state.targetSeconds, results };
  }
};
