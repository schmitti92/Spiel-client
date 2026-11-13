// Three independent Monster Slots after the Deal or No Deal finale.
// The server chooses and credits every prize once; this module only animates.
(()=>{'use strict';
const apiBase=()=>String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const currentUser=()=>window.SpielOnline?.state?.()?.user;
const $=id=>document.getElementById(id);
const iconFor={chest:'📦',pack:'🎴',hammer:'🔨',joker:'🃏',minigame:'🎟️',monster:'👹',cash:'💰'};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const container=document.createElement('section');
container.id='deal-monster-slots';
container.hidden=true;
container.setAttribute('role','dialog');
container.setAttribute('aria-modal','true');
container.setAttribute('aria-label','Drei Monster-Slots');
container.innerHTML=`<div class="monster-slot-machine">
 <div class="monster-slot-stars">✦ ✧ ✦ DIE GROSSE BELOHNUNG ✦ ✧ ✦</div>
 <h2>🎰 MONSTER SLOTS</h2>
 <p class="monster-slot-subheading">DREI WALZEN · DREI GARANTIERTE GEWINNE</p>
 <div class="monster-slot-reels" aria-live="polite">
  <div class="monster-slot-reel" data-reel="0"><span class="monster-slot-icon">🎁</span><strong>WALZE 1</strong><small>Bereit</small></div>
  <div class="monster-slot-reel" data-reel="1"><span class="monster-slot-icon">🎁</span><strong>WALZE 2</strong><small>Bereit</small></div>
  <div class="monster-slot-reel" data-reel="2"><span class="monster-slot-icon">🎁</span><strong>WALZE 3</strong><small>Bereit</small></div>
 </div>
 <p class="monster-slot-status" id="monster-slot-status">Deine Gewinne werden geladen …</p>
 <button type="button" id="monster-slot-accept" disabled>🎁 Alle drei Gewinne bestätigen</button>
 </div>`;
document.body.append(container);
const reels=[...container.querySelectorAll('.monster-slot-reel')];
const status=$('monster-slot-status'),accept=$('monster-slot-accept');
let liveGame=null,claimed=null,opening=false,openedGame='',loadBusy=false,animator=null;
const seenKey=gameId=>'monster-slots-watched:'+gameId;
function setReel(el,prize){
 el.querySelector('.monster-slot-icon').textContent=iconFor[prize.kind]||'🎁';
 el.querySelector('strong').textContent=prize.label||'Gewinn';
 el.querySelector('small').textContent=prize.kind==='cash'?'💶 GUTGESCHRIEBEN':'✓ GUTGESCHRIEBEN';
 el.classList.remove('spinning');el.classList.add('stopped');
}
const canPresent=()=>typeof g!=='undefined'&&g?.phase==='final'&&g.monsterSlotsVersion===1&&
 $('finale-cinema')?.hidden!==false&&document.visibilityState==='visible';
async function claim(){
 if(loadBusy||!liveGame||claimed?.gameId===liveGame)return;
 const u=currentUser();if(!u?.getIdToken)return;
 loadBusy=true;
 try{
  const token=await u.getIdToken();
  const response=await fetch(apiBase()+'/api/deal-or-no-deal/monster-slots/claim',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({gameId:liveGame}),cache:'no-store'
  });
  const data=await response.json();
  if(!response.ok||!data.ok||!Array.isArray(data.prizes)||data.prizes.length!==3)
   throw Error(data.error||'Gewinne nicht verfügbar');
  if(data.gameId!==liveGame)return;
  claimed=data;
  if(canPresent())void present();
 }catch(error){
  console.warn('[monster-slots]',error);
  status.textContent='⚠️ Gewinne konnten nicht geladen werden: '+String(error.message||error);
  if(canPresent()){container.hidden=false;accept.disabled=false;accept.textContent='🔄 Gewinne erneut abrufen';}
 }finally{loadBusy=false}
}
async function present(){
 if(opening||!claimed||claimed.gameId!==liveGame||openedGame===liveGame||!canPresent())return;
 const id=liveGame;
 if(sessionStorage.getItem(seenKey(id))==='yes'){
  sessionStorage.setItem('final-wheel-complete:'+id,'yes');
  window.dispatchEvent(new Event('deal-final-wheel-complete'));
  return;
 }
 opening=true;openedGame=id;container.hidden=false;
 accept.disabled=true;accept.textContent='🎁 Alle drei Gewinne bestätigen';
 reels.forEach(el=>{el.classList.remove('stopped');el.classList.add('spinning');el.querySelector('strong').textContent='DREHT …';el.querySelector('small').textContent='✨';});
 status.textContent='🎰 Alle drei Walzen drehen gleichzeitig!';
 // The animation is not authoritative and has no random effect on rewards.
 for(let i=0;i<3;i++){
  await sleep(window.matchMedia('(prefers-reduced-motion: reduce)').matches?200:1700);
  if(liveGame!==id||container.hidden)return;
  setReel(reels[i],claimed.prizes[i]);
  status.textContent=i===2?'🎉 Alle drei Gewinne wurden gutgeschrieben!':'✨ Walze '+(i+1)+' gestoppt – die anderen drehen weiter!';
 }
 accept.disabled=false;opening=false;
}
accept.addEventListener('click',()=>{
 if(!claimed||claimed.gameId!==liveGame){container.hidden=true;void claim();return;}
 if(opening)return;
 sessionStorage.setItem(seenKey(liveGame),'yes');
 sessionStorage.setItem('final-wheel-complete:'+liveGame,'yes');
 container.hidden=true;window.dispatchEvent(new Event('deal-final-wheel-complete'));
});
function sync(){
 if(typeof g==='undefined'||g?.phase!=='final'||g.monsterSlotsVersion!==1)return;
 if(g.id!==liveGame){liveGame=g.id;claimed=null;openedGame='';opening=false;container.hidden=true}
 if(sessionStorage.getItem(seenKey(g.id))==='yes')return;
 if(!claimed)void claim();
 else if(canPresent())void present();
}
window.addEventListener('deal-game-state-change',sync);
window.addEventListener('deal-finale-finished',sync);
window.addEventListener('deal-monster-slot-retry',()=>{
 if(!liveGame)return;
 if(claimed?.gameId===liveGame){openedGame='';void present();}
 else{container.hidden=false;void claim();}
});
window.addEventListener('deal-replay-finale-sequence',()=>{container.hidden=true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
window.addEventListener('load',sync);
setTimeout(sync,500);
})();