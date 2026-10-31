import {createManagedSession} from './SessionManager.js';

/** Stateless adapter from registered game definitions to managed sessions.
 * The caller owns room identity, storage, rendering and transport.
 */
export function createGameLauncher(registry) {
 if (!registry || typeof registry.get !== 'function') throw Error('INVALID_GAME_REGISTRY');
 return Object.freeze({
  create(gameId, players, options = {}) {
   const game = registry.get(gameId);
   if (!game) throw Error('UNKNOWN_GAME');
   return createManagedSession(game, players, options);
  }
 });
}
