// Bot actions are always dispatched through the same validated action pipeline.
// The host is responsible for scheduling calls; no timers or browser APIs here.
export function createBotManager(runner) {
  if (!runner || typeof runner.getState !== 'function' || typeof runner.getBotAction !== 'function' || typeof runner.dispatchAction !== 'function') {
    throw new TypeError('Expected MiniGame runner');
  }
  function step(playerId, { at, expectedRevision } = {}) {
    const snapshot = runner.getState();
    if (snapshot.status !== 'playing') return { accepted: false, reason: 'not-playing', state: snapshot };
    const player = snapshot.players.find(p => p.id === String(playerId));
    if (!player || player.type !== 'bot') return { accepted: false, reason: 'not-bot', state: snapshot };
    if (expectedRevision !== undefined && expectedRevision !== snapshot.revision) {
      return { accepted: false, reason: 'stale-revision', state: snapshot };
    }
    const action = runner.getBotAction(player.id, at);
    if (action == null) return { accepted: false, reason: 'no-action', state: runner.getState() };
    if (action.playerId !== player.id) return { accepted: false, reason: 'wrong-actor', state: runner.getState() };
    return runner.dispatchAction(action, { at, expectedRevision: snapshot.revision });
  }
  return { step };
}
