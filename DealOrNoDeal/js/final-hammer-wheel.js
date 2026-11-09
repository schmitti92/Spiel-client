'use strict';
(()=>{
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(new RegExp('/+$'),'');
 let shown='',busy=false,spinTimer=null;
 const user=()=>window.SpielOnline?.state?.()?.user;
 const match=()=>typeof g!=='undefined'?g:null;
 const room=()=>typeof code==='string'?code:new URLSearchParams(location.search).get('room');
 const winnerId=game=>{
  if(!game||game.phase!=='final'||!Array.isArray(game.finalValues))return null;
  const payouts=game.finalValues.map(p=>({id:p.id,payout:p.payout}));
  if(!payouts.length||payouts.some(p=>!Number.isFinite(p.payout)))return null;
  const max=Math.max(...payouts.map(p=>p.payout));
  const winners=payouts.filter(p=>p.payout===max);
  return winners.length===1?winners[0].id:null;
 };
 function show(){
  const game=match(),u=user(),winner=winnerId(game);if(!winner||!u?.uid)return;
  const started=Number(game.christmasWheelSpins?.['final:'+game.id]||0);
  if(!started)return;
  // Never cover the pack animation. If a tab was reloaded, the server timestamp
  // still lets us recover the hammer ceremony without sessionStorage.
  // The winner explicitly releases the card reveal for every player.
  // Never start the hammer wheel merely because a local timer elapsed.
  if(!game.christmasWheelClosed?.['final:'+game.id])return;
  if(Date.now()-started<12500)return;
  const packOverlay=document.getElementById('cent-reward');
  const finaleOverlay=document.getElementById('finale-cinema');
  if(packOverlay&&!packOverlay.hidden||finaleOverlay&&!finaleOverlay.hidden)return;
  if(shown===game.id||document.getElementById('ice-hammer-bonus')||sessionStorage.getItem('ice-hammer-wheel-seen:'+game.id)==='yes')return;
  shown=game.id;
  const overlay=document.createElement('div');overlay.id='ice-hammer-bonus';
  overlay.innerHTML='<div class="ice-hammer-card"><h2>🔨 DAS GROSSE SIEGER-HAMMERRAD</h2><p>Das Kartenpaket ist eingesammelt. Nur der Sieger dreht und erhält den Hammer – alle anderen Spieler schauen live zu.</p><div class="ice-hammer-wheel"><div class="ice-hammer-disc" role="img" aria-label="Hammer-Glücksrad mit 12 Feldern: 5 einfache Hammer, 5 Doppelhammer, 2 Glückshammer"></div><div class="ice-hammer-pointer" aria-hidden="true">▼</div></div><p class="ice-hammer-message" role="status">🎡 Der Sieger entscheidet, wann das Hammerrad startet</p><button class="ice-hammer-spin">🎡 Jetzt meinen Hammer auslosen</button><button class="ice-hammer-close" hidden>✓ Ergebnis schließen</button></div>';
  document.body.append(overlay);
  const disc=overlay.querySelector('.ice-hammer-disc'),spin=overlay.querySelector('.ice-hammer-spin'),status=overlay.querySelector('.ice-hammer-message'),close=overlay.querySelector('.ice-hammer-close');
  const labels={single:'🔨 Einfach-Hammer',double:'🔨 Doppel-Hammer',lucky:'✨ Glückshammer'};
  // Fixed pointer at 12 o'clock: sector centers in the current 12-field image.
  const angles={single:30,double:60,lucky:0};
  let revealed=false;
  const reveal=award=>{
   if(!award||award.gameId!==game.id||revealed||!Object.hasOwn(labels,award.hammer))return;
   revealed=true;busy=false;spin.hidden=true;
   const elapsed=Math.max(0,Date.now()-award.startedAt);
   const duration=Math.max(100,4300-elapsed);
   disc.style.transition='transform '+duration+'ms cubic-bezier(.12,.8,.12,1)';
   disc.style.transform='rotate('+(2160-angles[award.hammer])+'deg)';
   status.textContent=winner===u.uid?'🎡 Du drehst – die anderen Spieler schauen live zu …':'🎡 Der Sieger dreht – du schaust live zu …';
   clearTimeout(spinTimer);
   spinTimer=setTimeout(()=>{status.textContent='🎉 Gewonnen: '+labels[award.hammer]+'! '+(winner===u.uid?'Dein Hammer wurde gutgeschrieben.':'Der Sieger erhält diesen Hammer im Weihnachtsevent.');close.hidden=false},duration+100);
  };
  const onGameChange=()=>{const latest=match();if(latest?.id===game.id)reveal(latest.christmasHammerWheel)};
  window.addEventListener('deal-game-state-change',onGameChange);
  if(winner!==u.uid){spin.hidden=true;status.textContent='⏳ Warte auf den Sieger – nur er kann das Hammerrad drehen.'}
  else if(game.christmasHammerWheel){spin.hidden=true}
  if(game.christmasHammerWheel)reveal(game.christmasHammerWheel);
  spin.onclick=async()=>{
   if(busy||revealed||winner!==u.uid)return;busy=true;spin.disabled=true;status.textContent='⏳ Dein Hammer wird serverseitig ausgelost …';
   try{
    const token=await u.getIdToken();
    const response=await fetch(base+'/api/christmas-ice/final-hammer',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({code:room(),gameId:game.id}),cache:'no-store'});
    const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'SERVER_ERROR');
    const synchronized=match()?.christmasHammerWheel;
    reveal(synchronized?.gameId===game.id?synchronized:{gameId:game.id,hammer:data.hammer,startedAt:Date.now()});
   }catch(e){status.textContent='⚠️ '+e.message+' – bitte erneut versuchen.';spin.disabled=false;busy=false}
  };
  // Explicit user interaction is required: only the winner can trigger the spin.
  close.onclick=()=>{window.removeEventListener('deal-game-state-change',onGameChange);clearTimeout(spinTimer);sessionStorage.setItem('ice-hammer-wheel-seen:'+game.id,'yes');overlay.remove();busy=false};
 }
 function scheduleShow(){
  const game=match();if(!winnerId(game))return;
  const started=Number(game.christmasWheelSpins?.['final:'+game.id]||0);
  if(!started)return;
  if(!game.christmasWheelClosed?.['final:'+game.id])return;
  const delay=Math.max(0,12500-(Date.now()-started));
  clearTimeout(window.__iceHammerShowTimer);
  window.__iceHammerShowTimer=setTimeout(show,delay+250);
 }
 window.addEventListener('deal-final-wheel-complete',()=>{scheduleShow();show()});
 window.addEventListener('deal-game-state-change',scheduleShow);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){scheduleShow();show()}});
 scheduleShow();
 // Recover from missed socket updates and late reward-overlay dismissal without
 // new Firestore listeners. This only reads the already-present in-memory game.
 setInterval(()=>{if(!document.hidden){scheduleShow();show()}},2500);
 const style=document.createElement('style');style.textContent=`#ice-hammer-bonus{position:fixed;inset:0;z-index:99999;background:#06111df2 url('./Weihnachtsevent2/Weihnachtsbilder/file_00000000817c821082904a82b332d479.png') center/cover no-repeat;display:grid;place-items:center;padding:12px;color:#ffeac4}.ice-hammer-card{width:min(96vw,1000px);max-height:96dvh;overflow:auto;text-align:center;padding:clamp(10px,2vw,22px);border:3px solid #e8c26c;border-radius:22px;background:linear-gradient(180deg,#081b35a8,#241028d9);box-shadow:0 15px 60px #000c,0 0 35px #eebc6266;backdrop-filter:blur(2px)}.ice-hammer-card h2{margin:2px 0 4px;color:#ffe4a0;text-shadow:0 3px 12px #000;font-size:clamp(19px,3vw,35px)}.ice-hammer-card p{margin:5px 0;text-shadow:0 2px 8px #000}.ice-hammer-wheel{width:min(68vw,52dvh,550px);aspect-ratio:1;margin:9px auto;position:relative;filter:drop-shadow(0 0 20px #ffd46d88)}.ice-hammer-disc{width:100%;height:100%;background:url('./Weihnachtsevent2/Weihnachtsbilder/file_00000000b9c48210b20aab8553d17e0a.png') center/contain no-repeat;transform:rotate(0deg);will-change:transform}.ice-hammer-pointer{position:absolute;top:-13px;left:50%;transform:translateX(-50%);z-index:3;color:#fff3c0;font-size:clamp(22px,3vw,35px);text-shadow:0 2px 5px #321500,0 0 9px #ffce40;pointer-events:none}.ice-hammer-message{font-size:clamp(14px,2vw,22px);font-weight:800;min-height:1.6em}.ice-hammer-card button{margin:6px;padding:12px 19px;border:2px solid #fff2b9;border-radius:12px;background:linear-gradient(#ffe7a3,#d89929);color:#23140b;font-weight:900;cursor:pointer}.ice-hammer-card button[hidden]{display:none}@media(max-height:620px){.ice-hammer-wheel{width:min(43vw,47dvh,380px)}.ice-hammer-card{padding:7px}.ice-hammer-card p{font-size:12px}}@media(prefers-reduced-motion:reduce){.ice-hammer-disc{transition:none!important}}`;document.head.append(style);
})();
