import { assertGameContract } from './game-runner.mjs';
const games = new Map();
export function registerGame(game) {
  assertGameContract(game);
  if (games.has(game.id)) throw new Error('Duplicate game id: ' + game.id);
  games.set(game.id, game);
  return game;
}
export function getGame(id) { return games.get(id) ?? null; }
export function listGames() { return [...games.keys()]; }
