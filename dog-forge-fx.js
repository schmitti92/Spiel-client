/* DOG Forge C3: optional local presentation effects, never gameplay authority. */
(()=>{'use strict';
 const workspace=document.getElementById('forge-workspace');
 const dialog=document.getElementById('forge-result');
 const button=document.getElementById('forge-sound-toggle');
 const sceneButton=document.getElementById('forge-scene-toggle');
 if(!workspace||!dialog||!button)return;
 const SOUND_KEY='dog:forge:sound:v1';
 const SCENE_KEY='dog:forge:scene:v1';
 let sceneEnabled=true;
 try{sceneEnabled=localStorage.getItem(SCENE_KEY)!=='off';}catch{}
 document.body.classList.toggle('forge-scene-off',!sceneEnabled);
 function updateSceneButton(){
  if(!sceneButton)return;
  sceneButton.textContent=sceneEnabled?'🏰 Werkstatt an':'🏰 Werkstatt aus';
  sceneButton.setAttribute('aria-pressed',String(sceneEnabled));
  sceneButton.setAttribute('aria-label',sceneEnabled?
   'Schmiedehintergrund ausblenden':'Schmiedehintergrund anzeigen');
 }
 const AUDIO_AVAILABLE=!!(window.AudioContext||window.webkitAudioContext);
 let soundEnabled=false,audioContext=null,wasForging=false,wasResultOpen=false;
 try{soundEnabled=localStorage.getItem(SOUND_KEY)==='on'&&AUDIO_AVAILABLE;}catch{}
 function updateButton(){
  button.textContent=!AUDIO_AVAILABLE?'🔇 Ton nicht verfügbar':
   soundEnabled?'🔊 Ton an':'🔇 Ton aus';
  button.disabled=!AUDIO_AVAILABLE;
  button.setAttribute('aria-pressed',String(soundEnabled));
  button.setAttribute('aria-label',soundEnabled?
   'Schmiedegeräusche ausschalten':'Schmiedegeräusche einschalten');
  button.title='Nur auf diesem Gerät · ohne zusätzliche Audiodateien';
 }
 function context(){
  if(!soundEnabled||!AUDIO_AVAILABLE)return null;
  try{
   if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();
   if(audioContext.state==='suspended')void audioContext.resume().catch(()=>{});
   return audioContext;
  }catch{return null;}
 }
 // Original, low-volume synthesized effects. No external files or automatic background audio.
 function play(kind){
  const ctx=context();if(!ctx||ctx.state==='closed')return;
  const t=ctx.currentTime+.025;
  function tone(start,end,duration,volume,offset=0,wave='sine'){
   const osc=ctx.createOscillator(),gain=ctx.createGain(),begin=t+offset;
   osc.type=wave;osc.frequency.setValueAtTime(start,begin);
   osc.frequency.exponentialRampToValueAtTime(Math.max(30,end),begin+duration);
   gain.gain.setValueAtTime(.0001,begin);
   gain.gain.exponentialRampToValueAtTime(volume,begin+.014);
   gain.gain.exponentialRampToValueAtTime(.0001,begin+duration);
   osc.connect(gain);gain.connect(ctx.destination);
   osc.start(begin);osc.stop(begin+duration+.025);
   osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  try{
   if(kind==='strike'){
    tone(190,67,.16,.12,0,'triangle');tone(450,170,.09,.034,0,'square');
   }else if(kind==='equipment'){
    tone(390,560,.22,.052,0,'triangle');
    tone(575,805,.27,.049,.14);tone(790,1140,.32,.033,.29);
   }else if(kind==='skill'){
    tone(530,790,.20,.046);tone(780,1150,.27,.045,.15);
    tone(1000,1390,.31,.025,.32);
   }else if(kind==='failure'){
    tone(260,95,.43,.072,0,'triangle');tone(155,58,.37,.032,.1);
   }else if(kind==='exchange'){
    tone(480,695,.15,.043);tone(730,920,.2,.037,.15,'triangle');
   }
  }catch{/* Audio failure must never interfere with crafting. */}
 }
 button.addEventListener('click',()=>{
  if(!AUDIO_AVAILABLE)return;
  soundEnabled=!soundEnabled;
  try{localStorage.setItem(SOUND_KEY,soundEnabled?'on':'off');}catch{}
  updateButton();
  if(soundEnabled)play('exchange');
  else if(audioContext?.state==='running')void audioContext.suspend().catch(()=>{});
 });
 function unlockOnCraft(event){
  if(!soundEnabled)return;
  const target=event.target;
  if(target?.closest?.('#forge-confirm-submit,.exchange-row button,#forge-retry')){
   context();
  }
 }
 document.addEventListener('pointerdown',unlockOnCraft,{passive:true});
 document.addEventListener('keydown',event=>{
  if(event.key==='Enter'||event.key===' ')unlockOnCraft(event);
 });
 // The existing forge engine owns its state; cosmetic observers only react to it.
 function onForging(){
  const active=workspace.classList.contains('forging');
  if(active&&!wasForging){
   const tab=document.querySelector('.forge-tab.active')?.dataset.tab||'equipment';
   const kind=tab==='exchange'?'exchange':tab==='attack'||tab==='defense'?'skill':'equipment';
   workspace.dataset.craftKind=kind;
   if(kind==='skill'){
    const detail=document.querySelector('.upgrade-panel');
    const style=detail?getComputedStyle(detail):null;
    workspace.style.setProperty('--craft-glow',style?.getPropertyValue('--skill-glow')||'#9d77e666');
    workspace.style.setProperty('--craft-accent',style?.getPropertyValue('--skill-accent')||'#b993ff');
   }
   play('strike');
  }
  if(!active&&wasForging){
   delete workspace.dataset.craftKind;
   workspace.style.removeProperty('--craft-glow');
   workspace.style.removeProperty('--craft-accent');
  }
  wasForging=active;
 }
 const forgeObserver=new MutationObserver(onForging);
 forgeObserver.observe(workspace,{attributes:true,attributeFilter:['class']});
 function onResult(){
  const opened=dialog.open;
  if(opened&&!wasResultOpen){
   const cls=dialog.classList;
   play(cls.contains('result-failure')?'failure':
    cls.contains('result-skill-success')?'skill':
    cls.contains('result-equipment-success')?'equipment':'exchange');
   // Celebrate new equipment appearances without modifying authoritative values.
   const isUpgrade=cls.contains('result-equipment-success');
   const text=document.getElementById('forge-result-achievement')?.textContent||'';
   dialog.classList.toggle('result-new-look',isUpgrade&&text.includes('NEUE AUSSEHENSSTUFE'));
   const icon=dialog.querySelector('.result-art .gear-stage-5');
   dialog.classList.toggle('result-legendary',isUpgrade&&!!icon&&text.includes('NEUE AUSSEHENSSTUFE'));
  }
  wasResultOpen=opened;
 }
 const resultObserver=new MutationObserver(onResult);
 resultObserver.observe(dialog,{attributes:true,attributeFilter:['class','open']});
 // Automatically use the two prepared responsive images as soon as they are
 // uploaded. Until then, CSS provides a complete local SVG forge backdrop.
 function optionalBackground(){
  const desktop=document.body.dataset.forgeBackgroundDesktop||
    document.body.dataset.forgeBackground||'';
  const mobile=document.body.dataset.forgeBackgroundMobile||desktop;
  const isValid=path=>/^\.\/dog-forge-art\/[a-zA-Z0-9_-]+\.(?:webp|png|jpe?g)$/.test(path);
  const media=window.matchMedia?.('(max-width: 720px)');
  let generation=0,lastSource='';
  function setBackdrop(){
   const path=media?.matches?mobile:desktop;
   if(!sceneEnabled){
    generation++;
    document.body.classList.remove('forge-has-custom-wall');
    return;
   }
   if(!isValid(path)){
    generation++;
    document.body.classList.remove('forge-has-custom-wall');
    document.body.style.removeProperty('--forge-custom-wall');
    return;
   }
   if(path===lastSource&&document.body.classList.contains('forge-has-custom-wall'))return;
   const version=++generation;
   const image=new Image();
   image.onload=()=>{
    if(version!==generation||!sceneEnabled)return;
    lastSource=path;
    document.body.style.setProperty('--forge-custom-wall','url("'+path+'")');
    document.body.classList.add('forge-has-custom-wall');
   };
   image.onerror=()=>{
    if(version!==generation)return;
    lastSource='';
    document.body.style.removeProperty('--forge-custom-wall');
    document.body.classList.remove('forge-has-custom-wall');
   };
   image.src=path;
  }
  media?.addEventListener?.('change',setBackdrop);
  if(sceneButton)sceneButton.addEventListener('click',()=>{
   sceneEnabled=!sceneEnabled;
   try{localStorage.setItem(SCENE_KEY,sceneEnabled?'on':'off');}catch{}
   document.body.classList.toggle('forge-scene-off',!sceneEnabled);
   updateSceneButton();
   setBackdrop();
  });
  updateSceneButton();
  setBackdrop();
 }
 document.addEventListener('visibilitychange',()=>{
  document.body.classList.toggle('forge-hidden',document.hidden);
 });
 updateButton();
 optionalBackground();
})();