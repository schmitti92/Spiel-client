import {CATEGORIES,MODES,scoreForGame,allowedCategories,totals} from './rules.js?v=first-roll-anywhere-2';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),code=String(params.get('room')||'').toUpperCase(),base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
$('online-reload').onclick=()=>window.location.reload();
const valid=/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(code);
$('online-room').textContent='Raum '+(valid?code:'nicht verbunden');
$('online-back').href='./lobby.html'+(valid?'?room='+encodeURIComponent(code)+'&stay=1':'?stay=1');
let snapshot=null,ws=null,busy=false,connecting=false,retryTimer=null,heartbeat=null,viewPlayer=null,lastTurnKey=null,announcedTurnKey=null;
function onlineScore(g,c,j){
 if(g.dice.length===5)return scoreForGame(g,c,j);
 const dice=g.dice,counts=Array.from({length:7},(_,i)=>dice.filter(d=>d===i).length),sum=dice.reduce((a,b)=>a+b,0),unique=new Set(dice);
 const col=g.players[g.turn].sheet[j],face=dice.find(d=>dice.filter(v=>v===d).length>=5);
 if(g.mode==='joker'&&face&&col[11]===50&&col[face-1]!==null&&[8,9,10].includes(c))return [25,30,40][c-8];
 if(c<6)return counts[c+1]*(c+1);
 if(c===6)return Math.max(...counts)>=3?sum:0;
 if(c===7)return Math.max(...counts)>=4?sum:0;
 if(c===8)return counts.some(n=>n>=3)&&counts.filter(n=>n>=2).length>=2?25:0;
 if(c===9)return [[1,2,3,4],[2,3,4,5],[3,4,5,6]].some(seq=>seq.every(n=>unique.has(n)))?30:0;
 if(c===10)return [[1,2,3,4,5],[2,3,4,5,6]].some(seq=>seq.every(n=>unique.has(n)))?40:0;
 if(c===11)return Math.max(...counts)>=6?100:Math.max(...counts)>=5?50:0;
 return sum;
}
function onlineAllowed(g,j){
 if(g.freeEntryActive&&g.rolls>0)return g.players[g.turn].sheet[j].flatMap((v,i)=>v===null?[i]:[]);
 if(g.dice.length===5){const normal=allowedCategories(g,j);const col=g.players[g.turn].sheet[j];return g.rolls>0&&col?.[11]===null&&g.dice.some(d=>g.dice.filter(v=>v===d).length>=5)?[...new Set([...normal,11])]:normal;}
 const col=g.players[g.turn].sheet[j],face=g.dice.find(d=>g.dice.filter(v=>v===d).length>=5);
 if(g.mode==='joker'&&g.rolls>0&&face&&col[11]===50){
  if(col[face-1]===null)return [face-1];
  const lower=col.flatMap((v,i)=>i>=6&&v===null?[i]:[]);
  return lower.length?lower:col.flatMap((v,i)=>v===null?[i]:[]);
 }
 const normal=allowedCategories(g,j);return g.rolls>0&&col?.[11]===null&&g.dice.some(v=>g.dice.filter(x=>x===v).length>=5)?[...new Set([...normal,11])]:normal;
}
// Single source of truth for score-cell presentation and score dialog.
function scoreCellState(g,column,category){
 const col=g?.players?.[g.turn]?.sheet?.[column];
 if(!col||col[category]!==null||g.rolls===0||g.finished)return {kind:'closed',points:0};
 const allowed=onlineAllowed(g,column).includes(category);
 const points=allowed?onlineScore(g,category,column):0;
 if(allowed&&points>0)return {kind:'score',points};
 if(g.rolls>=3)return {kind:'strike',points:0};
 return {kind:'closed',points:0};
}
const user=()=>{const s=window.SpielOnline?.state?.();return s?.status==='online'&&s?.user?.getIdToken?s.user:null};
const status=t=>$('notice').textContent=t;
const current=()=>snapshot?.match?.game==='kniffel'?snapshot.match.kniffel:null;
const jokerLeft=(game,player,key,flag)=>Math.max(0,(game.jokerCount??1)-(player?.jokerUses?.[key]??(player?.[flag]?1:0)));
const countLabel=(label,left)=>label+' · '+left+'×';

function confirmInGame(title,message,onConfirm){
 document.getElementById('online-action-confirm')?.remove();
 const overlay=document.createElement('div');overlay.id='online-action-confirm';overlay.className='score-preview-overlay';
 const card=document.createElement('div');card.className='score-preview-card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','online-action-confirm-title');
 const heading=document.createElement('h2');heading.id='online-action-confirm-title';heading.textContent=title;
 const description=document.createElement('p');description.textContent=message;
 const actions=document.createElement('div');actions.className='score-preview-actions';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Abbrechen';
 const accept=document.createElement('button');accept.type='button';accept.className='score-preview-confirm';accept.textContent='Bestätigen';
 cancel.onclick=()=>overlay.remove();accept.onclick=()=>{overlay.remove();onConfirm()};
 actions.append(cancel,accept);card.append(heading,description,actions);overlay.append(card);document.body.append(overlay);cancel.focus();
}
function confirmScore(label,points,onConfirm){
 document.getElementById('online-score-confirm')?.remove();
 const overlay=document.createElement('div');overlay.id='online-score-confirm';overlay.className='score-preview-overlay';
 const card=document.createElement('div');card.className='score-preview-card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
 const heading=document.createElement('h2');heading.textContent=label;
 const description=document.createElement('p');description.textContent=points+' Punkte eintragen?';
 const actions=document.createElement('div');actions.className='score-preview-actions';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Zurück';
 const accept=document.createElement('button');accept.type='button';accept.textContent='Eintragen';accept.className='score-preview-confirm';
 cancel.onclick=()=>overlay.remove();accept.onclick=()=>{overlay.remove();onConfirm()};
 actions.append(cancel,accept);card.append(heading,description,actions);overlay.append(card);document.body.append(overlay);
 accept.focus();
}

