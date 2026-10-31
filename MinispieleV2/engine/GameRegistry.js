import {validateGameDefinition} from './GameContract.js';

/** Pure registry for game definitions. No rooms, sessions, UI or persistence. */
export function createGameRegistry(definitions = []) {
 if (!Array.isArray(definitions)) throw Error('INVALID_GAME_REGISTRY');
 const entries = new Map();
 const register = game => {
  validateGameDefinition(game);
  if (entries.has(game.id)) throw Error('DUPLICATE_GAME_ID');
  // Preserve the definition's functions and avoid changing caller-owned objects.
  const definition = Object.freeze({...game, ...(game.capabilities ? {capabilities:Object.freeze([...game.capabilities])} : {})});
  entries.set(game.id, definition);
  return definition;
 };
 for (const definition of definitions) register(definition);
 return Object.freeze({
  register,
  get: id => entries.get(id) ?? null,
  has: id => entries.has(id),
  list: () => [...entries.values()],
  ids: () => [...entries.keys()]
 });
}
