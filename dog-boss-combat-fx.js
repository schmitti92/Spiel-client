/* Die 100 Tore – visual-only, server-clock synchronized tactical combat.
 * No local damage, win rolls or extra requests. The encounter state is
 * authoritative; this module draws representative attacks and feedback.
 */
(()=>{
 'use strict';
 const kinds=Object.freeze({
  intro:'🐉 DER BOSS ERWACHT',
  dodge:'🛡️ ACHTUNG – AUSWEICHEN!',
  reaction:'⚡ DER BOSS LÄDT SEINEN ANGRIFF',
  math:'🧮 MAGISCHE RUNEN AKTIV',
  target:'🎯 SCHWACHPUNKT ENTDECKT',
  finale:'⚔️ LETZTER ANGRIFF',
  awaiting:'⌛ DAS KAMPFERGEBNIS WIRD GEPRÜFT',
  victory:'🏆 BOSS BESIEGT!',
  defeat:'💀 DER BOSS HAT ÜBERLEBT',
  waiting:'⚔️ HELDEN SAMMELN SICH'
 });
 const iconFor=['⚔️','🛡️','✨'];
 const glowFor=Object.freeze({
  10:'#ff995f',20:'#b68aff',30:'#6de6ff',40:'#8be6a1',
  50:'#65b6f5',60:'#ff7b50',70:'#d7a4ff',80:'#d6e0ec',
  90:'#ff91ba',100:'#ffd37a'
 });
 const $=(root,selector)=>root?.querySelector?.(selector)||null;
 /** Pure model derived only from the view and the synchronized server clock.
  * A late joiner enters the correct event without replaying older scenes.
  */
 function deriveCue(view,serverNow){
  if(!view)return {kind:'waiting',round:-1,elapsed:0,wave:-1};
  if(view.phase==='victory')return {kind:'victory',round:-1,elapsed:30000,wave:-1};
  if(view.phase==='cooldown')return {kind:'defeat',round:-1,elapsed:30000,wave:-1};
  if(view.phase!=='fighting')return {kind:'waiting',round:-1,elapsed:0,wave:-1};
  const begun=Number(view.startedAt)||0;
  const elapsed=Math.max(0,serverNow-begun);
  if(elapsed<3000)return {kind:'intro',round:-1,elapsed,wave:0};
  const current=view.miniGames?.rounds?.find(r=>
   elapsed>=r.startMs&&elapsed<r.endMs);
  if(current){
   const record=view.miniGames?.myAnswers?.[current.round];
   return {kind:kinds[current.kind]?current.kind:'intro',
    round:current.round,elapsed,
    wave:Math.floor((elapsed-current.startMs)/1750),
    feedback:record?.correct===true?'correct':
     record?.correct===false?'wrong':'none',
    feedbackAt:Number(record?.at)||0};
  }
  if(elapsed<30000)return {kind:'finale',round:-1,elapsed,
   wave:Math.floor((elapsed-24000)/1400)};
  return {kind:'awaiting',round:-1,elapsed,wave:-1};
 }
 function create(root,gate=10){
  if(!root)return {update:()=>{}};
  const heroes=$ (root,'#combat-hero-line');
  const cue=$ (root,'#combat-cue');
  const flash=$ (root,'#combat-flash');
  const boss=$ (root,'#combat-boss');
  root.style?.setProperty?.('--boss-accent',glowFor[gate]||glowFor[10]);
  root.style?.setProperty?.('--boss-shift',String(Math.max(0,(gate-10)*2.4))+'deg');
  let fightersKey='',phaseKey='',waveKey='',feedbackKey='';
  function fighters(view){
   const selected=view?.phase==='waiting'?
    (view?.members||[]).filter(m=>m.ready):
    Array.isArray(view?.roster)?view.roster:[];
   const memberNames=new Map((view?.members||[]).map(m=>[m.uid,m.name]));
   const ids=selected.map(m=>m.uid);
   const nextKey=ids.join('|');
   if(fightersKey===nextKey)return;
   fightersKey=nextKey;
   if(!heroes)return;
   const elements=selected.map((m,i)=>{
    const item=document.createElement('div');
    item.className='combat-hero combat-hero-'+(i+1);
    const mark=document.createElement('span');
    mark.className='combat-hero-symbol';
    mark.textContent=iconFor[i]||'⚔️';
    const name=document.createElement('span');
    name.className='combat-hero-name';
    name.textContent=String(memberNames.get(m.uid)||'Held '+(i+1)).slice(0,22);
    item.append(mark,name);
    return item;
   });
   heroes.replaceChildren(...elements);
  }
  function update(view,serverNow){
   fighters(view);
   const scene=deriveCue(view,serverNow);
   const pKey=(view?.startedAt||0)+':'+scene.kind+':'+scene.round+':'+
    (view?.phase||'waiting');
   if(pKey!==phaseKey){
    phaseKey=pKey;
    root.dataset.cue=scene.kind;
    root.dataset.phase=view?.phase||'waiting';
    if(cue)cue.textContent=kinds[scene.kind]||kinds.waiting;
   }
   const fKey=pKey+':'+scene.feedback+':'+scene.feedbackAt;
   if(fKey!==feedbackKey){
    feedbackKey=fKey;
    root.dataset.feedback=scene.feedback||'none';
    // The server returns the correctness of *this* player's answer only.
    if(scene.feedbackAt>0&&cue&&scene.feedback!=='none')
     cue.textContent=scene.feedback==='correct'?
      '✨ DEINE AKTION WAR ERFOLGREICH!':'🛡️ ANGRIFF ÜBERSTANDEN – WEITERKÄMPFEN!';
   }
   if(scene.feedbackAt>0&&serverNow-scene.feedbackAt>1600&&
      root.dataset.feedback!=='none'){
    root.dataset.feedback='none';
    if(cue)cue.textContent=kinds[scene.kind]||kinds.waiting;
   }
   const wKey=pKey+':'+scene.wave;
   if(wKey!==waveKey){
    waveKey=wKey;
    if(flash){
     flash.replaceChildren();
     if(scene.wave>=0&&view?.phase==='fighting'){
      const burst=document.createElement('span');
      burst.className='combat-energy-pulse';
      // Decorative projectiles only – they never imply actual server damage.
      flash.append(burst);
     }
    }
   }
   if(boss)boss.setAttribute('aria-label',
    'Boss – '+(view?.name||'Gemeinsamer Wächter'));
  }
  return {update};
 }
 window.DogBossCombatFX={create,deriveCue};
})();