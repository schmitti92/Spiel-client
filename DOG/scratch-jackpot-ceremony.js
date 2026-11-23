/**
 * DOG Lichtertal scratch jackpot reveal. Presentation only:
 * prizes are already committed by Render before this module is called.
 * Never creates entitlements, changes balances or calls an API.
 */
import {CHRISTMAS_AVATARS} from './christmas-avatar-catalog.js?v=1';
import {CHRISTMAS_PAGE_BACKGROUNDS} from './christmas-background-catalog.js?v=1';
import {CHRISTMAS_ACTIVE_ICONS} from './christmas-activeicon-catalog.js?v=1';
import {CHRISTMAS_NAME_FRAMES} from './christmas-nameframe-catalog.js?v=1';
import {BOARD_STYLES,HUD_TONES} from './appearance-registry.js?v=28';
import {CARD_EDITIONS} from './card-visuals.js?v=13';

/** Select only server-reported main prizes; never infer a prize from glyphs. */
export function scratchJackpotRewards(receipt){
 if(!receipt||typeof receipt!=='object')return [];
 const wins=Array.isArray(receipt.winnings)?receipt.winnings:
  receipt.type==='unlock'?[{type:'unlock',prize:receipt.prize}]:
  receipt.type==='coins'?[{type:'coins',amount:receipt.amount}]:[];
 const unlocks=wins.filter(w=>w?.type==='unlock'&&w.prize?.unlockId)
  .map(w=>({type:'unlock',prize:w.prize}));
 const total=Number.isSafeInteger(receipt.totalCoins)&&receipt.totalCoins>0?
  receipt.totalCoins:wins.filter(w=>w?.type==='coins'&&Number.isSafeInteger(w.amount))
   .reduce((n,w)=>n+w.amount,0);
 const special=receipt.rareMainMultiplier===true||
  (receipt.board?.variantId==='dog_jackpot_9'&&wins.some(w=>w?.type==='coins'||w?.type==='unlock'))||
  wins.some(w=>w?.milestone==='tic-jackpot');
 const high=wins.filter(w=>w?.type==='coins'&&Number.isSafeInteger(w.amount)&&w.amount>=2000);
 const money=special?total:high.reduce((n,w)=>n+w.amount,0);
 // Merge money awards into one ceremony slide, rather than eight slides from DOG.
 if(money>0)(unlocks.length||money>=2000||special)&&unlocks.push({type:'coins',amount:money});
 return unlocks;
}
export function scratchJackpotPreview(reward){
 if(reward?.type==='coins')return {title:(reward.amount||0).toLocaleString('de-DE')+' Münzen',category:'Geld-Hauptgewinn',icon:'💰',image:null};
 const prize=reward?.prize||{};
 const id=typeof prize.unlockId==='string'?prize.unlockId:'';
 const avatar=CHRISTMAS_AVATARS.find(item=>item.unlockId===id);
 const scene=CHRISTMAS_PAGE_BACKGROUNDS.find(item=>item.unlockId===id);
 const board=Object.values(BOARD_STYLES).find(item=>item.unlockId===id);
 const cards=Object.values(CARD_EDITIONS).find(item=>item.unlockId===id);
 const emblem=CHRISTMAS_ACTIVE_ICONS.find(item=>item.unlockId===id);
 const frame=CHRISTMAS_NAME_FRAMES.find(item=>item.unlockId===id);
 const toneId=id.startsWith('christmas2026:hud-tone:')?id.slice('christmas2026:hud-tone:'.length):'';
 const tone=HUD_TONES[toneId];
 const image=avatar?.image||scene?.image||board?.image||
  (cards?.base?cards.base+'7.'+(cards.extension||'png'):null);
 const categories={
  avatars:'Profilbild',backgrounds:'Hintergrund',boards:'Spielbrett',
  cards:'Kartendesign',activeicons:'Aktivsymbol',emblems:'Aktivsymbol',
  nameframes:'Namensrahmen',frames:'Namensrahmen',emoji:'Emoji',
  emojis:'Emoji','hud-tone':'Blockfarbe'
 };
 const category=avatar?'Profilbild':scene?'Hintergrund':board?'Spielbrett':
  cards?'Kartendesign':emblem?'Aktivsymbol':frame?'Namensrahmen':
  tone?'Blockfarbe':categories[prize.category]||'Freischaltung';
 return {
  title:String(prize.name||'Neue Freischaltung'),
  category,icon:String(prize.icon||emblem?.icon||frame?.frameIcon||'🎁'),
  image:image||null,
  swatch:tone?.swatch||null
 };
}

