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
 const fmt=new Intl.NumberFormat('de-DE');
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
    const impact=progress>=.50&&progress<.75;
    return {kind:defensive?'boss-strike':'hero-strike',
     index:i,uid,slot,progress,impact,elapsed,defensive,slotDuration};
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
  let lastKey='',lastEncounter='',played=new Set(),recent=[];
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
   if(!state.impact)return;
   const strikes=view?.miniGames?.exchange?.strikes;
   if(!Array.isArray(strikes))return;
   const server=strikes.find(x=>x.round===state.index&&
    x.uid===state.uid&&x.kind===state.kind&&x.slot===state.slot);
   if(!server||!Number.isFinite(Number(server.amount))||
    // The impact timestamp is from the server's shared timeline.
    state.elapsed<server.atMs||state.elapsed>server.atMs+1700)return;
   const key=String(view.startedAt)+':'+String(view.attempt||0)+
    ':'+server.round+':'+server.kind+':'+server.uid;
   if(played.has(key))return;
   played.add(key);
   const damage=Math.max(0,Math.round(Number(server.amount)||0));
   const defender=state.kind==='boss-strike';
   const target=defender?heroNodes.get(state.uid):boss;
   if(!target)return;
   const name=nameMap.get(state.uid)||'Held';
   const label=defender?(damage?'−'+fmt.format(damage):'BLOCK!'):
    '−'+fmt.format(damage);
   if(typeof document!=='undefined'){
    const popup=document.createElement('strong');
    popup.className='v3-floating-damage '+(defender?
     (damage?'is-hero-hit':'is-blocked'):'is-boss-hit');
    popup.textContent=label;
    popup.setAttribute?.('aria-hidden','true');
    // Animates from the actual hit character; no floating at another slot.
    target.append?.(popup);
    // At most two existing popups per target; keep frame work bounded.
    const existing=target.querySelectorAll?.('.v3-floating-damage')||[];
    if(existing.length>2)existing[0].remove?.();
    if(popup.animate){
     const effect=popup.animate([
      {opacity:0,transform:'translate(-50%,20px) scale(.5)'},
      {opacity:1,transform:'translate(-50%,-12px) scale(1.5)',offset:.24},
      {opacity:1,transform:'translate(-50%,-36px) scale(1.08)',offset:.65},
      {opacity:0,transform:'translate(-50%,-75px) scale(.87)'}
     ],{duration:1450,easing:'ease-out',fill:'forwards'});
     effect.onfinish=()=>popup.remove?.();
    }else popup.classList.add('is-fallback');
   }
   const item=defender?
    '🛡️ '+name+': '+(damage?'−'+fmt.format(damage)+' LP':'BLOCK!'):
    '🔥 '+name+' → Boss: −'+fmt.format(damage)+' LP';
   recent.unshift(item);recent=recent.slice(0,3);
   if(log)log.textContent=recent.join(' · ');
  }
  function update(view,now){
   root.dataset.v3Gate=String(Number(view?.gate)||10);
   const stamp=String(view?.startedAt||0)+':'+String(view?.attempt||0);
   if(stamp!==lastEncounter){
    lastEncounter=stamp;lastKey='';played=new Set();recent=[];
    if(log)log.textContent='Noch keine bestätigten Treffer';
   }
   const state=derive(view,now);
   if(!scene)return;
   scene.dataset.v3Action=state.kind;
   scene.dataset.v3Final=state.index===4?'true':'false';
   scene.dataset.v3Impact=state.impact?'yes':'no';
   scene.dataset.v3StrikeSide=state.defensive?'boss':'hero';
   const members=Array.isArray(view?.members)?view.members:[];
   nameMap.clear();
   for(const m of members)if(m?.uid)nameMap.set(m.uid,clean(m.name));
   const key=stamp+':'+state.index+':'+state.kind+':'+state.slot;
   if(key!==lastKey){
    lastKey=key;
    if(action){
     if(state.kind==='boss-strike')
      action.textContent='🔥 '+clean(view?.name||'Der Wächter')+
       ' greift '+(nameMap.get(state.uid)||'einen Helden')+' an';
     else if(state.kind==='hero-strike')
      action.textContent='⚔️ '+(nameMap.get(state.uid)||'Ein Held')+' greift den Boss an';
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
    const current=members.find(m=>m.uid===uid);
    const hero=ALLOWED.includes(current?.heroClass)?current.heroClass:'krieger';
    item.dataset.heroClass=hero;
    weapon(item,hero);
    if(item.style?.setProperty){
     item.style.setProperty('--v3-duration',Math.round(state.slotDuration||3500)+'ms');
     item.style.setProperty('--v3-delay',
      '-'+Math.round(active?state.progress*(state.slotDuration||3500):0)+'ms');
     item.style.setProperty('--v3-step',String(active?state.progress||0:0));
    }
   }
   if(boss){
    const active=state.kind==='boss-strike';
    boss.dataset.v3Active=active?'true':'false';
    boss.dataset.v3Hit=state.kind==='hero-strike'&&state.impact?'true':'false';
    boss.style?.setProperty?.('--v3-duration',Math.round(state.slotDuration||3500)+'ms');
    boss.style?.setProperty?.('--v3-delay',
     '-'+Math.round(active?state.progress*(state.slotDuration||3500):0)+'ms');
    boss.style?.setProperty?.('--v3-target-slot',String(state.slot||0));
    boss.style?.setProperty?.('--v3-step',String(state.progress||0));
   }
   strikeEffects(view,state,heroNodes);
   if(progressBar)progressBar.style.width=
    (state.progress?Math.round(state.progress*100):0)+'%';
  }
  return {update,derive};
 }
 window.DogBossArenaV3={create,derive};
})();