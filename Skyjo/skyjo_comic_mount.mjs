import { createComicLiveView } from './skyjo_comic_live_view.mjs';
import { createComicActionBridge } from './skyjo_comic_action_bridge.mjs';
import { bindComicCardInteractions } from './skyjo_comic_card_events.mjs';

/**
 * Explicit host integration for a separately mounted Comic DOM.
 * No polling, no server connection and no mutation of the classic game.
 * The real SKYJO engine must call update() whenever its authoritative state changes.
 */
export function mountComicGame({
  root, getSeatId, game, canAct, onError = () => {}, interactive = false
}) {
  if (!root || typeof getSeatId !== 'function' || !game ||
      typeof canAct !== 'function' || typeof onError !== 'function')
    throw new TypeError('Comic game requires an engine and an authenticated seat');
  let currentSeatIndex = -1;
  let disposed = false;
  const allowed = () => !disposed && interactive === true && currentSeatIndex >= 0 && canAct();
  const bridge = createComicActionBridge({ game, canAct: allowed, onError });
  const view = createComicLiveView({ root, getSeatId, onError, interactive });
  const unbind = bindComicCardInteractions({
    root, bridge, isEnabled: allowed, isOwnPlayer: index => index === currentSeatIndex
  });
  return Object.freeze({
    update(room, revision) {
      if (disposed) return false;
      const result = view.receive(room, revision);
      if (result && Number.isInteger(result.selfIndex)) currentSeatIndex = result.selfIndex;
      return result;
    },
    action(action, payload) {
      if (!allowed()) return false;
      if ((action === 'selectGridCard' || action === 'selectExtraCard' || action === 'resolveMatch') &&
          payload?.playerIndex !== currentSeatIndex) return false;
      return bridge.dispatch(action, payload);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      currentSeatIndex = -1;
      unbind();
      view.stop();
    }
  });
}
