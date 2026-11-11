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
   (elapsed<rounds[0].startMs?0:clamp(rounds.filter(r=>elapsed>=r.endMs).length,0,rounds.length-1)):-1);
  const latest=Object.entries(answers).flatMap(([index,record])=>{
   const events=Array.isArray(record?.attempts)?record.attempts:[record];
   return events.map(item=>({index:Number(index),step:item?.step??0,
    correct:item?.correct===true,wrong:item?.correct===false,
    at:parseMs(item?.at)}));
  }).filter(x=>Number.isInteger(x.index)&&x.index>=0&&x.index<rounds.length&&x.at>0)
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
   boss:$(root,'#combat-boss'),combat:$(root,'#combat-scene'),
   shieldFill:$(root,'#live-shield-fill'),shieldValue:$(root,'#live-shield-value'),
   announcement:$(root,'#live-stage-announcement'),
   stageTitle:$(root,'#live-stage-title'),stageScore:$(root,'#live-stage-score'),
   stageSubtitle:$(root,'#live-stage-subtitle')
  };
  const steps=nodes.steps?[...nodes.steps.querySelectorAll('.live-round-step')]:[];
  let lastHitKey='',lastRound='',lastFeedback='',lastImpactKey='',lastExchangeKey='';
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
   const all=view?.miniGames?.myAnswers?.[record?.index]?.attempts||[];
   const round=view?.miniGames?.rounds?.[record?.index];
   const isBatch=round?.kind==='math'&&all.length>1&&
    all.every(step=>step.at===record?.at);
   const hits=isBatch?all.filter(step=>step.correct).length:
    record?.correct?1:0;
   if(!hits||record.at<=0||now-record.at>3600||
      now-record.at< -500||view?.phase!=='fighting')return;
   const key=String(view.startedAt)+':'+record.index+':'+record.step+
    ':'+record.at+':'+hits;
   if(lastHitKey===key)return;
   lastHitKey=key;
   const myHero=(view.members||[]).find(m=>m.isMe);
   const name=String(myHero?.name||'Dein Held').slice(0,24);
   const wrap=nodes.hit;
   if(wrap){
    const effects=[];
    for(let i=0;i<hits;i++){
     const delay=(i*.22).toFixed(2)+'s';
     const beam=document.createElement('span');
     beam.className='live-hit-beam';
     beam.style.animationDelay=delay;
     const burst=document.createElement('span');
     burst.className='live-hit-burst';
     burst.style.animationDelay=delay;
     effects.push(beam,burst);
    }
    const label=document.createElement('strong');
    label.className='live-hit-label';
    label.textContent=isBatch?'✅ '+name+': '+hits+' bestätigte Treffer!':
     '✅ '+name+' greift an!';
    effects.push(label);
    wrap.replaceChildren(...effects);
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
  function updateExchange(view,current){
   const stages=view?.miniGames?.exchange?.stages;
   const exchange=Array.isArray(stages)&&current.rounds.length===4;
   const fightingExchange=exchange&&current.phase==='fighting';
   // Keep the last server-confirmed shield amount visible after settlement.
   const shield=exchange?Math.max(0,Math.min(100,
    Number(view.miniGames.exchange.shield)||0)):100;
   if(nodes.shieldFill)nodes.shieldFill.style.width=shield+'%';
   text(nodes.shieldValue,shield+' / 100');
   const scene=fightingExchange?current.rounds.find(round=>
    current.elapsed>=round.endMs&&current.elapsed<round.endMs+2000):null;
   if(!scene){
    if(nodes.announcement)nodes.announcement.hidden=true;
    if(nodes.combat?.classList){
     nodes.combat.classList.remove('live-exchange-attack');
     nodes.combat.classList.remove('live-exchange-defense');
     nodes.combat.classList.remove('live-exchange-miss');
     nodes.combat.classList.remove('live-exchange-guard-damaged');
    }
    return;
   }
   const stage=stages[scene.round],defensive=!!stage?.defensive;
   const previousShield=scene.round===3?
    Number(stages[1]?.shield??100):100;
   const shieldLoss=defensive&&stage?.completed?
    Math.max(0,previousShield-Number(stage.shield??previousShield)):0;
   const participants=(view.roster||[]).map(m=>
    (view.members||[]).find(p=>p.uid===m.uid)?.name||m.name||'Held');
   const heroNames=participants.length?
    participants.join(', '):'Dein Team';
   const key=String(view.startedAt)+':'+scene.round;
   if(nodes.announcement)nodes.announcement.hidden=false;
   const title=defensive?'🛡️ BOSS SCHLÄGT ZURÜCK':
    '⚔️ GEMEINSAMER ANGRIFF';
   text(nodes.stageTitle,title);
   text(nodes.stageScore,stage?.completed?
    (defensive?'Team-Schild '+stage.shield+' / 100 · −'+shieldLoss+
      ' Schildpunkte':
     stage.correct+' / '+stage.max+' Treffer · +'+
      Number(stage.bonusPercent||0).toLocaleString('de-DE')+' % Extraangriff'):
    'Die Ergebnisse werden vom Server bestätigt …');
   text(nodes.stageSubtitle,defensive?
    (shieldLoss===0&&stage?.completed?
     'Perfekt! Die Gruppe blockt den Angriff vollständig!':
     'Der Boss schlägt zu – die Helden verteidigen sich gemeinsam!'):
    (stage?.completed&&stage.correct===0?
     'Kein Treffer – der Boss weicht dem Angriff aus.':
     heroNames+' greifen den Boss gemeinsam an!'));
   text(nodes.round,'ZWISCHENSEQUENZ '+(scene.round+1)+' / 4');
   if(nodes.prompt)nodes.prompt.hidden=false;
   text(nodes.promptTitle,title);
   text(nodes.promptDetail,stage?.completed?
    (defensive?'Gemeinsam übrig: '+stage.shield+' Schildpunkte':
     stage.correct+' bestätigte Treffer von '+stage.max):
    'Warte auf die serverbestätigte Teamwertung …');
   if(nodes.combat?.classList){
    nodes.combat.classList.toggle('live-exchange-miss',
     !defensive&&stage?.completed&&stage.correct===0);
    nodes.combat.classList.toggle('live-exchange-guard-damaged',
     defensive&&stage?.completed&&shieldLoss>0);
   }
   if(lastExchangeKey!==key){
    lastExchangeKey=key;
    const cls=defensive?'live-exchange-defense':'live-exchange-attack';
    if(nodes.combat?.classList){
     // Late clients join at the same point in the synchronized 2s action,
     // instead of replaying a complete strike while teammates are finished.
     const offset=Math.min(1999,Math.max(0,current.elapsed-scene.endMs));
     nodes.combat.style?.setProperty?.('--exchange-offset',(-offset)+'ms');
     nodes.combat.classList.remove('live-exchange-attack');
     nodes.combat.classList.remove('live-exchange-defense');
     void nodes.combat.offsetWidth;
     nodes.combat.classList.add(cls);
    }
   }
  }
  function update(view,now){
   const current=battleModel(view,now);
   const {phase,rounds,answers,roundIndex,latest}=current;
   const active=phase==='fighting'&&rounds.length>=3;
   const title=phase==='victory'?'🏆 BOSS BESIEGT':
    phase==='cooldown'?'💀 BOSS ÜBERLEBT':
    phase==='fighting'?'⚔️ LIVE-HERAUSFORDERUNG':'⚔️ BOSS-HERAUSFORDERUNG';
   text($(root,'#live-challenge-heading'),title);
   text(nodes.round,active?'RUNDE '+(roundIndex+1)+' / '+rounds.length:
    (rounds.length===4?'4 RUNDEN · 40 SEK.':'3 RUNDEN · 30 SEK.'));
   if(nodes.prompt){
    nodes.prompt.hidden=active||phase==='victory'||phase==='cooldown';
    text(nodes.promptTitle,phase==='fighting'?'⚔️ Kampf läuft':
     phase==='waiting'?'Team vorbereitet?':'Der Boss bereitet sich vor');
    text(nodes.promptDetail,phase==='fighting'?'Die nächsten Aufgaben kommen vom Server.':
     'Die Aufgaben erscheinen rechts und wechseln mit Kampfszenen.');
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
    node.hidden=!round;
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
    const recentRound=recent?rounds[latest.index]:null;
    const answered=recentRound?.kind==='math'?
     answers[latest.index]?.attempts:null;
    const batch=Array.isArray(answered)&&answered.length>1&&
     answered.every(a=>a.at===latest.at);
    const mathCount=batch?answered.filter(a=>a.correct).length:0;
    const feedback=phase==='victory'?'🏆 Der Boss wurde vom Team besiegt!':
     phase==='cooldown'?'💀 Der Boss hat überlebt – bereitet euch vor.':
     phase!=='fighting'?'Das Team stellt sich dem Wächter.':
     recent?(batch?
       (mathCount?'✅ '+mathCount+' Mathetreffer bestätigt!':'❌ Keine richtige Matheantwort.'):
       recentRound?.kind==='dodge'?
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
   if(phase==='fighting'&&recent&&hitKind!=='dodge'&&rounds.length!==4)
    attack(latest,view,now);
   if(phase==='fighting'&&rounds.length!==4){
    const dodge=rounds.find(round=>round.kind==='dodge');
    if(dodge)dodgeImpact(dodge,latest,view,now);
   }
   updateExchange(view,current);
   if(phase!=='fighting'){lastHitKey='';lastImpactKey='';lastExchangeKey='';}
  }
  return {update};
 }
 window.DogBossLiveUI=Object.freeze({create,battleModel});
})();
