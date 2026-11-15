import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DOG_CHRISTMAS_REWARDS,DOG_CHRISTMAS_REWARD_COUNTS,isChristmasRewardLocked} from '../DOG/christmas-reward-locks.js';
import {DOG_COLLECTION_CATEGORIES} from '../DOG/collection-catalog.js';
import {normalizeAppearance} from '../DOG/appearance-registry.js';
import {DOG_EMOJI_STARTERS,loadEmojiSlots,isEmojiUnlocked,DOG_CHRISTMAS_EMOJIS} from '../DOG/dog-emojis.js';
import {isChristmasAvatarUnlocked} from '../DOG/christmas-avatar-catalog.js';
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('all 49 newly added DOG Christmas cosmetics have independent locked rewards',()=>{
 assert.deepEqual(DOG_CHRISTMAS_REWARD_COUNTS,{
  boards:4,backgrounds:5,avatars:20,frames:5,emblems:5,emojis:10
 });
 assert.equal(DOG_CHRISTMAS_REWARDS.length,49);
 assert.equal(new Set(DOG_CHRISTMAS_REWARDS.map(item=>item.id)).size,49);
 assert.equal(new Set(DOG_CHRISTMAS_REWARDS.map(item=>item.unlockId)).size,49);
 for(const item of DOG_CHRISTMAS_REWARDS){
  assert.equal(item.status,'planned',item.name);
  assert.ok(isChristmasRewardLocked(item),item.name);
  assert.ok(isChristmasRewardLocked(item.unlockId),item.name);
  const category=DOG_COLLECTION_CATEGORIES.find(c=>c.id===item.category);
  const visible=category?.items.find(entry=>entry.id===item.id);
  assert.ok(visible,item.name+' missing from gallery');
  assert.equal(visible.unlockId,item.unlockId,item.name);
  assert.equal(visible.status,'planned',item.name+' must never be selectable before the event');
 }
});
test('Christmas lock survives a misleading available state or missing unlockId',()=>{
 const first=DOG_CHRISTMAS_REWARDS[0];
 assert.equal(isChristmasRewardLocked({id:first.id,status:'available'}),true);
 assert.equal(isChristmasRewardLocked({id:'future-item',unlockId:'christmas2026:frame:new',status:'available'}),true);
 assert.equal(isChristmasRewardLocked({id:'frame-current',status:'available'}),false);
});
test('the existing player choices remain locked down',()=>{
 for(const board of DOG_CHRISTMAS_REWARDS.filter(r=>r.category==='boards')){
  assert.notEqual(normalizeAppearance({board:board.id}).board,board.id,board.name);
 }
 assert.ok(DOG_CHRISTMAS_REWARDS.filter(r=>r.category==='avatars').every(x=>!isChristmasAvatarUnlocked(x.id)));
 for(const emoji of DOG_CHRISTMAS_EMOJIS)assert.equal(isEmojiUnlocked(emoji.id),false);
 assert.deepEqual(DOG_EMOJI_STARTERS,['emoji_01','emoji_02','emoji_03']);
 const fakeLocalState=source('../DOG/avatar-picker.js');
 assert.match(fakeLocalState,/const MAX=16/,'Christmas avatars cannot be selected in the avatar picker');
 const lobby=source('../DOG/emoji-lobby.js');
 assert.match(lobby,/button\.disabled=!allowed/,'Christmas emojis stay disabled');
 const collection=source('../DOG/collection.js');
 assert.match(collection,/isChristmasRewardLocked\(item\)/,'collection has a second lock guard');
 assert.match(collection,/btn\.disabled=locked/);
 assert.match(collection,/if\(item\.status!=='available'\|\|isChristmasRewardLocked\(item\)\)return/);
});
