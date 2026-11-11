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
    groupTrack:$(root,'#live-group-hp-track'),bossTrack:$(root,'#live-boss-hp-track'),
    heroHealth:$(root,'#live-hero-health'),bossDamage:$(root,'#combat-boss-damage'),
    teamDamage:$(root,'#combat-team-damage'),
   announcement:$(root,'#live-stage-announcement'),
   stageTitle:$(root,'#live-stage-title'),stageScore:$(root,'#live-stage-score'),
   stageSubtitle:$(root,'#live-stage-subtitle'),
   cinematic:$(root,'#live-cinematic'),cineHeader:$(root,'#cinematic-header'),
   cineCountdown:$(root,'#cinematic-countdown'),cineAction:$(root,'#cinematic-action-label'),
   cineEyebrow:$(root,'#cinematic-eyebrow'),cineScore:$(root,'#cinematic-score'),
   cineScoreDesc:$(root,'#cinematic-score-description'),
   cineBonus:$(root,'#cinematic-bonus'),cineBonusLabel:$(root,'#cinematic-bonus-label'),
   cineBonusDetail:$(root,'#cinematic-bonus-detail'),
   cineCumulative:$(root,'#cinematic-cumulative'),
   cineNext:$(root,'#cinematic-next'),cineProgress:$(root,'#cinematic-progress')
  };
  const steps=nodes.steps?[...nodes.steps.querySelectorAll('.live-round-step')]:[];
  let lastHitKey='',lastRound='',lastFeedback='',lastImpactKey='',lastExchangeKey='';
  let lastVitalsEncounter='',lastBossHp=null,lastTeamHp=null,lastHeroVitalsKey='';
  const fmtHealth=new Intl.NumberFormat('de-DE');
  function popDamage(node,damage,enemy=false){
   if(!node||damage<=0||typeof document==='undefined')return;
   const label=document.createElement('strong');
   label.className=enemy?'combat-damage-pop is-boss':'combat-damage-pop is-team';
   label.textContent='−'+fmtHealth.format(damage)+' LP';
   node.replaceChildren?.(label);
  }
  function updateHealth(view,current){
   const maxBoss=Math.max(0,Number(view?.bossHp)||0);
   const fromServer=Number(view?.bossLiveHp);
   const liveBoss=Number.isFinite(fromServer)&&view?.bossLiveHp!==undefined?
    clamp(fromServer,0,maxBoss):
    current.knownHp===null?maxBoss:current.knownHp;
   if(nodes.hpFill)nodes.hpFill.style.width=(maxBoss?
    clamp(100*liveBoss/maxBoss,0,100):100).toFixed(2)+'%';
   nodes.bossTrack?.setAttribute?.('aria-valuemax',String(maxBoss||1));
   nodes.bossTrack?.setAttribute?.('aria-valuenow',String(Math.round(liveBoss)));
   const pool=view?.teamHealth;
   const hasPool=Number(pool?.maxHp)>0;
   const teamMax=hasPool?Number(pool.maxHp):0;
   const teamHp=hasPool?clamp(Number(pool.hp)||0,0,teamMax):0;
   if(hasPool){
    if(nodes.shieldFill)nodes.shieldFill.style.width=(100*teamHp/teamMax).toFixed(2)+'%';
    text(nodes.shieldValue,fmtHealth.format(teamHp)+' / '+fmtHealth.format(teamMax)+' LP');
    nodes.groupTrack?.setAttribute?.('aria-valuemax',String(teamMax));
    nodes.groupTrack?.setAttribute?.('aria-valuenow',String(teamHp));
   }else{
    if(nodes.heroHealth)nodes.heroHealth.replaceChildren?.();
    lastHeroVitalsKey='';
   }
   const members=view?.members||[];
   if(hasPool&&nodes.heroHealth&&typeof document!=='undefined'){
    const players=Array.isArray(pool.heroes)?pool.heroes:[];
    const signature=JSON.stringify(players.map(p=>[p.uid,p.hp,p.maxHp,
     members.find(m=>m.uid===p.uid)?.name||'']));
    if(signature!==lastHeroVitalsKey){
     lastHeroVitalsKey=signature;
     const cards=players.map(p=>{
      const row=document.createElement('div');
      row.className='live-hero-health-card';
      const name=document.createElement('span');
      name.className='live-hero-health-name';
      name.textContent=members.find(m=>m.uid===p.uid)?.name||'Held';
      const track=document.createElement('span');
      track.className='live-hero-health-bar';
      const fill=document.createElement('span');
      fill.style.width=(100*clamp(Number(p.hp)||0,0,Math.max(1,p.maxHp))/
       Math.max(1,p.maxHp)).toFixed(2)+'%';
      track.append?.(fill);
      const value=document.createElement('b');
      value.textContent=fmtHealth.format(p.hp);
      row.append?.(name,track,value);
      return row;
     });
     nodes.heroHealth.replaceChildren?.(...cards);
    }
   }
   const encounter=String(view?.startedAt||0)+':'+String(view?.attempt||0);
   if(encounter!==lastVitalsEncounter){
    lastVitalsEncounter=encounter;
    lastBossHp=liveBoss;lastTeamHp=hasPool?teamHp:null;
   }else{
    if(view?.phase==='fighting'&&lastBossHp!==null&&liveBoss<lastBossHp)
     popDamage(nodes.bossDamage,lastBossHp-liveBoss,true);
    if(view?.phase==='fighting'&&hasPool&&lastTeamHp!==null&&teamHp<lastTeamHp)
     popDamage(nodes.teamDamage,lastTeamHp-teamHp,false);
    lastBossHp=liveBoss;lastTeamHp=hasPool?teamHp:null;
   }
  }

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
  function updateCinematic(view,current,round,stage,shieldLoss){
   if(view?.miniGames?.version!==4){
    if(nodes.cinematic)nodes.cinematic.hidden=true;
    return;
   }
   if(nodes.cinematic)nodes.cinematic.hidden=false;
   const index=round.round,defensive=!!stage?.defensive;
   const next=current.rounds[index+1],windowEnd=next?.startMs??50000;
   const totalMs=windowEnd-round.endMs;
   const remaining=Math.max(0,windowEnd-current.elapsed);
   const fmt=new Intl.NumberFormat('de-DE');
   if(nodes.cinematic?.style?.setProperty)
    nodes.cinematic.style.setProperty('--cine-animation-offset',
     '-'+Math.max(0,current.elapsed-round.endMs)+'ms');
   text(nodes.cineCountdown,(remaining/1000).toFixed(1).replace('.',',')+' s');
   if(nodes.cineProgress)nodes.cineProgress.style.width=
    Math.max(0,Math.min(100,(1-remaining/totalMs)*100)).toFixed(1)+'%';
   const title=defensive?'🛡️ DER BOSS GREIFT AN!':'⚔️ UNSER TEAM SCHLÄGT ZU!';
   text(nodes.cineHeader,title);
   text(nodes.cineAction,defensive?'SCHUTZSCHILD AKTIV':'GEMEINSAMER EXTRAANGRIFF');
   if(nodes.cinematic){
    nodes.cinematic.classList.toggle('is-defense',defensive);
    nodes.cinematic.classList.toggle('is-attack',!defensive);
   }
   if(!stage?.completed){
    text(nodes.cineEyebrow,'SERVERERGEBNIS WIRD BESTÄTIGT');
    text(nodes.cineScore,'…');
    text(nodes.cineScoreDesc,'Bitte Ergebnisprüfung abwarten');
    text(nodes.cineBonusLabel,'⏳ BESTÄTIGUNG');
    text(nodes.cineBonus,'…');
    text(nodes.cineBonusDetail,'Keine unbestätigten Schadenswerte');
    text(nodes.cineCumulative,'');
   }else if(defensive){
    const blocked=Math.max(0,25-shieldLoss);
    text(nodes.cineEyebrow,'🛡️ TEAMVERTEIDIGUNG');
    text(nodes.cineScore,fmt.format(stage.shield)+' / 100');
    text(nodes.cineScoreDesc,'Verbleibende gemeinsame Schildpunkte');
    text(nodes.cineBonusLabel,'🛡️ ABGEBLOCKTE SCHILDPUNKTE');
    text(nodes.cineBonus,fmt.format(blocked)+' / 25');
    text(nodes.cineBonusDetail,shieldLoss===0?
     'Perfekter Block! Kein Schildverlust.':
     'Bossangriff: −'+fmt.format(shieldLoss)+' Schildpunkte');
    text(nodes.cineCumulative,
     fmt.format(stage.correct)+' / '+fmt.format(stage.max)+' erfolgreiche Abwehraktionen');
   }else{
    const percent=Number(stage.bonusPercent||0);
    const bonus=stage.bonusDamage;
    text(nodes.cineEyebrow,'⚔️ GEMEINSAMER TEAMANGRIFF');
    text(nodes.cineScore,fmt.format(stage.correct)+' / '+fmt.format(stage.max));
    text(nodes.cineScoreDesc,'Richtige Aufgaben aller kämpfenden Helden');
    text(nodes.cineBonusLabel,'🔥 ZUSÄTZLICHES ANGRIFFSPOTENZIAL');
    text(nodes.cineBonus,Number.isFinite(bonus)?
     '+'+fmt.format(bonus):'+'+fmt.format(percent)+' %');
    text(nodes.cineBonusDetail,
     '+'+percent.toLocaleString('de-DE')+' % Team-Bonus · LP-Schaden erst bei Endwertung');
    const cumulative=view.miniGames.exchange?.cumulativeExtraDamage;
    text(nodes.cineCumulative,Number.isFinite(cumulative)?
     '🔥 Bisher gesammelt: +'+fmt.format(cumulative)+' Angriffspotenzial':
     'Gemeinsamer Angriff wird vorbereitet');
   }
   const upcoming=next?({'dodge':'🛡️ Ausweichen','target':'🎯 Zieltreffer',
    'reaction':'⚡ Reaktion','math':'🧮 Blitz-Mathe'}[next.kind]||'Nächste Runde'):
    '🏆 Finale Auswertung folgt';
   text(nodes.cineNext,next?'Als Nächstes: '+upcoming:upcoming);
  }
  function updateExchange(view,current){
   const stages=view?.miniGames?.exchange?.stages;
   const exchange=Array.isArray(stages)&&current.rounds.length===4;
   const fightingExchange=exchange&&current.phase==='fighting';
   // Keep the last server-confirmed shield amount visible after settlement.
   const shield=exchange?Math.max(0,Math.min(100,
    Number(view.miniGames.exchange.shield)||0)):100;
   if(!Number(view?.teamHealth?.maxHp)){
    if(nodes.shieldFill)nodes.shieldFill.style.width=shield+'%';
    text(nodes.shieldValue,shield+' / 100');
   }
   const scene=fightingExchange?current.rounds.find((round,index)=>{
    const next=current.rounds[index+1];
    const end=next?next.startMs:Number(view.miniGames?.exchange?.durationMs)||40000;
    return current.elapsed>=round.endMs&&current.elapsed<end;
   }):null;
   if(!scene){
    if(nodes.cinematic)nodes.cinematic.hidden=true;
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
   if(nodes.announcement)nodes.announcement.hidden=view?.miniGames?.version===4;
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
   updateCinematic(view,current,scene,stage,shieldLoss);
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
     const offset=Math.min(4499,Math.max(0,current.elapsed-scene.endMs));
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
    (rounds.length===4?'4 RUNDEN · '+(view?.miniGames?.version===4?'50':'40')+' SEK.':'3 RUNDEN · 30 SEK.'));
   if(nodes.prompt){
    nodes.prompt.hidden=active||phase==='victory'||phase==='cooldown';
    text(nodes.promptTitle,phase==='fighting'?'⚔️ Kampf läuft':
     phase==='waiting'?'Team vorbereitet?':'Der Boss bereitet sich vor');
    text(nodes.promptDetail,phase==='fighting'?'Die nächsten Aufgaben kommen vom Server.':
     'Die Aufgaben erscheinen rechts und wechseln mit Kampfszenen.');
   }
   updateHealth(view,current);
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
