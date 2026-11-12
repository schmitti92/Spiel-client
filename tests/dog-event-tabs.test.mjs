import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const names=['dog-expedition.html','dog-tor-map.html','dog-forge.html','dog-ascension.html','dog-boss10.html','dog-group-boss.html','dog-boss.html','dog-private-preview.html'];
test('All expedition areas load the same tabs',()=>{
 for(const name of names){
  const html=fs.readFileSync(new URL(name,root),'utf8');
  assert.match(html,/dog-event-tabs\.css\?v=/,name);
  assert.match(html,/dog-event-tabs\.js\?v=/,name);
 }
});
test('Tab destinations exist and navigation does not request additional data',()=>{
 const script=fs.readFileSync(new URL('dog-event-tabs.js',root),'utf8');
 for(const name of [...names,'hub-lobby.html','DealOrNoDeal/lobby.html']){
  assert.ok(fs.existsSync(new URL(name,root)),name);
 }
 assert.doesNotMatch(script,/\bfetch\s*\(|onSnapshot|getIdToken|firebase|firestore/i);
 assert.match(script,/groupBosses\.some/);
});
