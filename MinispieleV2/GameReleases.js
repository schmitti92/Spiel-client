/** Single release manifest for MiniGame V2. No rooms, network or storage.
 * offline=true publishes in the local selection; online=true requires a tested
 * shared-hub adapter and a dedicated online page before publication.
 */
export const gameReleases=Object.freeze([
 Object.freeze({id:'farbenblitz',name:'⚡ Farbenblitz',offline:true,online:true,module:'./games/farbenblitz.js',image:'./assets/farbenblitz-forest.svg',page:'./farbenblitz.html',description:'1–4 Spieler · Antippen, Anleitung lesen und mit „Verstanden“ starten',gradient:'linear-gradient(125deg,#294b62,#16344b)',border:'#bb9250',launchPath:'/farbenblitz/launch'}),
 Object.freeze({id:'eier-chaos',name:'🥚 Eier-Chaos Online',offline:true,online:true,module:'./games/eier-chaos/game.js',image:'./assets/farbenblitz-forest.svg',page:'./eier-chaos.html',description:'60 Sekunden Eier fangen · 1–4 Spieler · gemeinsamer Countdown',gradient:'linear-gradient(120deg,#38633d,#84602b)',border:'#e9d18a',launchPath:'/eier-chaos/launch'}),
 Object.freeze({id:'merk-matrix',name:'🧠 Merk-Matrix 2 Online',offline:false,online:true,page:'./merk-matrix-online.html',description:'1–4 Spieler · gemeinsames Muster · automatische Runden',gradient:'linear-gradient(120deg,#1b4679,#55388a)',border:'#75e6fa',launchPath:'/merk-matrix/launch'}),
 Object.freeze({id:'drei-schatzkammern',name:'🏰 Die drei Schatzkammern',offline:true,online:true,module:'./games/schatzkammern/game.js',image:'./assets/farbenblitz-forest.svg',page:'./engine2/games/drei-schatzkammern/hub-online.html',description:'Drei Kammern · 1–4 Spieler · gemeinsame Lobby · Engine 2.0',gradient:'linear-gradient(125deg,#403052,#86562c)',border:'#f3d17c',launchPath:'/drei-schatzkammern/launch'})
]);
export function releasedGames(mode){
 if(mode!=='offline'&&mode!=='online')throw Error('INVALID_RELEASE_MODE');
 return gameReleases.filter(game=>game[mode]);
}
export function validateGameReleases(entries=gameReleases){
 const ids=new Set();
 for(const game of entries){
  if(!/^[a-z][a-z0-9-]*$/.test(game.id)||ids.has(game.id))throw Error('INVALID_OR_DUPLICATE_GAME_ID');
  ids.add(game.id);
  if(typeof game.offline!=='boolean'||typeof game.online!=='boolean')throw Error('INVALID_RELEASE_FLAGS');
  if(game.offline&&(!game.module||!game.image))throw Error('OFFLINE_GAME_ASSETS_REQUIRED');
  if(game.online&&(!game.page||!game.launchPath))throw Error('ONLINE_ADAPTER_REQUIRED');
 }
 return true;
}
validateGameReleases();
