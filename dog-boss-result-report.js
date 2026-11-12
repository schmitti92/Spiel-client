/* 100 Tore · shared boss conclusion for every major gate.
 * Purely presentational: all stats, LP and replay hits originate in the
 * confirmed server battle view; no writes, network requests or hidden rolls.
 */
(()=>{'use strict';
 const $=(root,id)=>root?.querySelector?.('#'+id)||null;
 const fmt=new Intl.NumberFormat('de-DE');
 const num=n=>Math.max(0,Math.round(Number(n)||0));
 const text=(node,value)=>{if(node)node.textContent=String(value)};
 const cap=s=>String(s||'Held').slice(0,28);
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const LABELS={math:'🧮 Blitz-Mathe',dodge:'🛡️ Ausweichen',
  target:'🎯 Farbe & Symbole',reaction:'⚡ Reaktion',chain:'⛓️ Kettenbrecher'};
 const DEFENSIVE=new Set(['dodge','reaction']);
 const grades=[[100,'Maximum'],[90,'Hervorragend'],[75,'Sehr gut'],
  [55,'Gut'],[35,'Ordentlich'],[15,'Ausbaufähig'],[0,'Schwach']];
 function grade(percent){
  return grades.find(([mark])=>percent>=mark)?.[1]||'Schwach';
 }
 function model(view){
  // Admins can bypass the defeat cooldown. The server then exposes phase
  // "waiting" while retaining the concluded result and its saved roster.
  // The report must still open and require confirmation for that real fight.
  const bypassedDefeat=view?.phase==='waiting'&&
   view.developerBossCooldownDisabled===true&&
   view.result?.win===false&&Number(view.startedAt)>0&&
   Number(view.endsAt)>Number(view.startedAt);
  if(!view||(!['victory','cooldown'].includes(view.phase)&&!bypassedDefeat)||
   !view.result||!Array.isArray(view.roster)||!view.roster.length)return null;
  const result=view.result,rawStages=view.miniGames?.exchange?.stages;
  const stages=Array.isArray(rawStages)?rawStages.filter(s=>s?.completed):[];
  // Five equal stages, read-only from the server. Old reports retain their grade.
  const evaluation=view.miniGames?.exchange?.evaluation;
  const officialScore=evaluation?.completedRounds===5&&
   evaluation.weighting==='equal'&&Number.isFinite(evaluation.teamPercent)?
   evaluation:null;
  const serverEvents=Number(view.miniGames?.version)>=11&&
   view.combat?.version===1&&
   Array.isArray(view.combat?.events)?view.combat.events:null;
  const strikes=(serverEvents||view.miniGames?.exchange?.strikes||[])
   .filter(x=>x&&Number.isInteger(x.round)&&
    Number.isFinite(Number(x.amount))&&Number.isFinite(Number(x.atMs)));
  const names=new Map((view.members||[]).filter(m=>m?.uid)
   .map(m=>[m.uid,m]));
  const health=new Map((view.teamHealth?.heroes||[]).filter(x=>x?.uid)
   .map(x=>[x.uid,x]));
  const rows=view.roster.filter(x=>x?.uid).slice(0,3).map((hero,i)=>{
   const m=names.get(hero.uid)||{};
   const hp=health.get(hero.uid);
   const playerStages=stages.flatMap(s=>
    (s.playerResults||[]).filter(p=>p?.uid===hero.uid)
     .map(p=>({...p,kind:s.kind,round:s.round})));
   const correct=playerStages.reduce((n,p)=>n+num(p.correct),0);
   const possible=playerStages.reduce((n,p)=>n+num(p.max),0);
   const performance=officialScore?.players?.find(p=>p.uid===hero.uid);
   const attacks=strikes.filter(e=>e.uid===hero.uid&&
    ['hero-strike','hero-finisher'].includes(e.kind));
   const received=strikes.filter(e=>e.uid===hero.uid&&e.kind==='boss-strike');
   return {uid:hero.uid,name:cap(m.name||'Held '+(i+1)),
    heroClass:['krieger','magierin','waechter'].includes(m.heroClass)?
     m.heroClass:'krieger',isMe:!!m.isMe,
    weaponLevel:num(hero.weaponLevel),armorLevel:num(hero.armorLevel),
    attackPower:num(hero.skillPower),destruction:num(hero.skillDestruction),
    defenseSkill:num(hero.skillDefense),guardSkill:num(hero.skillGuard),
    attack:attacks.reduce((n,e)=>n+num(e.amount),0),
    taken:received.reduce((n,e)=>n+num(e.amount),0),
    correct,possible,percentage:Number.isFinite(performance?.percent)?
     performance.percent:possible?Math.round(100*correct/possible):null,
    hp:hp?num(hp.hp):null,maxHp:hp?num(hp.maxHp):null,
    fallen:Number(view?.miniGames?.version)>=15&&hp?.hp===0,
    attacks:attacks.length,blocks:received.filter(e=>e.blocked).length};
  });
  const right=rows.reduce((n,r)=>n+r.correct,0);
  const possible=rows.reduce((n,r)=>n+r.possible,0);
  const percent=officialScore?officialScore.teamPercent:
   possible?Math.round(100*right/possible):null;
  const bossHp=num(result.bossHp||view.bossHp);
  const bossRemaining=num(result.hpRemaining);
  const finalDamage=num(result.damage);
  const teamHp=rows.every(r=>r.hp!==null)?
   rows.reduce((n,r)=>n+r.hp,0):null;
  const teamMax=rows.every(r=>r.maxHp!==null)?
   rows.reduce((n,r)=>n+r.maxHp,0):null;
  const stageRows=stages.map(s=>{
   const correct=(s.playerResults||[]).reduce((n,p)=>n+num(p.correct),0);
   const max=(s.playerResults||[]).reduce((n,p)=>n+num(p.max),0);
   const stageHits=strikes.filter(e=>e.round===s.round);
   return {round:s.round,kind:s.kind,
    title:(s.round+1)+'. '+(LABELS[s.kind]||'Aufgabe'),
    correct,max,percent:Number.isFinite(officialScore?.rounds?.[s.round]?.percent)?
     officialScore.rounds[s.round].percent:max?Math.round(100*correct/max):null,
    damage:stageHits.filter(e=>e.kind==='hero-strike')
     .reduce((n,e)=>n+num(e.amount),0),
    taken:stageHits.filter(e=>e.kind==='boss-strike')
     .reduce((n,e)=>n+num(e.amount),0),
    defensive:!!s.defensive,
    // Only already-verified answers and cinematic effects. A bonus earned
    // from the minigame is separate from the actual boss-LP strike.
    persons:(s.playerResults||[]).map(p=>{
     const ownHits=stageHits.filter(e=>e.uid===p.uid&&e.kind===
      (s.defensive?'boss-strike':'hero-strike'));
     const hit=ownHits.length?ownHits.reduce((sum,e)=>sum+num(e.amount),0):null;
     return {uid:p.uid,name:cap(names.get(p.uid)?.name||'Held'),
      correct:num(p.correct),max:num(p.max)||num(
       view.miniGames?.rounds?.[s.round]?.maxSteps),
      fallen:p.fallen===true,hit,
      savedHp:Number.isFinite(p.savedHp)?num(p.savedHp):null,
      bonusDamage:Number.isFinite(p.bonusDamage)?num(p.bonusDamage):null,
      protectionPoints:Number.isFinite(p.protectionPoints)?num(p.protectionPoints):null};
    })};
  });
  const finisher=strikes.find(e=>e.kind==='team-finisher')||null;
  const personalFinales=strikes.filter(e=>e.kind==='hero-finisher');
  const finale=Number(view.miniGames?.version)>=15&&
   view.combat?.finale?.kind==='personal'&&personalFinales.length?
   {strikes:personalFinales,outcome:view.result.win?'victory':'defeat'}:null;
  const guard=strikes.find(e=>e.kind==='boss-guard')||null;
  const settlement=view.combat?.reconciliation?.reconciled===true?
   view.combat.reconciliation:null;
  if(finisher)stageRows.push({
   round:finisher.round,kind:'team-finisher',
   title:'⚡ Gemeinsamer Schlussangriff · Glück / Kritisch',
   correct:0,max:0,percent:null,
   damage:num(finisher.amount),taken:0,defensive:false
  });
  if(personalFinales.length)stageRows.push({
   round:4,kind:'hero-finisher',
   title:'⚡ Persönliche Schlussangriffe · '+personalFinales.length+' Helden',
   correct:0,max:0,percent:null,
   damage:personalFinales.reduce((n,e)=>n+num(e.amount),0),
   taken:0,defensive:false
  });
  if(guard)stageRows.push({
   round:guard.round,kind:'boss-guard',
   title:'🛡️ Glücksabwehr des Bosses',
   correct:0,max:0,percent:null,
   damage:0,taken:0,restored:num(-guard.amount),defensive:false
  });
  // Deterministic, read-only highlight sequence; does not replay minigames.
  const replay=strikes
   .filter(e=>['team-finisher','boss-guard'].includes(e.kind)||
    view.roster.some(p=>p.uid===e.uid))
   .sort((a,b)=>a.atMs-b.atMs||a.slot-b.slot)
   .map((event,i)=>({
    ...event,name:event.kind==='team-finisher'?'Team':
     event.kind==='boss-guard'?'Boss':
     rows.find(r=>r.uid===event.uid)?.name||'Held',
    amount:event.kind==='boss-guard'?Math.round(Number(event.amount)||0):
     num(event.amount),seq:Number.isInteger(event.sequence)?event.sequence:i+1,
    kind:event.kind,
    roundTitle:LABELS[view.miniGames?.rounds?.[event.round]?.kind]||
     ('Runde '+(event.round+1))
   }));
  const tips=[];
  const gate=num(view.gate)||10;
  const gearCap=Math.max(1,Math.floor(gate/10));
  const skillCap=Math.min(50,gearCap*5);
  if(!result.win&&bossRemaining>0){
   tips.push('⚔️ Dem Boss blieben '+fmt.format(bossRemaining)+
    ' LP. Konzentriert euch auf mehr richtige Angriffe und die offensive Vorbereitung.');
  }
  if(rows.length<3)tips.push('👥 Tretet möglichst zu dritt an. Allein ist ein Sieg ausgeschlossen; zu zweit ist er nur unter besonderen Voraussetzungen möglich.');
  const weapon=rows.find(r=>r.weaponLevel<gearCap);
  const attackSkill=rows.find(r=>r.attackPower<skillCap||r.destruction<skillCap);
  if(!result.win&&weapon)
   tips.push('⚒️ '+weapon.name+': Die Waffe steht auf Stufe '+
    weapon.weaponLevel+'. Vor diesem Tor ist bis Stufe '+gearCap+
    ' möglich. Verbessert die Waffe in der Schmiede.');
  else if(!result.win&&attackSkill)
   tips.push('✨ '+attackSkill.name+': Angriffskraft und Vernichtungsschlag sind noch nicht beide auf der für diesen Boss passenden Fertigkeitsstufe '+skillCap+'.');
  if(percent!==null&&percent<75)
   tips.push('🎮 Übt die Minispiele: '+fmt.format(right)+' von '+fmt.format(possible)+
    ' möglichen Aufgaben wurden richtig gelöst. Mehr Treffer verbessern eure Angriffe und Abwehr.');
  const chain=stageRows.find(s=>s.kind==='chain');
  if(chain&&chain.percent!==null&&chain.percent<70)
   tips.push('⛓️ Beim Kettenbrecher die goldene Kette treffen: Ein Tipp reicht. Die letzte Runde erhöht euren finalen Angriff.');
  if(teamHp!==null&&teamMax&&teamHp/teamMax<.7)
   tips.push('🛡️ Achtet auf eure Verteidigung: Weniger Fehler bei Ausweichen und Reaktion bewahren LP. Rüstung verbessern, sofern das Tor weitere Stufen erlaubt.');
  if(result.win)tips.push('🏆 Der Boss ist besiegt! Nutzt die nächste Schmiedestufe, bevor ihr zum nächsten Wächter aufbrecht.');
  if(!tips.length)tips.push('⚒️ Überprüft die Ausrüstung in der Schmiede und konzentriert euch beim nächsten Versuch auf präzisere Minispiele.');
  return {gate:num(view.gate)||10,bossName:cap(view.name||'Boss'),
   result:{win:!!result.win,damage:finalDamage,bossHp,bossRemaining,
    critical:!!result.rareCritical},
   rows,stages:stageRows,score:{correct:right,max:possible,
    percent,grade:percent===null?'Nicht verfügbar':grade(percent),
     equalWeight:!!officialScore,perfect:officialScore?.perfect??null},
   teamHp,teamMax,tips:tips.slice(0,4),replay,
   settlement,finisher,guard,finale,
   cooldownUntil:num(view.cooldownUntil),key:String(view.gate||10)+':'+
    String(view.startedAt||0)+':'+String(view.attempt||0)+':'+
    String(result.win)+':'+String(finalDamage)};
 }
 function create(root){
  if(!root)return {update(){},model};
  // Mount the finish screen outside the battle/preflight grid. The old
  // inline section could be hidden by the stage's data-screen CSS rules.
  const stage=root.closest?.('.stage')||document.querySelector('.stage');
  const openButton=document.querySelector('#boss-result-open');
  if(document.body?.appendChild)document.body.appendChild(root);
  let visibleKey='',dismissedKey='',timer=null,events=[],nextIndex=0;
  let finaleTimer=null,finaleStep=0;
  const html=`
   <div class="br-dialog" role="dialog" aria-modal="true" aria-labelledby="br-title"
    aria-describedby="br-subtitle" tabindex="-1">
    <div id="br-finale-screen" class="br-finale-screen" hidden
     aria-label="Persönliche Schlussangriffe" role="status" aria-live="polite">
     <p class="br-finale-eyebrow">⛓️ KETTENBRECHER GESCHAFFT · DAS FINALE</p>
     <strong id="br-finale-name" class="br-finale-name">Die Helden sammeln ihre Kräfte</strong>
     <span id="br-finale-value" class="br-finale-value">⚔️</span>
     <p id="br-finale-hp" class="br-finale-hp"></p>
     <p id="br-finale-step" class="br-finale-step"></p>
    </div>
    <div class="br-scroll">
   <header class="br-head">
    <p class="br-eyebrow">✦ DIE 100 TORE · KAMPFABRECHNUNG ✦</p>
    <h2 id="br-title">🏆 Kampf abgeschlossen</h2>
    <p id="br-subtitle"></p>
   </header>
   <div class="br-metrics">
    <article class="br-boss-metric"><span>🐉 BOSS · RESTLICHE LP</span>
     <strong id="br-boss-hp"></strong><div class="br-bar"><span id="br-boss-fill"></span></div>
     <small id="br-boss-detail"></small>
    </article>
    <article class="br-team-metric"><span>❤️ HELDEN · VERBLEIBENDE LP</span>
     <strong id="br-team-hp"></strong><div class="br-bar"><span id="br-team-fill"></span></div>
     <small id="br-damage-total"></small>
    </article>
   </div>
   <div class="br-grid">
    <section class="br-panel br-participants">
     <h3>🛡️ Lebenspunkte aller Kämpfer</h3>
     <div id="br-hero-vitals" class="br-hero-vitals"></div>
    </section>
    <section class="br-panel">
     <h3>🎮 Minispiel-Gesamtwertung</h3>
     <div class="br-score-main"><strong id="br-score-value"></strong><span id="br-score-grade"></span></div>
     <div class="br-grade-scale" role="img" aria-label="Leistungsskala von schlecht bis Maximum">
      <span id="br-grade-indicator"></span>
     </div>
     <div class="br-scale-words"><span>Schwach</span><span>Ordentlich</span><span>Gut</span><span>Sehr gut</span><span>Maximum</span></div>
     <p id="br-score-detail" class="br-muted"></p>
     <div id="br-rounds" class="br-rounds"></div>
    </section>
   </div>
   <section class="br-panel br-attacks">
    <h3>⚔️ Angriffe und persönliche Ergebnisse</h3>
    <div class="br-table-scroll"><table>
     <thead><tr><th>Held</th><th>Angriffstreffer</th><th>Erhalten</th><th>Minispiele</th><th>LP am Ende</th></tr></thead>
     <tbody id="br-attack-rows"></tbody>
    </table></div>
    <p class="br-muted" id="br-attack-note">Treffer aus den Zwischensequenzen. Der verbindliche Endschaden wird separat serverseitig ermittelt.</p>
    <details class="br-attack-details" id="br-strike-details">
     <summary>📜 Jeden Einzelangriff ansehen</summary>
     <div class="br-table-scroll"><table>
      <thead><tr><th>Runde</th><th>Angreifer</th><th>Ziel</th><th>Treffer</th></tr></thead>
      <tbody id="br-strike-rows"></tbody>
     </table></div>
    </details>
    <div class="br-final-damage"><span>💥 Endgültiger Teamschaden</span><strong id="br-final-damage"></strong></div>
   </section>
   <section class="br-panel br-advice">
    <h3 id="br-advice-title">🧭 So werdet ihr stärker</h3>
    <div id="br-advice-lines"></div>
   </section>
   <section class="br-panel br-replay-panel">
    <div class="br-replay-head">
     <div><h3>🎬 Kampf noch einmal ansehen</h3>
      <p class="br-muted">Komprimierte Wiederholung der bestätigten Einzelangriffe · keine erneuten Minispiele</p></div>
     <button id="br-replay-start" type="button">▶ Kampf-Highlights abspielen</button>
    </div>
    <div class="br-replay-stage" id="br-replay-stage" data-replay-state="idle" data-hit-kind="none" data-gate="10" aria-label="Kampfwiederholung">
     <div class="br-replay-boss"><span class="br-replay-boss-art">🐉</span><strong id="br-replay-boss-name">Boss</strong></div>
     <div class="br-replay-center"><span id="br-replay-icon">⚔️</span>
      <strong id="br-replay-hit">Bereit zur Wiederholung</strong></div>
     <div class="br-replay-heroes" id="br-replay-heroes"></div>
     <div class="br-replay-caption" id="br-replay-caption" role="status" aria-live="polite">Wiederholung aus den bestätigten Treffern.</div>
    </div>
    <div class="br-replay-meter"><span id="br-replay-progress"></span></div>
   </section>
    </div>
   <div class="br-footer">
    <span class="br-footer-caption">Die Schlusswertung bleibt geöffnet, bis du bestätigst.</span>
    <button type="button" id="br-return">✓ Bestätigen</button>
   </div>
   </div>`;
  root.innerHTML=html;
  root.setAttribute?.('aria-live','off');
  const dialog=root.querySelector?.('.br-dialog');
  const setOpen=(opened)=>{
   root.hidden=!opened;
   stage?.classList?.toggle('boss-result-open',opened);
   document.body?.classList?.toggle('dog-boss-report-visible',opened);
   if(openButton)openButton.hidden=opened;
   if(opened)dialog?.focus?.({preventScroll:true});
  };
  // Closing by Escape, backdrop, timers or document clicks is intentionally
  // unsupported. Confirmation is the only way to dismiss this result.
  root.addEventListener?.('keydown',event=>{
   if(root.hidden||event.key!=='Tab')return;
   const targets=[...(dialog?.querySelectorAll?.(
    'button:not([disabled]),a[href],summary,[tabindex="0"]')||[])];
   const focusable=targets.filter(el=>!el.hidden&&el.offsetParent!==null);
   if(!focusable.length)return;
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){
    event.preventDefault();last.focus?.();
   }else if(!event.shiftKey&&document.activeElement===last){
    event.preventDefault();first.focus?.();
   }
  });
  const node=id=>$(root,id);
  const make=(tag,className,value)=>{
   const item=document.createElement(tag);
   if(className)item.className=className;
   if(value!==undefined)item.textContent=String(value);
   return item;
  };
  const fmtHp=(hp,max)=>hp===null?'Nicht verfügbar':
   fmt.format(hp)+' / '+fmt.format(max)+' LP';
  const bar=(parent,percent)=>{
   const meter=make('div','br-bar');const fill=make('span');
   fill.style.width=clamp(percent,0,100)+'%';
   meter.append(fill);parent.append(meter);
  };
  function clearFinale(){
   if(finaleTimer!==null){clearInterval(finaleTimer);finaleTimer=null;}
   const screen=node('br-finale-screen');
   if(screen)screen.hidden=true;
   root.dataset.finale='finished';
   node('br-return').disabled=false;
   node('br-replay-start').disabled=!events.length;
  }
  function startFinale(report){
   const strikes=report.finale?.strikes||[];
   if(!strikes.length)return;
   clearFinale();
   root.dataset.finale='running';
   node('br-finale-screen').hidden=false;
   node('br-return').disabled=true;
   node('br-replay-start').disabled=true;
   finaleStep=0;
   const display=()=>{
    if(finaleStep<strikes.length){
     const strike=strikes[finaleStep];
     const name=report.rows.find(r=>r.uid===strike.uid)?.name||'Held';
     text(node('br-finale-name'),'⚔️ '+name+' trifft den Boss!');
     text(node('br-finale-value'),'−'+fmt.format(strike.amount)+' LP');
     text(node('br-finale-hp'),'Boss-LP: '+
      fmt.format(strike.hpBefore)+' → '+fmt.format(strike.hpAfter)+
      (strike.overkillDamage>0?' · '+fmt.format(strike.overkillDamage)+
       ' LP Übertreffer':''));
     text(node('br-finale-step'),'Schlussangriff '+(finaleStep+1)+
      ' / '+strikes.length);
     finaleStep++;return;
    }
    if(finaleStep===strikes.length){
     text(node('br-finale-name'),report.result.win?
      '🏆 SIEG! DER BOSS IST BESIEGT':'💀 NIEDERLAGE! DER BOSS HAT ÜBERLEBT');
     text(node('br-finale-value'),report.result.win?'🏆':'🛡️');
     text(node('br-finale-hp'),'Endstand: '+
      fmt.format(report.result.bossRemaining)+' Boss-LP');
     text(node('br-finale-step'),'Serverbestätigte Schlusswertung');
     finaleStep++;return;
    }
    clearFinale();
   };
   display();
   finaleTimer=setInterval(display,1500);
  }
  const ended=()=>{
   if(timer!==null){clearInterval(timer);timer=null;}
   node('br-replay-start').textContent='↻ Highlights erneut abspielen';
   node('br-replay-stage').dataset.replayState='idle';
  };
  function showStrike(event){
   const field=node('br-replay-stage');
   const final=['team-finisher','hero-finisher'].includes(event.kind);
   const personal=event.kind==='hero-finisher';
   const guard=event.kind==='boss-guard';
   field.dataset.hitKind=guard?'guard':final?'final':
    event.kind==='boss-strike'?'boss':'hero';
   field.dataset.replayState='playing';
   const target=event.kind==='boss-strike'?'🛡️ '+event.name:'🐉 Boss';
   const label=guard?'🛡️ +'+fmt.format(-event.amount)+' Boss-LP':
    event.blocked?'BLOCK!':'−'+fmt.format(event.amount)+' LP';
   text(node('br-replay-icon'),guard?'🛡️':final?'⚡':
    event.kind==='boss-strike'?'🔥':'⚔️');
   text(node('br-replay-hit'),label);
   text(node('br-replay-caption'),
    (guard?'🛡️ Der Boss wehrt durch Glück einen Teil des Schadens ab':
     personal?'⚡ Persönlicher Schlussangriff von '+event.name:
     final?'⚡ Gemeinsamer Schlussangriff · Glück / Kritisch':
     event.roundTitle+' · '+(event.kind==='boss-strike'?
      'Boss greift '+event.name+' an':event.name+' greift den Boss an'))+
    ' · '+target+(Number.isFinite(Number(event.hpBefore))&&
     Number.isFinite(Number(event.hpAfter))?
      ' · LP '+fmt.format(event.hpBefore)+' → '+fmt.format(event.hpAfter):''));
   const chars=node('br-replay-heroes');
   for(const child of chars.children)child.classList?.toggle(
    'is-active',child.dataset.uid===event.uid);
   field.classList?.remove('br-hit-burst');void field.offsetWidth;
   field.classList?.add('br-hit-burst');
   node('br-replay-progress').style.width=
    Math.round(100*(nextIndex+1)/Math.max(1,events.length))+'%';
  }
  function startReplay(){
   ended();nextIndex=0;
   if(!events.length){
    text(node('br-replay-caption'),'Keine bestätigten Einzeltreffer für die Wiederholung verfügbar.');
    return;
   }
   const tick=()=>{
    if(nextIndex>=events.length){ended();return;}
    showStrike(events[nextIndex]);nextIndex++;
   };
   text(node('br-replay-start'),'■ Wiederholung stoppen');
   tick();timer=setInterval(tick,1350);
  }
  node('br-replay-start').addEventListener('click',()=>{
   if(timer!==null){ended();return;}startReplay();
  });
  node('br-return').addEventListener('click',()=>{
   if(!visibleKey||finaleTimer!==null)return;
   dismissedKey=visibleKey;
   ended();
   setOpen(false);
   openButton?.focus?.({preventScroll:true});
  });
  if(openButton)openButton.addEventListener('click',()=>{
   if(!visibleKey)return;
   dismissedKey='';
   setOpen(true);
  });
  function render(report){
   const {result,rows,score,stages,replay,tips}=report;
   text(node('br-title'),result.win?'🏆 SIEG · '+report.bossName+' BESIEGT':
    '💀 NIEDERLAGE · '+report.bossName+' ÜBERLEBT');
   text(node('br-subtitle'),result.win?
    'Der Sieg wurde vom Server bestätigt. Eure Gruppe hat den Wächter überwunden!':
    'Der Boss hat standgehalten. Eure Leistung wird ausgewertet – mit konkreten Verbesserungsmöglichkeiten.');
   root.dataset.result=result.win?'victory':'defeat';
   text(node('br-boss-hp'),fmtHp(result.bossRemaining,result.bossHp));
   node('br-boss-fill').style.width=(result.bossHp?
    100*result.bossRemaining/result.bossHp:0)+'%';
   text(node('br-boss-detail'),result.win?'Boss besiegt':
    fmt.format(result.bossRemaining)+' LP fehlen zum Sieg');
   text(node('br-team-hp'),fmtHp(report.teamHp,report.teamMax));
   node('br-team-fill').style.width=report.teamMax?
    100*report.teamHp/report.teamMax+'%':'0%';
   text(node('br-damage-total'),'Kampfergebnis: '+(result.win?'Sieg':'Niederlage')+
    (result.critical?' · Seltener kritischer Treffer':'')+
    (report.settlement?' · '+fmt.format(report.settlement.appliedDamage)+
     ' Boss-LP abgezogen'+(report.settlement.overkillDamage>0?
      ' · '+fmt.format(report.settlement.overkillDamage)+' LP Übertreffer':'')+
     (report.settlement.guardRecovered>0?
      ' · '+fmt.format(report.settlement.guardRecovered)+' LP Glücksabwehr':''):'')
   );
   const vitals=node('br-hero-vitals');const attacks=node('br-attack-rows');
   const heroNodes=[],attackNodes=[];
   for(const hero of rows){
    const wrap=make('div','br-vital');
    const header=make('div','br-vital-line');
    header.append(make('strong',null,(hero.heroClass==='magierin'?'✨ ':
     hero.heroClass==='waechter'?'🛡️ ':'⚔️ ')+hero.name),
     make('span',null,hero.fallen?'💀 Gefallen · 0 LP':
      fmtHp(hero.hp,hero.maxHp)));
    wrap.append(header);
    bar(wrap,hero.maxHp&&hero.hp!==null?100*hero.hp/hero.maxHp:0);
    heroNodes.push(wrap);
    const tr=make('tr');
    for(const value of [hero.name,
     fmt.format(hero.attack)+' LP',fmt.format(hero.taken)+' LP',
     hero.possible?fmt.format(hero.correct)+' / '+fmt.format(hero.possible):'—',
     hero.fallen?'💀 Gefallen · 0 LP':fmtHp(hero.hp,hero.maxHp)]){
     tr.append(make('td',null,value));
    }
    attackNodes.push(tr);
   }
   vitals.replaceChildren(...heroNodes);attacks.replaceChildren(...attackNodes);
   const individualHits=replay.map(e=>{
    const tr=make('tr');
    const againstBoss=e.kind!=='boss-strike';
    const personal=e.kind==='hero-finisher';
    const final=e.kind==='team-finisher'||personal;
    const guard=e.kind==='boss-guard';
    for(const v of [guard?'Glücksabwehr':
     personal?'Persönlicher Schlussangriff':final?'Finalschlag':'Runde '+(e.round+1),
     againstBoss?e.name:report.bossName,
     againstBoss?report.bossName:e.name,
     guard?'+'+fmt.format(-e.amount)+' Boss-LP':
      e.blocked?'BLOCK!':'−'+fmt.format(e.amount)+' LP'+
       (final&&e.overkillDamage>0?' (+'+fmt.format(e.overkillDamage)+
        ' Übertreffer)':'')])tr.append(make('td',null,v));
    return tr;
   });
   node('br-strike-rows').replaceChildren(...individualHits);
   node('br-strike-details').hidden=!individualHits.length;
   text(node('br-final-damage'),fmt.format(result.damage)+' LP');
   text(node('br-score-value'),score.percent===null?'–':score.percent+' %');
   text(node('br-score-grade'),score.grade);
   node('br-grade-indicator').style.left=
    clamp(score.percent===null?0:score.percent,0,100)+'%';
   text(node('br-score-detail'),score.max?
    fmt.format(score.correct)+' / '+fmt.format(score.max)+
    ' Aufgaben im Team richtig · reine Minispiel-Leistung (ohne Ausrüstung)'+
    (score.equalWeight?' · 5 Spiele je 20 % gewichtet · '+
     (score.perfect?'PERFEKT!':'100 % nur bei Maximalleistung'):''):
    'Für diesen älteren Kampf sind keine Einzelwertungen verfügbar.');
   const stageNodes=stages.map(s=>{
    const row=make('div','br-round');
    const top=make('div','br-round-top');
    top.append(make('strong',null,s.title),make('span',null,
     s.max?fmt.format(s.correct)+' / '+fmt.format(s.max)+' richtig':'—'));
    const track=make('div','br-mini-track'),fill=make('span');
    fill.style.width=(s.percent||0)+'%';track.append(fill);
    const impact=make('small','br-round-impact',s.kind==='boss-guard'?
     '🛡️ +'+fmt.format(s.restored)+' Boss-LP durch Glücksabwehr':
     s.defensive?'🛡️ '+fmt.format(s.taken)+' LP erlitten':
     '⚔️ '+fmt.format(s.damage)+' LP in den sichtbaren Trefferphasen');
    row.append(top,track,impact);
    if(s.persons?.length){
     const personal=make('div','br-round-personal');
     for(const p of s.persons){
      const details=p.fallen?'💀 ausgefallen':
       s.defensive?(Number.isFinite(p.savedHp)?
        '🛡️ '+fmt.format(p.savedHp)+' LP geschützt':
        '🛡️ '+fmt.format(p.protectionPoints||0)+' Schutzpunkte')+
        (Number.isFinite(p.hit)?' · −'+fmt.format(p.hit)+' LP erhalten':
         ' · Boss-Trefferhistorie offen'):
        (Number.isFinite(p.bonusDamage)?
         '🔥 +'+fmt.format(p.bonusDamage)+' Bonus erspielt · ':'')+
         (Number.isFinite(p.hit)?'⚔️ −'+fmt.format(p.hit)+' Boss-LP':
          '⚔️ Trefferhistorie offen');
      personal.append(make('small','br-round-player',
       p.name+' · '+fmt.format(p.correct)+'/'+fmt.format(p.max)+
       ' richtig · '+details));
     }
     row.append(personal);
    }
    return row;
   });
   node('br-rounds').replaceChildren(...stageNodes);
   node('br-advice-lines').replaceChildren(...tips.map(t=>make('p','br-advice-item',t)));
   const avatars=rows.map(hero=>{
    const el=make('span','br-replay-hero',
     (hero.heroClass==='magierin'?'✨':hero.heroClass==='waechter'?'🛡️':'⚔️')+
     ' '+hero.name);
    el.dataset.uid=hero.uid;return el;
   });
   node('br-replay-heroes').replaceChildren(...avatars);
   text(node('br-replay-boss-name'),report.bossName);
   node('br-replay-stage').dataset.gate=String(report.gate);
   text(node('br-replay-caption'),
    replay.length?replay.length+' bestätigte Angriffsmomente können erneut angesehen werden.':
    'Für ältere Kämpfe sind keine einzelnen Angriffsmomente gespeichert.');
   text(node('br-replay-hit'),'Bereit zur Wiederholung');
   node('br-replay-progress').style.width='0%';
   node('br-replay-start').disabled=!replay.length;
   node('br-replay-start').textContent=replay.length?
    '▶ Kampf-Highlights abspielen':'Keine Treffer verfügbar';
   events=replay;nextIndex=0;
  }
  function update(view){
   const report=model(view);
   if(!report){
    if(visibleKey){ended();clearFinale();}
    visibleKey='';dismissedKey='';
    setOpen(false);
    if(openButton)openButton.hidden=true;
    return;
   }
   if(report.key!==visibleKey){
    ended();clearFinale();visibleKey=report.key;dismissedKey='';
    render(report);
    setOpen(true);
    startFinale(report);
   }else{
    // No clock tick, poll or unchanged server state may close the dialog.
    const show=dismissedKey!==visibleKey;
    if(root.hidden===show)setOpen(show);
   }
  }
  return {update,model};
 }
 window.DogBossResultReport=Object.freeze({create,model,grade});
})();
