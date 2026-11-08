'use strict';
(()=>{
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(new RegExp('/+;
 let shown='',busy=false;
 const user=()=>window.SpielOnline?.state?.()?.user;
 const match=()=>typeof g!=='undefined'?g:null;
 function show(){
  const game=match(),u=user();if(!game||game.phase!=='final'||!u?.uid)return;
  const payouts=(game.finalValues||[]).map(x=>({id:x.id,payout:x.payout}));
  if(!payouts.length)return;
  const top=Math.max(...payouts.map(x=>x.payout)),winners=payouts.filter(x=>x.payout===top);
  if(winners.length!==1||winners[0].id!==u.uid)return;
  if(!sessionStorage.getItem('final-wheel-complete:'+game.id))return;
  if(shown===game.id||sessionStorage.getItem('ice-hammer-wheel-seen:'+game.id)==='yes')return;
  shown=game.id;
  const overlay=document.createElement('div');overlay.id='ice-hammer-bonus';
  overlay.innerHTML='<div class="ice-hammer-card"><h2>🔨 Sieger-Hammerrad</h2><p>Das Sammelkarten-Glücksrad ist abgeschlossen. Jetzt folgt dein zusätzlicher Hammergewinn!</p><div class="ice-hammer-wheel"><div class="ice-hammer-disc">🔨<span>Einfach · 50 %</span><span>Doppel · 35 %</span><span>Glück · 15 %</span></div></div><p class="ice-hammer-message" role="status">Bereit für deinen Siegerbonus</p><button class="ice-hammer-spin">🎡 Hammer-Glücksrad drehen</button><button class="ice-hammer-close" hidden>✓ Weiter zum Spiel</button></div>';
  document.body.append(overlay);
  const disc=overlay.querySelector('.ice-hammer-disc'),spin=overlay.querySelector('.ice-hammer-spin'),status=overlay.querySelector('.ice-hammer-message'),close=overlay.querySelector('.ice-hammer-close');
  spin.onclick=async()=>{
   if(busy)return;busy=true;spin.disabled=true;status.textContent='⏳ Gewinnerbonus wird serverseitig geprüft …';
   try{
    const token=await u.getIdToken();
    const response=await fetch(base+'/api/christmas-ice/final-hammer',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({code:typeof code==='string'?code:new URLSearchParams(location.search).get('room'),gameId:game.id}),cache:'no-store'});
    const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'SERVER_ERROR');
    const labels={single:'🔨 Einfach-Hammer',double:'🔨 Doppel-Hammer',lucky:'✨ Glückshammer'};
    const angles={single:60,double:220,lucky:320};
    disc.style.transform='rotate('+(1800+360-angles[data.hammer])+'deg)';
    status.textContent='🎡 Das Hammerrad dreht sich …';
    setTimeout(()=>{status.textContent='🎉 Gewonnen: '+labels[data.hammer]+'! Der Hammer wurde deinem Online-Weihnachtsevent gutgeschrieben.';spin.hidden=true;close.hidden=false},matchMedia('(prefers-reduced-motion: reduce)').matches?100:4300);
   }catch(e){status.textContent='⚠️ '+e.message+' – bitte erneut versuchen.';spin.disabled=false;busy=false}
  };
  close.onclick=()=>{sessionStorage.setItem('ice-hammer-wheel-seen:'+game.id,'yes');overlay.remove()};
 }
 window.addEventListener('deal-final-wheel-complete',()=>setTimeout(show,200));
 window.addEventListener('deal-game-state-change',()=>{if(sessionStorage.getItem('final-wheel-complete:'+String(match()?.id)))show()});
 const style=document.createElement('style');style.textContent='#ice-hammer-bonus{position:fixed;inset:0;z-index:99999;background:#06111de9;display:grid;place-items:center;padding:14px;color:#ffeac4}.ice-hammer-card{width:min(95vw,520px);max-height:94vh;overflow:auto;text-align:center;padding:20px;border:3px solid #e8c26c;border-radius:22px;background:linear-gradient(145deg,#132d4a,#30213e);box-shadow:0 15px 60px #000b}.ice-hammer-wheel{width:min(62vw,270px);aspect-ratio:1;margin:15px auto;position:relative}.ice-hammer-wheel:before{content:"▼";position:absolute;top:-17px;left:calc(50% - 11px);z-index:2;color:#ffe68c;font-size:26px}.ice-hammer-disc{width:100%;height:100%;border:9px solid #e7c77d;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;font-size:29px;background:conic-gradient(#428dc7 0 50%,#b57d2e 50% 85%,#8b4cbb 85% 100%);transition:transform 4.2s cubic-bezier(.12,.8,.12,1);box-shadow:0 0 30px #ffdc7b80}.ice-hammer-disc span{font-size:13px;font-weight:900;text-shadow:0 2px 6px #000}.ice-hammer-card button{margin:7px;padding:13px 18px;border:2px solid #fff2b9;border-radius:12px;background:#e8bd5f;color:#23140b;font-weight:900;cursor:pointer}.ice-hammer-card button[hidden]{display:none}@media(prefers-reduced-motion:reduce){.ice-hammer-disc{transition:none}}';document.head.append(style);
})();
),'');
 let shown='',busy=false;
 const user=()=>window.SpielOnline?.state?.()?.user;
 const match=()=>typeof g!=='undefined'?g:null;
 function show(){
  const game=match(),u=user();if(!game||game.phase!=='final'||!u?.uid)return;
  const payouts=(game.finalValues||[]).map(x=>({id:x.id,payout:x.payout}));
  if(!payouts.length)return;
  const top=Math.max(...payouts.map(x=>x.payout)),winners=payouts.filter(x=>x.payout===top);
  if(winners.length!==1||winners[0].id!==u.uid)return;
  if(!sessionStorage.getItem('final-wheel-complete:'+game.id))return;
  if(shown===game.id||sessionStorage.getItem('ice-hammer-wheel-seen:'+game.id)==='yes')return;
  shown=game.id;
  const overlay=document.createElement('div');overlay.id='ice-hammer-bonus';
  overlay.innerHTML='<div class="ice-hammer-card"><h2>🔨 Sieger-Hammerrad</h2><p>Das Sammelkarten-Glücksrad ist abgeschlossen. Jetzt folgt dein zusätzlicher Hammergewinn!</p><div class="ice-hammer-wheel"><div class="ice-hammer-disc">🔨<span>Einfach · 50 %</span><span>Doppel · 35 %</span><span>Glück · 15 %</span></div></div><p class="ice-hammer-message" role="status">Bereit für deinen Siegerbonus</p><button class="ice-hammer-spin">🎡 Hammer-Glücksrad drehen</button><button class="ice-hammer-close" hidden>✓ Weiter zum Spiel</button></div>';
  document.body.append(overlay);
  const disc=overlay.querySelector('.ice-hammer-disc'),spin=overlay.querySelector('.ice-hammer-spin'),status=overlay.querySelector('.ice-hammer-message'),close=overlay.querySelector('.ice-hammer-close');
  spin.onclick=async()=>{
   if(busy)return;busy=true;spin.disabled=true;status.textContent='⏳ Gewinnerbonus wird serverseitig geprüft …';
   try{
    const token=await u.getIdToken();
    const response=await fetch(base+'/api/christmas-ice/final-hammer',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({code:typeof code==='string'?code:new URLSearchParams(location.search).get('room'),gameId:game.id}),cache:'no-store'});
    const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'SERVER_ERROR');
    const labels={single:'🔨 Einfach-Hammer',double:'🔨 Doppel-Hammer',lucky:'✨ Glückshammer'};
    const angles={single:60,double:220,lucky:320};
    disc.style.transform='rotate('+(1800+360-angles[data.hammer])+'deg)';
    status.textContent='🎡 Das Hammerrad dreht sich …';
    setTimeout(()=>{status.textContent='🎉 Gewonnen: '+labels[data.hammer]+'! Der Hammer wurde deinem Online-Weihnachtsevent gutgeschrieben.';spin.hidden=true;close.hidden=false},matchMedia('(prefers-reduced-motion: reduce)').matches?100:4300);
   }catch(e){status.textContent='⚠️ '+e.message+' – bitte erneut versuchen.';spin.disabled=false;busy=false}
  };
  close.onclick=()=>{sessionStorage.setItem('ice-hammer-wheel-seen:'+game.id,'yes');overlay.remove()};
 }
 window.addEventListener('deal-final-wheel-complete',()=>setTimeout(show,200));
 window.addEventListener('deal-game-state-change',()=>{if(sessionStorage.getItem('final-wheel-complete:'+String(match()?.id)))show()});
 const style=document.createElement('style');style.textContent='#ice-hammer-bonus{position:fixed;inset:0;z-index:99999;background:#06111de9;display:grid;place-items:center;padding:14px;color:#ffeac4}.ice-hammer-card{width:min(95vw,520px);max-height:94vh;overflow:auto;text-align:center;padding:20px;border:3px solid #e8c26c;border-radius:22px;background:linear-gradient(145deg,#132d4a,#30213e);box-shadow:0 15px 60px #000b}.ice-hammer-wheel{width:min(62vw,270px);aspect-ratio:1;margin:15px auto;position:relative}.ice-hammer-wheel:before{content:"▼";position:absolute;top:-17px;left:calc(50% - 11px);z-index:2;color:#ffe68c;font-size:26px}.ice-hammer-disc{width:100%;height:100%;border:9px solid #e7c77d;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;font-size:29px;background:conic-gradient(#428dc7 0 50%,#b57d2e 50% 85%,#8b4cbb 85% 100%);transition:transform 4.2s cubic-bezier(.12,.8,.12,1);box-shadow:0 0 30px #ffdc7b80}.ice-hammer-disc span{font-size:13px;font-weight:900;text-shadow:0 2px 6px #000}.ice-hammer-card button{margin:7px;padding:13px 18px;border:2px solid #fff2b9;border-radius:12px;background:#e8bd5f;color:#23140b;font-weight:900;cursor:pointer}.ice-hammer-card button[hidden]{display:none}@media(prefers-reduced-motion:reduce){.ice-hammer-disc{transition:none}}';document.head.append(style);
})();
