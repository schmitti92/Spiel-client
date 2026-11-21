import {isVerifiedCosmeticUnlocked,isVerifiedDogPlayerLevelAtLeast,isVerifiedNikolausCardConfigured} from './verified-cosmetics.js?v=3';
/** DOG card visuals only. Add future editions here without changing rules, card IDs or online state. */
export const CARD_EDITION='kartendesign-01';
export const CARD_EDITION_STORAGE_KEY='dog:card-edition:v1';
/**
 * Visual-only card editions: register 15 consistently named PNG or SVG cards
 * including the back for each edition. No engine/network changes.
 */
export const CARD_EDITIONS=Object.freeze({
 'kartendesign-01':Object.freeze({
  label:'DOG Royal · Kartendesign 01',
  base:'./assets/karten/kartendesign-01/normiert/',
  width:700,height:980
 }),
 'kartendesign-02':Object.freeze({
  label:'❄️ Winterzauber · Blau',
  base:'./assets/karten/kartendesign-02/normiert/',
  width:1024,height:1536,
  unlockId:'christmas2026:cards:kartendesign-02'
 }),
 'kartendesign-03':Object.freeze({
  label:'🎄 Weihnachtsglanz · Rot-Grün-Gold',
  base:'./assets/karten/kartendesign-03/normiert/',
  width:700,height:980,
  unlockId:'christmas2026:cards:kartendesign-03'
 }),
 'kartendesign-04':Object.freeze({
  label:'✨ Sternenportal · Astralglas',
  base:'./assets/karten/kartendesign-04/vektoren/',
  width:700,height:980,extension:'svg'
 }),
 'kartendesign-05':Object.freeze({
  label:'🎅 Sankt Nikolaus · Rot & Gold',
  base:'./assets/karten/kartendesign-05/normiert/',
  width:700,height:980,extension:'png',minPlayerLevel:20,
  fallbackBase:'./assets/karten/kartendesign-05/vektoren/',fallbackExtension:'svg'
 })
});
/** A registered upload is a preview, not proof of event ownership.
 * Future activation requires an authenticated, per-user Render entitlement. */
export const isCardEditionUnlocked=id=>{
 const entry=CARD_EDITIONS[id];
 return Boolean(entry&&(!entry.unlockId||isVerifiedCosmeticUnlocked(entry.unlockId))&&
  (!entry.minPlayerLevel||isVerifiedDogPlayerLevelAtLeast(entry.minPlayerLevel))&&
  (id!=='kartendesign-05'||isVerifiedNikolausCardConfigured()));
};

export const CARD_FILE_NAMES=Object.freeze({
 '1/11':'1-11','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8',
 '9':'9','10':'10','12':'12','13':'13','swap':'tausch','joker':'joker'
});
export function loadCardEdition(storage=typeof localStorage==='undefined'?null:localStorage){
 try{
  const id=storage?.getItem(CARD_EDITION_STORAGE_KEY);
  return isCardEditionUnlocked(id)?id:CARD_EDITION;
 }catch{return CARD_EDITION;}
}
export function saveCardEdition(id,storage=typeof localStorage==='undefined'?null:localStorage){
 const selected=isCardEditionUnlocked(id)?id:CARD_EDITION;
 try{storage?.setItem(CARD_EDITION_STORAGE_KEY,selected);}catch{}
 return selected;
}
export function cardBackImage(edition=loadCardEdition()){
 const item=CARD_EDITIONS[isCardEditionUnlocked(edition)?edition:CARD_EDITION];
 return item.base+'rueckseite.'+(item.extension||'png');
}
/** CSS image layers: uploaded premium PNG on top, original SVG beneath as fallback. */
export function cardBackBackground(edition=loadCardEdition()){
 const item=CARD_EDITIONS[isCardEditionUnlocked(edition)?edition:CARD_EDITION];
 const main='url("'+item.base+'rueckseite.'+(item.extension||'png')+'")';
 return item.fallbackBase?main+', url("'+item.fallbackBase+'rueckseite.'+(item.fallbackExtension||'svg')+'")':main;
}
export const CARD_ASSET_BASE=CARD_EDITIONS[CARD_EDITION].base;
export const CARD_ASSETS=Object.freeze(Object.fromEntries(Object.entries(CARD_FILE_NAMES).map(([type,file])=>[type,CARD_ASSET_BASE+file+'.png'])));
export const CARD_VISUALS=Object.freeze({
 '1/11':{kind:'home',symbol:'⌂ ➜',caption:'HAUS VERLASSEN'},
 '2':{kind:'number',symbol:'🐾',caption:'2 FELDER'},
 '3':{kind:'number',symbol:'🐾',caption:'3 FELDER'},
 '4':{kind:'reverse',symbol:'⇄',caption:'VOR / ZURÜCK'},
 '5':{kind:'number',symbol:'🐾',caption:'5 FELDER'},
 '6':{kind:'number',symbol:'🐾',caption:'6 FELDER'},
 '7':{kind:'split',symbol:'↙ ↓ ↘',caption:'7 AUFTEILEN'},
 '8':{kind:'number',symbol:'🐾',caption:'8 FELDER'},
 '9':{kind:'number',symbol:'🐾',caption:'9 FELDER'},
 '10':{kind:'number',symbol:'🐾',caption:'10 FELDER'},
 '12':{kind:'number',symbol:'🐾',caption:'12 FELDER'},
 '13':{kind:'home',symbol:'⌂ ➜',caption:'HAUS VERLASSEN'},
 'swap':{kind:'swap',symbol:'🔴 ⇄ 🔵',caption:'FIGUREN TAUSCHEN'},
 'joker':{kind:'wild',symbol:'★',caption:'FREIE KARTENWAHL'}
});
/** Can later be replaced by a registered edition with per-card asset paths. */
export function cardVisual(type,edition=loadCardEdition()){
 const item=CARD_VISUALS[type]||{kind:'number',symbol:'🐾',caption:'KARTE'};
 const selected=isCardEditionUnlocked(edition)?edition:CARD_EDITION;
 const file=CARD_FILE_NAMES[type];
 const entry=CARD_EDITIONS[selected];
 return {...item,edition:selected,
  image:file?entry.base+file+'.'+(entry.extension||'png'):null,
  fallbackImage:file&&entry.fallbackBase?entry.fallbackBase+file+'.'+(entry.fallbackExtension||'svg'):null};
}
export function cardMarkup(type,{tag='button',selected=false,extraClass='',attrs='',footer=null}={}){
 const c=cardVisual(type);
 const value=type==='swap'?'⇄':type==='joker'?'★':type;
 const safe=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const fallback=c.fallbackImage?' data-fallback="'+safe(c.fallbackImage)+'"':'';
 const art=c.image?'<img class="dog-card-art" src="'+safe(c.image)+'"'+fallback+' alt="" loading="eager" onload="this.parentNode.classList.add(&quot;has-dog-art&quot;)" onerror="if(this.dataset.fallback){const path=this.dataset.fallback;delete this.dataset.fallback;this.src=path;}else this.remove()">':'';
 const inner=art+'<span class="dog-card-top"><span>'+safe(value)+'</span><span>✦</span></span><span class="dog-card-main"><span class="dog-card-value">'+safe(value)+'</span><span class="dog-card-symbol">'+safe(c.symbol)+'</span></span><span class="dog-card-footer">'+safe(footer||c.caption)+'</span>';
 return '<'+tag+' class="playing-card dog-designed '+(selected?'picked ':'')+safe(extraClass)+'" data-card-kind="'+safe(c.kind)+'" data-card-edition="'+safe(c.edition)+'" '+attrs+'>'+inner+'</'+tag+'>';
}
