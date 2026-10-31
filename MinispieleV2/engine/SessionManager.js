import {createStandardSession} from './StandardSession.js';
/** Pure V2 lifecycle; room identity, network and storage belong to the shared hub. */
export function createManagedSession(game, players, options = {}) {
  const session = createStandardSession(game, players, options);
  const ids = players.map(p => p.id);
  let phase = 'ready';
  let generation = 0;
  const accepted = new Map();
  const view = () => Object.freeze({phase, generation, ...session.snapshot()});
  return Object.freeze({
    snapshot: view,
    start() {
      if (phase !== 'ready') throw Error('SESSION_NOT_READY');
      phase = session.snapshot().result === null ? 'playing' : 'finished';
      return view();
    },
    dispatch(playerId, action, meta = {}) {
      if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw Error('INVALID_ACTION_META');
      const {requestId, expectedRevision} = meta;
      if (requestId !== undefined && (typeof requestId !== 'string' || !requestId)) throw Error('INVALID_REQUEST_ID');
      if (expectedRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) throw Error('INVALID_EXPECTED_REVISION');
      if (!ids.includes(playerId)) throw Error('UNKNOWN_PLAYER');
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
      if (next.result !== null) phase = 'finished';
      return view();
    },
    botTurn(playerId) {
      if (phase !== 'playing') throw Error('SESSION_NOT_PLAYING');
      const next = session.botTurn(playerId);
      if (next.result !== null) phase = 'finished';
      return view();
    },
    restart() {
      if (phase !== 'finished') throw Error('SESSION_NOT_FINISHED');
      session.restart();
      generation++;
      accepted.clear();
      phase = 'ready';
      return view();
    }
  });
}
