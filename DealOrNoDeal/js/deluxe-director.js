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
  const caseCount=Number(game?.caseCount)||27;
  const remaining=Math.max(0,caseCount-opened);
  const phaseName=game?.phase||'waiting';
  const labels={waiting:'WILLKOMMEN IM GOLDSTUDIO',select:'DEIN GLÜCKSKOFFER',open:'JETZT WIRD ES SPANNEND',reveal:'DER KOFFER ÖFFNET SICH',decision:'DER BANKER RUFT AN',final:'DAS GROSSE FINALE',finished:'DIE SHOW IST BEENDET'};
  const key=String(game?.id||'')+':'+String(game?.revision||'')+':'+phaseName;
  if(key===lastKey)return;
  lastKey=key;
  phase('deluxe-phase').textContent=labels[phaseName]||'GOLDSTUDIO LIVE';
  phase('deluxe-count').textContent=remaining+' KOFFER ÜBRIG';
  phase('deluxe-risk-fill').style.width=Math.round(opened/caseCount*100)+'%';
  const intensity=opened>=Math.max(0,caseCount-3)?'FINALE · HÖCHSTE SPANNUNG':opened>=Math.max(0,caseCount-8)?'HOCHSPANNUNG':opened>=10?'JETZT WIRD ES ERNST':'DIE SPANNUNG STEIGT';
  phase('deluxe-risk-label').textContent=intensity;
  document.body.classList.toggle('deluxe-climax',opened>=Math.max(0,caseCount-3));
  document.body.classList.toggle('deluxe-decision',phaseName==='decision');
  if(game&&lastPhase&&phaseName!==lastPhase){
   if(phaseName==='decision'){
    // Original three-note incoming call. Sound remains opt-in.
    beep(392,.16);setTimeout(()=>beep(523,.18),220);setTimeout(()=>beep(659,.3),470);
   }else if(phaseName==='final'){
    beep(523,.16);setTimeout(()=>beep(659,.18),220);
    setTimeout(()=>beep(784,.19),450);setTimeout(()=>beep(1047,.42),710);
   }else if(phaseName==='open'&&lastPhase==='decision'&&
     game.history?.at(-1)?.decisions?.length===game.history?.at(-1)?.participants?.length&&
     game.history.at(-1).decisions.every(v=>v.deal===false)){
    // An original victory-like swell for a unanimous risk-taking decision.
    beep(440,.11);setTimeout(()=>beep(554,.12),160);setTimeout(()=>beep(740,.26),340);
   }
  }
  if(game&&lastOpened>=0&&opened>lastOpened){
   const amount=game.openedAmounts?.at(-1)?.amount;
   if(amount>=100000000){
    // A million-euro amount has been eliminated.
    beep(440,.16);setTimeout(()=>beep(330,.24),200);
    setTimeout(()=>beep(220,.37),460);
   }else if(Number.isFinite(amount)&&amount<=7500){
    // The big-money amounts have survived this reveal.
    beep(587,.12);setTimeout(()=>beep(784,.21),175);
   }else beep(360,.18);
  }
  lastPhase=phaseName;lastOpened=opened;
 }
 tick();setInterval(()=>{if(!document.hidden)tick()},500);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
})();
