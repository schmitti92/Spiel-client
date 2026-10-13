/**
 * Separate, opt-in SKYJO Comic mirror for an existing game document.
 * Intended to be called by the original engine after its normal render:
 * window.dispatchEvent(new CustomEvent('skyjo-comic-snapshot', {detail:{room,seatId,revision}}))
 * The mirror does not subscribe to servers and cannot mutate the original board.
 */
import { mountComicGame } from './skyjo_comic_mount.mjs';

export function connectComicMirror({
  root, game, canAct = () => false, interactive = false,
  eventTarget = window, onError = console.error
}) {
  if (!root || !eventTarget?.addEventListener || !eventTarget?.removeEventListener)
    throw new TypeError('Missing Comic mirror target');
  let seatId = '';
  const mount = mountComicGame({
    root, game, interactive, canAct, onError,
    getSeatId: () => seatId
  });
  function onSnapshot(event) {
    const data = event?.detail;
    if (!data || typeof data.seatId !== 'string' || !data.seatId) return;
    seatId = data.seatId;
    mount.update(data.room, data.revision);
  }
  eventTarget.addEventListener('skyjo-comic-snapshot', onSnapshot);
  return () => {
    eventTarget.removeEventListener('skyjo-comic-snapshot', onSnapshot);
    mount.dispose();
  };
}
