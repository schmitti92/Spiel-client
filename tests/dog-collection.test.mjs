import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DOG_COLLECTION_CATEGORIES,dogCollectionCategory,dogCollectionStats} from '../DOG/collection-catalog.js';
import {BOARD_STYLES,SCENE_STYLES,PIECE_STYLES,CARD_STYLES,HUD_TONES,HUD_LAYOUTS} from '../DOG/appearance-registry.js';
import {DOG_EMOJIS,DOG_EMOJI_STARTERS} from '../DOG/dog-emojis.js';
const text=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('DOG collection lists 10 categories, unique per-category IDs and real availability counts',()=>{
 assert.equal(DOG_COLLECTION_CATEGORIES.length,10);
 const names=DOG_COLLECTION_CATEGORIES.map(c=>c.id);
 assert.equal(new Set(names).size,names.length);
 for(const c of DOG_COLLECTION_CATEGORIES){
  assert.equal(new Set(c.items.map(i=>i.id)).size,c.items.length,c.id);
  assert.ok(c.items.length,c.id);
  const s=dogCollectionStats(c);
  assert.equal(s.total,c.items.length);
  assert.equal(s.available+s.planned,s.total);
  assert.ok(c.items.every(i=>['available','planned'].includes(i.status)));
  assert.ok(c.items.every(i=>i.status==='planned'||i.kind==='appearance'||i.kind==='avatar'||i.kind==='emoji'||i.kind==='default'));
 }
 const overall=dogCollectionStats();
 assert.equal(overall.total,DOG_COLLECTION_CATEGORIES.reduce((sum,c)=>sum+c.items.length,0));
 assert.equal(dogCollectionCategory('missing').id,'backgrounds');
});
test('Collection registers actual selectable designs without inventing past unlocks',()=>{
 const look=id=>dogCollectionCategory(id);
 assert.equal(look('boards').items.filter(x=>x.status==='available').length,Object.keys(BOARD_STYLES).length);
 assert.equal(look('backgrounds').items.filter(x=>x.status==='available').length,Object.keys(SCENE_STYLES).length);
 assert.equal(look('pieces').items.filter(x=>x.status==='available').length,Object.keys(PIECE_STYLES).length);
 assert.equal(look('cards').items.filter(x=>x.status==='available').length,Object.keys(CARD_STYLES).length);
 assert.equal(look('hud').items.filter(x=>x.status==='available').length,Object.keys(HUD_TONES).length+Object.keys(HUD_LAYOUTS).length);
 assert.equal(look('avatars').items.filter(x=>x.status==='available').length,16);
 assert.equal(look('emblems').items.filter(x=>x.status==='available').length,1);
 assert.equal(look('effects').items.filter(x=>x.status==='available').length,0);
 assert.ok(look('frames').items.find(x=>x.id==='frame-elegant').status==='planned');
});
test('50 emoji slots and only three unlocked starters appear in collection',()=>{
 const entries=dogCollectionCategory('emojis').items;
 assert.equal(DOG_EMOJIS.length,50);
 assert.equal(DOG_EMOJI_STARTERS.length,3);
 assert.equal(entries.length,50);
 assert.deepEqual(entries.filter(x=>x.status==='available').map(x=>x.id),[...DOG_EMOJI_STARTERS]);
});
test('Lobby buttons and collection page remain navigable without changing DOG game rules',()=>{
 const hub=text('../hub-lobby.html'),local=text('../spielauswahl-lokal.html');
 const html=text('../DOG/sammlung.html'),js=text('../DOG/collection.js');
 assert.match(hub,/data-dog-collection-link/);
 assert.match(local,/data-dog-collection-link/);
 assert.match(html,/id="collection-grid"/);
 assert.match(html,/id="collection-detail-content"/);
 assert.match(html,/src="\.\/collection\.js\?v=1"/);
 assert.match(js,/saveAppearance\(/);
 assert.match(js,/saveEmojiSlots\(/);
 assert.match(js,/if\(item\.status!=='available'\)return/);
 assert.match(js,/returnPage\(/);
});
