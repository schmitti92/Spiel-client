import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DOG_COLLECTION_CATEGORIES,dogCollectionCategory,dogCollectionStats} from '../DOG/collection-catalog.js';
import {BOARD_STYLES,SCENE_STYLES,PIECE_STYLES,CARD_STYLES,HUD_TONES,HUD_LAYOUTS} from '../DOG/appearance-registry.js';
import {DOG_EMOJIS,DOG_EMOJI_STARTERS,DOG_CHRISTMAS_EMOJIS} from '../DOG/dog-emojis.js';
import {buildDogCollection} from '../DOG/collection-extensions.js';
import {DOG_CHRISTMAS_REWARDS,isChristmasRewardLocked,DOG_CHRISTMAS_REWARD_COUNTS} from '../DOG/christmas-reward-locks.js';
const text=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('DOG collection distinguishes real selections from locked event previews',()=>{
 assert.equal(DOG_COLLECTION_CATEGORIES.length,9);
 const names=DOG_COLLECTION_CATEGORIES.map(c=>c.id);
 assert.equal(new Set(names).size,names.length);
 for(const c of DOG_COLLECTION_CATEGORIES){
  assert.equal(new Set(c.items.map(i=>i.id)).size,c.items.length,c.id);
  assert.ok(c.items.length,c.id);
  const s=dogCollectionStats(c);
  assert.equal(s.total,c.items.length);
  assert.equal(s.available+s.planned,s.total);
  assert.ok(c.items.every(i=>['available','planned'].includes(i.status)));
  assert.ok(c.items.every(i=>['appearance','avatar','emoji','default','nameFrame','activeIcon','event','cardEdition'].includes(i.kind)));
  assert.ok(c.items.filter(i=>i.status==='planned').every(i=>i.unlockId||i.minPlayerLevel>=1),'locked previews lack entitlement IDs: '+c.id+' '+c.items.filter(i=>i.status==='planned'&&!i.unlockId).map(i=>i.id).join(','));
 }
 const overall=dogCollectionStats();
 assert.equal(overall.total,DOG_COLLECTION_CATEGORIES.reduce((sum,c)=>sum+c.items.length,0));
 assert.equal(dogCollectionCategory('missing').id,'backgrounds');
});
test('Collection registers actual selectable designs without inventing past unlocks',()=>{
 const look=id=>dogCollectionCategory(id);
 assert.equal(look('boards').items.length,Object.keys(BOARD_STYLES).length-1,'missing royal-marmor art stays hidden');
 assert.equal(look('backgrounds').items.filter(x=>x.status==='available').length,2);
 assert.equal(look('backgrounds').items.filter(x=>x.status==='planned').length,10);
 assert.equal(look('pieces').items.filter(x=>x.status==='available').length,Object.keys(PIECE_STYLES).length);
 assert.equal(look('cards').items.filter(x=>x.status==='available').length,2,'classic and Sternenportal are available');
 assert.equal(look('cards').items.filter(x=>x.status==='planned').length,3);
 assert.deepEqual(look('cards').items.map(x=>x.id),['classic','kartendesign-02','kartendesign-03','kartendesign-04','kartendesign-05']);
 assert.ok(look('cards').items.filter(x=>x.status==='planned').every(x=>x.kind==='cardEdition'&&(x.unlockId?.startsWith('christmas2026:cards:')||x.minPlayerLevel===20)));
 assert.equal(look('cards').items.find(x=>x.id==='kartendesign-05').minPlayerLevel,20);
 assert.ok(look('cards').items.filter(x=>x.status==='planned').every(x=>x.image?.endsWith('/normiert/9.png')));
 assert.match(look('cards').items[0].image,/kartendesign-01\/normiert\/9\.png$/);
 assert.ok(look('cards').items.every(x=>x.cardEdition),'each published deck must have real card artwork');
 assert.equal(look('hud').items.filter(x=>x.status==='available').length,1+Object.keys(HUD_LAYOUTS).length);
 assert.equal(look('hud').items.filter(x=>x.status==='planned').length,16);
 assert.equal(look('avatars').items.filter(x=>x.status==='available').length,16);
 assert.equal(look('emblems').items.filter(x=>x.status==='available').length,1);
 assert.equal(DOG_COLLECTION_CATEGORIES.some(x=>x.id==='effects'),false);
 assert.equal(look('frames').items.filter(x=>x.status==='available').length,1);
 assert.equal(look('emblems').items.filter(x=>x.status==='available').length,1);
 assert.ok(look('frames').items.some(x=>x.status==='planned'));
 assert.ok(look('emblems').items.some(x=>x.status==='planned'));
});
test('Christmas card editions are registered as verified-only reward previews',()=>{
 const rewardEntries=DOG_CHRISTMAS_REWARDS.filter(x=>x.category==='cards');
 assert.equal(rewardEntries.length,2);
 assert.equal(DOG_CHRISTMAS_REWARD_COUNTS.cards,2);
 for(const card of dogCollectionCategory('cards').items.filter(x=>x.status==='planned'&&x.unlockId)){
  assert.ok(isChristmasRewardLocked(card));
  assert.ok(rewardEntries.some(r=>r.id===card.id&&r.unlockId===card.unlockId));
 }
});

