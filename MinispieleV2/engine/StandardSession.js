import {createSession} from './MiniGameEngine.js';
import {validateResult} from './ResultContract.js';
/** Strict V2 entry point. Reject invalid results before an action commits state. */
export function createStandardSession(game, players, options = {}) {
  const checkedGame = {
    ...game,
    applyAction(state, context) {
      const next = game.applyAction(state, context);
      // Validate before MiniGameEngine commits the returned state.
      if (next && typeof next === 'object') validateResult(game.getResult(structuredClone(next)), players);
      return next;
    }
  };
  const session = createSession(checkedGame, players, options);
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
