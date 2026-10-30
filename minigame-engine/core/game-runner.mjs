import { createRandom } from './random.mjs';
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
  createRandom(seed); // validate seed before constructing the runner
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
  let lastTime = null;
  let epoch = 0;
  let randomState = seed >>> 0;
  function prepareRound(at) {
    if (!Number.isFinite(at) || at < 0) throw new RangeError('Invalid time');
    const random = createRandom(randomState);
    const next = structuredClone(game.createInitialState({ ...config, now: at, random: () => random.next() }));
    return { next, nextStatus: game.isFinished(next) ? 'finished' : 'playing', nextRandomState: random.getState() };
  }
  function currentTime(at) { return at === undefined ? (lastTime ?? now) : at; }
  function context(at) {
    if (!Number.isFinite(at) || at < 0) throw new RangeError('Invalid time');
    if (lastTime !== null && at < lastTime) throw new RangeError('Game time cannot move backwards');
    return { ...config, now: at };
  }
  function snapshot() {
    if (status === 'idle') return { gameId: game.id, status, revision, epoch, players: roster, gameData: null, result: null };
    return { gameId: game.id, status, revision, epoch, players: roster, gameData: structuredClone(state), result: status === 'finished' ? structuredClone(game.getResult(structuredClone(state))) : null };
  }
  function startGame(at = now) {
    if (status !== 'idle') throw new Error('Game already started; use restartGame');
    const prepared = prepareRound(at);
    state = prepared.next;
    randomState = prepared.nextRandomState;
    lastTime = at;
    status = prepared.nextStatus;
    epoch++;
    revision++;
    return snapshot();
  }
  function dispatchAction(action, { at, expectedRevision } = {}) {
    if (status !== 'playing') return { accepted: false, reason: 'not-playing', state: snapshot() };
    if (expectedRevision !== undefined && expectedRevision !== revision) return { accepted: false, reason: 'stale-revision', state: snapshot() };
    at = currentTime(at);
    const baseCtx = context(at);
    const actionRandom = createRandom(randomState);
    const ctx = { ...baseCtx, random: () => actionRandom.next() };
    if (!action || typeof action !== 'object' || typeof action.playerId !== 'string' || !roster.some(p => p.id === action.playerId)) return { accepted: false, reason: 'unknown-player', state: snapshot() };
    if (!game.validateAction(structuredClone(state), action, ctx)) return { accepted: false, reason: 'invalid-action', state: snapshot() };
    const next = game.applyAction(structuredClone(state), action, ctx);
    if (next === undefined) throw new TypeError('applyAction must return state');
    const prepared = structuredClone(next);
    const nextStatus = game.isFinished(structuredClone(prepared)) ? 'finished' : 'playing';
    const nextResult = nextStatus === 'finished' ? structuredClone(game.getResult(structuredClone(prepared))) : null;
    state = prepared;
    randomState = actionRandom.getState();
    lastTime = at;
    revision++;
    status = nextStatus;
    return { accepted: true, state: snapshot() };
  }
  function getBotAction(playerId, at) {
    at = currentTime(at);
    const player = roster.find(p => p.id === String(playerId));
    if (!player || player.type !== 'bot' || status !== 'playing') return null;
    // Bot strategy may inspect random numbers but cannot advance the authoritative stream.
    const botRandom = createRandom(randomState);
    return game.getBotAction(structuredClone(state), { ...context(at), playerId: player.id, random: () => botRandom.next() });
  }
  function restartGame(at = now) {
    // Prepare the new round before replacing the current one.
    const prepared = prepareRound(at);
    state = prepared.next;
    randomState = prepared.nextRandomState;
    status = prepared.nextStatus;
    lastTime = at;
    revision++;
    epoch++;
    return snapshot();
  }
  function advanceTime(at) {
    context(at);
    if (status !== 'playing') return snapshot();
    // Process scheduled bot stops in chronological order, even if the host clock jumps.
    // Timeout is always last at the same instant and catches remaining players.
    const dueBots = roster.filter(p => p.type === 'bot')
      .map(p => ({ playerId: p.id, at: state?.botStopAt?.[p.id] }))
      .filter(x => Number.isFinite(x.at) && x.at <= at && x.at >= (lastTime ?? 0))
      .sort((a, b) => a.at - b.at);
    for (const due of dueBots) {
      if (status !== 'playing') break;
      const action = getBotAction(due.playerId, due.at);
      if (action) dispatchAction(action, { at: due.at });
    }
    if (status === 'playing') {
      const ctx = context(at);
      const timed = typeof game.getTimedAction === 'function'
        ? game.getTimedAction(structuredClone(state), ctx) : null;
      if (timed) dispatchAction(timed, { at });
    }
    return snapshot();
  }
  function destroyGame() { state = undefined; status = 'idle'; lastTime = null; revision++; }
  return { startGame, dispatchAction, advanceTime, getState: snapshot, getBotAction, restartGame, destroyGame };
}
