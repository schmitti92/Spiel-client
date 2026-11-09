/* Christmas Show Director — UI coordination, not prize logic.
 * Owns the order of Christmas pack → confirmed Bingo/Jackpot scenes.
 * No fetch, account reads, receipts, gambling odds or awards happen here.
 */
(()=>{
 'use strict';
 const id=name=>document.getElementById(name);
 const state={
  phase:'idle',packMode:null,claimPending:false,earned:0,
  deferredPacks:[],bridgeTimer:null,bridgeDeadline:null,bridgeSerial:0,focusBeforeBridge:null
 };
 const reduced=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||window.ChristmasSpectacle?.minimal?.());
 const isRealPack=()=>state.packMode==='real';
 const isPackVisible=()=>id('reveal-overlay')?.hidden===false;
 const isBingoVisible=()=>id('hammer-cinema')?.hidden===false;
 function showCue(){
  const tip=id('reveal-next-act'),button=id('reveal-close');
  if(!tip||!button||!isRealPack()||!isPackVisible())return;
  const ready=state.earned>0;
  const checking=state.claimPending;
  const waiting=state.deferredPacks.length;
  const visible=ready||checking||waiting>0;
  tip.hidden=!(visible&&id('reveal-summary')?.hidden===false);
  tip.textContent=ready
   ?state.earned===1?'🏆 Deine bestätigte Bingo-Siegesshow wartet nach dem Paket auf dich!'
     :'🏆 '+state.earned+' bestätigte Bingo-Gewinne warten nach dem Paket auf dich!'
   :checking?'⏳ Hammer-Bingos werden im Hintergrund serverseitig geprüft.'
     :waiting===1?'🎁 Ein weiteres Paket wartet auf die Enthüllung.':'🎁 '+waiting+' weitere Pakete warten auf die Enthüllung.';
  if(id('reveal-summary')?.hidden===false){
   button.textContent=ready?'🏆 Weiter zur Siegesshow':
    checking?'🎬 Weiter · Gewinnprüfung läuft':
    waiting>0?'🎁 Nächstes Paket öffnen':'Schließen ✓';
  }
 }
 function clearBridge(){
  if(state.bridgeTimer!==null)clearTimeout(state.bridgeTimer);
  if(state.bridgeDeadline!==null)clearTimeout(state.bridgeDeadline);
  state.bridgeTimer=null;state.bridgeDeadline=null;
  state.bridgeSerial++;
 }
 function hideBridge(){
  const overlay=id('christmas-show-transition');
  if(overlay){overlay.hidden=true;overlay.setAttribute('aria-hidden','true');}
 }
 function playQueuedPack(){
  if(state.phase!=='idle'||!state.deferredPacks.length)return false;
  const deferred=state.deferredPacks.shift();
  state.packMode=deferred.mode;state.phase='pack';
  state.claimPending=false; // a claim may already have settled before the deferred reveal.
  state.earned=deferred.earned||0;
  try{deferred.present();}catch(error){
   state.phase='idle';state.packMode=null;throw error;
  }
  showCue();
  return true;
 }
 function releaseBridge(){
  if(state.phase!=='transition')return;
  clearBridge();hideBridge();
  const previousFocus=state.focusBeforeBridge;state.focusBeforeBridge=null;
  if(previousFocus?.isConnected){try{previousFocus.focus({preventScroll:true})}catch(_){}}
  state.phase='idle';state.packMode=null;state.claimPending=false;state.earned=0;
  if(playQueuedPack())return;
  window.HammerBingoCinematics?.resume();
 }
 function scheduleBridge(){
  if(state.phase!=='transition')return;
  if(state.claimPending)return;
  if(state.bridgeTimer!==null)clearTimeout(state.bridgeTimer);
  const ticket=state.bridgeSerial;
  // Keep the logo handoff readable but short. UI skips directly for reduced motion.
  state.bridgeTimer=setTimeout(()=>{
   if(ticket!==state.bridgeSerial)return;
   releaseBridge();
  },reduced()?40:state.earned?1150:250);
 }
 function bridge(){
  state.focusBeforeBridge=document.activeElement;
  state.phase='transition';
  clearBridge();
  const overlay=id('christmas-show-transition');
  if(overlay){
   overlay.hidden=false;overlay.setAttribute('aria-hidden','false');
   overlay.dataset.wins=state.earned>0?'true':'false';
  }
  const title=id('christmas-show-transition-title'),copy=id('christmas-show-transition-copy');
  if(title)title.textContent=state.earned>0?'🏆 DAS BINGO-FINALE RUFT!':'🎄 WEIHNACHTSZAUBER';
  if(copy)copy.textContent=state.earned>0
   ?'Deine Paketkarten sind enthüllt – jetzt werden die bestätigten Hammer-Gewinne präsentiert.'
   :'Deine Paketkarten sind enthüllt. Die Gewinne werden noch sicher überprüft.';
  id('christmas-show-transition-skip')?.focus?.({preventScroll:true});
  if(state.claimPending){
   const serial=state.bridgeSerial;
   // Never strand a user because a network request hangs. If the claim returns
   // later, the queued award can still run once the transition is released.
   state.bridgeDeadline=setTimeout(()=>{if(serial===state.bridgeSerial)releaseBridge()},3800);
  }else scheduleBridge();
 }
 function presentPack(present,mode='real'){
  if(typeof present!=='function')return false;
  const normalized=mode==='demo'?'demo':'real';
  if(state.phase!=='idle'||isPackVisible()||isBingoVisible()||state.deferredPacks.length){
   // Never discard a paid-for packet: preserve every pending reveal in FIFO
   // order, even if two successful responses arrive during a Bingo scene.
   state.deferredPacks.push({present,mode:normalized,earned:0});
   if(state.phase==='idle'&&!isPackVisible()&&!isBingoVisible())playQueuedPack();
   else showCue();
   return false;
  }
  state.phase='pack';state.packMode=normalized;
  state.claimPending=false;state.earned=0;
  present();
  return true;
 }
 function claimStarted(){
  if(state.phase==='pack'&&isRealPack()){
   state.claimPending=true;showCue();
  }
 }
 function claimSettled(){
  if(state.phase==='pack'&&isRealPack()){
   state.claimPending=false;showCue();
  }else if(state.phase==='transition'){
   state.claimPending=false;
   if(state.bridgeDeadline!==null){clearTimeout(state.bridgeDeadline);state.bridgeDeadline=null}
   scheduleBridge();
  }
 }
 function awardQueued(count=0){
  const amount=Math.max(0,Math.floor(Number(count)||0));
  if(!amount)return;
  // Awards during Bingo can belong to a pending confirmed package.
  // Keep that queue's visual cue; the credited reward itself is managed
  // solely by the Bingo controller and cannot be duplicated here.
  if(!isRealPack()&&state.deferredPacks.length){
   state.deferredPacks[state.deferredPacks.length-1].earned+=amount;
  }
  if((state.phase==='pack'||state.phase==='transition')&&isRealPack()){
   state.earned+=amount;
   if(state.phase==='pack')showCue();
   else{
    const title=id('christmas-show-transition-title'),copy=id('christmas-show-transition-copy');
    if(title)title.textContent='🏆 DEINE GEWINNE SIND BESTÄTIGT!';
    if(copy)copy.textContent='Die Bingos wurden sicher gutgeschrieben. Jetzt folgt deine Siegesshow!';
    if(!state.claimPending)scheduleBridge();
   }
  }
 }
 function summaryReady(){showCue()}
 function packClosed(){
  if(state.phase!=='pack')return;
  if(state.packMode==='demo'||(!state.earned&&!state.claimPending)){
   state.phase='idle';state.packMode=null;state.claimPending=false;state.earned=0;
   if(playQueuedPack())return;
   window.HammerBingoCinematics?.resume();
   return;
  }
  bridge();
 }
 function canStartBingo(){
  return state.phase==='idle'&&!isPackVisible()&&!isBingoVisible()
   &&id('christmas-show-transition')?.hidden!==false;
 }
 function bingoStarted(){
  if(!canStartBingo())return false;
  state.phase='bingo';
  return true;
 }
 function bingoEnded(){
  if(state.phase!=='bingo')return;
  state.phase='idle';
  if(playQueuedPack())return;
  // The Bingo controller handles its own queue and the small inter-scene beat.
 }
 function skipTransition(){releaseBridge()}
 function init(){
  id('christmas-show-transition-skip')?.addEventListener('click',skipTransition);
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&state.phase==='transition'){
    event.preventDefault();skipTransition();
   }
  });
  // A return from a background tab should not block committed scenes forever.
  document.addEventListener('visibilitychange',()=>{
   if(!document.hidden&&state.phase==='idle'){
    window.HammerBingoCinematics?.resume();
   }
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 window.ChristmasShowDirector=Object.freeze({
  presentPack,claimStarted,claimSettled,awardQueued,summaryReady,
  packClosed,canStartBingo,bingoStarted,bingoEnded,skipTransition
 });
})();
