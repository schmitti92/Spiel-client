import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('fight sends backend requestId not local storage id field',()=>{
 const s=get('dog-tor-map.js');
 assert.match(s,/const pending=old\|\|\{id:requestId\(\),gate\}/);
 assert.match(s,/request\('POST','fight',\{requestId:pending\.id,gate:pending\.gate\},account\)/);
 assert.doesNotMatch(s,/request\('POST','fight',pending,account\)/);
 assert.match(s,/if\(retry&&!old\)/);
});
test('fresh client cache token deployed',()=>{
 assert.match(get('dog-tor-map.html'),/dog-tor-map\.js\?v=20261112-quick-finish1/);
});
