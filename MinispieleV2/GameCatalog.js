/** Central MiniGame V2 catalog. No UI, network, storage or room management. */
const registry=new Map();
const slug=/^[a-z][a-z0-9-]*$/;
export function registerMiniGame(definition){
 if(!definition||typeof definition!=='object')throw Error('GAME_DEFINITION_REQUIRED');
 const {id,name,minPlayers=1,maxPlayers=4,module,image}=definition;
 if(typeof id!=='string'||!slug.test(id))throw Error('INVALID_GAME_ID');
 if(registry.has(id))throw Error('DUPLICATE_GAME_ID');
 if(typeof name!=='string'||!name.trim())throw Error('INVALID_GAME_NAME');
 if(!Number.isInteger(minPlayers)||!Number.isInteger(maxPlayers)||minPlayers<1||maxPlayers>4||minPlayers>maxPlayers)throw Error('INVALID_PLAYER_LIMITS');
 if(typeof module!=='string'||!module.startsWith('./games/')||!module.endsWith('/game.js')||module.includes('..'))throw Error('INVALID_GAME_MODULE');
 if(typeof image!=='string'||!image.startsWith('./assets/')||image.includes('..'))throw Error('INVALID_GAME_IMAGE');
 const item=Object.freeze({id,name:name.trim(),minPlayers,maxPlayers,module,image});
 registry.set(id,item);
 return item;
}
export function listMiniGames(){return Array.from(registry.values());}
export function getMiniGame(id){return registry.get(id)||null;}
export function isGameSupported(id,count){const g=getMiniGame(id);return !!g&&Number.isInteger(count)&&count>=g.minPlayers&&count<=g.maxPlayers;}
