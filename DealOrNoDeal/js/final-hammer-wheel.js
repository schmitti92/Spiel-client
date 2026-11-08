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
  overlay.innerHTML='<div class="ice-hammer-card"><h2>🔨 Sieger-Hammerrad</h2><p>Das Sammelkarten-Glücksrad ist abgeschlossen. Jetzt folgt dein zusätzlicher Hammergewinn!</p><div class="ice-hammer-wheel"><div class="ice-hammer-disc">🔨<span>Einfach · 50 %</span><span>Doppel · 35 %</span><span>Glück · 15 %</span></div></div><p class="ice-hammer-message" role="status">Bereit für deinen Siegerbonus</p><button class="ice-hammer-spin">🎡 Hammer-Glücksrad drehen</button><button class="ice-hammer-close" hidden>✓ Weiter zum Spiel</button></div>';
  document.body.append(overlay);
  const disc=overlay.querySelector('.ice-hammer-disc'),spin=overlay.querySelector('.ice-hammer-spin'),status=overlay.querySelector('.ice-hammer-message'),close=overlay.querySelector('.ice-hammer-close');
  const labels={single:'🔨 Einfach-Hammer',double:'🔨 Doppel-Hammer',lucky:'✨ Glückshammer'};
  const angles={single:60,double:220,lucky:320};
  let revealed=false;
  const reveal=award=>{
   if(!award||award.gameId!==game.id||revealed)return;
   revealed=true;busy=false;spin.hidden=true;
   const elapsed=Math.max(0,Date.now()-award.startedAt);
   const duration=Math.max(100,4300-elapsed);
   disc.style.transition='transform '+duration+'ms cubic-bezier(.12,.8,.12,1)';
   disc.style.transform='rotate('+(1800+360-angles[award.hammer])+'deg)';
   status.textContent='🎡 Das Hammerrad dreht sich für alle …';
   clearTimeout(spinTimer);
   spinTimer=setTimeout(()=>{status.textContent='🎉 Gewonnen: '+labels[award.hammer]+'! '+(winner===u.uid?'Dein Hammer wurde gutgeschrieben.':'Der Sieger erhält diesen Hammer im Weihnachtsevent.');close.hidden=false},duration+100);
  };
  const onGameChange=()=>{const latest=match();if(latest?.id===game.id)reveal(latest.christmasHammerWheel)};
  window.addEventListener('deal-game-state-change',onGameChange);
  if(winner!==u.uid){spin.hidden=true;status.textContent='⏳ Der Sieger dreht das Hammerrad. Alle schauen gemeinsam zu …'}
  else if(game.christmasHammerWheel){spin.hidden=true}
  if(game.christmasHammerWheel)reveal(game.christmasHammerWheel);
  spin.onclick=async()=>{
   if(busy)return;busy=true;spin.disabled=true;status.textContent='⏳ Gewinnerbonus wird serverseitig geprüft …';
   try{
    const token=await u.getIdToken();
    const response=await fetch(base+'/api/christmas-ice/final-hammer',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({code:room(),gameId:game.id}),cache:'no-store'});
    const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'SERVER_ERROR');
    reveal({gameId:game.id,hammer:data.hammer,startedAt:Date.now()});
   }catch(e){status.textContent='⚠️ '+e.message+' – bitte erneut versuchen.';spin.disabled=false;busy=false}
  };
  // The winner's click is optional: start automatically so an idle device
  // cannot leave all spectators stuck at the wheel.
  if(winner===u.uid&&!game.christmasHammerWheel)setTimeout(()=>{if(overlay.isConnected&&!revealed&&!busy)spin.click()},1800);
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
 const style=document.createElement('style');style.textContent='#ice-hammer-bonus{position:fixed;inset:0;z-index:99999;background:#06111de9;display:grid;place-items:center;padding:14px;color:#ffeac4}.ice-hammer-card{width:min(95vw,520px);max-height:94vh;overflow:auto;text-align:center;padding:20px;border:3px solid #e8c26c;border-radius:22px;background:linear-gradient(145deg,#132d4a,#30213e);box-shadow:0 15px 60px #000b}.ice-hammer-wheel{width:min(62vw,270px);aspect-ratio:1;margin:15px auto;position:relative}.ice-hammer-wheel:before{content:"▼";position:absolute;top:-17px;left:calc(50% - 11px);z-index:2;color:#ffe68c;font-size:26px}.ice-hammer-disc{width:100%;height:100%;border:9px solid #e7c77d;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;font-size:29px;background:conic-gradient(#428dc7 0 50%,#b57d2e 50% 85%,#8b4cbb 85% 100%);transition:transform 4.2s cubic-bezier(.12,.8,.12,1);box-shadow:0 0 30px #ffdc7b80}.ice-hammer-disc span{font-size:13px;font-weight:900;text-shadow:0 2px 6px #000}.ice-hammer-card button{margin:7px;padding:13px 18px;border:2px solid #fff2b9;border-radius:12px;background:#e8bd5f;color:#23140b;font-weight:900;cursor:pointer}.ice-hammer-card button[hidden]{display:none}@media(prefers-reduced-motion:reduce){.ice-hammer-disc{transition:none}}';document.head.append(style);
})();
