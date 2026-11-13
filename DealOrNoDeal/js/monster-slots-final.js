'use strict';
// Goldstudio Monster Slots · premium 3-reel finale visual.
// The server settles the prizes. These rolling symbols are purely decorative.
(()=>{'use strict';
const base=()=>String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const user=()=>window.SpielOnline?.state?.()?.user;
const $=id=>document.getElementById(id);
const icons={chest:'📦',pack:'🎴',hammer:'🔨',joker:'🃏',minigame:'🎟️',monster:'👹',cash:'💰',wildcard:'❓'};
const rarityNames={rare:'🔹 SELTEN',epic:'💜 EPISCH',legendary:'👑 LEGENDÄR',mythic:'🌈 MYTHISCHER JACKPOT'};
const rarityOf=p=>p.rarity||((p.kind==='wildcard'||p.kind==='cash'&&p.amountCents>=500000000)?'mythic':p.kind==='chest'&&p.id==='legendary'||p.kind==='pack'&&p.id==='platinum'?'legendary':'common');
const chestArt={wood:'../dog-chest-art/01_Holzkiste.png',iron:'../dog-chest-art/02_Eisenkiste.png',silver:'../dog-chest-art/03_Silberkiste.png',gold:'../dog-chest-art/04_Goldkiste.png',legendary:'../dog-chest-art/05_Legendaere_Kiste.png'};
const awardArt={
 chest:chestArt,
 pack:{small:'assets/slot-premium/slot-pack-silver.png',large:'assets/slot-premium/slot-pack-gold.png',premium:'assets/slot-premium/slot-pack-premium.png',platinum:'assets/hats/reward-platinum.svg'},
 hammer:{single:'assets/slot-premium/slot-hammer.png',double:'assets/slot-premium/slot-doublehammer.png',lucky:'assets/slot-premium/slot-goldhammer.png'},
 joker:'assets/slot-premium/slot-joker.png',
 minigame:'assets/hats/reveal-gift.svg',
 monster:'Weihnachtsevent2/Weihnachtsbilder/file_0000000077288210bd94623e0d40c452.png',
 cash:'assets/slot-premium/slot-money.png',
 wildcard:'assets/slot-premium/slot-question-card.png'
};
const awardImage=prize=>typeof awardArt[prize.kind]==='string'?awardArt[prize.kind]:awardArt[prize.kind]?.[prize.id]||null;
const rolling=['📦','🎴','🔨','🃏','🎟️','👹','💰','💎','❓'];
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const seenKey=id=>'monster-slots-watched:'+String(user()?.uid||'anonymous')+':'+id;
const root=document.createElement('section');root.id='deal-monster-slots';root.hidden=true;root.tabIndex=-1;
root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','monster-slots-title');
root.innerHTML="<div class=\"monster-slot-machine\">\n <div class=\"monster-slot-lights\" aria-hidden=\"true\">✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦</div>\n <div class=\"monster-slot-kicker\">✦ GOLDSTUDIO · DAS GROSSE GEWINNFINALE ✦</div>\n <h2 id=\"monster-slots-title\">🎰 MONSTER SLOTS</h2>\n <p class=\"monster-slot-shared-caption\" aria-live=\"polite\" hidden></p>\n <p class=\"monster-slot-subheading\">3 WALZEN <span aria-hidden=\"true\">◆</span> 3 GARANTIERTE GEWINNE</p>\n <div class=\"monster-slot-ribbon\" aria-hidden=\"true\">✧ &nbsp; JEDER SLOT GEWINNT &nbsp; ✧</div>\n <div class=\"monster-slot-reels\" role=\"group\" aria-label=\"Drei Gewinnwalzen\">\n  <div class=\"monster-slot-reel\" data-reel=\"0\" data-phase=\"ready\">\n   <div class=\"monster-slot-reel-head\"><span class=\"monster-slot-led\"></span>WALZE 01<span class=\"monster-slot-led\"></span></div>\n   <div class=\"monster-slot-window\">\n    <div class=\"monster-slot-track\" aria-hidden=\"true\"></div>\n    <div class=\"monster-slot-prize\" hidden><div class=\"monster-slot-art\"><span class=\"monster-slot-emoji\">🎁</span></div><span class=\"monster-slot-quantity\">1×</span><strong class=\"monster-slot-prize-name\">Dein Gewinn</strong></div>\n    <div class=\"monster-slot-glass\" aria-hidden=\"true\"></div>\n   </div>\n   <div class=\"monster-slot-reel-foot\"><span class=\"monster-slot-state\">BEREIT</span><span aria-hidden=\"true\">✦</span></div>\n  </div>\n  <div class=\"monster-slot-reel\" data-reel=\"1\" data-phase=\"ready\">\n   <div class=\"monster-slot-reel-head\"><span class=\"monster-slot-led\"></span>WALZE 02<span class=\"monster-slot-led\"></span></div>\n   <div class=\"monster-slot-window\">\n    <div class=\"monster-slot-track\" aria-hidden=\"true\"></div>\n    <div class=\"monster-slot-prize\" hidden><div class=\"monster-slot-art\"><span class=\"monster-slot-emoji\">🎁</span></div><span class=\"monster-slot-quantity\">1×</span><strong class=\"monster-slot-prize-name\">Dein Gewinn</strong></div>\n    <div class=\"monster-slot-glass\" aria-hidden=\"true\"></div>\n   </div>\n   <div class=\"monster-slot-reel-foot\"><span class=\"monster-slot-state\">BEREIT</span><span aria-hidden=\"true\">✦</span></div>\n  </div>\n  <div class=\"monster-slot-reel\" data-reel=\"2\" data-phase=\"ready\">\n   <div class=\"monster-slot-reel-head\"><span class=\"monster-slot-led\"></span>WALZE 03<span class=\"monster-slot-led\"></span></div>\n   <div class=\"monster-slot-window\">\n    <div class=\"monster-slot-track\" aria-hidden=\"true\"></div>\n    <div class=\"monster-slot-prize\" hidden><div class=\"monster-slot-art\"><span class=\"monster-slot-emoji\">🎁</span></div><span class=\"monster-slot-quantity\">1×</span><strong class=\"monster-slot-prize-name\">Dein Gewinn</strong></div>\n    <div class=\"monster-slot-glass\" aria-hidden=\"true\"></div>\n   </div>\n   <div class=\"monster-slot-reel-foot\"><span class=\"monster-slot-state\">BEREIT</span><span aria-hidden=\"true\">✦</span></div>\n  </div>\n </div>\n <div class=\"monster-slot-progress\" aria-hidden=\"true\"><span></span><span></span><span></span></div>\n <p id=\"monster-slot-status\" class=\"monster-slot-status\" role=\"status\" aria-live=\"polite\">Deine Gewinne werden geladen …</p>\n <button id=\"monster-slot-accept\" type=\"button\" disabled>🎁 Gewinne bestätigen</button>\n <p class=\"monster-slot-footnote\">Jede Walze gewinnt. Die Preise sind serverseitig gesichert.</p>\n</div>";

document.body.append(root);
const reels=[...root.querySelectorAll('.monster-slot-reel')],lights=[...root.querySelectorAll('.monster-slot-progress span')];
const status=$('monster-slot-status'),accept=$('monster-slot-accept');
const entitledReels=()=>typeof g!=='undefined'?Number(window.dealSlotReelsFor?.(g,user()?.uid)||0):0;
function configureReels(count){
 const n=count===1?1:3;
 root.dataset.reels=String(n);
 for(let i=0;i<reels.length;i++){reels[i].hidden=i>=n;lights[i].hidden=i>=n;}
 const subtitle=root.querySelector('.monster-slot-subheading');
 if(subtitle)subtitle.textContent=n===1?
  '🥈 ZWEITER PLATZ · 1 WALZE · 1 GARANTIERTER GEWINN':
  '🏆 ERSTER PLATZ · 3 WALZEN · 3 GARANTIERTE GEWINNE';
 root.querySelector('.monster-slot-reels')?.setAttribute('aria-label',
  n===1?'Eine Gewinnwalze':'Drei Gewinnwalzen');
 summaryTitle.textContent='🎉 '+n+(n===1?' Slot-Gewinn':' Slot-Gewinne');
 summaryButton.textContent='✅ '+(n===1?'Gewinn':'Alle Gewinne')+' bestätigen';
}

 // The summary is a single, scrollable view: all prizes and every opened card
 // appear together. No extra payout or pack-opening requests are sent.
const summary=document.createElement('div');
summary.id='monster-slot-reward-summary';summary.className='monster-slot-reward-summary';summary.hidden=true;
summary.setAttribute('role','region');summary.setAttribute('aria-label','Alle Slotgewinne und Sammelkarten');
const summaryContent=document.createElement('div');summaryContent.className='monster-slot-reward-content';
const summaryKicker=document.createElement('p');summaryKicker.className='monster-slot-reward-kicker';
summaryKicker.textContent='✦ GOLDSTUDIO · ALLE DEINE BELOHNUNGEN ✦';
const summaryTitle=document.createElement('h3');summaryTitle.className='monster-slot-reward-title';
summaryTitle.textContent='🎉 Deine 3 Slot-Gewinne';
const summaryDetail=document.createElement('p');summaryDetail.className='monster-slot-reward-detail';
summaryDetail.textContent='Alle Belohnungen wurden bereits deinem Profil gutgeschrieben.';
const summaryPrizes=document.createElement('div');summaryPrizes.className='monster-slot-reward-prizes';
const summaryCardsPanel=document.createElement('div');summaryCardsPanel.className='monster-slot-reward-cards-panel';summaryCardsPanel.hidden=true;
const summaryCardsTitle=document.createElement('h4');summaryCardsTitle.className='monster-slot-reward-cards-title';
const summaryCardsDetail=document.createElement('p');summaryCardsDetail.className='monster-slot-reward-cards-detail';
const summaryCards=document.createElement('div');summaryCards.className='monster-slot-reward-cards';
summaryCardsPanel.append(summaryCardsTitle,summaryCardsDetail,summaryCards);
const summaryButton=document.createElement('button');summaryButton.id='monster-slot-summary-accept';
summaryButton.type='button';summaryButton.textContent='✅ Alle Gewinne bestätigen';
summaryContent.append(summaryKicker,summaryTitle,summaryDetail,summaryPrizes,summaryCardsPanel,summaryButton);
summary.append(summaryContent);root.append(summary);
let liveGame=null,claimed=null,claimedUid=null,claiming=null,opening=false,shown='',seq=0,timers=[],priorFocus=null;
let sharedSignature='',sharedPending=false;
const sharedCaption=root.querySelector('.monster-slot-shared-caption');
const setStatus=t=>status.textContent=t;
const watched=id=>{try{return sessionStorage.getItem(seenKey(id))==='yes'}catch{return false}};
function timer(fn,ms){const id=setTimeout(()=>{timers=timers.filter(t=>t!==id);fn()},ms);timers.push(id)}
function cancel(hide=true){seq++;timers.forEach(clearTimeout);timers=[];opening=false;shown='';summary.hidden=true;if(hide)root.hidden=true}
function setPhase(el,phase){el.dataset.phase=phase;el.querySelector('.monster-slot-state').textContent=phase==='running'?'DREHT …':phase==='won'?'✓ GEWONNEN':'BEREIT'}
for(const reel of reels){
 reel.querySelector('.monster-slot-track').replaceChildren(...rolling.concat(rolling).map(icon=>{
  const span=document.createElement('span');span.className='monster-slot-track-symbol';span.textContent=icon;return span;
 }));
}
function resetReel(reel){
 setPhase(reel,'ready');reel.dataset.rarity='';reel.dataset.award='';reel.dataset.variant='';
 const win=reel.querySelector('.monster-slot-prize');win.hidden=true;
 win.querySelector('.monster-slot-art').replaceChildren();
}
function showPrize(reel,prize){
 const win=reel.querySelector('.monster-slot-prize'),art=win.querySelector('.monster-slot-art');
 art.replaceChildren();art.classList.remove('has-image');
 const span=document.createElement('span');span.className='monster-slot-emoji';span.textContent=icons[prize.kind]||'🎁';art.append(span);
 const imagePath=awardImage(prize);
 reel.dataset.award=prize.kind||'';
 reel.dataset.variant=prize.id||'';
 if(imagePath){
  const img=document.createElement('img');img.alt='';img.loading='eager';img.decoding='async';
  img.addEventListener('load',()=>{if(art.contains(img))art.classList.add('has-image')},{once:true});
  img.addEventListener('error',()=>{if(art.contains(img))img.remove()},{once:true});
  img.src=imagePath;art.append(img);
 }
 const count=Number.isInteger(prize.quantity)?prize.quantity:1,isCash=prize.kind==='cash';
 win.querySelector('.monster-slot-quantity').textContent=isCash?'💶 ZUFALLSGELD':prize.kind==='wildcard'?'❓ JOKER-SAMMELKARTE':count+'×';
 win.querySelector('.monster-slot-prize-name').textContent=isCash?String(prize.label||'Geldgewinn'):String(prize.label||'Gewinn').replace(/^\d+\s*×\s*/,'');
 const rarity=rarityOf(prize);reel.dataset.rarity=rarity;
  win.querySelector('.monster-slot-scarcity')?.remove();
  if(rarityNames[rarity]){
   const mark=document.createElement('strong');mark.className='monster-slot-scarcity';mark.textContent=rarityNames[rarity];
   win.append(mark);
  }
 win.hidden=false;setPhase(reel,'won');
}
// All clients agree on a draw based on the server's original (unboosted) payouts.
// A tied highest result never triggers a claim or shows the Slot machine.
const isTiedFinal=game=>{
 const values=Array.isArray(game?.finalValues)?game.finalValues.map(f=>f.payout):[];
 return values.length>1&&values.filter(v=>v===Math.max(...values)).length>1;
};
const canShow=()=>typeof g!=='undefined'&&g?.phase==='final'&&g.monsterSlotsVersion===1&&!isTiedFinal(g)&&entitledReels()>0&&
 document.getElementById('finale-cinema')?.hidden!==false&&
 document.getElementById('cent-reward')?.hidden!==false&&!document.hidden;
function showAlreadySettled(){
 configureReels(claimed.prizes.length);
 reels.slice(0,claimed.prizes.length).forEach((reel,i)=>showPrize(reel,claimed.prizes[i]));
 lights.slice(0,claimed.prizes.length).forEach(light=>light.classList.add('lit'));
 root.dataset.phase='summary';root.hidden=false;renderSummary();summary.hidden=false;
 accept.disabled=true;summaryButton.disabled=false;summaryButton.textContent='✓ Fenster schließen';
 setStatus('🎉 '+(claimed.prizes.length===1?'Dein Gewinn wurde':'Deine drei Gewinne wurden')+' bereits gutgeschrieben.');
}

 // Opened packs already have all their cards settled and persisted by the server.
 // Render both NEW and duplicate cards, including packs without any new cards.
const awardedPacks=prizes=>(prizes||[]).filter(p=>p.kind==='pack')
 .flatMap(p=>Array.isArray(p.openedPacks)?p.openedPacks:[]);
function renderSummary(){
 if(!claimed)return;
 const prizeItems=claimed.prizes.map((prize,index)=>{
  const item=document.createElement('article');item.className='monster-slot-reward-item';
  item.dataset.kind=String(prize.kind||'');item.dataset.rarity=rarityOf(prize);
  const heading=document.createElement('span');heading.className='monster-slot-reward-item-reel';heading.textContent='WALZE '+(index+1);
  const art=document.createElement('div');art.className='monster-slot-reward-item-art';
  const fallback=document.createElement('span');fallback.textContent=icons[prize.kind]||'🎁';art.append(fallback);
  const imagePath=awardImage(prize);
  if(imagePath){
   const img=document.createElement('img');img.alt='';img.loading='eager';img.decoding='async';
   img.addEventListener('load',()=>{art.classList.add('has-image')},{once:true});
   img.addEventListener('error',()=>{img.remove()},{once:true});
   img.src=imagePath;art.append(img);
  }
  const label=document.createElement('strong');label.className='monster-slot-reward-item-name';
  label.textContent=String(prize.label||'Gewinn');
  item.append(heading,art,label);
   if(rarityNames[rarityOf(prize)]){
    const mark=document.createElement('small');mark.className='monster-slot-summary-rarity';mark.textContent=rarityNames[rarityOf(prize)];item.append(mark);
   }
  return item;
 });
 summaryPrizes.replaceChildren(...prizeItems);
 const packs=awardedPacks(claimed.prizes);
 const cards=packs.flatMap(pack=>(Array.isArray(pack.revealed)?pack.revealed:[])
  .map(card=>({card,packName:String(pack.packName||'DOG Kartenpaket')})));
 const freshCount=cards.filter(({card})=>card.isNew===true).length;
 const duplicateCount=cards.length-freshCount;
 summaryCardsPanel.hidden=packs.length===0;
 summaryCardsTitle.textContent='🃏 Alle Sammelkarten ('+cards.length+')';
 summaryCardsDetail.textContent=cards.length
  ?'🌟 '+freshCount+' neu · '+duplicateCount+' doppelt · Alle Karten aus '+packs.length+' '+(packs.length===1?'Paket':'Paketen')+' gleichzeitig aufgedeckt'
  :'Die gewonnenen Pakete sind gutgeschrieben; bei älteren Gewinnen können sie noch als Gutscheine vorliegen.';
 const tiles=cards.map(({card,packName})=>{
  const tile=document.createElement('article');tile.className='monster-slot-reward-card';
  tile.dataset.rarity=String(card.rarity||'common');
  tile.dataset.new=card.isNew===true?'yes':'no';
  const art=document.createElement('div');art.className='monster-slot-reward-card-art';
  if(card.image){
   const img=document.createElement('img');
   const source='Weihnachtsevent2/Sammelalbum_Saison_2_Bilder/'+encodeURIComponent(String(card.image));
   img.alt=String(card.name||'Sammelkarte');img.loading='eager';img.decoding='async';
   if(window.ChristmasCardImages?.guard&&window.ChristmasCardImages?.show){
    window.ChristmasCardImages.guard(img);window.ChristmasCardImages.show(img,source);
   }else{
    img.onerror=()=>{img.onerror=null;img.src='assets/weihnachts_event/card-back-winter.svg'};
    img.src=source;
   }
   art.append(img);
  }else{const fallback=document.createElement('span');fallback.textContent='🎴';art.append(fallback)}
  const flag=document.createElement('span');flag.className='monster-slot-reward-card-flag';
  flag.textContent=card.isNew===true?'🌟 NEU':'DOPPELT';
  const name=document.createElement('strong');name.className='monster-slot-reward-card-name';
  name.textContent=String(card.name||'Sammelkarte');
  const origin=document.createElement('span');origin.className='monster-slot-reward-card-origin';
  origin.textContent=packName;
  tile.append(art,flag,name,origin);return tile;
 });
 summaryCards.replaceChildren(...tiles);
}
function showSummary(token,id){
 if(token!==seq||liveGame!==id||root.hidden||!claimed)return;
 renderSummary();
 summary.hidden=false;opening=false;root.dataset.phase='summary';
 setStatus('🎉 Alle Gewinne auf einen Blick – bereits gutgeschrieben!');
 accept.disabled=true;summaryButton.disabled=false;summaryButton.textContent='✅ '+(claimed.prizes.length===1?'Gewinn':'Alle Gewinne')+' bestätigen';
 summaryButton.focus({preventScroll:true});
}
function present(reopen=false){
 if(opening||!claimed||claimed.gameId!==liveGame||claimedUid!==user()?.uid||shown===liveGame&&!reopen||!canShow())return;
 const id=liveGame;
 configureReels(claimed.prizes.length);
 if(watched(id)&&!reopen){try{sessionStorage.setItem('final-wheel-complete:'+id,'yes')}catch{}window.dispatchEvent(new Event('deal-final-wheel-complete'));return}
 const token=++seq;shown=id;priorFocus=document.activeElement;root.hidden=false;summary.hidden=true;
 lights.forEach(light=>light.classList.remove('lit'));
 if(watched(id)){showAlreadySettled();root.focus({preventScroll:true});return}
 opening=true;root.dataset.phase='rolling';accept.disabled=true;accept.textContent='🎁 Gewinne bestätigen';
 reels.slice(0,claimed.prizes.length).forEach(reel=>{resetReel(reel);setPhase(reel,'running')});
 const single=claimed.prizes.length===1;
 setStatus(single?'🥈 Deine einzige Gewinnwalze dreht!':'🎰 Alle drei Walzen drehen gleichzeitig!');
 root.focus({preventScroll:true});
 const stops=(reduced()?[100,220,340]:[3000,4500,6000]).slice(0,claimed.prizes.length);
 stops.forEach((ms,i)=>timer(()=>{
  if(token!==seq||liveGame!==id||root.hidden)return;
  showPrize(reels[i],claimed.prizes[i]);lights[i].classList.add('lit');
  const finished=i===claimed.prizes.length-1;
  setStatus(finished?single?'🎉 Dein Slot-Gewinn wurde gutgeschrieben!':
   '🎉 Alle drei Gewinne wurden gutgeschrieben!':
   '✨ Walze '+(i+1)+' gestoppt – die anderen drehen weiter!');
  if(finished)timer(()=>showSummary(token,id),single?1000:2000);
 },ms));
}
async function claim(){
 if(claiming||!liveGame||entitledReels()===0||claimed?.gameId===liveGame&&claimedUid===user()?.uid)return;
 const u=user();if(!u?.getIdToken)return;
 const id=liveGame,uid=u.uid;claiming=id;setStatus('🎁 '+(entitledReels()===1?'Dein Slot-Gewinn wird':'Deine drei Slot-Gewinne werden')+' sicher geladen …');
 try{
  const token=await u.getIdToken();
  const response=await fetch(base()+'/api/deal-or-no-deal/monster-slots/claim',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({gameId:id}),cache:'no-store'
  });
  const data=await response.json();
  if(!response.ok||!data.ok||data.gameId!==id||!Array.isArray(data.prizes)||data.prizes.length!==entitledReels()||data.guaranteed!==entitledReels())
   throw Error(data.error||'GEWINNE_NICHT_VERFUEGBAR');
  if(liveGame!==id||user()?.uid!==uid)return;
  claimed=data;claimedUid=uid;if(canShow())present();
 }catch(error){
  if(liveGame!==id)return;
  console.warn('[monster-slots]',error);
  setStatus('⚠️ Gewinne derzeit nicht erreichbar: '+String(error.message||error)+'. Bitte erneut versuchen.');
  if(canShow()){root.hidden=false;accept.disabled=false;accept.textContent='↻ Gewinne erneut abrufen'}
 }finally{claiming=null;if(liveGame!==id||user()?.uid!==uid)sync()}
}
function confirmSlots(){
 if(typeof g!=='undefined'&&g?.phase==='final'&&g.monsterSlotShow){
  const stage=g.monsterSlotShow;
  if(stage.phase==='ready')void sharedAction('spin');
  else if(stage.phase==='rolling'&&!opening)void sharedAction('confirm');
  return;
 }
 if(!claimed||claimed.gameId!==liveGame||claimedUid!==user()?.uid){accept.disabled=true;void claim();return}
 if(opening)return;
 try{sessionStorage.setItem(seenKey(liveGame),'yes');sessionStorage.setItem('final-wheel-complete:'+liveGame,'yes')}catch(e){console.warn('[monster-slots] Anzeigequittung nicht gespeichert',e)}
 cancel();window.dispatchEvent(new Event('deal-final-wheel-complete'));
 if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});
}
accept.addEventListener('click',confirmSlots);
summaryButton.addEventListener('click',confirmSlots);

