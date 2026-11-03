import {farbenblitz} from './games/farbenblitz.js';
import {registerMiniGame} from './GameCatalog.js';
import {releasedGames} from './GameReleases.js';
/** Offline releases share the same manifest as the online lobby. */
for(const game of releasedGames('offline')){
 if(game.id==='farbenblitz')continue; // Existing rules are exported directly.
 registerMiniGame({id:game.id,name:game.name,minPlayers:1,maxPlayers:4,module:game.module,image:game.image});
}
export const games=Object.freeze([farbenblitz]);
