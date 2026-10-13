/**
 * SKYJO Comic read-only live snapshot controller.
 * The existing authenticated engine must supply snapshots; this controller
 * never connects to Firebase, WebSockets or sends gameplay commands.
 */
import { projectSkyjoGame } from './skyjo_comic_projection.mjs';
import { renderComicSnapshot } from './skyjo_comic_snapshot_view.mjs';

export function createComicLiveView({ root, getSeatId, onError = () => {} }) {
  if (!root || typeof getSeatId !== 'function' || typeof onError !== 'function')
    throw new TypeError('Invalid Comic view configuration');
  let lastRevision = -1;
  let stopped = false;
  function receive(room, revision) {
    if (stopped) return false;
    if (!Number.isSafeInteger(revision) || revision < 0) {
      onError(new TypeError('Snapshot revision required')); return false;
    }
    if (revision <= lastRevision) return false;
    try {
      const seatId = getSeatId();
      const projection = projectSkyjoGame(room, seatId);
      renderComicSnapshot(room, seatId, root);
      lastRevision = revision;
      return projection;
    } catch (error) {
      onError(error);
      return false;
    }
  }
  return {
    receive,
    stop() { stopped = true; },
    get revision() { return lastRevision; }
  };
}