test('all HUD color tiles use real theme tokens and support large preview',()=>{
 const hud=dogCollectionCategory('hud').items;
 const toneItems=hud.filter(item=>item.field==='hudTone');
 assert.equal(toneItems.length,Object.keys(HUD_TONES).length);
 for(const item of toneItems){
  const tone=HUD_TONES[item.value];
  assert.deepEqual(item.hudTheme,tone,item.name+' should use the actual HUD palette values');
  assert.match(item.hudTheme.swatch,/^#[0-9a-f]{6}$/i);
  assert.ok(item.hudTheme.panel&&item.hudTheme.seat&&item.hudTheme.button&&item.hudTheme.border);
 }
 const layoutItems=hud.filter(item=>item.field==='hudLayout');
 assert.equal(layoutItems.length,Object.keys(HUD_LAYOUTS).length);
 assert.ok(layoutItems.every(item=>!item.hudTheme),'a layout is not a color theme');
 const page=text('../DOG/collection.js'),styles=text('../DOG/collection.css');
 assert.match(page,/if\(item\.hudTheme\)/);
 assert.match(page,/--hud-preview-/);
 assert.match(styles,/\.collection-hud-tone-preview/);
 assert.match(styles,/\.detail-image \.collection-hud-tone-preview/);
});

test('three starter emojis stay free while 47 classic and 10 Christmas emojis require a reward',()=>{
 const entries=dogCollectionCategory('emojis').items;
 assert.ok(DOG_EMOJIS.length>=DOG_EMOJI_STARTERS.length+DOG_CHRISTMAS_EMOJIS.length);
 assert.equal(DOG_EMOJI_STARTERS.length,3);
 assert.equal(entries.length,DOG_EMOJIS.length);
 assert.equal(entries.filter(x=>x.status==='planned').length,DOG_EMOJIS.length-DOG_EMOJI_STARTERS.length);
 assert.equal(entries.filter(x=>x.unlockId?.startsWith('christmas2026:standard-emoji:')).length,47);
 assert.deepEqual(entries.filter(x=>x.status==='available').map(x=>x.id),[...DOG_EMOJI_STARTERS]);
});
test('Lobby buttons and collection page remain navigable without changing DOG game rules',()=>{
 const hub=text('../hub-lobby.html'),local=text('../spielauswahl-lokal.html');
 const html=text('../DOG/sammlung.html'),js=text('../DOG/collection.js');
 assert.match(hub,/data-dog-collection-link/);
 assert.match(local,/data-dog-collection-link/);
 assert.match(html,/id="collection-grid"/);
 assert.match(html,/id="collection-detail-content"/);
 assert.match(html,/src="\.\/collection\.js\?v=\d+"/);
 assert.doesNotMatch(html,/data-filter="planned"/);
 assert.match(html,/data-filter="active"/);
 assert.match(js,/saveAppearance\(/);
 assert.match(js,/saveEmojiSlots\(/);
 assert.match(js,/if\(!canEquip\(item\)\)return/);
 assert.match(js,/isVerifiedCosmeticUnlocked\(item\.unlockId\)/);
 assert.match(js,/returnPage\(/);
});

test('extensions can later add content without fake published rewards',()=>{
 const base=DOG_COLLECTION_CATEGORIES;
 const updated=buildDogCollection(base,
  [{id:'banners',title:'Banner',icon:'🎗️',subtitle:'Zukünftige Banner',items:[]}],
  [{category:'frames',id:'event-winter-ice',name:'Eisrahmen',status:'planned',icon:'❄️',
    image:'./assets/events/winter-2027/ice-frame.webp',description:'Winterevent'},
   {category:'banners',id:'event-winter-banner',name:'Winterbanner',status:'planned',icon:'🎗️'}]);
 assert.equal(updated.length,base.length+1);
 assert.equal(updated.find(x=>x.id==='banners').items.length,1);
 assert.equal(updated.find(x=>x.id==='frames').items.length,base.find(x=>x.id==='frames').items.length+1);
 assert.equal(updated.find(x=>x.id==='frames').items.at(-1).status,'planned');
 assert.equal(updated.find(x=>x.id==='frames').items.at(-1).kind,'event');
 assert.equal(dogCollectionStats().total,base.flatMap(x=>x.items).length,'base catalog unchanged');
 assert.throws(()=>buildDogCollection(base,[],[
  {category:'frames',id:'event-free',name:'Fake Grant',status:'available'}]),/INVALID_EXTENSION_ITEM/);
 assert.throws(()=>buildDogCollection(base,[],[
  {category:'frames',id:'event-winter-ice',name:'Unsafe image',status:'planned',image:'https://example.com/picture.png'}]),/INVALID_EXTENSION_ITEM/);
 assert.throws(()=>buildDogCollection(base,[],[
  {category:'frames',id:'frame-current',name:'Duplicate',status:'planned'}]),/INVALID_EXTENSION_ITEM/);
 assert.throws(()=>buildDogCollection(base,[{id:'frames',title:'Duplicate'}]),/INVALID_CATEGORY/);
});
