import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 PLAYER_STATISTICS_TAB_REUSE_MS,reuseRecentPlayerStatistics
} from '../DOG/christmas-player-statistics-ui.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Player statistics reuse is short and strictly scoped by room and verified account',()=>{
 assert.equal(PLAYER_STATISTICS_TAB_REUSE_MS,30000);
 const state={uid:'alice',roomCode:'123',loadedUid:'alice',loadedRoomCode:'123',
   loadedAt:100000,hasData:true,now:110000};
 assert.equal(reuseRecentPlayerStatistics(state),true);
 assert.equal(reuseRecentPlayerStatistics({...state,now:129999}),true);
 assert.equal(reuseRecentPlayerStatistics({...state,now:130000}),false,'new GET after 30 seconds');
 assert.equal(reuseRecentPlayerStatistics({...state,now:99999}),false,'no frozen cache after clock rollback');
 assert.equal(reuseRecentPlayerStatistics({...state,uid:'bob'}),false,'account isolation');
 assert.equal(reuseRecentPlayerStatistics({...state,roomCode:'456'}),false,'room isolation');
 assert.equal(reuseRecentPlayerStatistics({...state,force:true}),false,'manual refresh bypasses cache');
 assert.equal(reuseRecentPlayerStatistics({...state,hasData:false}),false,'no caching failed requests');
 assert.equal(reuseRecentPlayerStatistics({...state,uid:null}),false,'signed-out users cannot reuse');
});

test('Only quick tab switches use local snapshot; manual refresh and real identity changes always reload',()=>{
 const js=read('DOG/christmas-player-statistics-ui.js');
 const page=read('DOG/christmas-event.js');
 assert.match(js,/if\(reuseRecentPlayerStatistics\(/);
 assert.match(js,/if\(loading&&!force\)return loading/);
 assert.match(js,/lastLoadedAt=Date\.now\(\);lastLoadedUid=account\.uid;lastLoadedCode=code/);
 assert.match(js,/refresh\.addEventListener\('click',\(\)=>void load\(true\)\)/);
 assert.match(js,/if\(nextUid===activeUid\)return/);
 assert.match(js,/requestId\+\+;loading=null;data=null;lastLoadedAt=0/);
 assert.match(js,/if\(nextUid&&document\.getElementById\('tab-statistics'\)/);
 assert.match(js,/code=next;data=null;lastLoadedAt=0/);
 assert.match(page,/christmas-player-statistics-ui\.js\?v=3/);
 assert.match(page,/if\(id==='statistics'\)void statisticsScreen\?\.load\(\)/);
});
