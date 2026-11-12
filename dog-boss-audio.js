/* K-07 · Local Web Audio cues, never a network or gameplay operation.
 * Browser audio unlocks only following the explicit sound-button gesture.
 * Combat confirmation and its timestamp remain the sole source of hit cues.
 */
(()=>{'use strict';
 const create=root=>{
  const button=root?.querySelector?.('#combat-sound');
  if(!button)return {update(){},isEnabled:()=>false};
  let enabled=false,context=null,encounter='',seen=new Set();
  const audioCtor=()=>window.AudioContext||window.webkitAudioContext;
  function buttonState(){
   button.textContent=enabled?'🔊':'🔇';
   button.setAttribute?.('aria-pressed',String(enabled));
   button.setAttribute?.('aria-label',enabled?
    'Kampfgeräusche stummschalten':'Kampfgeräusche einschalten');
   button.title=enabled?'Kampfgeräusche aus':'Kampfgeräusche an';
  }
  function play(kind,gate){
   if(!enabled||!context||context.state==='suspended')return;
   try{
    const t=context.currentTime;
    const base=kind==='warn'?240:kind==='block'?420:
     kind==='boss-hit'?130:kind==='hero-hit'?550:300;
    // A short synthetic cue instead of a downloaded sound file.
    const shift=kind==='boss-hit'?(Number(gate)%3)*22:0;
    const length=kind==='warn'?.13:kind==='block'?.16:.20;
    const oscillator=context.createOscillator();
    const gain=context.createGain();
    oscillator.type=kind==='boss-hit'?'sawtooth':
     kind==='warn'?'triangle':'sine';
    oscillator.frequency.setValueAtTime(base+shift,t);
    oscillator.frequency.exponentialRampToValueAtTime(
     Math.max(65,(base+shift)*(kind==='boss-hit'?.55:1.34)),t+length);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(.065,t+.014);
    gain.gain.exponentialRampToValueAtTime(.0001,t+length);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.start(t);oscillator.stop(t+length+.015);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
   }catch{/* Audio unavailable: gameplay stays fully functional. */}
  }
  button.addEventListener('click',event=>{
   event?.stopPropagation?.();
   enabled=!enabled;
   if(enabled){
    try{
     const Ctor=audioCtor();
     if(!Ctor){enabled=false;buttonState();return}
     if(!context)context=new Ctor();
     context.resume?.().catch?.(()=>{});
    }catch{enabled=false}
   }else context?.suspend?.().catch?.(()=>{});
   buttonState();
  });
  buttonState();
  return {isEnabled:()=>enabled,update(view,state){
   const stamp=String(view?.startedAt||0)+':'+String(view?.attempt||0);
   if(stamp!==encounter){encounter=stamp;seen=new Set();}
   if(!enabled||view?.phase!=='fighting'||!state||
      (typeof document!=='undefined'&&document.hidden))return;
   if(!['boss-strike','hero-strike'].includes(state.kind))return;
   const key=stamp+':'+state.index+':'+state.slot+':'+state.kind;
   if(state.kind==='boss-strike'&&state.beat==='windup'){
    const token=key+':warning';
    const nearStart=Number(state.phaseElapsed)<Number(state.slotDuration)*.2+300;
    if(nearStart&&!seen.has(token)){
     seen.add(token);play('warn',view?.gate);
    }
   }
   // Never play an unconfirmed hit, and never replay after reconnect.
   if(state.impact&&state.confirmed){
    const token=key+':impact';
    if(!seen.has(token)){
     seen.add(token);
     play(state.confirmedDamage===0?'block':
      state.kind==='boss-strike'?'boss-hit':'hero-hit',view?.gate);
    }
   }
  }};
 };
 window.DogBossAudio={create};
})();
