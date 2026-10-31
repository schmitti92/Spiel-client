/** MiniGame V2 contract metadata. Pure and independent of UI, network and storage. */
export const GAME_CONTRACT_VERSION = 1;
export const GAME_CAPABILITIES = Object.freeze(['rounds','timed','simultaneous']);
/** Optional rule metadata is descriptive: game code remains authoritative. */
export const GAME_SCORE_DIRECTIONS = Object.freeze(['higher','lower']);
const slug = /^[a-z][a-z0-9-]*$/;
export function validateGameDefinition(game) {
 if (!game || typeof game !== 'object' || Array.isArray(game)) throw Error('GAME_REQUIRED');
 if (typeof game.id !== 'string' || !slug.test(game.id)) throw Error('GAME_CONTRACT_id');
 for (const key of ['initialState','applyAction','getResult','botAction']) {
  if (typeof game[key] !== 'function') throw Error('GAME_CONTRACT_'+key);
 }
 if (game.contractVersion !== undefined && game.contractVersion !== GAME_CONTRACT_VERSION) throw Error('UNSUPPORTED_GAME_CONTRACT_VERSION');
 const min = game.minPlayers ?? 1, max = game.maxPlayers ?? 4;
 if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 4 || min > max) throw Error('INVALID_GAME_PLAYER_LIMITS');
 if (game.roundCount !== undefined && (!Number.isSafeInteger(game.roundCount) || game.roundCount < 1)) throw Error('INVALID_GAME_ROUND_COUNT');
 if (game.scoreDirection !== undefined && !GAME_SCORE_DIRECTIONS.includes(game.scoreDirection)) throw Error('INVALID_GAME_SCORE_DIRECTION');
 if (game.timeLimitMs !== undefined && (!Number.isSafeInteger(game.timeLimitMs) || game.timeLimitMs < 1)) throw Error('INVALID_GAME_TIME_LIMIT');
 if (game.capabilities !== undefined) {
  if (!Array.isArray(game.capabilities) || new Set(game.capabilities).size !== game.capabilities.length ||
   game.capabilities.some(c => !GAME_CAPABILITIES.includes(c))) throw Error('INVALID_GAME_CAPABILITIES');
  if (game.roundCount !== undefined && !game.capabilities.includes('rounds')) throw Error('UNDECLARED_GAME_ROUNDS');
  if (game.timeLimitMs !== undefined && !game.capabilities.includes('timed')) throw Error('UNDECLARED_GAME_TIMER');
 } else if (game.roundCount !== undefined || game.timeLimitMs !== undefined) {
  throw Error('GAME_CAPABILITIES_REQUIRED');
 }
 return game;
}
