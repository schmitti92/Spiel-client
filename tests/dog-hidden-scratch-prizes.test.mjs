import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../DOG/'+name,import.meta.url),'utf8');
test('collection hides all unearned scratch catalog entries and reveals only verified receipts',()=>{
 const source=file('collection.js');
 const start=source.indexOf('const available=item=>');
 const end=source.indexOf('const canEquip=item=>',start);
 assert.ok(start>0&&end>start);
 const snippet=source.slice(start,end);
 function visible(owned){
  return new Function('isVerifiedCosmeticUnlocked','isChristmasRewardLocked',
   snippet+'\nreturn {available,visibleCollectionItem};')(
    id=>owned.has(id),()=>false);
 }
 const cases=[
  'christmas2026:board:weihnachtsdorf',
  'christmas2026:scene:01',
  'christmas2026:avatar:01',
  'christmas2026:emoji:01',
  'christmas2026:hud-tone:midnight',
  'christmas2026:standard-emoji:emoji_04'
 ];
 const none=visible(new Set());
 for(const unlockId of cases){
  const item={id:'test',name:'Secret',image:'./secret.webp',unlockId,status:'planned'};
  assert.equal(none.visibleCollectionItem(item),false,unlockId);
  assert.equal(visible(new Set([unlockId])).visibleCollectionItem(item),true,unlockId);
 }
 assert.equal(none.visibleCollectionItem({id:'studio',status:'available'}),true);
 assert.match(source,/cat\.items\.filter\(x=>visibleCollectionItem\(x\)/);
 assert.match(source,/cat\.items\.find\(x=>x\.id===picked&&visibleCollectionItem\(x\)\)/);
 assert.match(source,/DOG_COLLECTION_CATEGORIES\.flatMap\(c=>c\.items\)\.filter\(visibleCollectionItem\)/);
 assert.match(source,/const locked=!available\(item\)/,'owned prizes are no longer labelled locked');
});
test('designer and picker do not load unearned cosmetic art or names',()=>{
 const designer=file('design-studio.js');
 const picker=file('board-picker.js');
 const studioEntry=file('design-studio-entry.js');
 assert.match(designer,/SCENES\.filter\(unlockedScene\)/);
 assert.match(designer,/BOARDS\.filter\(k=>validBoard\(k\)&&isBoardUnlocked\(k\)\)/);
 assert.match(designer,/if\(!unlockedTone\(id\)\)continue/);
 assert.match(designer,/renderOwnedOptions\(\);/);
 assert.match(designer,/window\.addEventListener\('dog-cosmetics-verified'/);
 assert.match(picker,/if\(!theme\|\|!isBoardUnlocked\(id\)\)continue/);
 assert.match(picker,/window\.addEventListener\('dog-cosmetics-verified',renderOwnedBoards\)/);
 assert.match(studioEntry,/await refreshVerifiedCosmetics\(\{force:true\}\)/);
 assert.ok(studioEntry.indexOf('await refreshVerifiedCosmetics')<studioEntry.indexOf("await import('./design-studio.js"));
});
test('emoji gallery shows only earned emojis and rechecks after verification',()=>{
 const script=file('emoji-lobby.js');
 assert.match(script,/DOG_EMOJIS\.filter\(item=>isEmojiUnlocked\(item\.id\)\)/);
 assert.match(script,/gallery\.replaceChildren\(\.\.\.visibleEmojis\(\)\.slice/);
 assert.match(script,/window\.addEventListener\('dog-cosmetics-verified'/);
 assert.doesNotMatch(script,/DOG_EMOJIS\.slice\(page\*10/);
});
test('switching profiles immediately revokes previous user unlocks even before network response',async()=>{
 const source=file('verified-cosmetics.js').replace(/^export /gm,'');
 let uid='first',responseOwned=['christmas2026:board:weihnachtsdorf'],fetchCount=0;
 const events=[];
 const win={SPIELPORTAL_CONFIG:{apiBase:'https://example.org'},SpielOnline:{state:()=>({
  status:uid?'online':'guest',user:uid?{uid,getIdToken:async()=> 'token-'+uid}:null
 })},addEventListener() {},dispatchEvent(event){events.push(event.type)}};
 const fetch=async()=>{fetchCount++;return {ok:true,json:async()=>({
  ok:true,scratch:{ownedUnlockIds:responseOwned}
 })}};
 const api=new Function('window','fetch','Event','queueMicrotask',
  source+'\nreturn {refreshVerifiedCosmetics,isVerifiedCosmeticUnlocked};')(
  win,fetch,class Event{constructor(type){this.type=type}},()=>{});
 assert.equal(api.isVerifiedCosmeticUnlocked(responseOwned[0]),false);
 await api.refreshVerifiedCosmetics({force:true});
 assert.equal(api.isVerifiedCosmeticUnlocked(responseOwned[0]),true);
 uid='second';responseOwned=[];
 const pending=api.refreshVerifiedCosmetics({force:true});
 assert.equal(api.isVerifiedCosmeticUnlocked('christmas2026:board:weihnachtsdorf'),false,
  'previous player must lose visibility synchronously');
 await pending;
 assert.equal(api.isVerifiedCosmeticUnlocked('christmas2026:board:weihnachtsdorf'),false);
 assert.equal(fetchCount,2);
 assert.ok(events.includes('dog-cosmetics-verified'));
});
