/**
 * DOG Weihnachtsbelohnungen 2026: central, read-only preview manifest.
 *
 * Items from Christmas catalogues MUST stay locked until a future authenticated
 * Render endpoint verifies the individual unlockId for the signed-in player.
 * This module intentionally neither reads localStorage nor issues rewards:
 * uploaded artwork, UI previews, URL parameters and progress sliders never
 * constitute proof of ownership.
 */
import {BOARD_STYLES} from './appearance-registry.js?v=23';
import {CHRISTMAS_PAGE_BACKGROUNDS} from './christmas-background-catalog.js?v=1';
import {CHRISTMAS_AVATARS} from './christmas-avatar-catalog.js?v=1';
import {CHRISTMAS_NAME_FRAMES} from './christmas-nameframe-catalog.js?v=1';
import {CHRISTMAS_ACTIVE_ICONS} from './christmas-activeicon-catalog.js?v=1';
import {DOG_CHRISTMAS_EMOJIS} from './dog-emojis.js?v=2';
import {CARD_EDITIONS} from './card-visuals.js?v=8';

const PREFIX='christmas2026:';
const reward=(category,id,name,unlockId)=>{
 if(typeof id!=='string'||!id||typeof unlockId!=='string'||!unlockId.startsWith(PREFIX)){
  throw Error('DOG_CHRISTMAS_REWARD_INVALID');
 }
 return Object.freeze({category,id,name,unlockId,status:'planned'});
};

export const DOG_CHRISTMAS_REWARDS=Object.freeze([
 ...Object.entries(BOARD_STYLES).filter(([,board])=>board.unlockId?.startsWith(PREFIX))
  .map(([id,board])=>reward('boards',id,board.label,board.unlockId)),
 ...CHRISTMAS_PAGE_BACKGROUNDS.map(item=>reward('backgrounds',item.id,item.name,item.unlockId)),
 ...CHRISTMAS_AVATARS.map(item=>reward('avatars',item.id,item.name,item.unlockId)),
 ...CHRISTMAS_NAME_FRAMES.map(item=>reward('frames',item.id,item.name,item.unlockId)),
 ...CHRISTMAS_ACTIVE_ICONS.map(item=>reward('emblems',item.id,item.name,item.unlockId)),
 ...DOG_CHRISTMAS_EMOJIS.map(item=>reward('emojis',item.id,item.name,item.unlockId)),
 ...Object.entries(CARD_EDITIONS).filter(([,entry])=>Boolean(entry.unlockId))
  .map(([id,entry])=>reward('cards',id,entry.label,entry.unlockId))
]);
const ownedIds=new Set(DOG_CHRISTMAS_REWARDS.map(item=>item.id));
const unlockIds=new Set(DOG_CHRISTMAS_REWARDS.map(item=>item.unlockId));
if(ownedIds.size!==DOG_CHRISTMAS_REWARDS.length||unlockIds.size!==DOG_CHRISTMAS_REWARDS.length){
 throw Error('DOG_CHRISTMAS_REWARD_DUPLICATE');
}

/** Fail closed. Christmas items cannot be equipped just because a UI status
 * was changed, an art file exists or localStorage was edited.
 * Future activation needs a per-user Render-validated entitlement check.
 */
export function isChristmasRewardLocked(item){
 if(!item)return false;
 if(typeof item==='string')return unlockIds.has(item)||item.startsWith(PREFIX);
 return ownedIds.has(item.id)||
  (typeof item.unlockId==='string'&&item.unlockId.startsWith(PREFIX));
}
export const DOG_CHRISTMAS_REWARD_COUNTS=Object.freeze(
 Object.fromEntries(['boards','backgrounds','avatars','frames','emblems','emojis','cards'].map(
  category=>[category,DOG_CHRISTMAS_REWARDS.filter(item=>item.category===category).length]
 ))
);
