/**
 * SKYJO Comic — read-only adapter (v1).
 * Separate from skyjo_action.html and from all existing game engines.
 * Never posts or writes game state. Use only after verifying the live schema.
 */
export function normalizeComicSnapshot(room) {
  if (!room || room.kind !== 'skyjo-room-v2' || room.version !== 2) {
    throw new TypeError('Unexpected SKYJO room version');
  }
  const lobby = room.lobby;
  if (!lobby || !Array.isArray(lobby.players)) throw new TypeError('Invalid SKYJO lobby');
  const players = lobby.players.map((seat, index) => ({
    seatId: String(seat.id || ''),
    name: String(seat.name || 'Spieler'),
    index
  }));
  if (players.length < 2 || players.length > 5) {
    throw new RangeError('Comic board supports 2–5 seats, designed for 3–5');
  }
  const game = room.game || null;
  if (game && (!Array.isArray(game.players) || game.players.length !== players.length)) {
    throw new TypeError('Game player count does not match the lobby');
  }
  return Object.freeze({
    phase: game ? String(game.phase || 'playing') : 'lobby',
    status: String(lobby.status || 'lobby'),
    players,
    game,
    settings: lobby.settings || {}
  });
}
export function layoutForComicSeats(total, selfIndex) {
  if (!Number.isInteger(total) || total < 3 || total > 5) throw new RangeError('Requires 3–5 players');
  if (!Number.isInteger(selfIndex) || selfIndex < 0 || selfIndex >= total) throw new RangeError('Invalid player index');
  const positions = {
    3: ['enemy-left-top', 'enemy-right-top'],
    4: ['enemy-left-top', 'enemy-right-top', 'enemy-right-bottom'],
    5: ['enemy-left-top', 'enemy-right-top', 'enemy-left-bottom', 'enemy-right-bottom']
  }[total];
  const opponents = [];
  for (let offset = 1; offset < total; offset++) {
    const index = (selfIndex + offset) % total;
    opponents.push({ index, position: positions[offset - 1] });
  }
  return { selfIndex, opponents };
}
