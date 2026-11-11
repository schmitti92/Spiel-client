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
  let heroNodes=new Map(),lastBattleView=null,lastDodgeScene='',dodgeMoves=new Map(),dodgeResults=new Set();
  const dodgeLayer=document.createElement('div');
  dodgeLayer.className='battle-dodge-layer';
  dodgeLayer.setAttribute?.('aria-hidden','true');
  dodgeLayer.hidden=true;
  const dangerCells=Array.from({length:3},(_,i)=>{
   const cell=document.createElement('span');
   cell.className='battle-dodge-lane';
   dodgeLayer.append?.(cell);
   return cell;
  });
  const strikeBurst=document.createElement('span');
  strikeBurst.className='battle-dodge-strike';
  dodgeLayer.append?.(strikeBurst);
  // These effects are cosmetic. They use the published strike schedule and
  // never produce an HP deduction or an extra server request.
  const weapon=document.createElement('span');
  weapon.className='battle-boss-weapon';
  weapon.setAttribute?.('aria-hidden','true');
  weapon.setAttribute?.('data-weapon',gate===10?'warhammer':'elemental');
  const weaponTrail=document.createElement('span');
  weaponTrail.className='battle-weapon-trail';
  const primaryImpact=document.createElement('span');
  primaryImpact.className='battle-weapon-impact';
  const secondaryImpact=document.createElement('span');
  secondaryImpact.className='battle-weapon-impact battle-weapon-impact-secondary';
  secondaryImpact.hidden=true;
  dodgeLayer.append?.(weaponTrail,weapon,primaryImpact,secondaryImpact);
  root.append?.(dodgeLayer);
  let weaponSession='',swingCount=0;
  const lanesX=lanes=>lanes===2?[62,85]:[54,74,92];
  function clearDodgeClasses(){
   for(const hero of heroNodes.values()){
    hero.classList?.remove('battle-dodge-success');
    hero.classList?.remove('battle-dodge-hit');
    const badge=hero.querySelector?.('.battle-dodge-verdict');
    badge?.remove?.();
   }
  }
  function moveHero(uid,choice,lanes,at,serverNow,round,step){
   const node=heroNodes.get(uid);
   if(!node||!Number.isInteger(choice)||choice<0||choice>=lanes)return;
   const encounter=String(lastBattleView?.startedAt||0);
   const key=encounter+':'+round+':'+step+':'+choice;
   if(dodgeMoves.get(uid)===key)return;
   dodgeMoves.set(uid,key);
   const x=lanes===2?(choice===0?-56:56):[-68,0,68][choice];
   node.style?.setProperty?.('--dodge-move-x',x+'px');
   node.style?.setProperty?.('--dodge-quarter-x',Math.round(x*.23)+'px');
   node.style?.setProperty?.('--dodge-mid-x',Math.round(x*.45)+'px');
   node.style?.setProperty?.('--dodge-near-x',Math.round(x*.84)+'px');
   node.setAttribute?.('data-dodge-direction',lanes===2?(choice===0?'left':'right'):
    ['left','center','right'][choice]);
   node.style?.setProperty?.('--dodge-move-delay',-Math.min(1750,Math.max(0,serverNow-at))+'ms');
   node.classList?.remove('battle-dodge-leap');
   void node.offsetWidth;
   node.classList?.add('battle-dodge-leap');
  }
  function verdict(uid,correct,sessionKey,choice,lanes){
   const node=heroNodes.get(uid);
   if(!node||dodgeResults.has(sessionKey))return;
   dodgeResults.add(sessionKey);
   node.classList?.toggle('battle-dodge-success',!!correct);
   node.classList?.toggle('battle-dodge-hit',!correct);
   const badge=document.createElement('strong');
   badge.className='battle-dodge-verdict '+(correct?'is-safe':'is-hit');
   const side=lanes===2?['LINKS','RECHTS'][choice]:['LINKS','MITTE','RECHTS'][choice];
   badge.textContent=(correct?'✓ AUSGEWICHEN':'✕ GETROFFEN')+(side?' · '+side:'');
   node.append?.(badge);
  }
  function renderDodges(view,serverNow){
   lastBattleView=view;
   const elapsed=serverNow-(Number(view?.startedAt)||0);
   const round=view?.phase==='fighting'&&view?.miniGames?.version>=5?
    view.miniGames.rounds?.find(r=>r.kind==='dodge'&&elapsed>=r.startMs&&elapsed<r.endMs):null;
   dodgeLayer.hidden=!round;
   if(!round){
    root.dataset.dodgeStrike='idle';
    root.dataset.bossSwing='idle';
    weaponSession='';
    return;
   }
   const attacks=round.attacks||[];
   const strike=attacks.find((r,i)=>elapsed>=r.startMs&&
    elapsed<(attacks[i+1]?.startMs??round.endMs));
   if(!strike)return;
   const sessionKey=String(view.startedAt)+':'+round.round+':'+strike.step;
   if(sessionKey!==lastDodgeScene){
    lastDodgeScene=sessionKey;
    clearDodgeClasses();
    if(dodgeResults.size>30)dodgeResults.clear();
   }
   const impact=elapsed>=strike.impactMs;
   root.dataset.dodgeStrike=impact?'impact':'warning';
   dodgeLayer.style?.setProperty?.('--dodge-attack-delay',
    -Math.max(0,elapsed-strike.impactMs)+'ms');
   const cells=lanesX(round.lanes);
   const validLane=index=>Number.isInteger(index)&&index>=0&&index<round.lanes;
   if(!validLane(strike.dangerIndex))return;
   dodgeLayer.style?.setProperty?.('--dodge-hit-x',cells[strike.dangerIndex]+'%');
   const second=validLane(strike.secondDangerIndex)&&
    strike.secondDangerIndex!==strike.dangerIndex?strike.secondDangerIndex:null;
   secondaryImpact.hidden=second===null;
   if(second!==null)dodgeLayer.style?.setProperty?.('--dodge-secondary-x',cells[second]+'%');
   const next=attacks.find(a=>a.step===strike.step+1);
   const span=Math.max(1900,Math.min(2800,(next?.startMs??round.endMs)-strike.startMs));
   dodgeLayer.style?.setProperty?.('--boss-swing-time',span+'ms');
   if(weaponSession!==sessionKey){
    weaponSession=sessionKey;
    // A reconnect starts at the server-clock animation offset, not frame 0.
    const offset=-Math.min(span,Math.max(0,elapsed-strike.startMs));
    dodgeLayer.style?.setProperty?.('--boss-swing-offset',offset+'ms');
    weapon.classList?.remove('battle-weapon-swing');
    weaponTrail.classList?.remove('battle-weapon-swing');
    primaryImpact.classList?.remove('battle-weapon-swing');
    secondaryImpact.classList?.remove('battle-weapon-swing');
    void weapon.offsetWidth;
    weapon.classList?.add('battle-weapon-swing');
    weaponTrail.classList?.add('battle-weapon-swing');
    primaryImpact.classList?.add('battle-weapon-swing');
    if(second!==null)secondaryImpact.classList?.add('battle-weapon-swing');
    root.dataset.bossSwing='armed';
    swingCount++;
   }
   root.dataset.bossSwing=impact?'impact':'windup';
   dangerCells.forEach((cell,i)=>{
    const visible=i<round.lanes;
    cell.hidden=!visible;
    if(!visible)return;
    cell.style.left=cells[i]+'%';
    cell.classList?.toggle('is-danger',
     i===strike.dangerIndex||i===strike.secondDangerIndex);
    cell.classList?.toggle('is-safe',
     i!==strike.dangerIndex&&i!==strike.secondDangerIndex);
   });
   // Both local and remote heroes move in the server-confirmed chosen direction.
   // Do not infer a success or reveal a secret result before the impact.
   const actions=Array.isArray(view.miniGames?.dodgeActions)?
    view.miniGames.dodgeActions:[];
   for(const action of actions){
    if(action.round!==round.round||action.step!==strike.step||
       !heroNodes.has(action.uid))continue;
    if(Number.isInteger(action.choice)&&action.at>0){
     if(serverNow-action.at<2200)
      moveHero(action.uid,action.choice,round.lanes,action.at,serverNow,round.round,strike.step);
     if(impact&&elapsed-strike.impactMs<2300)
      verdict(action.uid,action.correct===true,sessionKey+':'+action.uid,
       action.choice,round.lanes);
    }
   }
  }
  function previewDodge(view,roundIndex,step,choice,serverNow){
   if(view?.phase!=='fighting'||view?.miniGames?.version<5)return;
   const round=view.miniGames.rounds?.[roundIndex];
   if(round?.kind!=='dodge')return;
   const uid=view.members?.find(m=>m.isMe)?.uid;
   if(uid)moveHero(uid,choice,round.lanes,serverNow,serverNow,roundIndex,step);
  }

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
   const nextHeroNodes=new Map();
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
    nextHeroNodes.set(m.uid,item);
    return item;
   });
   heroes.replaceChildren(...elements);
   healthBars=nextHealthBars;
   heroNodes=nextHeroNodes;dodgeMoves.clear();dodgeResults.clear();
  }
  function update(view,serverNow){
   fighters(view);
   for(const hero of view?.teamHealth?.heroes||[]){
    const fill=healthBars.get(hero.uid);
    if(fill?.style)fill.style.width=(100*Math.max(0,Number(hero.hp)||0)/
      Math.max(1,Number(hero.maxHp)||1)).toFixed(2)+'%';
   }
   renderDodges(view,serverNow);
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
  return {update,previewDodge};
 }
 window.DogBossCombatFX={create,deriveCue,bossPortraits,heroPortraits};
})();