import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Receipt replay does not silently depend on stale map or hero status',()=>{
 const s=read('dog-tor-map.js');
 assert.match(s,/const memberReady=!!mapState\?\.isMember/);
 assert.match(s,/if\(!retry&&!memberReady\)/);
 assert.match(s,/if\(retry&&!old\)/);
 assert.doesNotMatch(s,/if\(!account\|\|working\|\|!mapState\?\.isMember/);
 assert.match(s,/const result=await request\('POST','fight',\{requestId:pending\.id,gate:pending\.gate\},account\)/);
});
test('Recovery error visible and request ID retained on network uncertainty',()=>{
 const s=read('dog-tor-map.js'),h=read('dog-tor-map.html');
 assert.match(s,/\$\('gate-recovery-status'\)\.textContent=detail/);
 assert.match(s,/const definitive=\['INVALID_REQUEST_ID'/);
 assert.match(h,/id="gate-recovery-status" role="status"/);
 assert.match(h,/dog-tor-map\.js\?v=20261112-quick-finish1/);
});
