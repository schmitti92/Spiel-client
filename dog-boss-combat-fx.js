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
  attackScene:'⚔️ HELDEN GREIFEN AN!',
  defenseScene:'🛡️ GEMEINSAM BLOCKEN!',
  awaiting:'⌛ DAS KAMPFERGEBNIS WIRD GEPRÜFT',
  victory:'🏆 BOSS BESIEGT!',
  defeat:'💀 DER BOSS HAT ÜBERLEBT',
  waiting:'⚔️ HELDEN SAMMELN SICH'
 });
 const iconFor=['⚔️','🛡️','✨'];
 const heroPortraits=['held-krieger.svg','held-magier.svg','held-schildtraeger.svg'];
 const cinematicHeroPortraits=['held-krieger-cinematic.svg','held-magier-cinematic.svg','held-schildtraeger-cinematic.svg'];
 // Explicit allowlist prevents arbitrary URLs or player-controlled image paths.
 const bossPortraits=Object.freeze({
  10:'aschewaechter-cinematic.svg',20:'schattenfuerst.svg',
  30:'kristallwurm.svg',40:'dornenkoenig.svg',
  50:'hueter-der-tiefe.svg',60:'flammendrache.svg',
  70:'seelenrichter.svg',80:'eisenkoloss.svg',
  90:'festungswaechter.svg',100:'letzter-waechter.svg'
 });
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
  if(view.miniGames?.version>=3){
   const rounds=view.miniGames.rounds||[];
   const current=rounds.find(r=>elapsed>=r.startMs&&elapsed<r.endMs);
   if(current)return {kind:current.kind,round:current.round,elapsed,
    wave:Math.floor((elapsed-current.startMs)/2000),feedback:'none',feedbackAt:0};
   const between=rounds.find((r,i)=>{
    const next=rounds[i+1],end=next?.startMs??
     (Number(view.endsAt)-Number(view.startedAt));
    return elapsed>=r.endMs&&elapsed<end;
   });
   if(between)return {kind:['dodge','reaction'].includes(between.kind)?
    'defenseScene':'attackScene',round:between.round,elapsed,wave:-1};
   return {kind:'awaiting',round:-1,elapsed,wave:-1};
  }
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
  const bossArt=$(root,'.monster-art');
  root.style?.setProperty?.('--boss-accent',glowFor[gate]||glowFor[10]);
  // Every boss now has its own silhouette and intrinsic palette, not just a
  // recolored Aschewächter. The CSS base portrait remains a safe fallback.
  root.style?.setProperty?.('--boss-shift','0deg');
  if(bossArt?.style&&bossPortraits[gate])
   bossArt.style.backgroundImage='url("./dog-boss-art/'+bossPortraits[gate]+'")';
  let fightersKey='',phaseKey='',waveKey='',feedbackKey='';
  let healthBars=new Map();
  function fighters(view){
   const selected=view?.phase==='waiting'?
    (view?.members||[]).filter(m=>m.ready):
    Array.isArray(view?.roster)?view.roster:[];
   const membersByUid=new Map((view?.members||[]).map(m=>[m.uid,m]));
   const nextKey=selected.map(m=>{
    const member=membersByUid.get(m.uid);
    return [m.uid,member?.name||'',member?.isMe===true?'me':'guest'].join(':');
   }).join('|');
   if(fightersKey===nextKey)return;
   fightersKey=nextKey;
   if(!heroes)return;
   const nextHealthBars=new Map();
   const elements=selected.map((m,i)=>{
    // Stable portraits from the original three-person expedition order.
    // Solo/Duo attempts do not change the appearance of a known hero.
    const originalIndex=(view?.members||[]).findIndex(x=>x.uid===m.uid);
    const roleIndex=(originalIndex>=0?originalIndex:i)%3;
    const item=document.createElement('div');
    item.setAttribute?.('data-hero-uid',m.uid);
    item.className='combat-hero combat-hero-'+(roleIndex+1)+
     ' combat-hero-portrait'+
     (membersByUid.get(m.uid)?.isMe?' combat-hero-me':'');
    const mark=document.createElement('span');
    mark.className='combat-hero-symbol';
    mark.textContent=iconFor[roleIndex]||'⚔️';
    mark.style.backgroundImage='url("./dog-boss-art/'+
     (gate===10?cinematicHeroPortraits:heroPortraits)[roleIndex]+'")';
    const name=document.createElement('span');
    name.className='combat-hero-name';
    name.textContent=String(membersByUid.get(m.uid)?.name||
     'Held '+(i+1)).slice(0,22);
    const hpTrack=document.createElement('span');
    hpTrack.className='combat-hero-hp-track';
    hpTrack.setAttribute?.('aria-hidden','true');
    const hpFill=document.createElement('span');
    hpFill.className='combat-hero-hp-fill';
    hpTrack.append(hpFill);
    item.append(mark,name,hpTrack);
    nextHealthBars.set(m.uid,hpFill);
    return item;
   });
   heroes.replaceChildren(...elements);
   healthBars=nextHealthBars;
  }
  function update(view,serverNow){
   fighters(view);
   for(const hero of view?.teamHealth?.heroes||[]){
    const fill=healthBars.get(hero.uid);
    if(fill?.style)fill.style.width=(100*Math.max(0,Number(hero.hp)||0)/
      Math.max(1,Number(hero.maxHp)||1)).toFixed(2)+'%';
   }
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
 window.DogBossCombatFX={create,deriveCue,bossPortraits,heroPortraits};
})();