export function createScratchJackpotCeremony({onAccept,root=document.body}={}){
 let dialog=null,box=null,acceptButton=null,art=null,caption=null,category=null,
  title=null,confetti=null,count=null,entries=[],index=0,phase='closed',openingTimer=null,
  revealTimer=null,activeReceipt=null,returnFocus=null;
 const timerClear=()=>{clearTimeout(openingTimer);clearTimeout(revealTimer);openingTimer=null;revealTimer=null;};
 function mount(){
  if(dialog)return;
  dialog=document.createElement('dialog');
  dialog.id='scratch-jackpot-ceremony';
  dialog.className='scratch-jackpot-dialog';
  dialog.setAttribute('aria-labelledby','scratch-jackpot-title');
  dialog.setAttribute('aria-describedby','scratch-jackpot-caption');
  dialog.innerHTML=
   '<div class="scratch-jackpot-scene" data-jackpot-phase="arrival">'+
    '<div class="scratch-jackpot-rays" aria-hidden="true"></div>'+
    '<div class="scratch-jackpot-confetti" aria-hidden="true"></div>'+
    '<div class="scratch-jackpot-content">'+
     '<span class="scratch-jackpot-overline">✦ DAS WEIHNACHTSWUNDER VON LICHTERTAL ✦</span>'+
     '<h2 id="scratch-jackpot-title">🏆 HAUPTGEWINN!</h2>'+
     '<p id="scratch-jackpot-caption">Eine magische Überraschung wartet auf dich!</p>'+
     '<button type="button" class="scratch-jackpot-gift" aria-label="Geschenkbox öffnen">'+
      '<span class="scratch-jackpot-lid"></span>'+
      '<span class="scratch-jackpot-box"><span class="scratch-jackpot-bow">✦</span></span>'+
      '<span class="scratch-jackpot-gift-shadow"></span>'+
     '</button>'+
     '<div class="scratch-jackpot-reward" aria-live="polite">'+
      '<div class="scratch-jackpot-art"></div>'+
      '<strong class="scratch-jackpot-reward-title"></strong>'+
      '<span class="scratch-jackpot-reward-category"></span>'+
      '<p class="scratch-jackpot-granted">✓ Bereits sicher deinem Profil gutgeschrieben</p>'+
     '</div>'+
     '<small class="scratch-jackpot-count" aria-live="polite"></small>'+
     '<button type="button" class="scratch-jackpot-accept" hidden>🎁 Gewinn annehmen</button>'+
    '</div>'+
   '</div>';
  root.append(dialog);
  box=dialog.querySelector('.scratch-jackpot-gift');
  acceptButton=dialog.querySelector('.scratch-jackpot-accept');
  art=dialog.querySelector('.scratch-jackpot-art');
  title=dialog.querySelector('.scratch-jackpot-reward-title');
  category=dialog.querySelector('.scratch-jackpot-reward-category');
  caption=dialog.querySelector('#scratch-jackpot-caption');
  confetti=dialog.querySelector('.scratch-jackpot-confetti');
  count=dialog.querySelector('.scratch-jackpot-count');
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(phase!=='revealed')openGift();});
  box.addEventListener('click',openGift);
  acceptButton.addEventListener('click',accept);
 }
 function rain(){
  if(!confetti)return;
  confetti.replaceChildren();
  if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const colors=['#ffe393','#ec6d78','#8be7f2','#fff','#bb89ee','#8ee6a5'];
  const fragment=document.createDocumentFragment();
  for(let i=0;i<85;i++){
   const piece=document.createElement('i');
   piece.style.setProperty('--j-x',(i*73%100)+'%');
   piece.style.setProperty('--j-delay',(i*29%17/20)+'s');
   piece.style.setProperty('--j-duration',(2.1+(i*19%13)/10)+'s');
   piece.style.setProperty('--j-color',colors[i%colors.length]);
   piece.style.setProperty('--j-rotate',((i*47)%720-360)+'deg');
   fragment.append(piece);
  }
  confetti.append(fragment);
 }
 function paint(){
  const reward=entries[index],preview=scratchJackpotPreview(reward);
  art.replaceChildren();
  art.className='scratch-jackpot-art';
  if(preview.image){
   const img=document.createElement('img');
   img.alt=preview.title;
   img.src=preview.image; // only from repository-maintained catalogues
   img.decoding='async';
   img.addEventListener('error',()=>{img.remove();art.textContent=preview.icon;art.classList.add('is-icon');},{once:true});
   art.append(img);
  }else if(preview.swatch){
   art.classList.add('is-swatch');
   const swatch=document.createElement('span');
   swatch.style.backgroundColor=preview.swatch;
   swatch.textContent=preview.icon;art.append(swatch);
  }else{
   art.classList.add('is-icon');
   art.textContent=preview.icon;
  }
  title.textContent=preview.title;
  category.textContent=preview.category+' · Neu freigeschaltet';
  if(reward.type==='coins')category.textContent='Geldgewinn · Bereits gutgeschrieben';
  caption.textContent=reward.type==='coins'?'Ein funkelnder Geld-Hauptgewinn!':'Du hast eine besondere Belohnung freigeschaltet!';
  count.textContent=entries.length>1?'Überraschung '+(index+1)+' von '+entries.length:'';
 }
 function nextSlide(){
  timerClear();
  phase='arrival';
  dialog.firstElementChild.dataset.jackpotPhase='arrival';
  acceptButton.hidden=true;
  paint();
  rain();
  box.focus({preventScroll:true});
  openingTimer=setTimeout(openGift,950);
 }
 function openGift(){
  if(phase!=='arrival')return;
  timerClear();phase='opening';
  dialog.firstElementChild.dataset.jackpotPhase='opening';
  revealTimer=setTimeout(()=>{
   if(phase!=='opening')return;
   phase='revealed';
   dialog.firstElementChild.dataset.jackpotPhase='revealed';
   acceptButton.hidden=false;
   acceptButton.focus({preventScroll:true});
  },650);
 }
 function dismiss(){
  timerClear();
  phase='closed';entries=[];activeReceipt=null;
  if(dialog?.open)dialog.close();
  confetti?.replaceChildren();
  const focus=returnFocus;returnFocus=null;
  if(focus?.isConnected&&!focus.closest('[hidden]'))focus.focus({preventScroll:true});
 }
 function accept(){
  if(phase!=='revealed')return;
  if(index<entries.length-1){index++;nextSlide();return;}
  dismiss();
  if(typeof onAccept==='function')onAccept();
 }
 function show(receipt){
  const list=scratchJackpotRewards(receipt);
  if(!list.length||dialog?.open)return false;
  mount();
  returnFocus=document.activeElement;
  entries=list;index=0;activeReceipt=receipt;
  dialog.showModal();
  nextSlide();
  return true;
 }
 return {show,dismiss,isOpen:()=>Boolean(dialog?.open)};
}
