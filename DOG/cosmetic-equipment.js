/**
 * DOG earned cosmetic equipment. This stores choices, NOT ownership.
 * A verified server unlock is required before a local selection is used.
 * Online room mutations are separately checked by Render in a transaction.
 */
import {isVerifiedCosmeticUnlocked} from './verified-cosmetics.js?v=3';
import {CHRISTMAS_NAME_FRAMES} from './christmas-nameframe-catalog.js?v=1';
import {CHRISTMAS_ACTIVE_ICONS} from './christmas-activeicon-catalog.js?v=1';

export const DOG_COSMETIC_EQUIPMENT_KEY='dog:earned-equipment:v1';
const catalogs={nameFrame:CHRISTMAS_NAME_FRAMES,activeIcon:CHRISTMAS_ACTIVE_ICONS};
const currentUid=()=>typeof window!=='undefined'?String(window.SpielOnline?.state?.()?.user?.uid||''):'';
export function dogCosmeticDefinition(kind,id){
 return catalogs[kind]?.find(item=>item.unlockId===id)||null;
}
export function validDogCosmetic(kind,id){
 return id===null||!!dogCosmeticDefinition(kind,id);
}
function storageRead(storage){
 try{const value=JSON.parse(storage?.getItem(DOG_COSMETIC_EQUIPMENT_KEY)||'null');
  return value&&typeof value==='object'?value:{};}catch{return {};}
}
function recordFor(kind,{local=false,seat=0,uid=currentUid(),storage=typeof localStorage!=='undefined'?localStorage:null}={}){
 if(!uid||!catalogs[kind])return {exists:false,value:undefined};
 const record=storageRead(storage),data=local?
  record.local?.[uid]?.[seat]:record.online?.[uid];
 return data&&Object.hasOwn(data,kind)?{exists:true,value:data[kind]}:{exists:false,value:undefined};
}
export function readPreferredDogCosmetic(kind,options={}){
 const {exists,value}=recordFor(kind,options);
 if(!exists)return undefined; // no local preference: do not overwrite another device
 if(value===null)return null;
 return dogCosmeticDefinition(kind,value)&&isVerifiedCosmeticUnlocked(value)?value:undefined;
}
export function equippedDogCosmetic(kind,options={}){
 return readPreferredDogCosmetic(kind,options)??null;
}
export function saveEquippedDogCosmetic(kind,id,{local=false,seat=0,uid=currentUid(),storage=typeof localStorage!=='undefined'?localStorage:null}={}){
 if(!uid||!catalogs[kind]||!validDogCosmetic(kind,id)||
  (id!==null&&!isVerifiedCosmeticUnlocked(id)))return false;
 const all=storageRead(storage);
 const byUser={...(local?all.local:all.online)||{}};
 if(local){
  const array=Array.isArray(byUser[uid])?byUser[uid].slice(0,4):[];
  array[seat]={...(array[seat]||{}),[kind]:id};
  byUser[uid]=array;
 }else byUser[uid]={...(byUser[uid]||{}),[kind]:id};
 const updated={...all,[local?'local':'online']:byUser};
 try{storage?.setItem(DOG_COSMETIC_EQUIPMENT_KEY,JSON.stringify(updated));}
 catch{return false;}
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('dog-equipment-changed',{detail:{kind,id,local,seat}}));
 return true;
}
