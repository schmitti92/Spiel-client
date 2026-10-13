/**
 * SKYJO Comic event publisher for an explicitly authorized engine host.
 * No polling, persistence, network requests, or changes to the classic board.
 */
export function publishComicSnapshot({
  target, room, seatId, revision
}) {
  if (!target || typeof target.dispatchEvent !== 'function') return false;
  if (!room || room.kind !== 'skyjo-room-v2' || room.version !== 2 ||
      !Array.isArray(room.lobby?.players) || !room.game) return false;
  if (room.lobby.players.length < 3 || room.lobby.players.length > 5) return false;
  if (!room.lobby.players.some(p => p.id === seatId)) return false;
  if (!Number.isSafeInteger(revision) || revision < 0) return false;
  const detail = { room, seatId, revision };
  // Browser CustomEvent is available in the real engine. Tests may supply
  // an event factory to avoid reliance on browser globals.
  const event = typeof CustomEvent === 'function'
    ? new CustomEvent('skyjo-comic-snapshot', { detail })
    : { type: 'skyjo-comic-snapshot', detail };
  return target.dispatchEvent(event);
}
