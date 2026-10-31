import {createSession} from './MiniGameEngine.js';
import {validateResult} from './ResultContract.js';
/** Strict V2 entry point. Legacy games must continue using createSession until migrated. */
export function createStandardSession(game, players, options = {}) {
  const session = createSession(game, players, options);
  const checked = snapshot => {
    validateResult(snapshot.result, snapshot.players);
    return snapshot;
  };
  checked(session.snapshot());
  return Object.freeze({
    snapshot: () => checked(session.snapshot()),
    dispatch: (playerId, action) => checked(session.dispatch(playerId, action)),
    botTurn: playerId => checked(session.botTurn(playerId)),
    restart: () => checked(session.restart())
  });
}
