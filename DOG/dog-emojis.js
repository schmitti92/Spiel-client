import {isVerifiedCosmeticUnlocked} from './verified-cosmetics.js?v=1';
/* DOG emoji catalog & personal quickbar; visual preferences only.
   3 starter emojis, 50 stable slots reserved for future event rewards.
   No Firestore writes, sockets, or recurring reads in this module. */
export const DOG_EMOJIS=Object.freeze([
 {
  "id": "emoji_01",
  "emoji": "😂",
  "name": "Lachen"
 },
 {
  "id": "emoji_02",
  "emoji": "😱",
  "name": "Schock"
 },
 {
  "id": "emoji_03",
  "emoji": "👏",
  "name": "Applaus"
 },
 {
  "id": "emoji_04",
  "emoji": "❤️",
  "name": "Herz"
 },
 {
  "id": "emoji_05",
  "emoji": "🎉",
  "name": "Feiern"
 },
 {
  "id": "emoji_06",
  "emoji": "😎",
  "name": "Cool"
 },
 {
  "id": "emoji_07",
  "emoji": "🤔",
  "name": "Nachdenken"
 },
 {
  "id": "emoji_08",
  "emoji": "🍀",
  "name": "Glück"
 },
 {
  "id": "emoji_09",
  "emoji": "👑",
  "name": "Krone"
 },
 {
  "id": "emoji_10",
  "emoji": "👋",
  "name": "Winken"
 },
 {
  "id": "emoji_11",
  "emoji": "😡",
  "name": "Wütend"
 },
 {
  "id": "emoji_12",
  "emoji": "🥳",
  "name": "Party"
 },
 {
  "id": "emoji_13",
  "emoji": "🤣",
  "name": "Lachflash"
 },
 {
  "id": "emoji_14",
  "emoji": "🥹",
  "name": "Gerührt"
 },
 {
  "id": "emoji_15",
  "emoji": "😭",
  "name": "Weinen"
 },
 {
  "id": "emoji_16",
  "emoji": "🙈",
  "name": "Oh nein"
 },
 {
  "id": "emoji_17",
  "emoji": "🤩",
  "name": "Begeistert"
 },
 {
  "id": "emoji_18",
  "emoji": "😴",
  "name": "Schlafen"
 },
 {
  "id": "emoji_19",
  "emoji": "🤯",
  "name": "Unglaublich"
 },
 {
  "id": "emoji_20",
  "emoji": "🫶",
  "name": "Liebe"
 },
 {
  "id": "emoji_21",
  "emoji": "💪",
  "name": "Stark"
 },
 {
  "id": "emoji_22",
  "emoji": "🔥",
  "name": "Feuer"
 },
 {
  "id": "emoji_23",
  "emoji": "✨",
  "name": "Magie"
 },
 {
  "id": "emoji_24",
  "emoji": "🌟",
  "name": "Stern"
 },
 {
  "id": "emoji_25",
  "emoji": "🏆",
  "name": "Sieg"
 },
 {
  "id": "emoji_26",
  "emoji": "💎",
  "name": "Diamant"
 },
 {
  "id": "emoji_27",
  "emoji": "🐾",
  "name": "Pfote"
 },
 {
  "id": "emoji_28",
  "emoji": "🐺",
  "name": "Wolf"
 },
 {
  "id": "emoji_29",
  "emoji": "🦁",
  "name": "Löwe"
 },
 {
  "id": "emoji_30",
  "emoji": "🐉",
  "name": "Drache"
 },
 {
  "id": "emoji_31",
  "emoji": "🦄",
  "name": "Einhorn"
 },
 {
  "id": "emoji_32",
  "emoji": "🪽",
  "name": "Flügel"
 },
 {
  "id": "emoji_33",
  "emoji": "❄️",
  "name": "Schnee"
 },
 {
  "id": "emoji_34",
  "emoji": "☃️",
  "name": "Schneemann"
 },
 {
  "id": "emoji_35",
  "emoji": "🎄",
  "name": "Weihnachten"
 },
 {
  "id": "emoji_36",
  "emoji": "🎁",
  "name": "Geschenk"
 },
 {
  "id": "emoji_37",
  "emoji": "🍕",
  "name": "Pizza"
 },
 {
  "id": "emoji_38",
  "emoji": "🍿",
  "name": "Popcorn"
 },
 {
  "id": "emoji_39",
  "emoji": "☕",
  "name": "Kaffee"
 },
 {
  "id": "emoji_40",
  "emoji": "💤",
  "name": "Müde"
 },
 {
  "id": "emoji_41",
  "emoji": "🤝",
  "name": "Teamwork"
 },
 {
  "id": "emoji_42",
  "emoji": "👍",
  "name": "Daumen hoch"
 },
 {
  "id": "emoji_43",
  "emoji": "👀",
  "name": "Ich sehe"
 },
 {
  "id": "emoji_44",
  "emoji": "💥",
  "name": "Boom"
 },
 {
  "id": "emoji_45",
  "emoji": "🚀",
  "name": "Rakete"
 },
 {
  "id": "emoji_46",
  "emoji": "🧠",
  "name": "Genie"
 },
 {
  "id": "emoji_47",
  "emoji": "🌈",
  "name": "Regenbogen"
 },
 {
  "id": "emoji_48",
  "emoji": "👻",
  "name": "Geist"
 },
 {
  "id": "emoji_49",
  "emoji": "😈",
  "name": "Frech"
 },
 {
  "id": "emoji_50",
  "emoji": "🎯",
  "name": "Volltreffer"
 },
 {
   "id": "emoji_51",
   "emoji": "🎅",
   "name": "Weihnachtsmann",
   "unlockId": "christmas2026:emoji:01"
 },
 {
   "id": "emoji_52",
   "emoji": "🤶",
   "name": "Frau Weihnachtsmann",
   "unlockId": "christmas2026:emoji:02"
 },
 {
   "id": "emoji_53",
   "emoji": "🦌",
   "name": "Rentier Rudolf",
   "unlockId": "christmas2026:emoji:03"
 },
 {
   "id": "emoji_54",
   "emoji": "🧝",
   "name": "Weihnachtswichtel",
   "unlockId": "christmas2026:emoji:04"
 },
 {
   "id": "emoji_55",
   "emoji": "🍪",
   "name": "Weihnachtsplätzchen",
   "unlockId": "christmas2026:emoji:05"
 },
 {
   "id": "emoji_56",
   "emoji": "🛷",
   "name": "Weihnachtsschlitten",
   "unlockId": "christmas2026:emoji:06"
 },
 {
   "id": "emoji_57",
   "emoji": "🔔",
   "name": "Weihnachtsglocke",
   "unlockId": "christmas2026:emoji:07"
 },
 {
   "id": "emoji_58",
   "emoji": "🧦",
   "name": "Nikolausstiefel",
   "unlockId": "christmas2026:emoji:08"
 },
 {
   "id": "emoji_59",
   "emoji": "🎀",
   "name": "Geschenkeschleife",
   "unlockId": "christmas2026:emoji:09"
 },
 {
   "id": "emoji_60",
   "emoji": "⭐",
   "name": "Weihnachtsstern",
   "unlockId": "christmas2026:emoji:10"
 }
].map(item=>Object.freeze(item)));
/** Ten festive preview-only emojis, each with an independent future server-granted entitlement.
 * Presence in the catalogue is NOT ownership; do not unlock via localStorage.
 */
