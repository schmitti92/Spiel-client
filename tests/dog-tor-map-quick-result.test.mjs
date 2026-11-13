import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const get=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Quick fight result only for ordinary gates and server result',()=>{
 const js=get('dog-tor-map.js');
 assert.match(js,/if\(fight.type!=='mini'&&gate%10!==5\)showQuickFightResult\(gate,fight,!!result.replayed\)/);
 assert.match(js,/const result=await request\('POST','fight',\{requestId:pending\.id,gate:pending\.gate\},account\)/);
 assert.match(js,/showQuickFightResult\(gate,fight,replayed\)/);
 assert.match(js,/if\(details.open\)details.close\(\)/);
 assert.match(js,/if\(!modal.open\)modal.showModal\(\)/);
});
test('Dedicated confirmation modal and unchanged recovery receipt',()=>{
 const js=get('dog-tor-map.js'),html=get('dog-tor-map.html');
 for(const id of ['gate-quick-result','gate-quick-result-title','gate-quick-result-text','gate-quick-result-close'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/const pending=old\|\|\{id:requestId\(\),gate\}/);
 assert.match(js,/if\(!old&&!storePending\(account,pending\)\)/);
 assert.match(js,/clearPending\(account\)/);
 assert.match(html,/dog-tor-map\.js\?v=20261113-boss-gear-50-v1/);
});
