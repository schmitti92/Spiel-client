'use strict';
// The two wheels share one existing reward dialog. The server owns the prizes;
// this file only renders the hammer wheel and starts it automatically after
// the first (pack) wheel. No second modal or second user click is needed.
(()=>{
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const labels={single:'🔨 Einfach-Hammer',double:'🔨 Doppel-Hammer',lucky:'✨ Glückshammer'};
 const angles={single:30,double:60,lucky:0};
 const duration=4300;
 const panel=document.getElementById('final-dual-hammer');
 const disc=document.getElementById('final-dual-hammer-disc');
 const status=document.getElementById('final-dual-hammer-status');
 if(!panel||!disc||!status)return;
 const retry=document.createElement('button');
 retry.type='button';retry.className='final-dual-retry';
 retry.textContent='🔄 Hammerrad erneut verbinden';retry.hidden=true;panel.append(retry);
 let active=null,epoch=0,finishTimer=null,retryTimer=null;
 const game=()=>typeof g!=='undefined'?g:null;
 const user=()=>window.SpielOnline?.state?.()?.user;
 const room=()=>typeof code==='string'?code:new URLSearchParams(location.search).get('room');
 function clearTimers(){clearTimeout(finishTimer);clearTimeout(retryTimer);finishTimer=null;retryTimer=null}
 function reset(reward){
  epoch++;clearTimers();
  active={id:reward.id,gameId:reward.gameId,uid:reward.uid,clockOffset:0,onComplete:null,ready:false,started:false,finished:false,busy:false,attempts:0};
  panel.dataset.phase='waiting';retry.hidden=true;retry.disabled=false;
  disc.style.transition='none';disc.style.transform='rotate(0deg)';
  status.textContent='🔒 Startet direkt nach dem Kartenrad';
 }
 function complete(a,which){
  if(active!==a||a.finished)return;
  a.finished=true;panel.dataset.phase='finished';
  status.textContent='🎉 '+labels[which]+' gewonnen! '+(a.uid===user()?.uid?'Dein Hammer wurde gutgeschrieben.':'Die Belohnung wurde dem Sieger gutgeschrieben.');
  retry.hidden=true;
  try{sessionStorage.setItem('ice-hammer-wheel-seen:'+a.gameId,'yes')}catch(_){}
  a.onComplete?.();
 }
 function spin(award){
  const a=active;
  if(!a||!a.ready||a.started||!award||award.gameId!==a.gameId||award.uid!==a.uid||!Object.hasOwn(labels,award.hammer))return;
  a.started=true;a.busy=false;clearTimeout(retryTimer);retry.hidden=true;panel.dataset.phase='spinning';
  const elapsed=Math.max(0,Date.now()+a.clockOffset-Number(award.startedAt||0));
  const target=2520-angles[award.hammer];
  status.textContent='🔨 DAS HAMMERRAD DREHT! · '+(a.uid===user()?.uid?'Dein Siegerbonus':'Live für alle Spieler');
  if(elapsed>=duration){
   disc.style.transition='none';disc.style.transform='rotate('+target+'deg)';
   complete(a,award.hammer);return;
  }
  // Start observers partway through an ongoing spin using the same timestamp.
  const progress=Math.min(1,elapsed/duration);
  const eased=1-Math.pow(1-progress,3);
  disc.style.transition='none';disc.style.transform='rotate('+(target*eased)+'deg)';
  const captured=epoch;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(active!==a||epoch!==captured||a.finished)return;
   disc.style.transition='transform '+Math.max(80,duration-elapsed)+'ms cubic-bezier(.12,.82,.12,1)';
   disc.style.transform='rotate('+target+'deg)';
  }));
  finishTimer=setTimeout(()=>complete(a,award.hammer),Math.max(0,duration-elapsed)+100);
 }
 function synchronize(){
  const a=active;if(!a?.ready)return;
  const current=game();if(current?.id!==a.gameId)return;
  spin(current.christmasHammerWheel);
 }
 async function requestHammer(){
  const a=active;if(!a?.ready||a.started||a.busy||a.finished||a.uid!==user()?.uid)return;
  a.busy=true;a.attempts++;retry.hidden=true;
  status.textContent='🔨 Das Hammerrad wird für alle Spieler gestartet …';
  try{
   const token=await user().getIdToken();
   if(active!==a)return;
   const response=await fetch(base+'/api/christmas-ice/final-hammer',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({code:room(),gameId:a.gameId}),cache:'no-store'
   });
   const data=await response.json();
   if(!response.ok||!data.ok)throw Error(data.error||'HAMMER_SERVER_ERROR');
   if(active!==a)return;
   spin({gameId:a.gameId,uid:a.uid,hammer:data.hammer,startedAt:data.startedAt||Date.now()+a.clockOffset});
  }catch(error){
   if(active!==a)return;
   synchronize();
   if(a.started)return;
   status.textContent='⚠️ Verbindung zum Hammerrad: '+(error.message||'Fehler')+'. Der Gewinn bleibt sicher gespeichert.';
   retry.hidden=false;retry.disabled=false;
   // Retry a temporary outage without needing another winner click.
   if(a.attempts<4)retryTimer=setTimeout(()=>{if(active===a&&!a.started)requestHammer()},2800);
  }finally{if(active===a)a.busy=false}
 }
 function activate(reward,onComplete,clockOffset=0){
  if(!reward)return;
  if(!active||active.id!==reward.id||active.gameId!==reward.gameId)reset(reward);
  const a=active;a.onComplete=onComplete;a.clockOffset=Number(clockOffset)||0;a.ready=true;
  panel.dataset.phase='ready';
  synchronize();
  if(a.started)return;
  if(a.uid===user()?.uid)requestHammer();
  else status.textContent='⏳ Der Sieger startet automatisch das Hammerrad – du schaust live zu.';
 }
 retry.addEventListener('click',()=>{if(active&&!active.busy){retry.disabled=true;requestHammer()}});
 window.addEventListener('deal-game-state-change',synchronize);
 window.DealFinalDualWheel={reset,activate,synchronize};
})();
