// MiniGame Engine 1.0 — environment-independent runner.
// Time and random values are supplied by the caller; game rules never access browser globals.
export function assertGameContract(game) {
  for (const key of ['createInitialState', 'validateAction', 'applyAction', 'getBotAction', 'isFinished', 'getResult']) {
    if (typeof game?.[key] !== 'function') throw new TypeError('Missing game contract method: ' + key);
  }
  if (typeof game.id !== 'string' || !game.id) throw new TypeError('Missing game id');
  return game;
}
export function createGameRunner(game, { players, settings = {}, seed = 1, now = 0 } = {}) {
  assertGameContract(game);
  if (!Array.isArray(players) || players.length < 1 || players.length > 4) throw new RangeError('Expected 1–4 players');
  const ids = new Set();
  const roster = players.map((p, seat) => {
    if (!p || (p.type !== 'human' && p.type !== 'bot')) throw new TypeError('Invalid player type');
    const id = String(p.id ?? seat + 1);
    if (ids.has(id)) throw new TypeError('Duplicate player id');
    ids.add(id);
    return Object.freeze({ id, name: String(p.name ?? 'Spieler ' + (seat + 1)), type: p.type, seat });
  });
  const config = Object.freeze({ players: Object.freeze(roster), settings: Object.freeze({ ...settings }), seed });
  let state;
  let revision = 0;
  let status = 'idle';
  function context(at) {
    if (!Number.isFinite(at) || at < 0) throw new RangeError('Invalid time');
    return { ...config, now: at };
  }
  function snapshot() {
    if (status === 'idle') return { gameId: game.id, status, revision, players: roster, gameData: null, result: null };
    return { gameId: game.id, status, revision, players: roster, gameData: structuredClone(state), result: status === 'finished' ? structuredClone(game.getResult(state)) : null };
  }
  function startGame(at = now) {
    if (status !== 'idle') throw new Error('Game already started; use restartGame');
    state = structuredClone(game.createInitialState(context(at)));
    status = game.isFinished(state) ? 'finished' : 'playing';
    revision++;
    return snapshot();
  }
  function dispatchAction(action, { at = now, expectedRevision } = {}) {
    if (status !== 'playing') return { accepted: false, reason: 'not-playing', state: snapshot() };
    if (expectedRevision !== undefined && expectedRevision !== revision) return { accepted: false, reason: 'stale-revision', state: snapshot() };
    const ctx = context(at);
    if (!action || typeof action !== 'object' || typeof action.playerId !== 'string' || !roster.some(p => p.id === action.playerId)) return { accepted: false, reason: 'unknown-player', state: snapshot() };
    if (!game.validateAction(structuredClone(state), action, ctx)) return { accepted: false, reason: 'invalid-action', state: snapshot() };
    const next = game.applyAction(structuredClone(state), action, ctx);
    if (next === undefined) throw new TypeError('applyAction must return state');
    state = structuredClone(next);
    revision++;
    if (game.isFinished(state)) status = 'finished';
    return { accepted: true, state: snapshot() };
  }
  function getBotAction(playerId, at = now) {
    const player = roster.find(p => p.id === String(playerId));
    if (!player || player.type !== 'bot' || status !== 'playing') return null;
    return game.getBotAction(structuredClone(state), { ...context(at), playerId: player.id });
  }
  function restartGame(at = now) { state = undefined; status = 'idle'; return startGame(at); }
  function destroyGame() { state = undefined; status = 'idle'; revision++; }
  return { startGame, dispatchAction, getState: snapshot, getBotAction, restartGame, destroyGame };
}
