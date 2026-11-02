import {farbenblitz} from './games/farbenblitz.js';
import {registerMiniGame} from './GameCatalog.js';
/** Explicitly released V2 game definitions. No sessions or room management. */
registerMiniGame({id:'eier-chaos',name:'🥚 Eier-Chaos',minPlayers:1,maxPlayers:4,module:'./games/eier-chaos/game.js',image:'./assets/farbenblitz-forest.svg'});
export const games=Object.freeze([farbenblitz]);

registerMiniGame({id:'schatzkammern',name:'🏰 Die drei Schatzkammern',minPlayers:1,maxPlayers:4,module:'./games/schatzkammern/game.js',image:'./assets/farbenblitz-forest.svg'});
