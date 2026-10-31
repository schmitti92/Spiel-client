/** Shared MiniGame V2 result validation. Pure; no DOM, storage or network. */
export function validateResult(result, players) {
  if (!Array.isArray(players) || players.length < 1 || players.length > 4) throw Error('INVALID_RESULT_PLAYERS');
  const playerIds = players.map(p => p.id);
  if (playerIds.some(id => typeof id !== 'string' || !id) || new Set(playerIds).size !== playerIds.length) throw Error('INVALID_RESULT_PLAYERS');
  if (result === null) return null;
  if (!result || typeof result !== 'object' || result.finished !== true || !Array.isArray(result.results)) throw Error('INVALID_RESULT_FORMAT');
  if (result.results.length !== players.length) throw Error('INVALID_RESULT_COUNT');
  const seen = new Set();
  for (const entry of result.results) {
    if (!entry || typeof entry !== 'object' || !playerIds.includes(entry.playerId) || seen.has(entry.playerId)) throw Error('INVALID_RESULT_PLAYER');
    if (typeof entry.score !== 'number' || !Number.isFinite(entry.score)) throw Error('INVALID_RESULT_SCORE');
    seen.add(entry.playerId);
  }
  return result;
}
