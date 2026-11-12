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
  if(!view||!['victory','cooldown'].includes(view.phase)||!view.result||
   !Array.isArray(view.roster)||!view.roster.length)return null;
  const result=view.result,rawStages=view.miniGames?.exchange?.stages;
  const stages=Array.isArray(rawStages)?rawStages.filter(s=>s?.completed):[];
  const strikes=Array.isArray(view.miniGames?.exchange?.strikes)?
   view.miniGames.exchange.strikes.filter(x=>
    x&&Number.isInteger(x.round)&&Number.isFinite(Number(x.amount))&&
    Number.isFinite(Number(x.atMs))):[];
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
   const attacks=strikes.filter(e=>e.uid===hero.uid&&e.kind==='hero-strike');
   const received=strikes.filter(e=>e.uid===hero.uid&&e.kind==='boss-strike');
   return {uid:hero.uid,name:cap(m.name||'Held '+(i+1)),
    heroClass:['krieger','magierin','waechter'].includes(m.heroClass)?
     m.heroClass:'krieger',isMe:!!m.isMe,
    weaponLevel:num(hero.weaponLevel),armorLevel:num(hero.armorLevel),
    attackPower:num(hero.skillPower),destruction:num(hero.skillDestruction),
    defenseSkill:num(hero.skillDefense),guardSkill:num(hero.skillGuard),
    attack:attacks.reduce((n,e)=>n+num(e.amount),0),
    taken:received.reduce((n,e)=>n+num(e.amount),0),
    correct,possible,percentage:possible?Math.round(100*correct/possible):null,
    hp:hp?num(hp.hp):null,maxHp:hp?num(hp.maxHp):null,
    attacks:attacks.length,blocks:received.filter(e=>e.blocked).length};
  });
  const right=rows.reduce((n,r)=>n+r.correct,0);
  const possible=rows.reduce((n,r)=>n+r.possible,0);
  const percent=possible?Math.round(100*right/possible):null;
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
    correct,max,percent:max?Math.round(100*correct/max):null,
    damage:stageHits.filter(e=>e.kind==='hero-strike')
     .reduce((n,e)=>n+num(e.amount),0),
    taken:stageHits.filter(e=>e.kind==='boss-strike')
     .reduce((n,e)=>n+num(e.amount),0),
    defensive:!!s.defensive};
  });
  // Deterministic, read-only highlight sequence; does not replay minigames.
  const replay=strikes
   .filter(e=>view.roster.some(p=>p.uid===e.uid))
   .sort((a,b)=>a.atMs-b.atMs||a.slot-b.slot)
   .map((event,i)=>({
    ...event,name:rows.find(r=>r.uid===event.uid)?.name||'Held',
    amount:num(event.amount),seq:i+1,kind:event.kind,
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
    percent,grade:percent===null?'Nicht verfügbar':grade(percent)},
   teamHp,teamMax,tips:tips.slice(0,4),replay,
   cooldownUntil:num(view.cooldownUntil),key:String(view.gate||10)+':'+
    String(view.startedAt||0)+':'+String(view.attempt||0)+':'+
    String(result.win)+':'+String(finalDamage)};
 }
 function create(root){
  if(!root)return {update(){},model};
  const stage=root.closest?.('.stage')||document.querySelector('.stage');
  const openButton=document.querySelector('#boss-result-open');
  let visibleKey='',dismissedKey='',timer=null,events=[],nextIndex=0;
  const html=`
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
   <div class="br-footer">
    <button type="button" id="br-return">↩ Zur Kampfvorbereitung</button>
    <a id="br-forge" href="./dog-ascension.html">⚒️ Zur Schmiede</a>
    <a id="br-map" href="./dog-tor-map.html">🗺️ Zur 100-Tore-Karte</a>
   </div>`;
  root.innerHTML=html;
  root.setAttribute?.('aria-live','off');
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
  const ended=()=>{
   if(timer!==null){clearInterval(timer);timer=null;}
   node('br-replay-start').textContent='↻ Highlights erneut abspielen';
   node('br-replay-stage').dataset.replayState='idle';
  };
  function showStrike(event){
   const field=node('br-replay-stage');
   field.dataset.hitKind=event.kind==='boss-strike'?'boss':'hero';
   field.dataset.replayState='playing';
   const target=event.kind==='boss-strike'?'🛡️ '+event.name:'🐉 Boss';
   const label=event.blocked?'BLOCK!':'−'+fmt.format(event.amount)+' LP';
   text(node('br-replay-icon'),event.kind==='boss-strike'?'🔥':'⚔️');
   text(node('br-replay-hit'),label);
   text(node('br-replay-caption'),
    event.roundTitle+' · '+(event.kind==='boss-strike'?
     'Boss greift '+event.name+' an':event.name+' greift den Boss an')+
    ' · '+target);
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
   if(!visibleKey)return;
   dismissedKey=visibleKey;ended();root.hidden=true;
   stage?.classList?.remove('boss-result-open');
   if(openButton)openButton.hidden=false;
  });
  if(openButton)openButton.addEventListener('click',()=>{
   if(!visibleKey)return;
   dismissedKey='';root.hidden=false;
   stage?.classList?.add('boss-result-open');
   openButton.hidden=true;
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
    (result.critical?' · Seltener kritischer Treffer':''));
   const vitals=node('br-hero-vitals');const attacks=node('br-attack-rows');
   const heroNodes=[],attackNodes=[];
   for(const hero of rows){
    const wrap=make('div','br-vital');
    const header=make('div','br-vital-line');
    header.append(make('strong',null,(hero.heroClass==='magierin'?'✨ ':
     hero.heroClass==='waechter'?'🛡️ ':'⚔️ ')+hero.name),
     make('span',null,fmtHp(hero.hp,hero.maxHp)));
    wrap.append(header);
    bar(wrap,hero.maxHp&&hero.hp!==null?100*hero.hp/hero.maxHp:0);
    heroNodes.push(wrap);
    const tr=make('tr');
    for(const value of [hero.name,
     fmt.format(hero.attack)+' LP',fmt.format(hero.taken)+' LP',
     hero.possible?fmt.format(hero.correct)+' / '+fmt.format(hero.possible):'—',
     fmtHp(hero.hp,hero.maxHp)]){
     tr.append(make('td',null,value));
    }
    attackNodes.push(tr);
   }
   vitals.replaceChildren(...heroNodes);attacks.replaceChildren(...attackNodes);
   const individualHits=replay.map(e=>{
    const tr=make('tr');
    const againstBoss=e.kind==='hero-strike';
    for(const v of ['Runde '+(e.round+1),againstBoss?e.name:report.bossName,
     againstBoss?report.bossName:e.name,
     e.blocked?'BLOCK!':'−'+fmt.format(e.amount)+' LP'])tr.append(make('td',null,v));
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
    ' Aufgaben im Team richtig · reine Minispiel-Leistung (ohne Ausrüstung)':
    'Für diesen älteren Kampf sind keine Einzelwertungen verfügbar.');
   const stageNodes=stages.map(s=>{
    const row=make('div','br-round');
    const top=make('div','br-round-top');
    top.append(make('strong',null,s.title),make('span',null,
     s.max?fmt.format(s.correct)+' / '+fmt.format(s.max)+' richtig':'—'));
    const track=make('div','br-mini-track'),fill=make('span');
    fill.style.width=(s.percent||0)+'%';track.append(fill);
    const impact=make('small','br-round-impact',s.defensive?
     '🛡️ '+fmt.format(s.taken)+' LP erlitten':
     '⚔️ '+fmt.format(s.damage)+' LP in den sichtbaren Trefferphasen');
    row.append(top,track,impact);return row;
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
   const forge=document.querySelector('#to-forge');
   const map=document.querySelector('#to-map');
   if(forge)node('br-forge').href=forge.href;
   if(map)node('br-map').href=map.href;
   events=replay;nextIndex=0;
  }
  function update(view){
   const report=model(view);
   if(!report){
    if(visibleKey)ended();
    visibleKey='';dismissedKey='';root.hidden=true;
    stage?.classList?.remove('boss-result-open');
    if(openButton)openButton.hidden=true;
    return;
   }
   if(report.key!==visibleKey){
    ended();visibleKey=report.key;dismissedKey='';
    render(report);
   }
   const show=dismissedKey!==visibleKey;
   root.hidden=!show;
   stage?.classList?.toggle('boss-result-open',show);
   if(openButton)openButton.hidden=show;
  }
  return {update,model};
 }
 window.DogBossResultReport=Object.freeze({create,model,grade});
})();
