/* 100 Tore – Arena V3: view-only presentation of the server-owned fight.
 * Does not compute or award damage, decide minigames, or make network calls.
 * A late client starts at the same server-time segment without replaying it.
 */
(()=>{'use strict';
 const ALLOWED=['krieger','magierin','waechter'];
 const query=(root,s)=>root?.querySelector?.(s)||null;
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const clean=(str)=>String(str||'Held').slice(0,23);
 const SEGMENT_WAIT_MS=5000;
 function derive(view,now){
  if(view?.phase!=='fighting'||!Number.isFinite(Number(view.startedAt)))
   return {kind:'waiting',index:-1,uid:null,elapsed:0};
  const elapsed=Math.max(0,now-Number(view.startedAt));
  const rounds=view?.miniGames?.rounds||[];
  const duration=Number(view?.endsAt)-Number(view?.startedAt);
  const fightDuration=Number.isFinite(duration)&&duration>0?duration:101000;
  for(let i=0;i<rounds.length;i++){
   const r=rounds[i],start=Number(r.startMs),end=Number(r.endMs);
   const nextStart=Number(rounds[i+1]?.startMs??fightDuration);
   if(elapsed>=start&&elapsed<end)
    return {kind:'minigame',index:i,uid:null,elapsed,round:r};
   if(elapsed>=end&&elapsed<nextStart){
    const players=Array.isArray(view.roster)?view.roster.filter(x=>x?.uid).slice(0,3):[];
    const defensive=r.kind==='reaction'||r.kind==='dodge';
    const sceneTime=elapsed-end;
    const actionTime=Math.max(0,nextStart-end-SEGMENT_WAIT_MS);
    if(!players.length||sceneTime>=actionTime)
     return {kind:'countdown',index:i,uid:null,defensive,elapsed};
    const slotDuration=actionTime/players.length;
    const slot=clamp(Math.floor(sceneTime/slotDuration),0,players.length-1);
    const uid=players[slot].uid,progress=clamp((sceneTime-slot*slotDuration)/slotDuration,0,1);
    const impact=progress>=.45&&progress<.70;
    return {kind:defensive?'boss-strike':'hero-strike',
     index:i,uid,slot,progress,impact,elapsed,defensive};
   }
  }
  return {kind:elapsed>=fightDuration?'result':'intro',index:-1,uid:null,elapsed};
 }
 function create(root){
  if(!root)return {update(){}};
  const scene=query(root,'#combat-scene');
  const boss=query(root,'#combat-boss');
  const action=query(root,'#v3-actor-action');
  const progress=query(root,'#v3-turn-progress');
  const nameMap=new Map();
  let lastKey='',lastEncounter='';
  function update(view,now){
   const gate=Number(view?.gate)||10;
   root.dataset.v3Gate=String(gate);
   const stamp=String(view?.startedAt||0)+':'+String(view?.attempt||0);
   if(stamp!==lastEncounter){lastEncounter=stamp;lastKey='';}
   const state=derive(view,now);
   if(!scene)return;
   scene.dataset.v3Action=state.kind;
   scene.dataset.v3Impact=state.impact?'yes':'no';
   const members=Array.isArray(view?.members)?view.members:[];
   nameMap.clear();
   for(const m of members)if(m?.uid)nameMap.set(m.uid,clean(m.name));
   const key=stamp+':'+state.index+':'+state.kind+':'+state.slot;
   if(key!==lastKey){
    lastKey=key;
    if(action){
     if(state.kind==='boss-strike')action.textContent='🔥 '+clean(view?.name||'Der Wächter')+' greift '+(nameMap.get(state.uid)||'einen Helden')+' an';
     else if(state.kind==='hero-strike')action.textContent='⚔️ '+(nameMap.get(state.uid)||'Ein Held')+' greift den Boss an';
     else if(state.kind==='countdown')action.textContent='⏳ Gleich beginnt die nächste Herausforderung';
     else if(state.kind==='minigame')action.textContent='🎮 Runde '+(state.index+1)+' – zeige dein Können!';
     else if(view?.phase==='victory')action.textContent='🏆 Der Boss wurde besiegt!';
     else if(view?.phase==='cooldown')action.textContent='💀 Der Boss hat überlebt';
     else action.textContent='⚔️ Bereitet eure Helden vor';
    }
   }
   const all=scene.querySelectorAll?.('.combat-hero')||[];
   for(const item of all){
    const uid=item.getAttribute?.('data-hero-uid');
    item.dataset.v3Active=uid&&uid===state.uid?'true':'false';
    item.dataset.v3Hit=uid&&uid===state.uid&&state.impact&&state.defensive?'true':'false';
    if(item.style?.setProperty){
     item.style.setProperty('--v3-step',String(state.uid===uid?state.progress||0:0));
    }
    const current=members.find(m=>m.uid===uid);
    const hero=ALLOWED.includes(current?.heroClass)?current.heroClass:null;
    if(hero)item.dataset.heroClass=hero;
   }
   if(boss){
    boss.dataset.v3Active=state.kind==='boss-strike'?'true':'false';
    boss.dataset.v3Hit=state.kind==='hero-strike'&&state.impact?'true':'false';
    boss.style?.setProperty?.('--v3-step',String(state.progress||0));
   }
   if(progress)progress.style.width=(state.progress?Math.round(state.progress*100):0)+'%';
  }
  return {update,derive};
 }
 window.DogBossArenaV3={create,derive};
})();