function chooseScore(g,c,column=0){
 document.getElementById('online-score-confirm')?.remove();
 const cellState=scoreCellState(g,column,c);
 const canEnter=cellState.kind==='score';
 const score=cellState.points;
 const overlay=document.createElement('div');overlay.id='online-score-confirm';overlay.className='score-preview-overlay';
 const card=document.createElement('div');card.className='score-preview-card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
 const heading=document.createElement('h2');heading.textContent=CATEGORIES[c];
 const description=document.createElement('p');description.textContent=canEnter?'Wie möchtest du dieses Feld werten?':'Nach dem dritten Wurf kannst du dieses Feld frei streichen.';
 const actions=document.createElement('div');actions.className='score-preview-actions';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Zurück';
 const enter=document.createElement('button');enter.type='button';enter.className='score-preview-confirm';enter.textContent=score+' Punkte eintragen';enter.disabled=!canEnter||score===0;if(!canEnter||score===0)enter.hidden=true;
 const strike=document.createElement('button');strike.type='button';strike.textContent='Feld streichen (—)';strike.hidden=g.rolls<3;
 cancel.onclick=()=>overlay.remove();
 enter.onclick=()=>{overlay.remove();send({type:'score',category:c,column})};
 strike.onclick=()=>{overlay.remove();send({type:'score',category:c,column,crossOut:true})};
 actions.append(cancel,enter,strike);card.append(heading,description,actions);overlay.append(card);document.body.append(overlay);enter.focus();
}
let movePick=null;
function clearMovePick(){movePick=null;document.getElementById('move-pick-guide')?.remove();render()}
function chooseMoveJoker(g){
 const player=g.players.find(p=>p.uid===user()?.uid);
 if(!player||player.sheet.length<2)return;
 if(!player.sheet.some(col=>col.some(value=>value!==null))){status('Noch keine Wertung zum Verschieben vorhanden.');return}
 movePick={category:null,fromColumn:null};
 const guide=document.createElement('div');guide.id='move-pick-guide';guide.setAttribute('role','status');
 guide.innerHTML='<strong>🔀 Verschieben / Tauschen</strong><span>Tippe zuerst auf eine eingetragene Wertung im Punkteblock.</span>';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Abbrechen';cancel.onclick=clearMovePick;
 guide.append(cancel);document.body.append(guide);render();
}
function moveCellClick(category,column){
 const g=current(),p=g?.players.find(x=>x.uid===user()?.uid);
 if(!movePick||!p||!g.extraJokers||jokerLeft(g,p,'move','moveUsed')===0)return;
 if(movePick.category===null){
  if(p.sheet[column]?.[category]===null)return;
  movePick={category,fromColumn:column};
  document.querySelector('#move-pick-guide span').textContent='Jetzt in derselben Zeile ein freies oder belegtes Zielfeld antippen.';
  render();return;
 }
 if(category!==movePick.category||column===movePick.fromColumn)return;
 const from=movePick.fromColumn,source=p.sheet[from][category],target=p.sheet[column][category];
 if(source===null)return;
 const overlay=document.createElement('div');overlay.id='online-score-confirm';overlay.className='score-preview-overlay';
 const card=document.createElement('div');card.className='score-preview-card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
 const title=document.createElement('h2');title.textContent=target===null?'🔀 Wertung verschieben':'🔀 Wertungen tauschen';
 const desc=document.createElement('p');desc.textContent=CATEGORIES[category]+': '+MODES[g.mode].columns[from]+' ('+(p.crossedOut?.[from]?.[category]?'gestrichen':source+' Punkte')+') → '+MODES[g.mode].columns[column]+(target===null?' (frei)':' ('+(p.crossedOut?.[column]?.[category]?'gestrichen':target+' Punkte')+')');
 const actions=document.createElement('div');actions.className='score-preview-actions';
 const back=document.createElement('button');back.type='button';back.textContent='Zurück';back.onclick=()=>overlay.remove();
 const yes=document.createElement('button');yes.type='button';yes.className='score-preview-confirm';yes.textContent='Bestätigen';yes.onclick=()=>{overlay.remove();movePick=null;document.getElementById('move-pick-guide')?.remove();send({type:'move-score',category,fromColumn:from,toColumn:column})};
 actions.append(back,yes);card.append(title,desc,actions);overlay.append(card);document.body.append(overlay);yes.focus();
}
function renderCompactScore(g,shownPlayer,viewPlayer,mine){
 const sheet=$('sheet'),col=shownPlayer.sheet[0],sums=totals(col);
 const wrap=document.createElement('div');wrap.className='compact-score wood-score';
 const group=(items)=>{const section=document.createElement('div');section.className='compact-score-group';items.forEach(c=>{
  const row=document.createElement('div');row.className='compact-score-row';
  const label=document.createElement('span');label.className='compact-score-label';label.textContent=CATEGORIES[c];if(c>=0&&c<=5){const die=document.createElement('span');die.className='wood-score-die';die.textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][c];label.prepend(die)}else{const symbol=document.createElement('span');symbol.className='wood-score-icon';symbol.textContent=({6:'🎲',7:'🎲',8:'🎲',9:'🛤️',10:'🛤️',11:'👑',12:'🎲'})[c]||'🎲';label.prepend(symbol)}
  const value=document.createElement('span');value.className='compact-score-value';
  if(col[c]!==null){value.textContent=shownPlayer.crossedOut?.[0]?.[c]?'—':String(col[c]);value.classList.add('score-ink')}
  else if(mine&&viewPlayer===g.turn&&scoreCellState(g,0,c).kind!=='closed'){
   value.textContent='';
   row.classList.add('score-row-action');
   if(scoreCellState(g,0,c).kind==='score')row.classList.add('score-positive-option');
   row.setAttribute('role','button');row.setAttribute('tabindex','0');
   row.setAttribute('aria-label',CATEGORIES[c]+': Wertung auswählen oder streichen');
   const choose=()=>chooseScore(g,c,0);
   row.addEventListener('click',choose);
   row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}});

  }else value.textContent='';
  row.append(label,value);section.append(row);
 });return section};
 const pair=(left,right,titles=null)=>{const grid=document.createElement('div');grid.className='compact-score-pair';const l=group(left),r=group(right);if(titles){[l,r].forEach((section,i)=>{const heading=document.createElement('div');heading.className='wood-score-heading';heading.textContent=titles[i];section.prepend(heading)})}grid.append(l,r);wrap.append(grid)};
 pair([0,1,2],[3,4,5],['Obere Zahlen (1–3)','Obere Zahlen (4–6)']);
 const summary=(label,value,cls='')=>{const row=document.createElement('div');row.className='compact-score-summary '+cls;const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=value;row.append(l,v);wrap.append(row)};
 summary('Oberer Teil (1–6)',sums.upper,'upper');
 summary('⭐ Bonus (ab 63)',sums.bonus,'bonus');
 pair([6,7,8],[9,10,11]);
 const chance=group([12]);chance.classList.add('compact-score-chance');wrap.append(chance);
 if(g.mode==='joker')summary('Jokerbonus',shownPlayer.jokerBonus||0);
 summary('🏆 Gesamtpunktzahl',sums.total+(shownPlayer.jokerBonus||0),'total');
 sheet.append(wrap);
 if(scoreReveal&&viewPlayer===scoreReveal.player){const row=wrap.querySelectorAll('.compact-score-row')[scoreReveal.category];{const cell=row?.querySelector('.compact-score-value');if(cell){cell.classList.add('score-reveal-cell');cell.dataset.scoreReveal=cell.textContent.trim()}}}
}


