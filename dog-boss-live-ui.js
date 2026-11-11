/* 100 TORE — Unified LIVE battle presentation, safe by design.
 * Single source of truth: the existing server view + synchronized server clock.
 * Never awards damage, asserts a hit value, chooses tasks, or sends requests.
 */
(()=>{
 'use strict';
 const taskNames={dodge:'🛡️ Ausweichen',reaction:'⚡ Reaktion',
  math:'🧮 Blitz-Mathe',target:'🎯 Zieltreffer'};
 const $=(root,selector)=>root?.querySelector?.(selector)||null;
 const text=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
 const parseMs=value=>Number.isFinite(Number(value))?Number(value):0;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function battleModel(view,now){
  const phase=view?.phase||'unavailable';
  const rounds=Array.isArray(view?.miniGames?.rounds)?view.miniGames.rounds:[];
  const answers=view?.miniGames?.myAnswers||{};
  const elapsed=Math.max(0,now-parseMs(view?.startedAt));
  const active=phase==='fighting'?(rounds.find(r=>elapsed>=r.startMs&&elapsed<r.endMs)||null):null;
  const roundIndex=active?.round??(phase==='fighting'&&rounds.length?
   (elapsed<rounds[0].startMs?0:clamp(rounds.filter(r=>elapsed>=r.endMs).length,0,2)):-1);
  const latest=Object.entries(answers).flatMap(([index,record])=>{
   const events=Array.isArray(record?.attempts)?record.attempts:[record];
   return events.map(item=>({index:Number(index),step:item?.step??0,
    correct:item?.correct===true,wrong:item?.correct===false,
    at:parseMs(item?.at)}));
  }).filter(x=>Number.isInteger(x.index)&&x.index>=0&&x.index<3&&x.at>0)
   .sort((a,b)=>b.at-a.at)[0]||null;
  const initialHp=Number(view?.bossHp);
  const remainingHp=Number(view?.result?.hpRemaining);
  const knownHp=Number.isFinite(initialHp)&&initialHp>0&&
    ['victory','cooldown'].includes(phase)&&Number.isFinite(remainingHp)?
    clamp(remainingHp,0,initialHp):null;
  return {phase,rounds,answers,active,roundIndex,latest,initialHp,knownHp,elapsed};
 }
 function create(root){
  if(!root)return {update:()=>{}};
  const nodes={
   steps:$(root,'#live-round-steps'),round:$(root,'#live-round-label'),
   feedback:$(root,'#live-feedback'),prompt:$(root,'#live-mini-prompt'),
   promptTitle:$(root,'#live-mini-prompt-title'),
   promptDetail:$(root,'#live-mini-prompt-detail'),
   minigame:$(root,'#mini-game'),
   hpFill:$(root,'#live-hp-fill'),hit:$(root,'#live-hit-effects'),
   boss:$(root,'#combat-boss'),combat:$(root,'#combat-scene')
  };
  const steps=nodes.steps?[...nodes.steps.querySelectorAll('.live-round-step')]:[];
  let lastHitKey='',lastRound='',lastFeedback='',lastImpactKey='';
  function dodgeImpact(round,record,view,now){
   const attacks=round?.attacks;
   if(!Array.isArray(attacks)||!nodes.hit||view?.phase!=='fighting')return;
   const elapsed=now-view.startedAt;
   const strike=attacks.find(a=>elapsed>=a.impactMs&&elapsed<a.impactMs+900);
   if(!strike)return;
   const key=String(view.startedAt)+':dodge:'+round.round+':'+strike.step;
   if(lastImpactKey===key)return;
   lastImpactKey=key;
   const account=(view.miniGames?.myAnswers||{})[round.round];
   const attempt=account?.attempts?.find(a=>a.step===strike.step);
   const fragment=document.createDocumentFragment();
   const hazards=[strike.dangerIndex,strike.secondDangerIndex]
    .filter(n=>Number.isInteger(n)&&n>=0);
   for(const lane of hazards){
    const hit=document.createElement('span');
    hit.className='live-dodge-ground';
    hit.style.left=(round.lanes===2?lane===0?'61%':'85%':
     [54,73,92][lane]+'%');
    fragment.append(hit);
   }
   const label=document.createElement('strong');label.className='live-dodge-result';
   label.textContent=attempt?.correct?'✅ Gut ausgewichen!':
    '💥 Boss-Einschlag!';fragment.append(label);
   nodes.hit.replaceChildren(fragment);
   if(attempt?.correct){
    const hero=$(nodes.combat,'.combat-hero-me');
    if(hero?.classList){hero.classList.remove('live-hero-dodge');
     void hero.offsetWidth;hero.classList.add('live-hero-dodge');}
   }
  }
  function attack(record,view,now){
   if(!record?.correct||record.at<=0||now-record.at>1600||
      now-record.at< -500||view?.phase!=='fighting')return;
   const key=String(view.startedAt)+':'+record.index+':'+record.at;
   if(lastHitKey===key)return;
   lastHitKey=key;
   const myHero=(view.members||[]).find(m=>m.isMe);
   const name=String(myHero?.name||'Dein Held').slice(0,24);
   const wrap=nodes.hit;
   if(wrap){
    const beam=document.createElement('span');
    beam.className='live-hit-beam';
    const burst=document.createElement('span');
    burst.className='live-hit-burst';
    const label=document.createElement('strong');
    label.className='live-hit-label';
    label.textContent='✅ '+name+' greift an!';
    wrap.replaceChildren(beam,burst,label);
   }
   const hero=$(nodes.combat,'.combat-hero-me');
   if(hero?.classList){
    hero.classList.remove('live-hero-attack');
    void hero.offsetWidth;hero.classList.add('live-hero-attack');
   }
   if(nodes.boss?.classList){
    nodes.boss.classList.remove('live-boss-struck');
    void nodes.boss.offsetWidth;nodes.boss.classList.add('live-boss-struck');
   }
  }
  function update(view,now){
   const current=battleModel(view,now);
   const {phase,rounds,answers,roundIndex,latest}=current;
   const active=phase==='fighting'&&rounds.length===3;
   const title=phase==='victory'?'🏆 BOSS BESIEGT':
    phase==='cooldown'?'💀 BOSS ÜBERLEBT':
    phase==='fighting'?'⚔️ LIVE-HERAUSFORDERUNG':'⚔️ BOSS-HERAUSFORDERUNG';
   text($(root,'#live-challenge-heading'),title);
   text(nodes.round,active?'RUNDE '+(roundIndex+1)+' / 3':'3 RUNDEN · 30 SEK.');
   if(nodes.prompt){
    nodes.prompt.hidden=active||phase==='victory'||phase==='cooldown';
    text(nodes.promptTitle,phase==='fighting'?'⚔️ Kampf läuft':
     phase==='waiting'?'Team vorbereitet?':'Der Boss bereitet sich vor');
    text(nodes.promptDetail,phase==='fighting'?'Die nächsten Aufgaben kommen vom Server.':
     'Drei zufällige Aufgaben erscheinen hier während des Kampfes.');
   }
   // Never pretend server-authoritative HP has changed mid-battle. The
   // server only confirms the remaining HP with its official result.
   if(nodes.hpFill){
    nodes.hpFill.style.width=current.knownHp===null?'100%':
     (current.initialHp?
      (current.knownHp/current.initialHp*100).toFixed(1)+'%':'0%');
   }
   for(const [i,node] of steps.entries()){
    const round=rounds[i],answer=answers[i];
    const kind=taskNames[round?.kind]||'Aufgabe';
    const value=(i+1)+' · '+kind;
    if(node.textContent!==value)node.textContent=value;
    node.classList.toggle('is-current',active&&i===roundIndex);
    node.classList.toggle('is-correct',answer?.correct===true);
    node.classList.toggle('is-wrong',answer?.correct===false);
    node.classList.toggle('is-finished',active&&i<roundIndex&&!answer);
   }
   const recent=latest&&Math.abs(now-latest.at)<3600;
   const signature=(view?.startedAt||'')+':'+(recent?latest.index+':'+latest.step+':'+latest.at:'other')+':'+phase;
   if(signature!==lastFeedback){
    lastFeedback=signature;
    const feedback=phase==='victory'?'🏆 Der Boss wurde vom Team besiegt!':
     phase==='cooldown'?'💀 Der Boss hat überlebt – bereitet euch vor.':
     phase!=='fighting'?'Das Team stellt sich dem Wächter.':
     recent?(rounds[latest.index]?.kind==='dodge'?
       (latest.correct?'✅ Ausgewichen – kein Treffer!':'💥 Ausweichfeld verfehlt!'):
       latest.correct?'✅ Richtig! Dein Held greift den Boss an!':
       '🛡️ Nicht geschafft – nächste Aufgabe!'):
     current.elapsed<3000?'⚔️ Der Angriff beginnt …':
     active?'🎯 Löse die Aufgabe rechts, um deinen Helden zu unterstützen!':
     '⏳ Boss-Ergebnis wird vom Server geprüft.';
    text(nodes.feedback,feedback);
    if(nodes.feedback){
     nodes.feedback.classList.toggle('is-correct',!!recent&&latest?.correct===true);
     nodes.feedback.classList.toggle('is-wrong',!!recent&&latest?.wrong===true);
    }
   }
   const hitKind=latest?rounds[latest.index]?.kind:null;
   if(phase==='fighting'&&recent&&hitKind!=='dodge')attack(latest,view,now);
   if(phase==='fighting'){
    const dodge=rounds.find(round=>round.kind==='dodge');
    if(dodge)dodgeImpact(dodge,latest,view,now);
   }
   if(phase!=='fighting'){lastHitKey='';lastImpactKey='';}
  }
  return {update};
 }
 window.DogBossLiveUI=Object.freeze({create,battleModel});
})();
