'use strict';
/* Goldstudio Deluxe: purely presentational, server-authoritative game state remains untouched. */
(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const hud=document.createElement('aside');hud.id='deluxe-director';hud.setAttribute('aria-label','Live-Regie');
 hud.innerHTML='<div class="deluxe-live"><span class="deluxe-dot"></span> GOLDSTUDIO <b>LIVE</b></div><div class="deluxe-info"><span id="deluxe-phase">DIE SHOW BEGINNT</span><strong id="deluxe-count">26 KOFFER</strong></div><div class="deluxe-risk"><span id="deluxe-risk-label">DIE SPANNUNG STEIGT</span><div class="deluxe-risk-track"><i id="deluxe-risk-fill"></i></div></div><button id="deluxe-sound" type="button" aria-pressed="false" title="Dezente Showklänge ein- oder ausschalten">♪ TON AUS</button>';
 document.body.append(hud);
 const phase=$id=>document.getElementById($id);
 let ctx=null,sound=false,lastKey='',lastPhase='',lastOpened=-1,lastOffer='';
 function beep(freq,duration,volume=0.022){
  if(!sound||reduced||document.hidden)return;
  try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,ctx.currentTime);gain.gain.setValueAtTime(volume,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration+.01)}catch(e){sound=false;phase('deluxe-sound').textContent='♪ TON AUS'}
 }
 phase('deluxe-sound').addEventListener('click',()=>{sound=!sound;phase('deluxe-sound').textContent=sound?'♫ TON AN':'♪ TON AUS';phase('deluxe-sound').setAttribute('aria-pressed',String(sound));if(sound)beep(660,.14)});
 function tick(){
  const game=typeof g!=='undefined'?g:null;
  const opened=game?.openedAmounts?.length||0;
  const remaining=Math.max(0,26-opened);
  const phaseName=game?.phase||'waiting';
  const labels={waiting:'WILLKOMMEN IM GOLDSTUDIO',select:'DEIN GLÜCKSKOFFER',open:'JETZT WIRD ES SPANNEND',reveal:'DER KOFFER ÖFFNET SICH',decision:'DER BANKER RUFT AN',final:'DAS GROSSE FINALE',finished:'DIE SHOW IST BEENDET'};
  const key=String(game?.id||'')+':'+String(game?.revision||'')+':'+phaseName;
  if(key===lastKey)return;
  lastKey=key;
  phase('deluxe-phase').textContent=labels[phaseName]||'GOLDSTUDIO LIVE';
  phase('deluxe-count').textContent=remaining+' KOFFER ÜBRIG';
  phase('deluxe-risk-fill').style.width=Math.round(opened/26*100)+'%';
  const intensity=opened>=23?'FINALE · HÖCHSTE SPANNUNG':opened>=18?'HOCHSPANNUNG':opened>=10?'JETZT WIRD ES ERNST':'DIE SPANNUNG STEIGT';
  phase('deluxe-risk-label').textContent=intensity;
  document.body.classList.toggle('deluxe-climax',opened>=23);
  document.body.classList.toggle('deluxe-decision',phaseName==='decision');
  if(game&&lastPhase&&phaseName!==lastPhase){
   if(phaseName==='decision'){beep(540,.22);setTimeout(()=>beep(760,.3),260)}
   else if(phaseName==='final'){beep(660,.2);setTimeout(()=>beep(880,.35),260)}
  }
  if(game&&lastOpened>=0&&opened>lastOpened){beep(360,.18)}
  lastPhase=phaseName;lastOpened=opened;
 }
 tick();setInterval(()=>{if(!document.hidden)tick()},500);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
})();
