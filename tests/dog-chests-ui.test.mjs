import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('dog-expedition.html');
const js=read('dog-materials-ui.js');
const css=read('dog-materials.css');

test('Five new expedition chests each have a count and a real open control',()=>{
 for(const [id,label,count] of [
  ['wood','Holzkiste','1–3'],['iron','Eisenkiste','2–5'],
  ['silver','Silberkiste','4–8'],['gold','Goldkiste','6–12'],
  ['legendary','Legendäre Truhe','10–20']
 ]){
  assert.ok(html.includes('id="open-'+id+'"'),id+' missing open button');
  assert.ok(html.includes('id="'+id+'-count"'),id+' missing count');
  assert.ok(html.includes(label));
  assert.ok(html.includes(count+' Rohstoffe'));
  assert.ok(js.includes(id+':{label:'),'missing tier metadata for '+id);
  assert.ok(css.includes('.tier-'+id),'missing visual style for '+id);
 }
 assert.ok(js.includes('EXPEDITION_TIERS'));
 assert.ok(js.includes('inventory?.expeditionChests'));
 assert.ok(js.includes("for(const tier of [...EXPEDITION_TIERS,'small','medium','large','legacy'])"));
});

test('The old three earned chest types and the legacy chest button remain usable',()=>{
 for(const id of ['small','medium','large','legacy']){
  assert.ok(html.includes('id="open-'+id+'"'));
  assert.ok(js.includes('open-'+id) || js.includes("...EXPEDITION_TIERS,'small','medium','large','legacy'"));
 }
 assert.ok(html.includes('Bereits gesammelte ältere Kisten'));
 assert.ok(html.includes('Diese alten Kisten behalten ihren bisherigen Inhalt'));
 assert.ok(js.includes("request('POST','open'"));
 assert.ok(js.includes("request('GET','me'"));
 assert.ok(js.includes('getIdToken'));
});

test('The UI persists the exact request ID before sending a loot-opening request',()=>{
 assert.ok(js.includes('function storePending(uid,id,tier,quantity=1)'));
 assert.ok(js.includes('localStorage.setItem(keyFor(uid),value)'));
 assert.ok(js.includes('localStorage.getItem(keyFor(uid))===value'));
 assert.ok(js.includes('if(!pending&&!storePending(uid,id,requestTier,quantity))'));
 assert.ok(js.includes('clearPending(uid)'));
 assert.ok(js.includes('result.replayed'));
});
