import {createStandardSession} from './StandardSession.js';
import {createPlayerManager} from './PlayerManager.js';
/** Pure V2 lifecycle; room identity, network and storage belong to the shared hub. */
export function createManagedSession(game, players, options = {}) {
  const playerManager = createPlayerManager(players);
  const roster = playerManager.list();
  const session = createStandardSession(game, roster, options);
  let phase = 'ready';
  let generation = 0;
  const accepted = new Map();
  const view = () => Object.freeze({phase, generation, ...session.snapshot()});
  // Lifecycle transitions depend only on the game's result contract, never on a fixed round or timer.
  const committedView = next => Object.freeze({phase: next.result === null ? 'playing' : 'finished', generation, ...next});
  return Object.freeze({
    snapshot: view,
    players: () => playerManager.list(),
    start() {
      if (phase !== 'ready') throw Error('SESSION_NOT_READY');
      const current = session.snapshot();
      const nextPhase = current.result === null ? 'playing' : 'finished';
      const nextView = Object.freeze({phase: nextPhase, generation, ...current});
      phase = nextPhase;
      return nextView;
    },
    dispatch(playerId, action, meta = {}) {
      if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw Error('INVALID_ACTION_META');
      const {requestId, expectedRevision} = meta;
      if (requestId !== undefined && (typeof requestId !== 'string' || !requestId)) throw Error('INVALID_REQUEST_ID');
      if (expectedRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) throw Error('INVALID_EXPECTED_REVISION');
      playerManager.requireHuman(playerId);
      const key = requestId === undefined ? null : JSON.stringify([generation, playerId, requestId]);
      if (key !== null && accepted.has(key)) {
        const previous = accepted.get(key);
        if (JSON.stringify(action) !== previous) throw Error('REQUEST_ID_CONFLICT');
        return view();
      }
      if (phase !== 'playing') throw Error('SESSION_NOT_PLAYING');
      if (expectedRevision !== undefined && expectedRevision !== session.snapshot().revision) throw Error('STALE_REVISION');
      const next = session.dispatch(playerId, action);
      if (key !== null) accepted.set(key, JSON.stringify(action));
      const response = committedView(next);
      phase = response.phase;
      return response;
    },
    botTurn(playerId) {
      if (phase !== 'playing') throw Error('SESSION_NOT_PLAYING');
      playerManager.requireBot(playerId);
      const next = session.botTurn(playerId);
      updatePhase(next.result);
      return view();
    },
    restart() {
      if (phase !== 'finished') throw Error('SESSION_NOT_FINISHED');
      const next = session.restart();
      const nextGeneration = generation + 1;
      const response = Object.freeze({phase: 'ready', generation: nextGeneration, ...next});
      generation = nextGeneration;
      accepted.clear();
      phase = 'ready';
      return response;
    }
  });
}
