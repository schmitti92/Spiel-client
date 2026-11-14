/** DOG card visuals only. Add future editions here without changing rules, card IDs or online state. */
export const CARD_EDITION='kartendesign-01';
export const CARD_ASSET_BASE='./assets/karten/kartendesign-01/';
export const CARD_ASSETS=Object.freeze(Object.fromEntries(['1/11','2','3','4','5','6','7','8','9','10','12','13','swap','joker'].map(type=>[type,CARD_ASSET_BASE+({'1/11':'1-11','swap':'tausch'}[type]||type)+'.png'])));
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
export function cardVisual(type,edition=CARD_EDITION){
 const item=CARD_VISUALS[type]||{kind:'number',symbol:'🐾',caption:'KARTE'};
 return {...item,edition,image:CARD_ASSETS[type]||null};
}
export function cardMarkup(type,{tag='button',selected=false,extraClass='',attrs='',footer=null}={}){
 const c=cardVisual(type);
 const value=type==='swap'?'⇄':type==='joker'?'★':type;
 const safe=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const art=c.image?'<img class="dog-card-art" src="'+safe(c.image)+'" alt="" loading="eager" onload="this.parentNode.classList.add('has-dog-art')" onerror="this.remove()">':'';
 const inner=art+'<span class="dog-card-top"><span>'+safe(value)+'</span><span>✦</span></span><span class="dog-card-main"><span class="dog-card-value">'+safe(value)+'</span><span class="dog-card-symbol">'+safe(c.symbol)+'</span></span><span class="dog-card-footer">'+safe(footer||c.caption)+'</span>';
 return '<'+tag+' class="playing-card dog-designed '+(selected?'picked ':'')+safe(extraClass)+'" data-card-kind="'+safe(c.kind)+'" '+attrs+'>'+inner+'</'+tag+'>';
}