// Room-wide sequential final show. Only the acting player (or any room member
// after 30 seconds of absence) may start or confirm the server-authorized turn.
// WebSocket game snapshots provide prizes and timestamps; no spectator polling.
async function sharedAction(operation){
 const stage=typeof g!=='undefined'?g?.monsterSlotShow:null;
 if(sharedPending||!stage||!['ready','rolling'].includes(stage.phase)||!g?.id)return;
 const id=g.id,uid=user()?.uid,now=typeof dealServerNow==='function'?dealServerNow():Date.now();
 if(stage.uid!==uid&&now-Number(stage.activatedAt||0)<30000)return;
 const currentSignature=sharedSignature;
 sharedPending=true;accept.disabled=true;summaryButton.disabled=true;
 setStatus(operation==='spin'?'🎰 Der gemeinsame Slot startet …':'✅ Bestätigung wird für alle gespeichert …');
 try{
  const token=await user()?.getIdToken?.();
  if(!token)throw Error('Bitte zuerst anmelden.');
  const response=await fetch(base()+'/api/deal-or-no-deal/'+encodeURIComponent(code||'')+'/monster-slots/show',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({gameId:id,operation}),cache:'no-store'
  });
  const data=await response.json();
  if(!response.ok||!data.ok||data.game?.id!==id)throw Error(data.error||'SLOT_SHOW_FAILED');
  // Server broadcast normally arrives first. This response covers packet loss.
  if(typeof g!=='undefined'&&g?.id===id&&
   Number(data.game.revision)>=Number(g.revision)){
   g=data.game;
   render();
   window.dispatchEvent(new Event('deal-game-state-change'));
  }
 }catch(error){
  console.warn('[monster-slots-shared]',error);
  setStatus('⚠️ Gemeinsame Slot-Aktion fehlgeschlagen: '+String(error.message||error)+'. Bitte erneut versuchen.');
  sharedSignature=''; // repaint the current turn without creating prizes
 }finally{
  // Recompute the action buttons after the network request completes.
  // The state broadcast can arrive while sharedPending is still true.
  sharedPending=false;
  sharedSignature='';
  renderShared();
 }
}
function renderShared(){
 const game=typeof g!=='undefined'?g:null,stage=game?.monsterSlotShow;
 if(!stage||game.phase!=='final')return;
 if(stage.phase==='ceremony'){
  if(sharedSignature||!root.hidden){cancel();sharedSignature='';}
  root.dataset.shared='no';liveGame=null;claimed=null;claimedUid=null;
  return;
 }
 // Existing Christmas prize presentation stays above slot loading order.
 if(document.hidden||document.getElementById('cent-reward')?.hidden===false||
  document.getElementById('vote-reveal')?.hidden===false)return;
 const signature=game.id+':'+stage.turn+':'+stage.phase+':'+String(stage.startedAt||0)+':'+String(user()?.uid||'');
 if(signature===sharedSignature&&!root.hidden)return;
 cancel();sharedSignature=signature;liveGame=game.id;claimed=null;claimedUid=null;
 root.dataset.shared='yes';
 root.dataset.turn=stage.turn;root.dataset.phase=stage.phase;
 const recipient=game.players?.find(p=>p.id===stage.uid);
 const name=recipient?.name||'Spieler',me=stage.uid===user()?.uid;
 const roundLabel=stage.turn==='runner'?'🥈 ZWEITPLATZIERTER':'🏆 SIEGER';
 const now=typeof dealServerNow==='function'?dealServerNow():Date.now();
 const canRecover=now-Number(stage.activatedAt||0)>=30000;
 const mayAct=me||canRecover;
 sharedCaption.hidden=false;
 sharedCaption.textContent=roundLabel+' · '+name+' · ALLE SPIELER SEHEN LIVE ZU';
 configureReels(stage.reels);
 summaryKicker.textContent=roundLabel+' · '+name;
 summaryTitle.textContent='🎉 '+stage.reels+(stage.reels===1?' Gewinn von ':' Gewinne von ')+name;
 summaryDetail.textContent='Die Belohnungen wurden '+name+' bereits gutgeschrieben. Alle Spieler sehen dieses Ergebnis.';
 lights.forEach(light=>light.classList.remove('lit'));
 reels.forEach(resetReel);summary.hidden=true;root.hidden=false;
 priorFocus=document.activeElement;
 if(stage.phase==='ready'){
  opening=false;accept.disabled=!mayAct||sharedPending;
  accept.textContent=me?'🎰 Jetzt deine Walze'+(stage.reels===3?'n':'')+' drehen':
   canRecover?'⏳ Für '+name+' fortsetzen':'👀 Zuschauer · '+name+' ist am Zug';
  setStatus(me?'🎰 Du bist jetzt dran! Alle anderen schauen dir beim Drehen zu.':
   '👀 '+name+' ist an der Reihe. Bitte warte auf den gemeinsamen Dreh.');
  if(!mayAct){
   const wait=Math.max(100,30050-(now-Number(stage.activatedAt||0)));
   timer(()=>{if(g?.id===game.id&&g.monsterSlotShow?.phase==='ready'&&sharedSignature===signature){sharedSignature='';renderShared()}},wait);
  }
  return;
 }
 const prizes=Array.isArray(stage.prizes)?stage.prizes:[];
 if(prizes.length!==stage.reels){root.hidden=true;return;}
 claimed={gameId:game.id,prizes};
 opening=true;accept.disabled=true;accept.textContent='⏳ Live-Dreh läuft …';
 const started=Number(stage.startedAt||now);
 const elapsed=Math.max(0,now-started);
 const stopTimes=(stage.reels===1?[3000]:[3000,4500,6000]);
 reels.slice(0,stage.reels).forEach(reel=>setPhase(reel,'running'));
 const token=seq;
 const resultAt=stage.reels===1?4200:7800;
 const reveal=(index)=>{
  if(seq!==token||sharedSignature!==signature||root.hidden)return;
  showPrize(reels[index],prizes[index]);lights[index].classList.add('lit');
  setStatus(index===stage.reels-1?'🎁 '+name+' hat '+stage.reels+(stage.reels===1?' Geschenk':' Geschenke')+' gewonnen!':
   '✨ '+name+': Walze '+(index+1)+' zeigt ihren Gewinn!');
 };
 stopTimes.forEach((at,index)=>{
  if(elapsed>=at)reveal(index);
  else timer(()=>reveal(index),at-elapsed);
 });
 const finish=()=>{
  if(seq!==token||sharedSignature!==signature||root.hidden)return;
  opening=false;root.dataset.phase='summary';renderSummary();summary.hidden=false;
  const recovery=(typeof dealServerNow==='function'?dealServerNow():Date.now())-Number(stage.activatedAt||0)>=30000;
  summaryButton.disabled=sharedPending||!(me||recovery);
  summaryButton.textContent=me?'✅ Meine Gewinne bestätigen · weiter':
   recovery?'⏳ Für '+name+' bestätigen':'👀 Zuschauer · '+name+' bestätigt';
  setStatus('🎉 '+name+' hat seine Gewinne erhalten.');
 };
 if(elapsed>=resultAt)finish();else timer(finish,resultAt-elapsed);
 if(!mayAct&&elapsed<30000)
  timer(()=>{if(g?.id===game.id&&g.monsterSlotShow?.phase==='rolling'&&sharedSignature===signature){sharedSignature='';renderShared()}},
   Math.max(500,30050-(now-Number(stage.activatedAt||0))));
}
function sync(){
 if(typeof g!=='undefined'&&g?.phase==='final'&&g.monsterSlotShow){renderShared();return;}
 if(sharedSignature){cancel();sharedSignature='';root.dataset.shared='no';claimed=null;claimedUid=null;liveGame=null;}
 if(typeof g==='undefined'||g?.phase!=='final'||g.monsterSlotsVersion!==1||isTiedFinal(g)||entitledReels()===0){
  if(liveGame){cancel();liveGame=null;claimed=null;claimedUid=null}return;
 }
 if(liveGame!==g.id||claimedUid&&claimedUid!==user()?.uid){cancel();liveGame=g.id;claimed=null;claimedUid=null}
 if(watched(g.id))return;
 if(!claimed)void claim();else if(canShow())present();
}
window.addEventListener('deal-game-state-change',sync);
window.addEventListener('deal-finale-finished',sync);
window.addEventListener('spielonline-change',sync);
// Wait until the legacy banker/one-cent reward layer has closed, then show the finale slots.
window.addEventListener('deal-reward-window-closed',()=>setTimeout(sync,400));
window.addEventListener('deal-monster-slot-retry',()=>{
 if(g?.monsterSlotShow){sharedSignature='';renderShared();return;}
 if(!liveGame||entitledReels()===0)return;
 if(claimed?.gameId===liveGame&&claimedUid===user()?.uid){if(!opening){shown='';present(true)}}
 else{root.hidden=false;void claim()}
});
window.addEventListener('deal-replay-finale-sequence',()=>{if(!g?.monsterSlotShow)cancel()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&opening&&!g?.monsterSlotShow)cancel();else if(!document.hidden)sync()});
window.addEventListener('load',sync);
setTimeout(sync,500);
})();