export const DOG_CHRISTMAS_EMOJIS=Object.freeze(DOG_EMOJIS.filter(item=>Boolean(item.unlockId)));
export const DOG_EMOJI_STARTERS=Object.freeze(['emoji_01','emoji_02','emoji_03']);
export const DOG_EMOJI_SLOTS=5;
const STORAGE_KEY='spielportal:dog:emoji-bar:v1';
const cleanSlots=slots=>{
 const used=new Set();
 return Array.from({length:DOG_EMOJI_SLOTS},(_,i)=>{
  const id=Array.isArray(slots)?slots[i]:null;
  if(!isEmojiUnlocked(id)||used.has(id))return null;
  used.add(id);return id;
 });
};
const storage=()=>{try{return localStorage;}catch{return null;}};
const accountKey=()=>String(window.SpielOnline?.state?.()?.user?.uid||'local').slice(0,180);
export const emojiById=id=>DOG_EMOJIS.find(item=>item.id===id)||null;
export const isEmojiUnlocked=id=>{
 if(DOG_EMOJI_STARTERS.includes(id))return true;
 const emoji=DOG_EMOJIS.find(item=>item.id===id);
 if(!emoji)return false;
 return isVerifiedCosmeticUnlocked(emoji.unlockId||'christmas2026:standard-emoji:'+id);
};
export function loadEmojiSlots(){
 try{
  const raw=storage()?.getItem(STORAGE_KEY),data=JSON.parse(raw||'{}');
  const own=data?.[accountKey()];
  return Array.isArray(own)?cleanSlots(own):[...DOG_EMOJI_STARTERS,null,null];
 }catch{return [...DOG_EMOJI_STARTERS,null,null];}
}
export function saveEmojiSlots(slots){
 const clean=cleanSlots(slots);
 try{
  const target=storage(),data=JSON.parse(target?.getItem(STORAGE_KEY)||'{}');
  target?.setItem(STORAGE_KEY,JSON.stringify({...((data&&typeof data==='object'&&!Array.isArray(data))?data:{}),[accountKey()]:clean}));
 }catch{}
 window.dispatchEvent(new CustomEvent('dog-emojis-changed',{detail:{slots:clean}}));
 return clean;
}