let scoreReveal=null,scoreRevealTimer=null,heldScorePlayer=null,scoreHoldUntil=0;
let diceMotion=null,diceMotionTimer=null;
function acceptSnapshot(fresh){
 if(snapshot&&Number(fresh.revision)<Number(snapshot.revision))return false;
 const before=current();
 const previousMatchId=snapshot?.match?.id;
 const oldDice=before?.dice?.slice()||[];
 const oldRolls=before?.rolls||0;
 const oldTurn=before?.turn;
 const oldHeld=before?.held?.slice()||[];
 const oldMatch=snapshot?.match?.id;
 snapshot=fresh;
 const next=current();
 if(before&&next&&previousMatchId===snapshot?.match?.id&&oldTurn===next.turn&&oldRolls>0&&next.rolls===0&&next.players?.[next.turn]?.fullRestartUsed){
  diceMotion=null;clearTimeout(diceMotionTimer);
  heldScorePlayer=null;scoreHoldUntil=0;scoreReveal=null;clearTimeout(scoreRevealTimer);
  document.getElementById('online-score-confirm')?.remove();
 }
 // Animate confirmed new rolls on every device; never animate a mere refresh.
 if(before&&next&&previousMatchId===snapshot?.match?.id&&oldTurn===next.turn&&next.rolls>oldRolls&&next.rolls>0){
  const moving=next.dice.map((_,i)=>oldRolls===0||!oldHeld[i]);
  diceMotion={key:[snapshot?.match?.id,next.turn,next.rolls].join(':'),moving};
  clearTimeout(diceMotionTimer);
  diceMotionTimer=setTimeout(()=>{diceMotion=null;document.querySelectorAll('#dice .die.dice-tumbling').forEach(el=>el.classList.remove('dice-tumbling'))},1550);
 }
 // Announce confirmed joker activation to every connected player, not on page load.
 if(before&&next&&oldMatch===snapshot?.match?.id){
  const labels=[['copyRollUsed','Wurf kopieren'],['fullRestartUsed','Kompletter Neustart'],['freeEntryUsed','Freie Eintragung'],['extraRollUsed','+1 Wurf'],['extraDieUsed','+1 Würfel'],['rerollUsed','Neuwurf'],['moveUsed','Verschieben / Tauschen']];
  for(const p of next.players||[]){
   const prev=before.players?.find(q=>q.uid===p.uid);
   if(!prev)continue;
   const usedKeys={copyRollUsed:'copyRoll',fullRestartUsed:'fullRestart',freeEntryUsed:'freeEntry',extraRollUsed:'extraRoll',extraDieUsed:'extraDie',rerollUsed:'reroll',moveUsed:'move'};const activated=labels.find(([key])=>(p.jokerUses?.[usedKeys[key]]??(p[key]?1:0))>(prev.jokerUses?.[usedKeys[key]]??(prev[key]?1:0)));
   if(activated){
    const toast=document.getElementById('kniffel-joker-toast')||document.createElement('div');
    toast.id='kniffel-joker-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
    toast.textContent='🍀 Joker aktiviert! · '+p.name+' · '+activated[1];
    document.body.append(toast);toast.classList.add('visible');
    clearTimeout(window.kniffelJokerToastTimer);
    window.kniffelJokerToastTimer=setTimeout(()=>toast.classList.remove('visible'),3200);
    break;
   }
  }
 }
 if(oldMatch&&oldMatch!==snapshot?.match?.id){heldScorePlayer=null;scoreHoldUntil=0;scoreReveal=null;clearTimeout(scoreRevealTimer);viewPlayer=null;lastTurnKey=null;}
 if(before&&next&&before.turn!==next.turn&&before.players?.length===next.players?.length){
  const old=before.players[before.turn],updated=next.players[before.turn];
  let changed=null;
  if(old&&updated&&old.uid===updated.uid){
   for(let j=0;j<updated.sheet.length;j++)for(let c=0;c<updated.sheet[j].length;c++)
    if(old.sheet[j]?.[c]===null&&updated.sheet[j][c]!==null)changed={column:j,category:c};
  }
  if(changed){
   heldScorePlayer=before.turn;
    scoreHoldUntil=Date.now()+3000;
   scoreReveal={player:before.turn,...changed};
   viewPlayer=before.turn;
   clearTimeout(scoreRevealTimer);
   // The number settles after the animation; the scorecard does NOT switch yet.
   scoreRevealTimer=setTimeout(()=>{scoreReveal=null;heldScorePlayer=null;scoreHoldUntil=0;viewPlayer=current()?.turn??next.turn;render()},3000);
  }else{
   // Undo or another non-scoring turn change must not leave a stale scorecard.
   heldScorePlayer=null;scoreHoldUntil=0;scoreReveal=null;clearTimeout(scoreRevealTimer);
  }
 }
 if(next?.rolls>0&&heldScorePlayer!==null){
  heldScorePlayer=null;scoreHoldUntil=0;scoreReveal=null;clearTimeout(scoreRevealTimer);
  viewPlayer=next.turn;
 }
 return true;
}

