'use strict';
/* Monster-Rad: client-only TV-show director. Prize ownership, ticket debit
   and the chosen 25-sector stop are always decided by the server. */
(()=>{
 const stage=document.getElementById('monster-stage');
 const countdown=document.getElementById('monster-show-countdown');
 const label=document.getElementById('monster-show-phase');
 const timer=document.getElementById('monster-show-timer');
 const confetti=document.getElementById('monster-show-confetti');
 const result=document.getElementById('monster-wheel-prize');
 if(!stage||!countdown||!label||!timer||!confetti||!result)return;
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 const pause=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 function change(phase,text){
  stage.dataset.showPhase=phase;
  label.textContent=text;
 }
 function reset(){
  change('ready','🎟️ BEREIT FÜR DIE MONSTER-SHOW');
  countdown.textContent='';
  countdown.hidden=true;
  confetti.replaceChildren();
  confetti.hidden=true;
  timer.style.removeProperty('--monster-show-duration');
  timer.classList.remove('is-running');
 }
 function awaiting(){
  change('confirming','🔐 DER WEIHNACHTS-TRESOR WIRD GEÖFFNET');
  countdown.hidden=true;
  confetti.hidden=true;
  timer.classList.remove('is-running');
 }
 async function countdownToSpin(){
  change('countdown','🎬 DIE GROSSE MONSTER-SHOW BEGINNT!');
  countdown.hidden=false;
  const duration=reduced()?110:650;
  for(const n of [3,2,1]){
   countdown.textContent=String(n);
   countdown.dataset.tick=String(n);
   await pause(duration);
  }
  countdown.textContent='LOS!';
  countdown.dataset.tick='go';
  await pause(reduced()?75:360);
  countdown.hidden=true;
 }
 function spinning(durationMs){
  change('spinning','🎡 DAS MONSTER-RAD DREHT SICH …');
  timer.style.setProperty('--monster-show-duration',Math.max(0,Number(durationMs)||8000)+'ms');
  timer.classList.remove('is-running');
  void timer.offsetWidth;
  timer.classList.add('is-running');
 }
 function winner(prize){
  const kind=prize?.kind||'';
  const icon=prize?.icon||'🏆';
  change('winning',kind==='avatar'?'👑 EIN LEGENDÄRER CHARAKTER!':kind==='pack'?'🎁 EIN KARTENPAKET-GEWINN!':kind==='cash'||kind==='randomCash'?'💰 GELDREGEN IM GOLDSTUDIO!':'🏆 DEIN MONSTER-GEWINN IST DA!');
  timer.classList.remove('is-running');
  countdown.textContent=icon;
  countdown.hidden=false;
  countdown.dataset.tick='won';
  confetti.replaceChildren();
  if(!reduced()){
   const frag=document.createDocumentFragment();
   for(let i=0;i<32;i++){
    const bit=document.createElement('i');
    bit.style.setProperty('--x',((i*67)%100)+'%');
    bit.style.setProperty('--delay',((i*11)%31)/100+'s');
    bit.style.setProperty('--drift',(((i*37)%110)-55)+'px');
    bit.className='monster-show-confetti-piece';
    frag.appendChild(bit);
   }
   confetti.appendChild(frag);
   confetti.hidden=false;
  }
  // Animate the existing server-confirmed result without changing its data.
  result.classList.remove('monster-show-result-arrive');
  void result.offsetWidth;
  result.classList.add('monster-show-result-arrive');
 }
 function error(){
  change('error','⚠️ DIE SHOW KONNTE NICHT ABGESCHLOSSEN WERDEN');
  countdown.hidden=true;confetti.hidden=true;
  timer.classList.remove('is-running');
 }
 window.ChristmasMonsterShow=Object.freeze({reset,awaiting,countdown:countdownToSpin,spinning,winner,error});
 reset();
})();