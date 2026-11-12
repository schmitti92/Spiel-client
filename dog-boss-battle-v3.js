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
 // K-01: Every animation beat is relative to the server-confirmed hit.
 // Rendering only: no new combat rolls, requests or local HP values.
 const beat=(slotElapsed,hitInSlot,slotDuration)=>{
  const lead=Math.max(1,hitInSlot);
  if(slotElapsed<lead*.22)return 'prepare';
  if(slotElapsed<lead*.74)return 'windup';
  if(slotElapsed<lead)return 'swing';
  if(slotElapsed<lead+IMPACT_VISUAL_MS)return 'impact';
  const tail=Math.max(0,slotDuration-lead-IMPACT_VISUAL_MS);
  return slotElapsed<lead+IMPACT_VISUAL_MS+tail*.72?'recovery':'reset';
 };
 const HERO_MOVES=Object.freeze({
  krieger:{windup:'spannt die Klinge',swing:'Klingenhieb'},
  magierin:{windup:'bündelt Arkankraft',swing:'Magieimpuls'},
  waechter:{windup:'stemmt den Schild vor',swing:'Schildstoß'}
 });
 // K-06: independent visual identities; no local damage or random rolls.
 const BOSS_STYLES=Object.freeze({
  10:'ash-storm',20:'shadow-blade',30:'crystal-spike',
  40:'thorn-whip',50:'abyss-trident',60:'dragon-breath',
  70:'soul-scythe',80:'iron-fist',90:'fortress-ram',
  100:'final-judgment'
 });
 const BOSS_MOVES=Object.freeze({
  'shadow-blade':{attack:'Schattenklinge',charge:'sammelt dunkle Schatten'},
  'crystal-spike':{attack:'Kristallstachel',charge:'bündelt scharfe Kristallsplitter'},
  'thorn-whip':{attack:'Dornenpeitsche',charge:'spannt seine Dornenranken'},
  'abyss-trident':{attack:'Tiefenstoß',charge:'ruft die Strömung der Tiefe'},
  'dragon-breath':{attack:'Feueratem',charge:'holt glühend Luft'},
  'soul-scythe':{attack:'Seelensichel',charge:'zieht Seelenenergie zusammen'},
  'iron-fist':{attack:'Kolossfaust',charge:'hebt die schwere Eisenfaust'},
  'fortress-ram':{attack:'Festungsramme',charge:'stemmt die gepanzerte Ramme'},
  'final-judgment':{attack:'Urteilsschlag',charge:'sammelt das Licht des letzten Tores'}
 });
 const bossStyle=gate=>BOSS_STYLES[Number(gate)]||'standard';
 const describeStrike=(state,name,bossName,heroClass,bossStyle)=>{
  // Boss identity changes only visuals/callouts, never server-owned damage.
  if(state.kind==='boss-strike'&&bossStyle==='ash-storm'){
   if(state.beat==='prepare')return '🌋 Der Aschewächter sammelt glühende Asche';
   if(state.beat==='windup')return '🔥 Der Aschewächter lädt den Aschensturm auf';
   if(state.beat==='swing')return '☄️ Der Aschewächter schleudert eine Aschenlanze!';
   if(state.beat==='impact'){
    if(!state.confirmed)return '🌫️ Aschenlanze bei '+name+' – prüfe Treffer';
    if(state.confirmedDamage===0)return state.roundKind==='dodge'?
     '💨 '+name+' entkommt dem Aschensturm!':
     '🛡️ '+name+' blockt die Aschenlanze!';
    return '💥 Die Aschenlanze trifft '+name+'!';
   }
   if(state.beat==='recovery')return '↩️ Die Asche glüht nach';
   return '🌋 Der Aschewächter sammelt neue Kraft';
  }
  const special=state.kind==='boss-strike'?BOSS_MOVES[bossStyle]:null;
  if(special){
   if(state.beat==='prepare')return '⚔️ '+bossName+' nimmt seine Kampfposition ein';
   if(state.beat==='windup')return '⚡ '+bossName+' '+special.charge+'!';
   if(state.beat==='swing')return '🔥 '+bossName+' entfesselt '+special.attack+'!';
   if(state.beat==='impact'){
    if(!state.confirmed)return '💥 '+special.attack+' bei '+name+' – prüfe Treffer';
    if(state.confirmedDamage===0)return state.roundKind==='dodge'?
     '💨 '+name+' entkommt '+special.attack+'!':
     '🛡️ '+name+' blockt '+special.attack+'!';
    return '💥 '+special.attack+' trifft '+name+'!';
   }
   if(state.beat==='recovery')return '↩️ '+special.attack+' klingt ab';
   return '🛡️ '+bossName+' ist wieder bereit';
  }
  const target=state.kind==='boss-strike'?name:bossName;
  const actor=state.kind==='boss-strike'?bossName:name;
  if(state.beat==='prepare')return '🛡️ '+actor+' nimmt seine Position ein';
  const move=state.kind==='hero-strike'?HERO_MOVES[heroClass]:null;
  if(state.beat==='windup')return '⚔️ '+actor+' holt zum Angriff aus'+
   (move?' – '+move.windup:'');
  if(state.beat==='swing')return '🔥 '+actor+' schlägt zu!'+
   (move?' '+move.swing:'');
  if(state.beat==='impact'){
   if(!state.confirmed)return '💥 Einschlag bei '+target+' – prüfe Treffer';
   if(state.kind==='boss-strike'&&state.confirmedDamage===0)
    return state.roundKind==='dodge'?
     '💨 '+name+' weicht aus!':'🛡️ '+name+' blockt den Boss!';
   return '💥 '+actor+' trifft '+target+'!';
  }
  if(state.beat==='recovery')return '↩️ '+actor+' zieht sich zurück';
  return '🛡️ '+actor+' ist wieder bereit';
 };
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
    // v15: a fallen hero keeps their scheduled slot (team clock stays
    // identical) but performs no imaginary attack after their death.
    const slotStart=end+slot*slotDuration;
    const fallen=Number(view?.miniGames?.version)>=15&&
     view?.combat?.events?.some(e=>e.targetId===uid&&e.hpAfter===0&&
      Number(e.atMs)<=slotStart);
    if(fallen)return {kind:'fallen',index:i,uid,slot,progress,
     elapsed,slotDuration,defensive:false,beat:'reset'};
    // Combat uses the very same impact time as the server's LP breakdown.
    // If the stage has not been confirmed yet, animate without a damage number.
    const kind=defensive?'boss-strike':'hero-strike';
    const confirmed=Number(view?.miniGames?.version)>=11&&
     view?.combat?.version===1&&Array.isArray(view?.combat?.events)?
     view.combat.events:view?.miniGames?.exchange?.strikes;
    const server=Array.isArray(confirmed)?confirmed.find(x=>
     x?.round===i&&x.uid===uid&&x.kind===kind&&x.slot===slot):null;
    const scriptedAtMs=end+(slot+IMPACT_BEAT)*slotDuration;
    const candidate=Number(server?.atMs);
    const confirmedAt=server&&Number.isFinite(candidate)&&
     candidate>=slotStart&&candidate<slotStart+slotDuration;
    const impactAtMs=confirmedAt?candidate:Math.round(scriptedAtMs);
    const phaseElapsed=sceneTime-slot*slotDuration;
    // Cinematic motion can run without a score; flashes cannot.
    const impact=elapsed>=impactAtMs&&elapsed<impactAtMs+IMPACT_VISUAL_MS&&
     (Number(view?.miniGames?.version)<11||!!server);
    return {kind,index:i,uid,slot,progress,impact,elapsed,defensive,
     roundKind:r.kind,
     slotDuration,impactAtMs,
     beat:beat(phaseElapsed,impactAtMs-slotStart,slotDuration),
     confirmed:!!server,confirmedDamage:server?Math.max(0,Number(server.amount)||0):null,
     phaseElapsed};
   }
  }
  return {kind:elapsed>=fightDuration?'result':'intro',index:-1,uid:null,elapsed};
 }
 function create(root){
  if(!root)return {update(){},derive};
  const scene=query(root,'#combat-scene');
  const audio=window.DogBossAudio?.create?.(root);
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
   // A single decorative layer per hero. Every class gets a different
   // motion synchronized with the existing CSS slot clock.
   let classFx=query(item,'.v3-class-effect');
   if(!classFx){
    classFx=document.createElement('span');
    classFx.className='v3-class-effect';
    classFx.setAttribute?.('aria-hidden','true');
    item.append?.(classFx);
   }
  }
  function strikeEffects(view,state,heroNodes){
   const provided=Number(view?.miniGames?.version)>=11&&
     view?.combat?.version===1&&Array.isArray(view?.combat?.events)?
     view.combat.events:view?.miniGames?.exchange?.strikes;
   if(!Array.isArray(provided)||!Number(view?.startedAt))return;
   const actors=new Set((view?.roster||[]).map(a=>a?.uid).filter(Boolean));
   const confirmed=provided.filter(x=>x&&
    (actors.has(x.uid)||['team-finisher','boss-guard'].includes(x.kind))&&
    Number.isInteger(x.round)&&x.round>=0&&
    Number.isInteger(x.slot)&&x.slot>=0&&
    ['boss-strike','hero-strike','team-finisher','boss-guard'].includes(x.kind)&&
    Number.isFinite(Number(x.atMs))&&Number(x.atMs)>=0&&
    Number.isFinite(Number(x.amount))&&
    (Number(x.amount)>=0||x.kind==='boss-guard'))
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
     const dodged=e.kind==='boss-strike'&&dmg===0&&
      view?.miniGames?.rounds?.[e.round]?.kind==='dodge';
     return e.kind==='boss-guard'?
      '🛡️ Glücksabwehr: +'+fmt.format(-e.amount)+' Boss-LP':
      e.kind==='team-finisher'?
       '⚡ Team → Boss: −'+fmt.format(dmg)+' LP':
      defender?'🛡️ '+name+': '+(dmg?'−'+fmt.format(dmg)+' LP':
       dodged?'AUSGEWICHEN!':'BLOCK!'):
       '🔥 '+name+' → Boss: −'+fmt.format(dmg)+' LP';
    }).join(' · '):'Noch keine bestätigten Treffer';
   }
   // Damage is displayed exactly once per official hit, even if a network
   // response contains an older stage. A reconnect never creates old FX.
   for(const server of timeline){
    const key=server.eventId||String(view.startedAt)+':'+
    String(view.attempt||0)+':'+server.round+':'+server.kind+':'+
    server.slot+':'+server.uid+':'+server.atMs;
    if(played.has(key))continue;
    played.add(key);
    const late=state.elapsed-server.atMs;
    if(late>RECONNECT_BURST_GRACE_MS||
     (view?.phase!=='fighting'&&!(['team-finisher','boss-guard'].includes(server.kind)&&
      ['victory','cooldown'].includes(view?.phase))))continue;
    const defender=server.kind==='boss-strike';
    const target=defender?heroNodes.get(server.uid):boss;
    if(!target||typeof document==='undefined')continue;
    const damage=Math.max(0,Math.round(Math.abs(Number(server.amount)||0)));
    const dodged=defender&&damage===0&&
     view?.miniGames?.rounds?.[server.round]?.kind==='dodge';
    const popup=document.createElement('strong');
    popup.className='v3-floating-damage '+(defender?
     (damage?'is-hero-hit':dodged?'is-dodged':'is-blocked'):'is-boss-hit');
    popup.textContent=server.kind==='boss-guard'?
     '🛡️ +'+fmt.format(damage):
     server.kind==='team-finisher'?
      '⚡ −'+fmt.format(damage):
     defender?(damage?'−'+fmt.format(damage):
      dodged?'AUSGEWICHEN!':'BLOCK!'):
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
   audio?.update?.(view,state);
   if(!scene)return;
   scene.dataset.v3Action=state.kind;
   scene.dataset.v3BossStyle=bossStyle(view?.gate);
   scene.dataset.v3Final=state.index===4?'true':'false';
   scene.dataset.v3Beat=state.beat||'idle';
   scene.dataset.v3Impact=state.impact?'yes':'no';
   scene.dataset.v3StrikeSide=state.defensive?'boss':'hero';
   scene.dataset.v3TargetSlot=String(state.slot??-1);
   const isStrike=['hero-strike','boss-strike'].includes(state.kind);
   // If a late authoritative hit timestamp arrives, re-align the existing
   // CSS motion once, not on every local 250ms UI refresh.
   const motionKey=stamp+':'+state.index+':'+state.kind+':'+state.slot+
    ':'+(state.impactAtMs??'');
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
   const roster=Array.isArray(view?.roster)?view.roster:[];
   nameMap.clear();
   for(const m of members)if(m?.uid)nameMap.set(m.uid,clean(m.name));
   const actorInfo=members.find(m=>m.uid===state.uid)||
    roster.find(m=>m.uid===state.uid);
   const actorClass=ALLOWED.includes(actorInfo?.heroClass)?
    actorInfo.heroClass:'krieger';
   const key=motionKey+':'+state.beat+':'+state.confirmedDamage+
    ':'+actorClass;
   if(action)action.hidden=!isStrike&&state.kind!=='fallen';
   if(key!==lastKey){
    lastKey=key;
    if(action){
     if(state.kind==='fallen')action.textContent='💀 '+
      (nameMap.get(state.uid)||'Ein Held')+
      ' ist gefallen – die anderen kämpfen weiter!';
     else if(isStrike)
      action.textContent=describeStrike(state,
       nameMap.get(state.uid)||'Ein Held',
       clean(view?.name||'Der Wächter'),actorClass,scene.dataset.v3BossStyle);
     else if(state.kind==='countdown')action.textContent='⏳ Nächste Runde';
     else if(state.kind==='minigame')
      action.textContent='🎮 Runde '+(state.index+1)+' – zeige dein Können!';
     else if(view?.phase==='victory')action.textContent='🏆 Boss besiegt!';
     else if(view?.phase==='cooldown')action.textContent='💀 Boss überlebt';
     else action.textContent='⚔️ Bereitet eure Helden vor';
    }
   }
   const all=scene.querySelectorAll?.('.combat-hero')||[];
   const vitals=window.DogBossLiveUI?.combatVitals?.(view,now);
   const dead=new Set(Number(view?.miniGames?.version)>=15?
    (vitals?.heroes||[]).filter(hero=>Number(hero.hp)<=0).map(hero=>hero.uid):[]);
   const heroNodes=new Map();
   for(const item of all){
    const uid=item.getAttribute?.('data-hero-uid');
    if(uid)heroNodes.set(uid,item);
    const active=!!uid&&uid===state.uid&&state.kind==='hero-strike';
    const targeted=!!uid&&uid===state.uid&&state.kind==='boss-strike';
    item.dataset.v3Fallen=dead.has(uid)?'true':'false';
    item.dataset.v3Active=active&&!dead.has(uid)?'true':'false';
    item.dataset.v3Targeted=targeted&&!dead.has(uid)?'true':'false';
    item.dataset.v3Hit=targeted&&state.impact?'true':'false';
    item.dataset.v3Guard=targeted&&['prepare','windup','swing'].includes(state.beat)?'true':'false';
    const current=members.find(m=>m.uid===uid)||
     roster.find(m=>m.uid===uid);
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
 window.DogBossArenaV3={create,derive,bossStyle};
})();