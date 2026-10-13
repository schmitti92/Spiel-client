/** Read-only projection of the actual SKYJO engine game state. No writes or actions. */
export function projectSkyjoGame(room, selfSeatId) {
  if (!room || room.kind !== 'skyjo-room-v2' || room.version !== 2 ||
      !Array.isArray(room.lobby?.players) || !Array.isArray(room.game?.players)) {
    throw new TypeError('Unsupported SKYJO game snapshot');
  }
  const seats = room.lobby.players;
  if (seats.length < 3 || seats.length > 5 || room.game.players.length !== seats.length) {
    throw new RangeError('Expected 3–5 matching players');
  }
  const selfIndex = seats.findIndex(p => p.id === String(selfSeatId));
  if (selfIndex < 0) throw new TypeError('Unknown player seat');
  const players = seats.map((seat, index) => {
    const engine = room.game.players[index];
    if (!engine || !Array.isArray(engine.grid) || engine.grid.length !== 12)
      throw new TypeError('Invalid grid for player '+index);
    return {
      seatId: String(seat.id), name: String(seat.name || engine.name || 'Spieler'),
      index, isSelf: index === selfIndex, total: Number.isFinite(engine.total) ? engine.total : null,
      cards: engine.grid.map(card => {
        if (card == null) return null;
        if (typeof card !== 'object') throw new TypeError('Invalid card');
        if (!card.faceUp) return { faceUp: false };
        if (card.type === 'star') return { faceUp: true, type: 'star', value: '★' };
        if (card.type === 'number' && Number.isFinite(card.value))
          return { faceUp: true, type: 'number', value: card.value };
        throw new TypeError('Unknown revealed card');
      }),
      extraCount: Array.isArray(engine.extras) ? engine.extras.length : 0,
      actionCount: Array.isArray(engine.actions) ? engine.actions.length : 0
    };
  });
  const currentPlayer = Number(room.game.currentPlayer);
  return {
    players, selfIndex,
    phase: String(room.game.phase || 'unknown'),
    currentPlayer: Number.isInteger(currentPlayer) && currentPlayer >= 0 && currentPlayer < players.length ? currentPlayer : null,
    playDeckCount: Array.isArray(room.game.playDeck) ? room.game.playDeck.length : null,
    discardCount: Array.isArray(room.game.discard) ? room.game.discard.length : null
  };
}
