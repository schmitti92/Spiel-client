// Goldstudio Monster Slots · premium 3-reel finale visual.
// The server settles the prizes. These rolling symbols are purely decorative.
(()=>{'use strict';
const base=()=>String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const user=()=>window.SpielOnline?.state?.()?.user;
const $=id=>document.getElementById(id);
const icons={chest:'📦',pack:'🎴',hammer:'🔨',joker:'🃏',minigame:'🎟️',monster:'👹',cash:'💰'};
const chestArt={wood:'../dog-chest-art/01_Holzkiste.png',iron:'../dog-chest-art/02_Eisenkiste.png',silver:'../dog-chest-art/03_Silberkiste.png',gold:'../dog-chest-art/04_Goldkiste.png',legendary:'../dog-chest-art/05_Legendaere_Kiste.png'};
const awardArt={
 chest:chestArt,
 pack:{small:'assets/hats/prize-pack.svg',large:'assets/hats/reward-pack.svg',premium:'assets/hats/reward-pack.svg',platinum:'assets/hats/reward-platinum.svg'},
 hammer:{single:'Weihnachtsevent2/Weihnachtsbilder/hammer-einfach.webp',double:'Weihnachtsevent2/Weihnachtsbilder/hammer-doppel.webp',lucky:'Weihnachtsevent2/Weihnachtsbilder/hammer-glueck.webp'},
 joker:'assets/hats/reward-joker.svg',
 minigame:'assets/hats/reveal-gift.svg',
 monster:'Weihnachtsevent2/Weihnachtsbilder/file_0000000077288210bd94623e0d40c452.png',
 cash:'assets/hats/reward-cash.svg'
};
const awardImage=prize=>typeof awardArt[prize.kind]==='string'?awardArt[prize.kind]:awardArt[prize.kind]?.[prize.id]||null;
const rolling=['📦','🎴','🔨','🃏','🎟️','👹','💰','💎'];
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const seenKey=id=>'monster-slots-watched:'+String(user()?.uid||'anonymous')+':'+id;
const root=document.createElement('section');root.id='deal-monster-slots';root.hidden=true;root.tabIndex=-1;
root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','monster-slots-title');
root.innerHTML="<div class=\"monster-slot-machine\">\n <div class=\"monster-slot-lights\" aria-hidden=\"true\">✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦</div>\n <div class=\"monster-slot-kicker\">✦ GOLDSTUDIO · DAS GROSSE GEWINNFINALE ✦</div>\n <h2 id=\"monster-slots-title\">🎰 MONSTER SLOTS</h2>\n <p class=\"monster-slot-subheading\">3 WALZEN <span aria-hidden=\"true\">◆</span> 3 GARANTIERTE GEWINNE</p>\n <div class=\"monster-slot-ribbon\" aria-hidden=\"true\">✧ &nbsp; JEDER SLOT GEWINNT &nbsp; ✧</div>\n <div class=\"monster-slot-reels\" role=\"group\" aria-label=\"Drei Gewinnwalzen\">\n  <div class=\"monster-slot-reel\" data-reel=\"0\" data-phase=\"ready\">\n   <div class=\"monster-slot-reel-head\"><span class=\"monster-slot-led\"></span>WALZE 01<span class=\"monster-slot-led\"></span></div>\n   <div class=\"monster-slot-window\">\n    <div class=\"monster-slot-track\" aria-hidden=\"true\"></div>\n    <div class=\"monster-slot-prize\" hidden><div class=\"monster-slot-art\"><span class=\"monster-slot-emoji\">🎁</span></div><span class=\"monster-slot-quantity\">1×</span><strong class=\"monster-slot-prize-name\">Dein Gewinn</strong></div>\n    <div class=\"monster-slot-glass\" aria-hidden=\"true\"></div>\n   </div>\n   <div class=\"monster-slot-reel-foot\"><span class=\"monster-slot-state\">BEREIT</span><span aria-hidden=\"true\">✦</span></div>\n  </div>\n  <div class=\"monster-slot-reel\" data-reel=\"1\" data-phase=\"ready\">\n   <div class=\"monster-slot-reel-head\"><span class=\"monster-slot-led\"></span>WALZE 02<span class=\"monster-slot-led\"></span></div>\n   <div class=\"monster-slot-window\">\n    <div class=\"monster-slot-track\" aria-hidden=\"true\"></div>\n    <div class=\"monster-slot-prize\" hidden><div class=\"monster-slot-art\"><span class=\"monster-slot-emoji\">🎁</span></div><span class=\"monster-slot-quantity\">1×</span><strong class=\"monster-slot-prize-name\">Dein Gewinn</strong></div>\n    <div class=\"monster-slot-glass\" aria-hidden=\"true\"></div>\n   </div>\n   <div class=\"monster-slot-reel-foot\"><span class=\"monster-slot-state\">BEREIT</span><span aria-hidden=\"true\">✦</span></div>\n  </div>\n  <div class=\"monster-slot-reel\" data-reel=\"2\" data-phase=\"ready\">\n   <div class=\"monster-slot-reel-head\"><span class=\"monster-slot-led\"></span>WALZE 03<span class=\"monster-slot-led\"></span></div>\n   <div class=\"monster-slot-window\">\n    <div class=\"monster-slot-track\" aria-hidden=\"true\"></div>\n    <div class=\"monster-slot-prize\" hidden><div class=\"monster-slot-art\"><span class=\"monster-slot-emoji\">🎁</span></div><span class=\"monster-slot-quantity\">1×</span><strong class=\"monster-slot-prize-name\">Dein Gewinn</strong></div>\n    <div class=\"monster-slot-glass\" aria-hidden=\"true\"></div>\n   </div>\n   <div class=\"monster-slot-reel-foot\"><span class=\"monster-slot-state\">BEREIT</span><span aria-hidden=\"true\">✦</span></div>\n  </div>\n </div>\n <div class=\"monster-slot-progress\" aria-hidden=\"true\"><span></span><span></span><span></span></div>\n <p id=\"monster-slot-status\" class=\"monster-slot-status\" role=\"status\" aria-live=\"polite\">Deine Gewinne werden geladen …</p>\n <button id=\"monster-slot-accept\" type=\"button\" disabled>🎁 Gewinne bestätigen</button>\n <p class=\"monster-slot-footnote\">Jede Walze gewinnt. Die Preise sind serverseitig gesichert.</p>\n</div>";

document.body.append(root);
const reels=[...root.querySelectorAll('.monster-slot-reel')],lights=[...root.querySelectorAll('.monster-slot-progress span')];
const status=$('monster-slot-status'),accept=$('monster-slot-accept');
let liveGame=null,claimed=null,claiming=null,opening=false,shown='',seq=0,timers=[],priorFocus=null;
const setStatus=t=>status.textContent=t;
const watched=id=>{try{return sessionStorage.getItem(seenKey(id))==='yes'}catch{return false}};
function timer(fn,ms){const id=setTimeout(()=>{timers=timers.filter(t=>t!==id);fn()},ms);timers.push(id)}
function cancel(hide=true){seq++;timers.forEach(clearTimeout);timers=[];opening=false;shown='';if(hide)root.hidden=true}
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
 win.querySelector('.monster-slot-quantity').textContent=isCash?'💶 ZUFALLSGELD':count+'×';
 win.querySelector('.monster-slot-prize-name').textContent=isCash?String(prize.label||'Geldgewinn'):String(prize.label||'Gewinn').replace(/^\d+\s*×\s*/,'');
 reel.dataset.rarity=prize.kind==='chest'&&prize.id==='legendary'||prize.kind==='pack'&&prize.id==='platinum'||isCash&&prize.amountCents>=100000000?'legendary':prize.kind==='chest'&&prize.id==='gold'||prize.kind==='pack'&&prize.id==='premium'?'epic':'common';
 win.hidden=false;setPhase(reel,'won');
}
const canShow=()=>typeof g!=='undefined'&&g?.phase==='final'&&g.monsterSlotsVersion===1&&
 document.getElementById('finale-cinema')?.hidden!==false&&!document.hidden;
function showAlreadySettled(){
 reels.forEach((reel,i)=>showPrize(reel,claimed.prizes[i]));
 lights.forEach(light=>light.classList.add('lit'));
 root.dataset.phase='finished';root.hidden=false;accept.disabled=false;accept.textContent='✓ Fenster schließen';
 setStatus('🎉 Diese drei Gewinne wurden bereits gutgeschrieben.');
}
function present(reopen=false){
 if(opening||!claimed||claimed.gameId!==liveGame||shown===liveGame&&!reopen||!canShow())return;
 const id=liveGame;
 if(watched(id)&&!reopen){try{sessionStorage.setItem('final-wheel-complete:'+id,'yes')}catch{}window.dispatchEvent(new Event('deal-final-wheel-complete'));return}
 const token=++seq;shown=id;priorFocus=document.activeElement;root.hidden=false;
 lights.forEach(light=>light.classList.remove('lit'));
 if(watched(id)){showAlreadySettled();root.focus({preventScroll:true});return}
 opening=true;root.dataset.phase='rolling';accept.disabled=true;accept.textContent='🎁 Gewinne bestätigen';
 reels.forEach(reel=>{resetReel(reel);setPhase(reel,'running')});
 setStatus('🎰 Alle drei Walzen drehen gleichzeitig!');root.focus({preventScroll:true});
 const stops=reduced()?[100,220,340]:[3000,4500,6000];
 stops.forEach((ms,i)=>timer(()=>{
  if(token!==seq||liveGame!==id||root.hidden)return;
  showPrize(reels[i],claimed.prizes[i]);lights[i].classList.add('lit');
  setStatus(i===2?'🎉 Alle drei Gewinne wurden gutgeschrieben!':'✨ Walze '+(i+1)+' gestoppt – die anderen drehen weiter!');
  if(i===2)timer(()=>{
   if(token!==seq||liveGame!==id||root.hidden)return;
   opening=false;root.dataset.phase='finished';
   accept.disabled=false;accept.textContent='🎁 Gewinne bestätigen';accept.focus({preventScroll:true});
  },reduced()?150:700);
 },ms));
}
async function claim(){
 if(claiming||!liveGame||claimed?.gameId===liveGame)return;
 const u=user();if(!u?.getIdToken)return;
 const id=liveGame;claiming=id;setStatus('🎁 Deine drei Gewinne werden sicher geladen …');
 try{
  const token=await u.getIdToken();
  const response=await fetch(base()+'/api/deal-or-no-deal/monster-slots/claim',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({gameId:id}),cache:'no-store'
  });
  const data=await response.json();
  if(!response.ok||!data.ok||data.gameId!==id||!Array.isArray(data.prizes)||data.prizes.length!==3)
   throw Error(data.error||'GEWINNE_NICHT_VERFUEGBAR');
  if(liveGame!==id)return;
  claimed=data;if(canShow())present();
 }catch(error){
  if(liveGame!==id)return;
  console.warn('[monster-slots]',error);
  setStatus('⚠️ Gewinne derzeit nicht erreichbar: '+String(error.message||error)+'. Bitte erneut versuchen.');
  if(canShow()){root.hidden=false;accept.disabled=false;accept.textContent='↻ Gewinne erneut abrufen'}
 }finally{claiming=null;if(liveGame!==id)sync()}
}
accept.addEventListener('click',()=>{
 if(!claimed||claimed.gameId!==liveGame){accept.disabled=true;void claim();return}
 if(opening)return;
 try{sessionStorage.setItem(seenKey(liveGame),'yes');sessionStorage.setItem('final-wheel-complete:'+liveGame,'yes')}catch(e){console.warn('[monster-slots] Anzeigequittung nicht gespeichert',e)}
 cancel();window.dispatchEvent(new Event('deal-final-wheel-complete'));
 if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});
});
function sync(){
 if(typeof g==='undefined'||g?.phase!=='final'||g.monsterSlotsVersion!==1){
  if(liveGame){cancel();liveGame=null;claimed=null}return;
 }
 if(liveGame!==g.id){cancel();liveGame=g.id;claimed=null}
 if(watched(g.id))return;
 if(!claimed)void claim();else if(canShow())present();
}
window.addEventListener('deal-game-state-change',sync);
window.addEventListener('deal-finale-finished',sync);
window.addEventListener('deal-monster-slot-retry',()=>{
 if(!liveGame)return;
 if(claimed?.gameId===liveGame){if(!opening){shown='';present(true)}}
 else{root.hidden=false;void claim()}
});
window.addEventListener('deal-replay-finale-sequence',()=>cancel());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&opening)cancel();else if(!document.hidden)sync()});
window.addEventListener('load',sync);
setTimeout(sync,500);
})();
