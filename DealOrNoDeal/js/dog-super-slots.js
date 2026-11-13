/* Five-reel DOG Super Slots, exclusively earned by completed DOG season-2 boards.
   Server awards all prizes atomically; this script only presents the receipt. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const base=()=>String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const player=()=>window.SpielOnline?.state?.()?.user;
 const emoji={chest:'📦',pack:'🎴',hammer:'🔨',joker:'🃏',minigame:'🎟️',monster:'👹',cash:'💰',wildcard:'❓'};
 const rarities={rare:'🔹 SELTEN',epic:'💜 EPISCH',legendary:'👑 LEGENDÄR',mythic:'🌈 MYTHISCH'};
 const rarityOf=p=>p.rarity||(p.kind==='wildcard'?'mythic':'common');
 const art={
  chest:{wood:'../dog-chest-art/01_Holzkiste.png',iron:'../dog-chest-art/02_Eisenkiste.png',silver:'../dog-chest-art/03_Silberkiste.png',gold:'../dog-chest-art/04_Goldkiste.png',legendary:'../dog-chest-art/05_Legendaere_Kiste.png'},
  pack:{small:'assets/hats/prize-pack.svg',large:'assets/hats/reward-pack.svg',premium:'assets/hats/reward-pack.svg',platinum:'assets/hats/reward-platinum.svg'},
  hammer:{single:'Weihnachtsevent2/Weihnachtsbilder/hammer-einfach.webp',double:'Weihnachtsevent2/Weihnachtsbilder/hammer-doppel.webp',lucky:'Weihnachtsevent2/Weihnachtsbilder/hammer-glueck.webp'},
  joker:'assets/hats/reward-joker.svg',minigame:'assets/hats/reveal-gift.svg',
  monster:'Weihnachtsevent2/Weihnachtsbilder/file_0000000077288210bd94623e0d40c452.png',
  cash:'assets/hats/reward-cash.svg'
 };
 const imageFor=p=>typeof art[p.kind]==='string'?art[p.kind]:art[p.kind]?.[p.id];
 const cardPath='Weihnachtsevent2/Sammelalbum_Saison_2_Bilder/';
 let spinning=false,lastResult=null;
 const pendingKey=uid=>'dog-s2-super-pending:'+uid;
 const getPending=uid=>{try{return sessionStorage.getItem(pendingKey(uid))}catch{return null}};
 const savePending=(uid,id)=>{try{sessionStorage.setItem(pendingKey(uid),id)}catch{}};
 const clearPending=uid=>{try{sessionStorage.removeItem(pendingKey(uid))}catch{}};
 function element(tag,className,textContent){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(textContent!==undefined)node.textContent=textContent;
  return node;
 }
 function displayArt(prize,container){
  const pic=imageFor(prize);
  if(pic){
   const image=element('img');image.alt='';image.loading='eager';image.decoding='async';
   image.src=pic;image.addEventListener('error',()=>image.replaceWith(element('span','dog-super-prize-art',emoji[prize.kind]||'🎁')),{once:true});
   container.append(image);
  }else container.append(element('span','dog-super-prize-art',emoji[prize.kind]||'🎁'));
 }
 function renderSummary(prizes){
  const summary=$('dog-super-summary'),items=$('dog-super-prizes'),cardsRoot=$('dog-super-cards'),cardsSection=$('dog-super-cards-section');
  const awards=prizes.map(prize=>{
   const tile=element('article','dog-super-prize');tile.dataset.rarity=rarityOf(prize);
   const graphic=element('div','dog-super-prize-art');displayArt(prize,graphic);
   tile.append(graphic,element('strong',null,String(prize.label||'Gewinn')));
   if(rarities[rarityOf(prize)])tile.append(element('small','dog-super-rarity',rarities[rarityOf(prize)]));
   return tile;
  });
  items.replaceChildren(...awards);
  const cards=prizes.filter(prize=>prize.kind==='pack').flatMap(prize=>
   (Array.isArray(prize.openedPacks)?prize.openedPacks:[]).flatMap(pack=>
    (Array.isArray(pack.revealed)?pack.revealed:[]).map(card=>({card,packName:String(pack.packName||'DOG Kartenpaket')}))
   ));
  cardsSection.hidden=cards.length===0;
  const newCount=cards.filter(({card})=>card.isNew===true).length;
  $('dog-super-cards-caption').textContent='🌟 '+newCount+' neu · '+(cards.length-newCount)+' doppelt · alle '+cards.length+' Karten gleichzeitig sichtbar';
  cardsRoot.replaceChildren(...cards.map(({card,packName})=>{
   const tile=element('article','dog-super-card');
   tile.dataset.new=card.isNew?'yes':'no';
   const picture=element('img');picture.loading='eager';picture.decoding='async';
   picture.alt=String(card.name||'DOG Karte');picture.src=cardPath+encodeURIComponent(String(card.image||''));
   tile.append(picture,element('strong',null,String(card.name||'Sammelkarte')),
    element('small',null,card.isNew?'🌟 NEU':'🔁 DOPPELT'),
    element('small',null,packName));
   return tile;
  }));
  summary.hidden=false;
 }
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function animateReceipt(receipt){
  const dialog=$('dog-super-slot-dialog'),reels=$('dog-super-reels'),summary=$('dog-super-summary'),close=$('dog-super-close');
  summary.hidden=true;close.disabled=true;
  const tiles=receipt.prizes.map((prize,i)=>{
   const tile=element('article','dog-super-reel');tile.dataset.phase='rolling';
   const number=element('span','dog-super-label','WALZE '+(i+1));
   const symbol=element('div','dog-super-emoji',emoji[prize.kind]||'🎁');
   const text=element('strong','dog-super-reel-name','DREHT …');
   tile.append(number,symbol,text);return tile;
  });
  reels.replaceChildren(...tiles);
  $('dog-super-phase').textContent='🎰 Fünf Walzen drehen – alle Gewinne sind bereits sicher gutgeschrieben!';
  if(!dialog.open)dialog.showModal();
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  for(let i=0;i<receipt.prizes.length;i++){
   await wait(reduced?120:600);
   const tile=tiles[i],prize=receipt.prizes[i];
   tile.dataset.phase='won';tile.dataset.rarity=rarityOf(prize);
   tile.children[1].replaceChildren();displayArt(prize,tile.children[1]);
   tile.children[2].textContent=String(prize.label||'Gewinn');
   if(rarities[rarityOf(prize)])tile.append(element('small','dog-super-rarity',rarities[rarityOf(prize)]));
   $('dog-super-phase').textContent='✨ '+(i+1)+' von 5 Gewinnen sichtbar';
  }
  $('dog-super-phase').textContent='🎉 Alle fünf Gewinne! In zwei Sekunden erscheint deine Gesamtübersicht.';
  await wait(2000);
  renderSummary(receipt.prizes);
  $('dog-super-phase').textContent='🎁 Alle Gewinne und DOG-Sammelkarten auf einen Blick.';
  close.disabled=false;close.focus({preventScroll:true});
 }
 async function play(resume=false){
  const user=player();if(!user?.getIdToken||spinning)return;
  const startButton=$('dog-super-play');
  if(!resume&&!(window.DogAlbumSeason2?.superTickets?.()>0))return;
  const uid=user.uid,stored=getPending(uid);
  const requestId=stored||'dog_super_'+Date.now()+'_'+Math.random().toString(36).slice(2,14);
  savePending(uid,requestId);spinning=true;startButton.disabled=true;
  $('dog-super-status').textContent='🎰 Deine fünf Super-Slot-Gewinne werden sicher gebucht …';
  try{
   const token=await user.getIdToken();
   const response=await fetch(base()+'/api/deal-or-no-deal/christmas/season2/super-slot/play',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({requestId}),cache:'no-store'
   });
   const out=await response.json();
   if(!response.ok||!out.ok||!Array.isArray(out.prizes)||out.prizes.length!==5)throw Error(out.error||'SUPER_SLOT_FAILED');
   if(player()?.uid!==uid)return;
   lastResult={uid,requestId};
   await animateReceipt(out);
   $('dog-super-status').textContent='✅ Fünf Gewinne gutgeschrieben – alle Karten im gemeinsamen Fenster aufgedeckt.';
  }catch(e){
   if(player()?.uid!==uid)return;
   if(e.message==='SUPER_SLOT_TICKET_REQUIRED')clearPending(uid);
   $('dog-super-status').textContent='⚠️ Super-Slot noch nicht bestätigt: '+(e.message||e)+' · Den Dreh erneut aufrufen ist sicher.';
  }finally{
   spinning=false;
   if(player()?.uid===uid)startButton.disabled=!(window.DogAlbumSeason2?.superTickets?.()>0)||!!lastResult;
  }
 }
 function tryRecover(){
  const user=player();
  if(user?.uid&&getPending(user.uid)&&!spinning&&!$('dog-super-slot-dialog').open)void play(true);
 }
 $('dog-super-play')?.addEventListener('click',()=>void play());
 $('dog-super-close')?.addEventListener('click',()=>{
  if(spinning||!lastResult)return;
  const {uid}=lastResult;lastResult=null;clearPending(uid);
  $('dog-super-slot-dialog').close();
  void window.DogAlbumSeason2?.refresh?.();
 });
 $('dog-super-slot-dialog')?.addEventListener('cancel',event=>{
  if(spinning||$('dog-super-close').disabled)event.preventDefault();
  else{
   if(lastResult?.uid)clearPending(lastResult.uid);
   lastResult=null;void window.DogAlbumSeason2?.refresh?.();
  }
 });
 window.DogSuperSlots={play,tryRecover};
 window.addEventListener('spielonline-change',tryRecover);
 // The album script loads first; restore a pending, already-settled spin
 // even if the auth event fired before this presentation module loaded.
 setTimeout(tryRecover,250);
})();
