import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../GameReleases.js',import.meta.url),'utf8');
const {releasedGames,gameReleases,validateGameReleases}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
test('online lobby only shows released online games',()=>{
 assert.deepEqual(releasedGames('online').map(g=>g.id),['farbenblitz','eier-chaos','merk-matrix']);
 assert.equal(releasedGames('online').some(g=>g.id==='schatzkammern'),false);
 assert.equal(releasedGames('offline').some(g=>g.id==='schatzkammern'),true);
});
test('online release requires a page and server launch adapter',()=>{
 assert.throws(()=>validateGameReleases([{id:'new-game',offline:true,online:true,module:'./games/new-game/game.js',image:'./assets/new.svg'}]),/ONLINE_ADAPTER_REQUIRED/);
 assert.throws(()=>validateGameReleases([{id:'new-game',offline:true,online:false}]),/OFFLINE_GAME_ASSETS_REQUIRED/);
 assert.throws(()=>validateGameReleases([gameReleases[0],gameReleases[0]]),/INVALID_OR_DUPLICATE_GAME_ID/);
});
test('every released online game has an existing dedicated page',()=>{
 for(const game of releasedGames('online'))assert.match(readFileSync(new URL('..'+game.page.slice(1),import.meta.url),'utf8'),/<html/i);
});
test('lobby renders from the release manifest instead of hard-coded cards',()=>{
 const lobby=readFileSync(new URL('../lobby.html',import.meta.url),'utf8');
 assert.match(lobby,/releasedGames\('online'\)/);
 assert.match(lobby,/createElement\('button'\)/);
 assert.doesNotMatch(lobby,/<button id="schatzkammern-launch"/);
});
