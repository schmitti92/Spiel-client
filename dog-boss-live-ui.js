/* 100 TORE — Unified LIVE battle presentation, safe by design.
 * Single source of truth: the existing server view + synchronized server clock.
 * Never awards damage, asserts a hit value, chooses tasks, or sends requests.
 */
(()=>{
 'use strict';
 const taskNames={dodge:'🛡️ Ausweichen',reaction:'⚡ Reaktion',
  math:'🧮 Blitz-Mathe',target:'🎯 Zieltreffer',chain:'⛓️ Kettenbrecher'};
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
   minigame:$(root,'#mini-game'),challenge:$(root,'.live-challenge'),
   resultsPanel:$(root,'#v3-round-results'),
   resultsTitle:$(root,'#v3-results-title'),
   resultsSubtitle:$(root,'#v3-results-subtitle'),
   resultsRows:$(root,'#v3-results-rows'),
   resultsTotal:$(root,'#v3-results-total'),
   resultsNote:$(root,'#v3-results-note'),
   recentDamage:$(root,'#live-recent-damage'),
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
   cineNext:$(root,'#cinematic-next'),cineProgress:$(root,'#cinematic-progress'),
   showOverlay:$(root,'#cinematic-grand-countdown'),
   showRing:$(root,'#cinematic-grand-ring'),
   showDigit:$(root,'#cinematic-grand-digit'),
   showLabel:$(root,'#cinematic-grand-label'),
   showNext:$(root,'#cinematic-grand-next'),
   startFlash:$(root,'#cinematic-start-flash')
  };
  const steps=nodes.steps?[...nodes.steps.querySelectorAll('.live-round-step')]:[];
  let lastHitKey='',lastRound='',lastFeedback='',lastImpactKey='',lastExchangeKey='',lastScoreKey='';
  let lastShowTick='';
  let lastVitalsEncounter='',lastBossHp=null,lastTeamHp=null,lastHeroVitalsKey='';
  let lastHeroHp=new Map(),recentDamage=[];
  let heroHpNodes=new Map();
  const fmtHealth=new Intl.NumberFormat('de-DE');
  // Display only decreases between two server-derived HP snapshots.
  // We cannot infer which hero caused boss damage from aggregate HP values.
  // No new requests or persistence: just three most recent visible losses.
  function logConfirmedDamage(label,amount,enemy=false){
   if(!Number.isFinite(amount)||amount<=0)return;
   recentDamage.unshift((enemy?'🔥 ':'🛡️ ')+label+': −'+
    fmtHealth.format(Math.round(amount))+' LP');
   recentDamage=recentDamage.slice(0,3);
  }
  function showRecentDamage(){
   text(nodes.recentDamage,recentDamage.length?
    recentDamage.join('  ·  '):'Noch keine bestätigten Treffer');
  }
  function popDamage(node,damage,enemy=false){
   if(!node||damage<=0||typeof document==='undefined')return;
   const label=document.createElement('strong');
   label.className=enemy?'combat-damage-pop is-boss':'combat-damage-pop is-team';
   label.textContent='−'+fmtHealth.format(damage)+' LP';
   node.replaceChildren?.(label);
  }
  function updateHealth(view,current,now){
   const maxBoss=Math.max(0,Number(view?.bossHp)||0);
   // S-01: all screens use the server-confirmed, sequenced hit events when
   // available. Time continues locally between polls; no extra requests.
   const stream=view?.combat;
   const inFight=view?.phase==='fighting'&&stream?.version===1&&
    !!stream.fightId&&Array.isArray(stream.events)&&Number(view?.startedAt)>0;
   const elapsed=Math.max(0,Number(now)-Number(view?.startedAt||0));
   const released=inFight?stream.events.filter(e=>Number(e.atMs)<=elapsed):[];
   const latestBoss=inFight?[...released].reverse().find(e=>e.targetId==='boss'):null;
   const fromServer=Number(inFight?
    latestBoss?.hpAfter??stream.initialBossHp:
    view?.miniGames?.exchange?.displayBossHp??view?.bossLiveHp);
   const liveBoss=Number.isFinite(fromServer)&&view?.bossLiveHp!==undefined?
    clamp(fromServer,0,maxBoss):
    current.knownHp===null?maxBoss:current.knownHp;
   if(nodes.hpFill)nodes.hpFill.style.width=(maxBoss?
    clamp(100*liveBoss/maxBoss,0,100):100).toFixed(2)+'%';
   nodes.bossTrack?.setAttribute?.('aria-valuemax',String(maxBoss||1));
   nodes.bossTrack?.setAttribute?.('aria-valuenow',String(Math.round(liveBoss)));
   if(nodes.combat?.dataset){
    nodes.combat.dataset.bossCritical=String(maxBoss>0&&liveBoss/maxBoss<=.3);
   }
   let pool=view?.miniGames?.exchange?.displayTeamHealth||view?.teamHealth;
   if(inFight&&Array.isArray(pool?.heroes)){
    const heroes=pool.heroes.map(hero=>{
     const event=[...released].reverse().find(e=>e.targetId===hero.uid);
     const hp=Number(event?.hpAfter??stream.initialHeroHp?.[hero.uid]);
     return {...hero,hp:Number.isFinite(hp)?clamp(hp,0,hero.maxHp):hero.hp};
    });
    const hp=heroes.reduce((sum,hero)=>sum+(Number(hero.hp)||0),0);
    pool={...pool,heroes,hp,lost:Math.max(0,(Number(pool.maxHp)||0)-hp)};
   }
   const hasPool=Number(pool?.maxHp)>0;
   const teamMax=hasPool?Number(pool.maxHp):0;
   const teamHp=hasPool?clamp(Number(pool.hp)||0,0,teamMax):0;
   if(nodes.combat?.dataset){
    nodes.combat.dataset.teamCritical=String(hasPool&&teamHp/teamMax<=.56);
   }
   if(hasPool){
    if(nodes.shieldFill)nodes.shieldFill.style.width=(100*teamHp/teamMax).toFixed(2)+'%';
    text(nodes.shieldValue,fmtHealth.format(teamHp)+' / '+fmtHealth.format(teamMax)+' LP');
    nodes.groupTrack?.setAttribute?.('aria-valuemax',String(teamMax));
    nodes.groupTrack?.setAttribute?.('aria-valuenow',String(teamHp));
   }else{
    if(nodes.heroHealth)nodes.heroHealth.replaceChildren?.();
    lastHeroVitalsKey='';heroHpNodes=new Map();
   }
   const members=view?.members||[];
   if(hasPool&&nodes.heroHealth&&typeof document!=='undefined'){
    const players=Array.isArray(pool.heroes)?pool.heroes:[];
    const signature=JSON.stringify(players.map(p=>[p.uid,p.maxHp,
     members.find(m=>m.uid===p.uid)?.name||'']));
    if(signature!==lastHeroVitalsKey){
     lastHeroVitalsKey=signature;
     heroHpNodes=new Map();
     const cards=players.map(p=>{
      const row=document.createElement('div');
      row.className='live-hero-health-card';
      const name=document.createElement('span');
      name.className='live-hero-health-name';
      name.textContent=members.find(m=>m.uid===p.uid)?.name||'Held';
      const track=document.createElement('span');
      track.className='live-hero-health-bar';
      const fill=document.createElement('span');
      track.append?.(fill);
      const value=document.createElement('b');
      row.append?.(name,track,value);
      heroHpNodes.set(p.uid,{fill,value});
      return row;
     });
     nodes.heroHealth.replaceChildren?.(...cards);
    }
    for(const p of players){
     const bar=heroHpNodes.get(p.uid);
     if(!bar)continue;
     const pct=100*clamp(Number(p.hp)||0,0,Math.max(1,p.maxHp))/
      Math.max(1,p.maxHp);
     if(bar.fill?.style)bar.fill.style.width=pct.toFixed(2)+'%';
     text(bar.value,fmtHealth.format(p.hp));
    }
   }
   const encounter=String(view?.startedAt||0)+':'+String(view?.attempt||0);
   const visibleHeroes=hasPool&&Array.isArray(pool.heroes)?pool.heroes:[];
   const heroHpNow=new Map(visibleHeroes.map(h=>[h.uid,Number(h.hp)||0]));
   if(encounter!==lastVitalsEncounter){
    lastVitalsEncounter=encounter;
    lastBossHp=liveBoss;lastTeamHp=hasPool?teamHp:null;
    lastHeroHp=heroHpNow;recentDamage=[];
   }else{
    const perHitFx=Number(view?.miniGames?.version)>=11&&
      Array.isArray(view?.miniGames?.exchange?.strikes);
    if(!perHitFx&&['fighting','victory','cooldown'].includes(view?.phase)&&
      lastBossHp!==null&&liveBoss<lastBossHp){
     const damage=lastBossHp-liveBoss;
     popDamage(nodes.bossDamage,damage,true);
     logConfirmedDamage('Boss',damage,true);
    }
    if(view?.phase==='fighting'&&hasPool){
     if(!perHitFx&&lastTeamHp!==null&&teamHp<lastTeamHp)
      popDamage(nodes.teamDamage,lastTeamHp-teamHp,false);
     if(!perHitFx)for(const hero of visibleHeroes){
      const previous=lastHeroHp.get(hero.uid);
      const currentHp=heroHpNow.get(hero.uid);
      if(Number.isFinite(previous)&&currentHp<previous){
       const name=members.find(m=>m.uid===hero.uid)?.name||'Held';
       logConfirmedDamage(String(name).slice(0,22),previous-currentHp);
      }
     }
    }
    lastBossHp=liveBoss;lastTeamHp=hasPool?teamHp:null;
    lastHeroHp=heroHpNow;
   }
   if(Number(view?.miniGames?.version)<11||
    !Array.isArray(view?.miniGames?.exchange?.strikes))showRecentDamage();
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
   const isBatch=(round?.kind==='math'||
     (round?.kind==='target'&&view?.miniGames?.version>=10))&&all.length>1&&
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
   if((view?.miniGames?.version||0)<4){
    if(nodes.cinematic)nodes.cinematic.hidden=true;
    return;
   }
   if(nodes.cinematic)nodes.cinematic.hidden=false;
   const index=round.round,defensive=!!stage?.defensive;
   const next=current.rounds[index+1],windowEnd=next?.startMs??
    (Number(view?.miniGames?.exchange?.durationMs)||50000);
   const totalMs=windowEnd-round.endMs;
   const sceneMs=Math.max(0,current.elapsed-round.endMs);
   const remaining=Math.max(0,windowEnd-current.elapsed);
   const fmt=new Intl.NumberFormat('de-DE');
   if(nodes.cinematic?.style?.setProperty)
    nodes.cinematic.style.setProperty('--cine-animation-offset',
     '-'+Math.max(0,current.elapsed-round.endMs)+'ms');
   text(nodes.cineCountdown,(remaining/1000).toFixed(1).replace('.',',')+' s');
   const grand=(view?.miniGames?.version||0)>=7&&totalMs>=14000;
   const finalCountdown=grand&&remaining<=3000;
   // All four 14s scenes land their strike at the shared server-clock midpoint.
   const strikeMid=totalMs/2;
   const cinematicPhase=!grand?'legacy':finalCountdown?'countdown':
    sceneMs<strikeMid-1400?'prepare':sceneMs<strikeMid+1400?'impact':'result';
   nodes.challenge?.classList?.toggle('is-cinematic-countdown',finalCountdown);
   nodes.challenge?.classList?.toggle('is-defense',finalCountdown&&defensive);
   nodes.showOverlay?.style?.setProperty?.('--cine-show-offset','-'+sceneMs+'ms');
   // Keep scoreboards readable until the final 3-second countdown.
   if(nodes.showOverlay)nodes.showOverlay.hidden=!finalCountdown;
   if(nodes.cinematic?.dataset){
    nodes.cinematic.dataset.showVersion=grand?'7':'legacy';
    nodes.cinematic.dataset.showPhase=cinematicPhase;
   }
   nodes.cinematic?.style?.setProperty?.('--cine-show-duration',totalMs+'ms');
   nodes.cinematic?.style?.setProperty?.('--cine-show-offset',
    '-'+Math.max(0,current.elapsed-round.endMs)+'ms');
   if(finalCountdown){
    const seconds=Math.max(1,Math.ceil(remaining/1000));
    const currentTick=String(view?.startedAt)+':'+round.round+':'+seconds;
    if(lastShowTick!==currentTick&&nodes.showDigit){
     lastShowTick=currentTick;
     nodes.showDigit.classList?.remove('is-rolling');
     void nodes.showDigit.offsetWidth;
     nodes.showDigit.classList?.add('is-rolling');
    }
    text(nodes.showDigit,String(seconds));
    nodes.showRing?.style?.setProperty?.('--show-sweep',
     Math.max(0,Math.min(360,360*remaining/3000)).toFixed(2)+'deg');
   }
   if(nodes.cineProgress)nodes.cineProgress.style.width=
    Math.max(0,Math.min(100,(1-remaining/totalMs)*100)).toFixed(1)+'%';
   const title=cinematicPhase==='legacy'?
    (defensive?'🛡️ DER BOSS GREIFT AN!':'⚔️ UNSER TEAM SCHLÄGT ZU!'):
    defensive?
     (cinematicPhase==='prepare'?'🛡️ DER BOSS HOLT AUS!':
      cinematicPhase==='impact'?'💥 DER BOSS GREIFT AN!':'🛡️ UNSERE ABWEHR'):
     (cinematicPhase==='prepare'?'⚔️ DAS TEAM SAMMELT KRAFT!':
      cinematicPhase==='impact'?'💥 JETZT TRIFFT UNSER TEAM!':'⚔️ UNSER TEAMERGEBNIS');
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
    const maxTeamHp=Number(view?.teamHealth?.maxHp)||0;
    const priorShield=round.round===3?
     Number(view?.miniGames?.exchange?.stages?.[1]?.shield??100):100;
    const hp=maxTeamHp?Math.round(maxTeamHp*stage.shield/100):0;
    const priorHp=maxTeamHp?Math.round(maxTeamHp*priorShield/100):0;
    const lost=Math.max(0,priorHp-hp);
    text(nodes.cineEyebrow,'❤️ TEAMVERTEIDIGUNG');
    text(nodes.cineScore,maxTeamHp?
     fmt.format(hp)+' / '+fmt.format(maxTeamHp):fmt.format(stage.shield)+' / 100');
    text(nodes.cineScoreDesc,maxTeamHp?'GRUPPEN-LP':'Teamverteidigung');
    text(nodes.cineBonusLabel,'🛡️ ABGEWEHRT');
    text(nodes.cineBonus,maxTeamHp?
     fmt.format(Math.max(0,Math.round(maxTeamHp*.25)-lost))+' LP':
     fmt.format(blocked)+' / 25');
    text(nodes.cineBonusDetail,maxTeamHp?
     (lost?'−'+fmt.format(lost)+' LP':'PERFEKT! KEIN SCHADEN'):
     (shieldLoss?'−'+fmt.format(shieldLoss)+' Schildpunkte':'Perfekter Block'));
    text(nodes.cineCumulative,
     fmt.format(stage.correct)+' / '+fmt.format(stage.max)+' Abwehraktionen');
   }else{
    const percent=Number(stage.bonusPercent||0);
    const bonus=stage.bonusDamage;
    text(nodes.cineEyebrow,'⚔️ GEMEINSAMER TEAMANGRIFF');
    text(nodes.cineScore,fmt.format(stage.correct)+' / '+fmt.format(stage.max));
    text(nodes.cineScoreDesc,'TEAMTREFFER');
    text(nodes.cineBonusLabel,'🔥 EXTRA-SCHADEN');
    text(nodes.cineBonus,Number.isFinite(bonus)?
     '+'+fmt.format(bonus):'+'+fmt.format(percent)+' %');
    text(nodes.cineBonusDetail,
     '+'+percent.toLocaleString('de-DE')+' % · Finale Wertung folgt');
    const cumulative=view.miniGames.exchange?.cumulativeExtraDamage;
    text(nodes.cineCumulative,Number.isFinite(cumulative)?
     '🔥 Gesamtbonus: +'+fmt.format(cumulative):
     'Gemeinsamer Angriff wird vorbereitet');
   }
   const upcoming=next?.kind==='chain'&&view?.miniGames?.version>=13?
    '⛓️ Kettenbrecher':next?.round===4&&view?.miniGames?.version>=12?
    '🔥 Finaler Schlag':next?.kind==='target'&&view?.miniGames?.version>=10?
    '🎨 Farb- und Symbol-Treffer':next?({'dodge':'🛡️ Ausweichen','target':'🎯 Zieltreffer',
    'reaction':'⚡ Reaktion','math':'🧮 Blitz-Mathe'}[next.kind]||'Nächste Runde'):
    '🏆 Finale Auswertung folgt';
   text(nodes.cineNext,next?'Als Nächstes: '+upcoming:upcoming);
   if((view?.miniGames?.version||0)>=7){
    text(nodes.showLabel,next?'NÄCHSTE RUNDE IN':'FINALE IN');
    text(nodes.showNext,upcoming);
   }
  }
  // Per-person interlude statistics are read-only server awards.
  // The panel reuses the minigame space while inputs are unavailable.
  function renderRoundResults(view,round,stage){
   if(!nodes.resultsPanel||!nodes.resultsRows)return;
   const defensive=!!stage?.defensive;
   const labels={math:'🧮 Blitz-Mathe',dodge:'🛡️ Ausweichen',
    target:(view?.miniGames?.version||0)>=10?'🎨 Farbe & Symbole':'🎯 Zieltreffer',
    reaction:'⚡ Reaktion',chain:'⛓️ Kettenbrecher'};
   if((view?.miniGames?.version||0)>=12&&round.round===4)
    labels.target='🔥 Finaler Schlag';
   text(nodes.resultsTitle,(labels[round.kind]||'Herausforderung')+' · Ergebnis');
   text(nodes.resultsSubtitle,defensive?
    'Persönlich erspielte Verteidigung':'Persönlich erspielter Angriff');
   const rows=Array.isArray(stage?.playerResults)?stage.playerResults:null;
   if(!rows){
    const info=document.createElement('div');
    info.className='v3-results-row';
    info.textContent='⏳ Warte auf die bestätigte Einzelwertung …';
    nodes.resultsRows.replaceChildren(info);
    text(nodes.resultsTotal,'Ergebnisse werden überprüft');
    text(nodes.resultsNote,'Bis zur Bestätigung werden keine Belohnungen geschätzt.');
    return;
   }
   const members=Array.isArray(view?.members)?view.members:[];
   const players=Array.isArray(view?.roster)?view.roster:[];
   const fmt=(v)=>Math.max(0,Number(v)||0).toLocaleString('de-DE');
   const personalRows=rows.map(item=>{
    const member=members.find(m=>m.uid===item.uid);
    const roster=players.find(p=>p.uid===item.uid);
    const name=String(member?.name||roster?.name||'Held').slice(0,24);
    const row=document.createElement('div');
    row.className='v3-results-row'+(member?.isMe?' is-me':'');
    row.setAttribute?.('role','row');
    const label=document.createElement('span');
    label.className='v3-result-name';label.textContent=name;
    label.setAttribute?.('role','cell');
    const score=document.createElement('span');
    score.className='v3-result-score';
    score.textContent=fmt(item.correct)+' / '+fmt(item.max);
    score.setAttribute?.('role','cell');
    const reward=document.createElement('span');
    reward.className='v3-result-reward'+(defensive?' is-defense':'');
    reward.setAttribute?.('role','cell');
    const amount=document.createElement('strong');
    const detail=document.createElement('small');
    if(defensive){
     amount.textContent=Number.isFinite(item.savedHp)?
      '+'+fmt(item.savedHp)+' LP geschützt':
      '+'+fmt(item.protectionPoints)+' Schutzpunkte';
     detail.textContent=Number.isFinite(item.savedHp)?
      '+'+fmt(item.protectionPoints)+' / 25 Schutzpunkte':
      'Abwehrbeitrag · Gruppenregel';
    }else{
     amount.textContent=Number.isFinite(item.bonusDamage)?
      '+'+fmt(item.bonusDamage)+' Zusatzschaden':
      '+'+fmt(item.bonusPercent)+' % Angriff';
     detail.textContent='Potenzial für die Endwertung';
    }
    reward.replaceChildren(amount,detail);
    row.replaceChildren(label,score,reward);
    return row;
   });
   nodes.resultsRows.replaceChildren(...personalRows);
   if(defensive){
    const saved=rows.reduce((sum,x)=>sum+(Number(x.savedHp)||0),0);
    const points=rows.reduce((sum,x)=>sum+(Number(x.protectionPoints)||0),0);
    const individual=rows.some(x=>Number.isFinite(x.savedHp));
    text(nodes.resultsTotal,individual?
     '🛡️ Zusammen +'+fmt(saved)+' LP bewahrt':
     '🛡️ Zusammen +'+fmt(points)+' Schutzpunkte');
    text(nodes.resultsNote,individual?
     'LP gegenüber keinem richtigen Ausweichen/Konter geschützt · kein dauerhafter Rüstungsbonus':
     'Abwehrpunkte nach bisheriger Gruppenregel · keine dauerhafte Rüstung');
   }else{
    text(nodes.resultsTotal,Number.isFinite(stage?.bonusDamage)?
     '🔥 Team: +'+fmt(stage.bonusDamage)+' Zusatzschaden':
     '🔥 Angriffswertung wird bestätigt');
    text(nodes.resultsNote,
     'Angriffspotenzial aus Ausrüstung und richtigen Aufgaben; tatsächlicher Schaden folgt in der Endwertung.');
   }
  }
  function updateExchange(view,current){
   const stages=view?.miniGames?.exchange?.stages;
   const exchange=Array.isArray(stages)&&
    (current.rounds.length===4||current.rounds.length===5);
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
    if(nodes.resultsPanel)nodes.resultsPanel.hidden=true;
    lastScoreKey='';
    if(nodes.cinematic)nodes.cinematic.hidden=true;
    if(nodes.showOverlay)nodes.showOverlay.hidden=true;
    nodes.challenge?.classList?.remove('is-cinematic-countdown');
    nodes.challenge?.classList?.remove('is-defense');
    lastShowTick='';
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
   const nextRound=current.rounds[scene.round+1];
   const windowEnd=nextRound?.startMs??
    (Number(view.miniGames?.exchange?.durationMs)||50000);
   const remaining=Math.max(0,windowEnd-current.elapsed);
   const longScene=(view?.miniGames?.version||0)>=7&&windowEnd-scene.endMs>=14000;
   const showResults=remaining>0&&(!longScene||remaining>3000);
   if(nodes.resultsPanel)nodes.resultsPanel.hidden=!showResults;
   if(showResults&&nodes.resultsPanel){
    const rowsSignature=JSON.stringify(stage?.playerResults||null);
    const key=String(view.startedAt)+':'+scene.round+':'+rowsSignature+':'+
     JSON.stringify((view.members||[]).map(m=>[m.uid,m.name,m.isMe]));
    if(lastScoreKey!==key){
     lastScoreKey=key;
     renderRoundResults(view,scene,stage);
    }
   }
   const previousShield=scene.round===3?
    Number(stages[1]?.shield??100):100;
   const shieldLoss=defensive&&stage?.completed?
    Math.max(0,previousShield-Number(stage.shield??previousShield)):0;
   const participants=(view.roster||[]).map(m=>
    (view.members||[]).find(p=>p.uid===m.uid)?.name||m.name||'Held');
   const heroNames=participants.length?
    participants.join(', '):'Dein Team';
   const key=String(view.startedAt)+':'+scene.round;
   if(nodes.announcement)nodes.announcement.hidden=(view?.miniGames?.version||0)>=4;
   const title=defensive?'🛡️ BOSS SCHLÄGT ZURÜCK':
    scene.round===4?'🔥 LETZTER SCHLAG':'⚔️ GEMEINSAMER ANGRIFF';
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
   text(nodes.round,'ZWISCHENSEQUENZ '+(scene.round+1)+' / '+current.rounds.length);
   updateCinematic(view,current,scene,stage,shieldLoss);
   if(nodes.prompt)nodes.prompt.hidden=showResults;
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
     const offset=Math.min(Math.max(0,Math.floor((view?.miniGames?.exchange?.durationMs||50000)-scene.endMs-100)),
      Math.max(0,current.elapsed-scene.endMs));
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
   if(nodes.combat?.dataset)nodes.combat.dataset.battleVersion=String(view?.miniGames?.version||0);
   // The "LOS!" flash is local to the published round start, with no new
   // subscription, network request or client-authoritative timer.
   const entering=(view?.miniGames?.version||0)>=7&&current.phase==='fighting'&&
    current.rounds.some(r=>r.round>0&&current.elapsed>=r.startMs&&
     current.elapsed<r.startMs+900);
   if(nodes.startFlash)nodes.startFlash.hidden=!entering;
   const {phase,rounds,answers,roundIndex,latest}=current;
   const active=phase==='fighting'&&rounds.length>=3;
   const title=phase==='victory'?'🏆 BOSS BESIEGT':
    phase==='cooldown'?'💀 BOSS ÜBERLEBT':
    phase==='fighting'?'⚔️ LIVE-HERAUSFORDERUNG':'⚔️ BOSS-HERAUSFORDERUNG';
   text($(root,'#live-challenge-heading'),title);
   text(nodes.round,active?'RUNDE '+(roundIndex+1)+' / '+rounds.length:
    (rounds.length>=4?rounds.length+' RUNDEN · '+(view?.miniGames?.version>=14?'135':view?.miniGames?.version>=12?'125':view?.miniGames?.version>=10?'101':view?.miniGames?.version>=8?'99':view?.miniGames?.version===7?'92':view?.miniGames?.version===6?'64':view?.miniGames?.version===5?'60':view?.miniGames?.version===4?'50':'40')+' SEK.':'3 RUNDEN · 30 SEK.'));
   if(nodes.prompt){
    nodes.prompt.hidden=active||phase==='victory'||phase==='cooldown';
    text(nodes.promptTitle,phase==='fighting'?'⚔️ Kampf läuft':
     phase==='waiting'?'Team vorbereitet?':'Der Boss bereitet sich vor');
    text(nodes.promptDetail,phase==='fighting'?'Die nächsten Aufgaben kommen vom Server.':
     'Die Aufgaben erscheinen rechts und wechseln mit Kampfszenen.');
   }
   updateHealth(view,current,now);
   for(const [i,node] of steps.entries()){
    const round=rounds[i],answer=answers[i];
    node.hidden=!round;
    const kind=round?.kind==='chain'&&view?.miniGames?.version>=13?
     '⛓️ Kettenbrecher':round?.round===4&&view?.miniGames?.version>=12?
     '🔥 Finaler Schlag':round?.kind==='target'&&view?.miniGames?.version>=10?
     '🎨 Farb- und Symbol-Treffer':taskNames[round?.kind]||'Aufgabe';
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
   if(phase==='fighting'&&recent&&hitKind!=='dodge'&&rounds.length<4)
    attack(latest,view,now);
   if(phase==='fighting'&&rounds.length<4){
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
