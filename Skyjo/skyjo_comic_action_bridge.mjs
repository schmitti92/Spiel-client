/**
 * SKYJO Comic interaction boundary.
 * The existing engine must explicitly provide its Game API and authorization
 * predicate. Never write directly to the server or synthesize state changes.
 */
const ALLOWED = Object.freeze({
  drawDeck: ['drawFromDeck', 0],
  drawDiscard: ['drawFromDiscard', 0],
  discardDrawn: ['discardDrawn', 0],
  selectGridCard: ['selectCard', 3],
  selectExtraCard: ['selectCard', 3],
  resolveMatch: ['resolveBoardMatch', 2]
});
export function createComicActionBridge({ game, canAct, onError = () => {} }) {
  if (!game || typeof canAct !== 'function' || typeof onError !== 'function')
    throw new TypeError('Invalid action bridge configuration');
  return Object.freeze({
    supported: Object.keys(ALLOWED),
    dispatch(action, payload = {}) {
      if (!Object.hasOwn(ALLOWED, action)) return false;
      if (!canAct()) return false;
      const [method] = ALLOWED[action];
      if (typeof game[method] !== 'function') return false;
      let args = [];
      if (action === 'selectGridCard' || action === 'selectExtraCard') {
        if (!Number.isInteger(payload.playerIndex) || !Number.isInteger(payload.cardIndex) ||
            payload.playerIndex < 0 || payload.cardIndex < 0) return false;
        args = [payload.playerIndex, action === 'selectGridCard' ? 'grid' : 'extra', payload.cardIndex];
      } else if (action === 'resolveMatch') {
        if (!Number.isInteger(payload.playerIndex) || !Number.isInteger(payload.matchIndex) ||
            payload.playerIndex < 0 || payload.matchIndex < 0) return false;
        args = [payload.playerIndex, payload.matchIndex];
      }
      try { game[method](...args); return true; }
      catch (error) { onError(error); return false; }
    }
  });
}
