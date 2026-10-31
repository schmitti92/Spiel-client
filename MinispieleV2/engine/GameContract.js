/** MiniGame V2 contract metadata. Pure and independent of UI, network and storage. */
export const GAME_CONTRACT_VERSION = 1;
export const GAME_CAPABILITIES = Object.freeze(['rounds','timed','simultaneous']);
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
 if (game.capabilities !== undefined) {
  if (!Array.isArray(game.capabilities) || new Set(game.capabilities).size !== game.capabilities.length ||
   game.capabilities.some(c => !GAME_CAPABILITIES.includes(c))) throw Error('INVALID_GAME_CAPABILITIES');
 }
 return game;
}
