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
  const bridge = createComicActionBridge({ game, canAct, onError });
  const view = createComicLiveView({ root, getSeatId, onError, interactive });
  const unbind = bindComicCardInteractions({
    root, bridge, isEnabled: () => interactive === true && canAct()
  });
  let disposed = false;
  return Object.freeze({
    update(room, revision) {
      if (disposed) return false;
      return view.receive(room, revision);
    },
    action(action, payload) {
      if (disposed || interactive !== true) return false;
      return bridge.dispatch(action, payload);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unbind();
      view.stop();
    }
  });
}
