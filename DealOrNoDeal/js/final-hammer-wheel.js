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
  // The same reward dialog remains the only ceremony window for both wheels.
  if(!game.christmasWheelClosed?.['final:'+game.id])return;
  const box=document.getElementById('cent-reward');
  const finaleOverlay=document.getElementById('finale-cinema');
  if(!box||finaleOverlay&&!finaleOverlay.hidden)return;
  if(shown===game.id||sessionStorage.getItem('ice-hammer-wheel-seen:'+game.id)==='yes')return;
  shown=game.id;
  box.hidden=false;box.classList.add('final-dual-active','final-hammer-running');
  box.dataset.stage='wheel';
  document.getElementById('cent-wheel-stage').hidden=false;
  document.getElementById('cent-reveal-stage').hidden=true;
  document.getElementById('cent-wheel-spin').hidden=true;
  document.getElementById('cent-reward-close').hidden=true;
  document.getElementById('final-dual-hammer').hidden=false;
  document.getElementById('cent-reward-title').textContent='🏆 Das große Sieger-Doppelglücksrad';
  document.getElementById('cent-reward-subtitle').textContent='🎁 Kartenpaket ausgelost · 🔨 Jetzt dreht das Hammerrad – live für alle';
  document.getElementById('cent-wheel-status').textContent='✓ Das Kartenpaket wurde bereits ausgelost';
  const disc=document.getElementById('final-dual-hammer-disc');
  const status=document.getElementById('final-dual-hammer-status');
  const close=document.getElementById('cent-reward-close');
  const spin=document.createElement('button');
  spin.className='final-hammer-retry';spin.textContent='🔄 Hammerauslosung erneut versuchen';spin.hidden=true;
  document.getElementById('final-dual-hammer').append(spin);
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
  if(winner!==u.uid){spin.hidden=true;status.textContent='⏳ Das Hammerrad wird beim Sieger automatisch gestartet – du schaust live zu.'}
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
   }catch(e){status.textContent='⚠️ '+e.message+' – der Sieger kann erneut versuchen.';spin.hidden=winner!==u.uid;spin.disabled=false;busy=false}
  };
  // Only the authenticated winner may request a spin; the server draws the award once.
  if(winner===u.uid&&!game.christmasHammerWheel)setTimeout(()=>{if(box.isConnected&&!box.hidden&&!busy&&!revealed)spin.click()},1400);
  close.onclick=()=>{window.removeEventListener('deal-game-state-change',onGameChange);clearTimeout(spinTimer);sessionStorage.setItem('ice-hammer-wheel-seen:'+game.id,'yes');box.hidden=true;box.classList.remove('final-hammer-running','final-dual-active');spin.remove();busy=false};
 }
 function scheduleShow(){
  const game=match();if(!winnerId(game))return;
  const started=Number(game.christmasWheelSpins?.['final:'+game.id]||0);
  if(!started)return;
  if(!game.christmasWheelClosed?.['final:'+game.id])return;
  const delay=0;
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

 const dualStyle=document.createElement('style');dualStyle.textContent=`
 #ice-hammer-bonus .ice-hammer-card{width:min(98vw,1100px)}
 #ice-hammer-bonus .ice-dual-wheels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(8px,2vw,24px);align-items:center;margin:10px 0}
 #ice-hammer-bonus .ice-dual-wheels section{min-width:0;padding:clamp(8px,1.5vw,16px);border:1px solid #d9b36c8c;border-radius:18px;background:#06142ac9}
 #ice-hammer-bonus .ice-dual-wheels h3{font-size:clamp(12px,2vw,22px);color:#ffe4a2;margin:0 0 8px}
 #ice-hammer-bonus .ice-dual-pack-wheel{width:min(32vw,42dvh,380px);aspect-ratio:1;margin:auto;background:url('./assets/weihnachts_gluecksrad_drehscheibe.png') center/contain no-repeat;filter:drop-shadow(0 0 18px #ffd46d80)}
 #ice-hammer-bonus .ice-hammer-wheel{width:min(32vw,42dvh,380px)}
 #ice-hammer-bonus .ice-dual-pack p{color:#b8f4c9;font-weight:850}
 #cent-reward.final-dual-active .final-dual-wheels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(8px,2vw,22px);align-items:start}
 #cent-reward.final-dual-active .final-dual-pack,#cent-reward.final-dual-active .final-dual-hammer{min-width:0;padding:8px;border:1px solid #e5c77a80;border-radius:16px;background:#07142cbb}
 #cent-reward.final-dual-active .final-dual-label{font-weight:950;color:#ffe7a3;font-size:clamp(12px,1.5vw,19px);margin:0 0 8px}
 #cent-reward.final-dual-active .cent-wheel-wrap{width:min(31vw,40dvh,350px);height:auto;aspect-ratio:1;margin:auto}
 #cent-reward.final-dual-active .final-dual-hammer-wrap{position:relative;width:min(31vw,40dvh,350px);aspect-ratio:1;margin:auto;filter:drop-shadow(0 0 18px #ffd46d60)}
 #cent-reward.final-dual-active .final-dual-hammer-disc{width:100%;height:100%;background:url('./Weihnachtsevent2/Weihnachtsbilder/file_00000000b9c48210b20aab8553d17e0a.png') center/contain no-repeat;filter:grayscale(.65) brightness(.65)}
 #cent-reward.final-dual-active .final-dual-pointer{position:absolute;top:-12px;left:50%;transform:translateX(-50%);font-size:28px;color:#ffe5a3}
 #cent-reward.final-dual-active #final-dual-hammer-status{color:#f8d79b;font-size:clamp(11px,1.2vw,16px)}
 #cent-reward.final-dual-active .cent-pack-legend{flex-wrap:wrap}
 @media(max-width:650px){#ice-hammer-bonus .ice-dual-wheels{gap:6px}#ice-hammer-bonus .ice-dual-wheels section{padding:6px}#ice-hammer-bonus .ice-dual-pack-wheel,#ice-hammer-bonus .ice-hammer-wheel{width:min(40vw,32dvh)}#cent-reward.final-dual-active .cent-wheel-wrap,#cent-reward.final-dual-active .final-dual-hammer-wrap{width:min(39vw,30dvh)}}
 @media(prefers-reduced-motion:reduce){#ice-hammer-bonus .ice-hammer-disc{transition:none!important}}
 `;document.head.append(dualStyle);
})();
