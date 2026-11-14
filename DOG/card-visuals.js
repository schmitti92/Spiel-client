/** DOG card visuals only. Add future editions here without changing rules, card IDs or online state. */
export const CARD_EDITION='kartendesign-01';
export const CARD_EDITION_STORAGE_KEY='dog:card-edition:v1';
/**
 * Visual-only card editions: to add Kartendesign 02, create a new folder of
 * 15 normalized PNGs and register ONE new entry here. No engine/network edits.
 */
export const CARD_EDITIONS=Object.freeze({
 'kartendesign-01':Object.freeze({
  label:'DOG Royal · Kartendesign 01',
  base:'./assets/karten/kartendesign-01/normiert/',
  width:700,height:980
 })
});
export const CARD_FILE_NAMES=Object.freeze({
 '1/11':'1-11','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8',
 '9':'9','10':'10','12':'12','13':'13','swap':'tausch','joker':'joker'
});
export function loadCardEdition(storage=typeof localStorage==='undefined'?null:localStorage){
 try{
  const id=storage?.getItem(CARD_EDITION_STORAGE_KEY);
  return id&&Object.hasOwn(CARD_EDITIONS,id)?id:CARD_EDITION;
 }catch{return CARD_EDITION;}
}
export function saveCardEdition(id,storage=typeof localStorage==='undefined'?null:localStorage){
 const selected=Object.hasOwn(CARD_EDITIONS,id)?id:CARD_EDITION;
 try{storage?.setItem(CARD_EDITION_STORAGE_KEY,selected);}catch{}
 return selected;
}
export function cardBackImage(edition=loadCardEdition()){
 const item=CARD_EDITIONS[edition]||CARD_EDITIONS[CARD_EDITION];
 return item.base+'rueckseite.png';
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
 const selected=Object.hasOwn(CARD_EDITIONS,edition)?edition:CARD_EDITION;
 const file=CARD_FILE_NAMES[type];
 return {...item,edition:selected,image:file?CARD_EDITIONS[selected].base+file+'.png':null};
}
export function cardMarkup(type,{tag='button',selected=false,extraClass='',attrs='',footer=null}={}){
 const c=cardVisual(type);
 const value=type==='swap'?'⇄':type==='joker'?'★':type;
 const safe=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const art=c.image?'<img class="dog-card-art" src="'+safe(c.image)+'" alt="" loading="eager" onload="this.parentNode.classList.add(&quot;has-dog-art&quot;)" onerror="this.remove()">':'';
 const inner=art+'<span class="dog-card-top"><span>'+safe(value)+'</span><span>✦</span></span><span class="dog-card-main"><span class="dog-card-value">'+safe(value)+'</span><span class="dog-card-symbol">'+safe(c.symbol)+'</span></span><span class="dog-card-footer">'+safe(footer||c.caption)+'</span>';
 return '<'+tag+' class="playing-card dog-designed '+(selected?'picked ':'')+safe(extraClass)+'" data-card-kind="'+safe(c.kind)+'" '+attrs+'>'+inner+'</'+tag+'>';
}
