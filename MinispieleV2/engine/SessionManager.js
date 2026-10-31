import {createStandardSession} from './StandardSession.js';
/** Pure V2 lifecycle; room identity, network and storage belong to the shared hub. */
export function createManagedSession(game, players, options = {}) {
  const session = createStandardSession(game, players, options);
  const ids = players.map(p => p.id);
  let phase = 'ready';
  let generation = 0;
  const view = () => Object.freeze({phase, generation, ...session.snapshot()});
  return Object.freeze({
    snapshot: view,
    start() {
      if (phase !== 'ready') throw Error('SESSION_NOT_READY');
      phase = session.snapshot().result === null ? 'playing' : 'finished';
      return view();
    },
    dispatch(playerId, action) {
      if (phase !== 'playing') throw Error('SESSION_NOT_PLAYING');
      if (!ids.includes(playerId)) throw Error('UNKNOWN_PLAYER');
      const next = session.dispatch(playerId, action);
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
      phase = 'ready';
      return view();
    }
  });
}