// First-roll achievements are derived from dice, independent of available score slots.
let celebratedRollKey='',celebrationTimer=null;
function firstRollAchievements(g){
 if(!g||g.finished||g.rolls!==1)return [];
 const d=g.dice||[],counts=Array.from({length:7},(_,i)=>d.filter(x=>x===i).length),unique=new Set(d);
 const out=[];
 if(counts.some(n=>n>=5))out.push('Kniffel');
 if([[1,2,3,4,5],[2,3,4,5,6]].some(seq=>seq.every(n=>unique.has(n))))out.push('Große Straße');
 else if([[1,2,3,4],[2,3,4,5],[3,4,5,6]].some(seq=>seq.every(n=>unique.has(n))))out.push('Kleine Straße');
 if(counts.some(n=>n>=4))out.push('Viererpasch');
 if(counts.some(n=>n>=3)&&counts.filter(n=>n>=2).length>=2)out.push('Full House');
 return out;
}
function showFirstRollAchievement(g){
 const toast=document.getElementById('first-roll-celebration');
 if(!toast)return;
 if(g?.rolls!==1||g?.finished){toast.hidden=true;return}
 const key=[snapshot?.match?.id||'',g.turn,g.players[g.turn]?.uid,g.rolls,(g.dice||[]).join(',')].join(':');
 if(key===celebratedRollKey)return;
 celebratedRollKey=key;
 const hits=firstRollAchievements(g);
 if(!hits.length){toast.hidden=true;return}
 toast.replaceChildren();
 const title=document.createElement('strong');title.textContent='🎉 Herzlichen Glückwunsch!';
 const detail=document.createElement('span');detail.textContent=hits.join(' · ');
 toast.append(title,detail);toast.hidden=false;
 clearTimeout(celebrationTimer);
 celebrationTimer=setTimeout(()=>{toast.hidden=true},3500);
}
function render(){
 const g=current();
 $('online-connection').textContent=ws?.readyState===1?'🟢 Live':'🟡 Verbinde …';
 $('players').replaceChildren();$('sheet').replaceChildren();$('dice').replaceChildren();$('online-result').replaceChildren();
 if(!g){$('online-undo').disabled=true;$('online-undo-vote')?.remove();$('status').textContent='Warte auf Kniffel-Partie …';$('roll').disabled=true;$('extra-roll-joker').hidden=true;$('extra-die-joker').hidden=true;$('free-entry-joker').hidden=true;$('full-restart-joker').hidden=true;$('copy-roll-joker').hidden=true;$('joker-panel').hidden=true;return}
 const p=g.players[g.turn],mine=!g.finished&&p?.uid===user()?.uid;
 $('online-abort').hidden=!!g.finished;
 $('online-abort').textContent=snapshot?.host?'✕ Spiel abbrechen':'← Spiel verlassen';
 $('online-abort').disabled=busy;
 const vote=g.undoVote,uid=user()?.uid;
 $('online-undo').disabled=busy||!!vote||!g.lastScoredTurn||!g.players.some(p=>p.uid===uid);
 $('online-undo').textContent=vote?'↶ Abstimmung läuft':'↶ Rückgängig';
 let dialog=$('online-undo-vote');
 if(vote){
  if(!dialog){
   dialog=document.createElement('div');dialog.id='online-undo-vote';dialog.className='undo-vote-overlay';
   dialog.innerHTML='<div class="undo-vote-card" role="dialog" aria-modal="true" aria-labelledby="undo-vote-title"><h2 id="undo-vote-title">↶ Letzten Zug zurücknehmen?</h2><p id="undo-vote-detail"></p><div class="undo-vote-actions"><button id="undo-approve">✓ Zustimmen</button><button id="undo-decline">✕ Ablehnen</button></div></div>';
   document.body.append(dialog);
  }
  const requester=g.players.find(p=>p.uid===vote.requester)?.name||'Ein Spieler';
  $('undo-vote-detail').textContent=requester+' möchte die letzte Wertung rückgängig machen. Zustimmung: '+vote.approvals.length+' / '+vote.voters.length+'.';
  const voted=vote.approvals.includes(uid);
  $('undo-approve').disabled=busy||voted||!vote.voters.includes(uid);
  $('undo-approve').textContent=voted?'✓ Zugestimmt':'✓ Zustimmen';
  $('undo-decline').disabled=busy||!vote.voters.includes(uid);
  $('undo-approve').onclick=()=>send({type:'undo-vote',approve:true});
  $('undo-decline').onclick=()=>send({type:'undo-vote',approve:false});
 }else dialog?.remove();
 $('game').classList.toggle('multi-score',p.sheet.length===3);
 const turnKey=(snapshot?.match?.id||'')+':'+g.turn;
if(heldScorePlayer!==null&&g.rolls===0&&Date.now()<scoreHoldUntil){
  viewPlayer=heldScorePlayer;
}else if(viewPlayer===null||lastTurnKey!==turnKey||viewPlayer>=g.players.length){
  viewPlayer=g.turn;
}
lastTurnKey=turnKey;
 const shownPlayer=g.players[viewPlayer];
 // Animate only genuine turn changes, never on ordinary room updates or tab clicks.
 // Skip the first snapshot after opening/reloading the page.
 const announceTurn=!scoreReveal&&announcedTurnKey!==null&&announcedTurnKey!==turnKey&&!g.finished;
 if(!scoreReveal)announcedTurnKey=turnKey;
 if(announceTurn){
   const label=(mine?'🎲 Du bist dran!':'🎲 '+p.name+' ist dran!');
   const banner=$('online-turn-banner');
   banner.textContent=label;
   banner.classList.remove('show');
   void banner.offsetWidth;
   banner.classList.add('show');
   banner.setAttribute('aria-hidden','false');
   banner.addEventListener('animationend',()=>{banner.classList.remove('show');banner.setAttribute('aria-hidden','true')},{once:true});
 }
 const playerTabs=document.createElement('div');playerTabs.className='score-player-tabs';playerTabs.setAttribute('role','group');playerTabs.setAttribute('aria-label','Punkteblock für Spieler auswählen');
 g.players.forEach((player,i)=>{const tab=document.createElement('button');tab.type='button';tab.className='score-player-tab'+(i===viewPlayer?' selected':'');tab.textContent=(player.bot?'🤖 ':'')+player.name;tab.setAttribute('aria-pressed',String(i===viewPlayer));tab.onclick=()=>{if(movePick)return;viewPlayer=i;render()};playerTabs.append(tab)});
 $('sheet').append(playerTabs);
 $('online-mode').textContent='Modus: '+({'classic':'Klassisch','joker':'Joker','triple-free':'Drei Spalten frei','top-down':'Von oben nach unten','bottom-up':'Von unten nach oben','triple-mixed':'Drei Spalten gemischt'}[g.mode]||g.mode);
 g.players.forEach((player,i)=>{const el=document.createElement('div');el.className='player'+(i===g.turn&&!g.finished?' active':'')+(announceTurn&&i===g.turn?' turn-arrived':'');el.textContent=(player.bot?'🤖 ':'👤 ')+player.name+' · '+(player.sheet.reduce((n,col)=>n+totals(col).total,0)+(player.jokerBonus||0))+' P.';$('players').append(el)});
 $('status').textContent=g.finished?'🏆 Partie beendet':p.name+' · Wurf '+g.rolls+' / '+(g.extraRollActive?4:3)+(mine?' · Du bist dran':'');
 showFirstRollAchievement(g);
 g.dice.forEach((n,i)=>{const b=document.createElement('button');b.type='button';b.className='die'+(g.held[i]?' held':'')+(g.rolls===0?' unrolled':'');b.style.setProperty('--die-index',i);if(diceMotion&&diceMotion.key===[snapshot?.match?.id,g.turn,g.rolls].join(':')&&diceMotion.moving[i])b.classList.add('dice-tumbling');if(g.rolls){const face=document.createElement('span');face.className='pips face-'+n;for(let k=0;k<9;k++){const pip=document.createElement('i');pip.className='pip pip-'+k;face.append(pip)}b.append(face)}else{const ready=document.createElement('span');ready.className='die-ready';ready.textContent='?';b.append(ready)}b.dataset.diceValue=g.rolls?String(n):'0';window.KniffelChristmasDice?.decorate(b,g.rolls?n:0);b.setAttribute('aria-label','Würfel '+(i+1)+': '+(g.rolls?n:'noch nicht geworfen'));b.disabled=!mine||busy||!!p.pendingCopy||g.rolls===0||g.rolls>=(g.extraRollActive?4:3);b.onclick=()=>send({type:'hold',index:i});$('dice').append(b)});
 const limit=g.extraRollActive?4:3;
 // Joker-Leiste zeigt immer denselben Spieler wie der aktuell sichtbare Punkteblock.
 const jokerOwner=shownPlayer;
 const jokerMine=jokerOwner?.uid===user()?.uid;
 const joker=$('extra-roll-joker'),dieJoker=$('extra-die-joker');
 joker.hidden=false;
 dieJoker.hidden=false;
 const rerollJoker=$('reroll-joker');rerollJoker.hidden=false;
 const freeJoker=$('free-entry-joker');freeJoker.hidden=false;
 const restartJoker=$('full-restart-joker');restartJoker.hidden=false;
 restartJoker.disabled=!g.extraJokers||!mine||!!p.pendingCopy||busy||g.rolls<1||jokerLeft(g,jokerOwner,'fullRestart','fullRestartUsed')===0;
 restartJoker.classList.toggle('joker-used',jokerLeft(g,jokerOwner,'fullRestart','fullRestartUsed')===0);
 $('full-restart-joker-label').textContent=countLabel('Komplett neu',jokerLeft(g,jokerOwner,'fullRestart','fullRestartUsed'));
 const moveJoker=$('move-score-joker');moveJoker.hidden=false;
 const copyJoker=$('copy-roll-joker');copyJoker.hidden=false;
 // Presentation groups only; gameplay and action IDs remain unchanged.
 for(const [id,group] of [['extra-roll-joker','würfeln'],['extra-die-joker','würfeln'],['reroll-joker','würfeln'],['full-restart-joker','würfeln'],['free-entry-joker','wertung'],['move-score-joker','wertung'],['copy-roll-joker','wertung']]){
  const button=$(id);if(button)button.dataset.jokerGroup=group;
 }
 $('joker-panel').hidden=false;
 $('joker-panel').setAttribute('aria-label','Joker von '+jokerOwner.name);
 $('joker-panel').dataset.player=String(viewPlayer);
 $('joker-panel').title=g.extraJokers?'Joker für diese Partie verfügbar':'Joker wurden in der Lobby für diese Partie nicht aktiviert';
 const copyLeft=Math.max(0,1-(jokerOwner?.jokerUses?.copyRoll??(jokerOwner?.copyRollUsed?1:0)));
 const copying=!!jokerOwner?.pendingCopy;
 copyJoker.disabled=!g.extraJokers||busy||g.finished||!jokerMine||g.players[g.turn]?.uid===jokerOwner?.uid||g.rolls!==3||copyLeft===0||copying;
 copyJoker.classList.toggle('joker-used',copyLeft===0);
 copyJoker.classList.toggle('joker-active',copying);
 copyJoker.title=copying?'Wurf von '+jokerOwner.pendingCopy.sourceName+' für deinen nächsten Zug gespeichert':copyLeft===0?'Alle Kopierjoker verbraucht':g.rolls!==3?'Warte auf den dritten Wurf eines Mitspielers':'Diesen Wurf für deinen nächsten Zug übernehmen';
 $('copy-roll-joker-label').textContent=countLabel(copying?'Wurf gespeichert':'Wurf kopieren',copyLeft);
 const copiedTurn=!!p.pendingCopy;
 const leftRoll=jokerLeft(g,jokerOwner,'extraRoll','extraRollUsed');const used=leftRoll===0;
 const available=g.extraJokers&&mine&&!busy&&!copiedTurn&&g.rolls===0&&!used&&!g.extraRollActive;
 joker.disabled=!available;
 joker.classList.toggle('joker-active',!!g.extraRollActive);
 joker.classList.toggle('joker-used',used&&!g.extraRollActive);
 joker.title=g.extraRollActive?'Aktiv: 4 Würfe':used?'Bereits eingesetzt':g.rolls>0?'Nur vor dem ersten Wurf aktivierbar':mine?'Jetzt für 4 Würfe aktivieren':'Nur im eigenen Zug aktivierbar';
 joker.setAttribute('aria-label','Glückswurf-Joker: '+joker.title);
 $('extra-roll-joker-label').textContent=countLabel(g.extraRollActive?'4 Würfe':'+1 Wurf',leftRoll);
 const leftDie=jokerLeft(g,jokerOwner,'extraDie','extraDieUsed');const dieUsed=leftDie===0;
 const dieAvailable=g.extraJokers&&mine&&!busy&&!copiedTurn&&g.rolls===0&&!dieUsed&&!g.extraDieActive;
 dieJoker.disabled=!dieAvailable;
 dieJoker.classList.toggle('joker-active',!!g.extraDieActive);
 dieJoker.classList.toggle('joker-used',dieUsed&&!g.extraDieActive);
 dieJoker.title=g.extraDieActive?'Aktiv: 6 Würfel':dieUsed?'Bereits eingesetzt':g.rolls>0?'Nur vor dem ersten Wurf aktivierbar':mine?'Jetzt mit 6 Würfeln spielen':'Nur im eigenen Zug aktivierbar';
 dieJoker.setAttribute('aria-label','Sechster Würfel: '+dieJoker.title);
 $('extra-die-joker-label').textContent=countLabel(g.extraDieActive?'6 Würfel':'+1 Würfel',leftDie);
 rerollJoker.disabled=!g.extraJokers||!mine||!!p.pendingCopy||busy||g.rolls<1||jokerLeft(g,jokerOwner,'reroll','rerollUsed')===0;
 rerollJoker.classList.toggle('joker-used',jokerLeft(g,jokerOwner,'reroll','rerollUsed')===0);
 rerollJoker.title=!g.extraJokers?'In der Lobby nicht aktiviert':jokerLeft(g,jokerOwner,'reroll','rerollUsed')===0?'Alle verbraucht':g.rolls<1?'Ab dem ersten Wurf verfügbar':'Alle nicht gehaltenen Würfel neu werfen';
 $('reroll-joker-label').textContent=countLabel('Neuwurf',jokerLeft(g,jokerOwner,'reroll','rerollUsed'));
 const leftFree=jokerLeft(g,jokerOwner,'freeEntry','freeEntryUsed');const freeUsed=leftFree===0;
 freeJoker.disabled=!g.extraJokers||!mine||busy||g.rolls<1||freeUsed||!!g.freeEntryActive;
 freeJoker.classList.toggle('joker-active',!!g.freeEntryActive);
 freeJoker.classList.toggle('joker-used',freeUsed&&!g.freeEntryActive);
 freeJoker.title=g.freeEntryActive?'Aktiv: Ein beliebiges leeres Feld wählen':freeUsed?'Bereits verwendet':!g.extraJokers?'In der Lobby nicht aktiviert':g.rolls<1?'Erst nach dem ersten Wurf aktivierbar':'Alle noch leeren Felder freigeben';
 $('free-entry-joker-label').textContent=countLabel(g.freeEntryActive?'Freie Wahl aktiv':'Freie Eintragung',leftFree);
 const ownPlayer=jokerOwner;
 const movePossible=ownPlayer?.sheet?.length>1&&ownPlayer.sheet.some((col,j)=>col.some((value,c)=>value!==null&&ownPlayer.sheet.some((target,k)=>k!==j&&true)));
 moveJoker.disabled=!g.extraJokers||busy||g.finished||!jokerMine||!ownPlayer||jokerLeft(g,ownPlayer,'move','moveUsed')===0||!movePossible;
 moveJoker.classList.toggle('joker-used',jokerLeft(g,ownPlayer,'move','moveUsed')===0);
 moveJoker.title=jokerLeft(g,ownPlayer,'move','moveUsed')===0?'Alle verbraucht':!g.extraJokers?'In der Lobby nicht aktiviert':!movePossible?'Keine eingetragene Wertung vorhanden':'Wertungen zwischen Spalten verschieben oder tauschen';
 $('move-score-joker-label').textContent=countLabel('Verschieben / Tauschen',jokerLeft(g,ownPlayer,'move','moveUsed'));
 $('roll').disabled=!mine||busy||!!p.pendingCopy||g.rolls>=limit;
 if(['classic','joker'].includes(g.mode)&&shownPlayer.sheet.length===1){renderCompactScore(g,shownPlayer,viewPlayer,mine)}else{
 const table=document.createElement('table');if(!['classic','joker'].includes(g.mode))table.className='variant-table wood-variant-table';
 const head=document.createElement('tr');head.className='score-head';
 const categoryHead=document.createElement('th');categoryHead.textContent='Kategorie';categoryHead.rowSpan=2;head.append(categoryHead);
 {const th=document.createElement('th');th.textContent=shownPlayer.name;th.colSpan=shownPlayer.sheet.length;th.className='score-player-head';head.append(th)}
 table.append(head);
 const directions=document.createElement('tr');directions.className='score-directions';
 const symbol={Aufwärts:'↑',Abwärts:'↓',Frei:'='};
 [[shownPlayer,viewPlayer]].forEach(([player,i])=>MODES[g.mode].columns.forEach((column,j)=>{const th=document.createElement('th');const icon=symbol[column]||'=';th.textContent=icon;th.title=player.name+' – '+(column==='Aufwärts'?'von unten nach oben':column==='Abwärts'?'von oben nach unten':'freie Reihenfolge');th.setAttribute('aria-label',th.title);th.className='score-direction';directions.append(th)}));
 table.append(directions);
 CATEGORIES.forEach((label,c)=>{const tr=document.createElement('tr');tr.className='score-category'+(c===6?' score-section-start':'');const name=document.createElement('td');name.className='score-label';name.textContent=label;tr.append(name);[[shownPlayer,viewPlayer]].forEach(([player,i])=>player.sheet.forEach((col,j)=>{const td=document.createElement('td');td.className='score-player-cell'+(i===g.turn&&!g.finished?' score-current-player':'');const value=col[c];if(movePick&&player.uid===user()?.uid&&j<player.sheet.length&&(movePick.category===null?value!==null:c===movePick.category)){td.classList.add('move-pick-cell');if(movePick.category===c&&movePick.fromColumn===j)td.classList.add('move-pick-source');if(movePick.category===null||j!==movePick.fromColumn){td.setAttribute('role','button');td.tabIndex=0;td.onclick=()=>moveCellClick(c,j);td.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();moveCellClick(c,j)}}}}if(value!==null){td.textContent=player.crossedOut?.[j]?.[c]?'—':String(value);td.classList.add('score-ink')}else if(!movePick&&mine&&i===g.turn&&scoreCellState(g,j,c).kind!=='closed'){td.textContent='';td.classList.add('score-open','score-row-action');if(scoreCellState(g,j,c).kind==='score')td.classList.add('score-positive-option');td.setAttribute('role','button');td.tabIndex=0;const choose=()=>chooseScore(g,c,j);td.onclick=choose;td.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}}}else td.textContent='';tr.append(td)}));table.append(tr)});
 for(const [label,key] of [['Oberer Teil','upper'],['Bonus (63+)','bonus'],['Gesamt','total']]){const tr=document.createElement('tr');tr.className='score-summary score-'+key;const td=document.createElement('td');td.textContent=label;tr.append(td);[[shownPlayer,viewPlayer]].forEach(([player,i])=>player.sheet.forEach(col=>{const cell=document.createElement('td');const sums=totals(col);cell.textContent=key==='bonus'&&sums.upper<63?sums.upper+' / 63':key==='total'?sums.total+(player.jokerBonus||0):sums[key];tr.append(cell)}));table.append(tr)}
 if(g.mode==='joker'){const tr=document.createElement('tr');tr.className='score-summary';const td=document.createElement('td');td.textContent='Jokerbonus';tr.append(td);[[shownPlayer,viewPlayer]].forEach(([player,i])=>{const cell=document.createElement('td');cell.className='player-tint-'+(i%4);cell.textContent=player.jokerBonus||0;tr.append(cell)});table.append(tr)}
 $('sheet').append(table);
 if(scoreReveal&&viewPlayer===scoreReveal.player){const cell=table.rows[scoreReveal.category+2]?.cells[scoreReveal.column+1];if(cell){cell.classList.add('score-reveal-cell');cell.dataset.scoreReveal=cell.textContent.trim();}}
 }
 $('notice').textContent=g.finished?'Partie beendet':mine&&p.pendingCopy?'📋 Kopierter Wurf von '+p.pendingCopy.sourceName+' – jetzt Wertung eintragen; kein Würfeln erlaubt!':!mine?'Warte auf '+p.name+' …':g.rolls===(g.extraRollActive?4:3)?'Würfe abgeschlossen – Wertung wählen!':g.rolls?'Wertung wählen oder erneut würfeln.':'Jetzt würfeln!';
 if(g.finished){
  const standings=(g.standings?.length?g.standings:g.players.map(p=>({name:p.name,total:p.sheet.reduce((sum,col)=>sum+totals(col).total,0)+(p.jokerBonus||0)}))).slice().sort((a,b)=>b.total-a.total);
  const top=standings[0]?.total;
  const winners=standings.filter(p=>p.total===top);
  const panel=document.createElement('section');panel.className='kniffel-victory';panel.setAttribute('aria-label','Siegerehrung');
  const trophy=document.createElement('div');trophy.className='victory-trophy';trophy.textContent='🏆';panel.append(trophy);
  const title=document.createElement('h2');title.textContent=winners.length>1?'Unentschieden!':'Herzlichen Glückwunsch!';panel.append(title);
  const champion=document.createElement('p');champion.className='victory-winner';champion.textContent=winners.map(p=>p.name).join(' & ')+(winners.length>1?' teilen sich den Sieg!':' gewinnt!');panel.append(champion);
  const podium=document.createElement('div');podium.className='victory-podium';
  standings.forEach((p,i)=>{const line=document.createElement('div');line.className='victory-standing'+(p.total===top?' winner':'');const rank=document.createElement('span');rank.textContent=['🥇','🥈','🥉'][i]||String(i+1)+'.';const name=document.createElement('strong');name.textContent=p.name;const points=document.createElement('b');points.textContent=p.total+' Punkte';line.append(rank,name,points);podium.append(line)});
  panel.append(podium);
  const actions=document.createElement('div');actions.className='victory-actions';
  const lobbyUrl='./lobby.html?room='+encodeURIComponent(code)+'&stay=1';
  const again=document.createElement('button');again.type='button';again.textContent='🎲 Neustart';again.onclick=async()=>{if(!snapshot?.host){location.assign(lobbyUrl);return}if(busy)return;busy=true;again.disabled=true;try{await request('/finish',{});location.assign(lobbyUrl)}catch(e){status('Neustart fehlgeschlagen: '+e.message);busy=false;again.disabled=false}};
  const lobby=document.createElement('a');lobby.href=lobbyUrl;lobby.textContent='← Zur Lobby';
  const selection=document.createElement('a');selection.href='../spielauswahl-online.html?room='+encodeURIComponent(code)+'&stay=1';selection.textContent='🎮 Spielauswahl';
  actions.append(again,lobby,selection);panel.append(actions);
  const hint=document.createElement('p');hint.className='victory-hint';hint.textContent='Neustart öffnet die Lobby, um die nächste Partie gemeinsam zu starten.';panel.append(hint);
  $('online-result').append(panel);
 }
}
async function request(path,body=null){const u=user();if(!u)throw Error('Bitte zuerst online anmelden');const token=await u.getIdToken(),res=await fetch(base+'/api/hub/rooms/'+encodeURIComponent(code)+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'SERVER_ERROR');return data.room}
async function refresh(){if(!valid||!user())return;try{const fresh=await request('');if(acceptSnapshot(fresh))render()}catch(e){status('Raum nicht verfügbar: '+e.message)}}
async function send(action){const g=current();if(!g||busy)return;busy=true;render();try{const fresh=await request('/kniffel/action',{matchId:snapshot.match.id,revision:g.revision,action});acceptSnapshot(fresh);if(action.type==='full-restart'){const updated=current();if(!updated||updated.rolls!==0||updated.dice?.length!==5||updated.held?.some(Boolean)||updated.extraDieActive||updated.extraRollActive){throw Error('Neustart nicht bestätigt – Spielzustand erneut laden');}status('🔄 Neustart erfolgreich: 5 Würfel freigegeben, wieder 3 Würfe verfügbar!');}else status('Aktion bestätigt');render()}catch(e){status('Aktion abgelehnt: '+e.message);await refresh()}finally{busy=false;render()}}
$('online-abort').onclick=async()=>{
 const host=!!snapshot?.host;
 const msg=host?'Laufendes Kniffel-Spiel für alle Spieler abbrechen? Die aktuelle Partie wird beendet.':'Laufendes Spiel verlassen? Die Partie der anderen Spieler wird dadurch nicht beendet.';
 confirmInGame(host?'Spiel abbrechen?':'Spiel verlassen?',msg,async()=>{
 if(!host){location.assign('./lobby.html?room='+encodeURIComponent(code)+'&stay=1');return}
 if(busy)return;busy=true;$('online-abort').disabled=true;
 try{await request('/cancel',{});location.assign('./lobby.html?room='+encodeURIComponent(code)+'&stay=1')}
 catch(e){busy=false;$('online-abort').disabled=false;status('Abbrechen fehlgeschlagen: '+e.message)}
 });
};
$('online-undo').onclick=()=>send({type:'undo-request'});
$('roll').onclick=()=>send({type:'roll'});
$('extra-roll-joker').onclick=()=>send({type:'extra-roll'});
$('extra-die-joker').onclick=()=>send({type:'extra-die'});
$('reroll-joker').onclick=()=>send({type:'reroll'});
$('free-entry-joker').onclick=()=>send({type:'free-entry'});
$('copy-roll-joker').onclick=()=>{
 const g=current(),p=g?.players[g.turn];
 if(!g||!p)return;
 confirmInGame('📋 Wurf kopieren','Den dritten Wurf von '+p.name+' übernehmen? Die Würfel werden gespeichert und ersetzen deinen nächsten Spielzug vollständig.',()=>send({type:'copy-roll'}));
};
$('full-restart-joker').onclick=()=>confirmInGame('🔄 Komplettneuwurf','Alle bisherigen Würfe dieses Zuges verwerfen und mit 5 Würfeln sowie 3 Würfen neu starten?',()=>send({type:'full-restart'}));
$('move-score-joker').onclick=()=>{const g=current();if(g)chooseMoveJoker(g)};
async function connect(){if(!valid||!user()||ws||connecting||document.hidden)return;connecting=true;try{const socket=new WebSocket(base.replace(/^http/i,'ws')+'/hub');ws=socket;socket.onopen=async()=>{try{const token=await user().getIdToken();if(ws===socket){socket.send(JSON.stringify({type:'subscribe',code,profileIdToken:token}));heartbeat=setInterval(()=>{if(ws===socket&&socket.readyState===1)socket.send(JSON.stringify({type:'ping'}))},30000)}}catch(_){socket.close()}};socket.onmessage=e=>{let msg;try{msg=JSON.parse(e.data)}catch(_){return}if(msg.type==='room'&&msg.room?.code===code){if(acceptSnapshot(msg.room)){render();status('Raum synchronisiert')}}if(msg.type==='error')status('Verbindung: '+msg.error)};socket.onclose=()=>{if(heartbeat){clearInterval(heartbeat);heartbeat=null}if(ws===socket)ws=null;render();if(!document.hidden)retryTimer=setTimeout(connect,4500)};socket.onerror=()=>socket.close()}catch(e){status(e.message)}finally{connecting=false}}
if(!valid)status('Bitte Kniffel über die Online-Spielauswahl mit einem gültigen Raum öffnen.');
else{const boot=async()=>{if(!user())return;await refresh();connect()};boot();window.addEventListener('spielonline-change',boot);document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();connect()}else if(ws){ws.close();ws=null}})}
