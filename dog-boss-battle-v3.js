/* 100 Tore · V3 weapon combat.
 * Entirely presentational. Every number is a proportional share of the
 * server-confirmed HP lost in a resolved phase (exchange.strikes), never
 * invented locally. No reads, writes, randomness or client combat rules.
 */
(()=>{'use strict';
 const ALLOWED=['krieger','magierin','waechter'];
 const query=(root,s)=>root?.querySelector?.(s)||null;
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const clean=str=>String(str||'Held').slice(0,23);
 const SEGMENT_WAIT_MS=3000;
 const IMPACT_BEAT=.54; // Matches the server's (slot + .54) * slotDuration
 const IMPACT_VISUAL_MS=420; // Camera flash only around the real contact
 const RECONNECT_BURST_GRACE_MS=1300; // Never replay old hits on reconnect
 const fmt=new Intl.NumberFormat('de-DE');
 const beat=p=>p<.2?'prepare':p<.42?'windup':p<IMPACT_BEAT?'swing':
  p<.64?'impact':p<.84?'recovery':'reset';
 function derive(view,now){
  if(view?.phase!=='fighting'||!Number.isFinite(Number(view.startedAt)))
   return {kind:'waiting',index:-1,uid:null,elapsed:0};
  const elapsed=Math.max(0,now-Number(view.startedAt));
  const rounds=view?.miniGames?.rounds||[];
  const duration=Number(view?.endsAt)-Number(view?.startedAt);
  const fightDuration=Number.isFinite(duration)&&duration>0?duration:
   (view?.miniGames?.version>=14?135000:view?.miniGames?.version>=12?125000:101000);
  // v1-v6 can still be replayed with their historical shorter sequences.
  const wait=Number(view?.miniGames?.version)>=7?SEGMENT_WAIT_MS:5000;
  for(let i=0;i<rounds.length;i++){
   const r=rounds[i],start=Number(r.startMs),end=Number(r.endMs);
   const nextStart=Number(rounds[i+1]?.startMs??fightDuration);
   if(elapsed>=start&&elapsed<end)
    return {kind:'minigame',index:i,uid:null,elapsed,round:r};
   if(elapsed>=end&&elapsed<nextStart){
    const players=Array.isArray(view.roster)?view.roster.filter(x=>x?.uid).slice(0,3):[];
    const defensive=r.kind==='reaction'||r.kind==='dodge';
    const sceneTime=elapsed-end,actionTime=Math.max(0,nextStart-end-wait);
    if(!players.length||sceneTime>=actionTime)
     return {kind:'countdown',index:i,uid:null,defensive,elapsed};
    const slotDuration=actionTime/players.length;
    const slot=clamp(Math.floor(sceneTime/slotDuration),0,players.length-1);
    const uid=players[slot].uid;
    const progress=clamp((sceneTime-slot*slotDuration)/slotDuration,0,1);
    // Combat uses the very same impact time as the server's LP breakdown.
    // If the stage has not been confirmed yet, animate without a damage number.
    const kind=defensive?'boss-strike':'hero-strike';
    const confirmed=view?.combat?.version===1&&Array.isArray(view?.combat?.events)?
     view.combat.events:view?.miniGames?.exchange?.strikes;
    const server=Array.isArray(confirmed)?confirmed.find(x=>
     x?.round===i&&x.uid===uid&&x.kind===kind&&x.slot===slot):null;
    const scriptedAtMs=end+(slot+IMPACT_BEAT)*slotDuration;
    const impactAtMs=Number.isFinite(Number(server?.atMs))?
     Number(server.atMs):Math.round(scriptedAtMs);
    const impact=elapsed>=impactAtMs&&elapsed<impactAtMs+IMPACT_VISUAL_MS;
    return {kind,index:i,uid,slot,progress,impact,elapsed,defensive,
     slotDuration,impactAtMs,beat:beat(progress),
     phaseElapsed:sceneTime-slot*slotDuration};
   }
  }
  return {kind:elapsed>=fightDuration?'result':'intro',index:-1,uid:null,elapsed};
 }
 function create(root){
  if(!root)return {update(){},derive};
  const scene=query(root,'#combat-scene');
  const boss=query(root,'#combat-boss');
  const action=query(root,'#v3-actor-action');
  const progressBar=query(root,'#v3-turn-progress');
  const log=query(root,'#live-recent-damage');
  const nameMap=new Map();
  let lastKey='',lastEncounter='',lastMotionKey='',played=new Set();
  let lastDamageSignature='',lastClock=null,lastWall=null;
  const prefersReduce=()=>{
   try{return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;}
   catch{return false;}
  };
  function weapon(item,type){
   if(!item||typeof document==='undefined')return;
   let elem=query(item,'.v3-weapon');
   if(!elem){
    elem=document.createElement('span');
    elem.className='v3-weapon';
    elem.setAttribute?.('aria-hidden','true');
    item.append?.(elem);
   }
   elem.dataset.weapon=type;
  }
  function strikeEffects(view,state,heroNodes){
   const provided=view?.combat?.version===1&&Array.isArray(view?.combat?.events)?
     view.combat.events:view?.miniGames?.exchange?.strikes;
   if(!Array.isArray(provided)||!Number(view?.startedAt))return;
   const actors=new Set((view?.roster||[]).map(a=>a?.uid).filter(Boolean));
   const confirmed=provided.filter(x=>x&&actors.has(x.uid)&&
    Number.isInteger(x.round)&&x.round>=0&&
    Number.isInteger(x.slot)&&x.slot>=0&&
    ['boss-strike','hero-strike'].includes(x.kind)&&
    Number.isFinite(Number(x.atMs))&&Number(x.atMs)>=0&&
    Number.isFinite(Number(x.amount))&&Number(x.amount)>=0)
    .sort((a,b)=>a.atMs-b.atMs||a.slot-b.slot);
   const timeline=confirmed.filter(x=>state.elapsed>=x.atMs);
   const latest=timeline.slice(-3).reverse();
   const signature=latest.map(e=>[e.round,e.slot,e.kind,e.uid,e.atMs,e.amount].join(':')).join('|');
   if(signature!==lastDamageSignature){
    lastDamageSignature=signature;
    if(log)log.textContent=latest.length?latest.map(e=>{
     const defender=e.kind==='boss-strike';
     const name=nameMap.get(e.uid)||'Held';
     const dmg=Math.max(0,Math.round(Number(e.amount)||0));
     return defender?'🛡️ '+name+': '+(dmg?'−'+fmt.format(dmg)+' LP':'BLOCK!'):
      '🔥 '+name+' → Boss: −'+fmt.format(dmg)+' LP';
    }).join(' · '):'Noch keine bestätigten Treffer';
   }
   // Damage is displayed exactly once per official hit, even if a network
   // response contains an older stage. A reconnect never creates old FX.
   for(const server of timeline){
    const key=String(view.startedAt)+':'+String(view.attempt||0)+':'+
     server.round+':'+server.kind+':'+server.slot+':'+server.uid+':'+server.atMs;
    if(played.has(key))continue;
    played.add(key);
    const late=state.elapsed-server.atMs;
    if(late>RECONNECT_BURST_GRACE_MS||view?.phase!=='fighting')continue;
    const defender=server.kind==='boss-strike';
    const target=defender?heroNodes.get(server.uid):boss;
    if(!target||typeof document==='undefined')continue;
    const damage=Math.max(0,Math.round(Number(server.amount)||0));
    const popup=document.createElement('strong');
    popup.className='v3-floating-damage '+(defender?
     (damage?'is-hero-hit':'is-blocked'):'is-boss-hit');
    popup.textContent=defender?(damage?'−'+fmt.format(damage):'BLOCK!'):
     '−'+fmt.format(damage);
    popup.setAttribute?.('aria-hidden','true');
    target.append?.(popup);
    const existing=target.querySelectorAll?.('.v3-floating-damage')||[];
    if(existing.length>2)existing[0].remove?.();
    if(prefersReduce()){popup.classList.add('is-reduced');continue;}
    if(popup.animate){
     const effect=popup.animate([
      {opacity:0,transform:'translate(-50%,20px) scale(.5)'},
      {opacity:1,transform:'translate(-50%,-12px) scale(1.5)',offset:.24},
      {opacity:1,transform:'translate(-50%,-36px) scale(1.08)',offset:.65},
      {opacity:0,transform:'translate(-50%,-75px) scale(.87)'}
     ],{duration:1450,easing:'ease-out',fill:'forwards'});
     // Correct catch-up position if the confirmed hit arrived via Firestore
     // while an animation was already in progress for all other devices.
     try{effect.currentTime=Math.min(1400,Math.max(0,late));}catch{}
     effect.onfinish=()=>popup.remove?.();
    }else popup.classList.add('is-fallback');
   }
  }
  function update(view,now){
   root.dataset.v3Gate=String(Number(view?.gate)||10);
   const stamp=String(view?.startedAt||0)+':'+String(view?.attempt||0);
   if(stamp!==lastEncounter){
    lastEncounter=stamp;lastKey='';lastMotionKey='';played=new Set();
    lastDamageSignature='';lastClock=null;lastWall=null;
    if(log)log.textContent='Noch keine bestätigten Treffer';
   }
   const state=derive(view,now);
   if(!scene)return;
   scene.dataset.v3Action=state.kind;
   scene.dataset.v3Final=state.index===4?'true':'false';
   scene.dataset.v3Beat=state.beat||'idle';
   scene.dataset.v3Impact=state.impact?'yes':'no';
   scene.dataset.v3StrikeSide=state.defensive?'boss':'hero';
   scene.dataset.v3TargetSlot=String(state.slot??-1);
   const isStrike=['hero-strike','boss-strike'].includes(state.kind);
   const motionKey=stamp+':'+state.index+':'+state.kind+':'+state.slot;
   // CSS runs freely between updates. Rebase only at actor changes or a
   // genuinely disrupted tab/browser clock, never every 250ms.
   const brokenClock=lastClock!==null&&lastWall!==null&&
    Math.abs((state.elapsed-lastClock)-(Date.now()-lastWall))>450;
   const rebase=motionKey!==lastMotionKey||brokenClock;
   lastMotionKey=motionKey;lastClock=state.elapsed;lastWall=Date.now();
   if(scene.style?.setProperty){
    scene.style.setProperty('--v3-impact-left',
     state.kind==='boss-strike'?
      (43+(Number(state.slot)||0)*18.2+9)+'%':'31%');
   }
   const members=Array.isArray(view?.members)?view.members:[];
   nameMap.clear();
   for(const m of members)if(m?.uid)nameMap.set(m.uid,clean(m.name));
   const key=motionKey;
   if(action)action.hidden=!isStrike;
   if(key!==lastKey){
    lastKey=key;
    if(action){
     if(state.kind==='boss-strike')
      action.textContent='🔥 '+clean(view?.name||'Der Wächter')+
       ' zielt auf '+(nameMap.get(state.uid)||'einen Helden');
     else if(state.kind==='hero-strike')
      action.textContent='⚔️ '+(nameMap.get(state.uid)||'Ein Held')+' holt zum Angriff aus';
     else if(state.kind==='countdown')action.textContent='⏳ Nächste Runde';
     else if(state.kind==='minigame')
      action.textContent='🎮 Runde '+(state.index+1)+' – zeige dein Können!';
     else if(view?.phase==='victory')action.textContent='🏆 Boss besiegt!';
     else if(view?.phase==='cooldown')action.textContent='💀 Boss überlebt';
     else action.textContent='⚔️ Bereitet eure Helden vor';
    }
   }
   const all=scene.querySelectorAll?.('.combat-hero')||[];
   const heroNodes=new Map();
   for(const item of all){
    const uid=item.getAttribute?.('data-hero-uid');
    if(uid)heroNodes.set(uid,item);
    const active=!!uid&&uid===state.uid&&state.kind==='hero-strike';
    const targeted=!!uid&&uid===state.uid&&state.kind==='boss-strike';
    item.dataset.v3Active=active?'true':'false';
    item.dataset.v3Targeted=targeted?'true':'false';
    item.dataset.v3Hit=targeted&&state.impact?'true':'false';
    item.dataset.v3Guard=targeted&&['prepare','windup','swing'].includes(state.beat)?'true':'false';
    const current=members.find(m=>m.uid===uid);
    const hero=ALLOWED.includes(current?.heroClass)?current.heroClass:'krieger';
    item.dataset.heroClass=hero;
    weapon(item,hero);
    if(item.style?.setProperty&&rebase){
     item.style.setProperty('--v3-duration',Math.round(state.slotDuration||3500)+'ms');
     item.style.setProperty('--v3-delay',
      '-'+Math.round(active?state.progress*(state.slotDuration||3500):0)+'ms');
    }
   }
   if(boss){
    const active=state.kind==='boss-strike';
    boss.dataset.v3Active=active?'true':'false';
    boss.dataset.v3Targeted=state.kind==='hero-strike'?'true':'false';
    boss.dataset.v3Hit=state.kind==='hero-strike'&&state.impact?'true':'false';
    if(boss.style?.setProperty&&rebase){
     boss.style.setProperty('--v3-duration',Math.round(state.slotDuration||3500)+'ms');
     boss.style.setProperty('--v3-delay',
      '-'+Math.round(active?state.progress*(state.slotDuration||3500):0)+'ms');
    }
    boss.style?.setProperty?.('--v3-target-slot',String(state.slot||0));
   }
   strikeEffects(view,state,heroNodes);
   if(progressBar)progressBar.style.width=
    (state.progress?Math.round(state.progress*100):0)+'%';
  }
  return {update,derive};
 }
 window.DogBossArenaV3={create,derive};
})();