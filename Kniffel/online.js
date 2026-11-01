import {CATEGORIES,MODES,scoreForGame,allowedCategories,totals} from './rules.js';
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
 if(c===11)return Math.max(...counts)>=5?50:0;
 return sum;
}
function onlineAllowed(g,j){
 if(g.dice.length===5)return allowedCategories(g,j);
 const col=g.players[g.turn].sheet[j],face=g.dice.find(d=>g.dice.filter(v=>v===d).length>=5);
 if(g.mode==='joker'&&g.rolls>0&&face&&col[11]===50){
  if(col[face-1]===null)return [face-1];
  const lower=col.flatMap((v,i)=>i>=6&&v===null?[i]:[]);
  return lower.length?lower:col.flatMap((v,i)=>v===null?[i]:[]);
 }
 return allowedCategories(g,j);
}
const user=()=>{const s=window.SpielOnline?.state?.();return s?.status==='online'&&s?.user?.getIdToken?s.user:null};
const status=t=>$('notice').textContent=t;
const current=()=>snapshot?.match?.game==='kniffel'?snapshot.match.kniffel:null;
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
 const score=onlineScore(g,c,column);
 const overlay=document.createElement('div');overlay.id='online-score-confirm';overlay.className='score-preview-overlay';
 const card=document.createElement('div');card.className='score-preview-card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
 const heading=document.createElement('h2');heading.textContent=CATEGORIES[c];
 const description=document.createElement('p');description.textContent='Wie möchtest du dieses Feld werten?';
 const actions=document.createElement('div');actions.className='score-preview-actions';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Zurück';
 const enter=document.createElement('button');enter.type='button';enter.className='score-preview-confirm';enter.textContent=score+' Punkte eintragen';
 const strike=document.createElement('button');strike.type='button';strike.textContent='Feld streichen (—)';
 cancel.onclick=()=>overlay.remove();
 enter.onclick=()=>{overlay.remove();send({type:'score',category:c,column})};
 strike.onclick=()=>{overlay.remove();send({type:'score',category:c,column,crossOut:true})};
 actions.append(cancel,enter,strike);card.append(heading,description,actions);overlay.append(card);document.body.append(overlay);enter.focus();
}
function renderCompactScore(g,shownPlayer,viewPlayer,mine){
 const sheet=$('sheet'),col=shownPlayer.sheet[0],sums=totals(col);
 const wrap=document.createElement('div');wrap.className='compact-score wood-score';
 const group=(items)=>{const section=document.createElement('div');section.className='compact-score-group';items.forEach(c=>{
  const row=document.createElement('div');row.className='compact-score-row';
  const label=document.createElement('span');label.className='compact-score-label';label.textContent=CATEGORIES[c];if(c>=0&&c<=5){const die=document.createElement('span');die.className='wood-score-die';die.textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][c];label.prepend(die)}else{const symbol=document.createElement('span');symbol.className='wood-score-icon';symbol.textContent=({6:'🎲',7:'🎲',8:'🎲',9:'🛤️',10:'🛤️',11:'👑',12:'🎲'})[c]||'🎲';label.prepend(symbol)}
  const value=document.createElement('span');value.className='compact-score-value';
  if(col[c]!==null){value.textContent=shownPlayer.crossedOut?.[0]?.[c]?'—':String(col[c]);value.classList.add('score-ink')}
  else if(mine&&viewPlayer===g.turn&&g.rolls>0&&onlineAllowed(g,0).includes(c)){
   value.textContent='';
   row.classList.add('score-row-action');
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
}

function render(){
 const g=current();
 $('online-connection').textContent=ws?.readyState===1?'🟢 Live':'🟡 Verbinde …';
 $('players').replaceChildren();$('sheet').replaceChildren();$('dice').replaceChildren();$('online-result').replaceChildren();
 if(!g){$('status').textContent='Warte auf Kniffel-Partie …';$('roll').disabled=true;$('extra-roll-joker').hidden=true;$('extra-die-joker').hidden=true;$('joker-panel').hidden=true;return}
 const p=g.players[g.turn],mine=!g.finished&&p?.uid===user()?.uid;
 $('game').classList.toggle('multi-score',p.sheet.length===3);
 const turnKey=(snapshot?.match?.id||'')+':'+g.turn;
 if(viewPlayer===null||lastTurnKey!==turnKey||viewPlayer>=g.players.length){viewPlayer=g.turn;lastTurnKey=turnKey}
 const shownPlayer=g.players[viewPlayer];
 // Animate only genuine turn changes, never on ordinary room updates or tab clicks.
 // Skip the first snapshot after opening/reloading the page.
 const announceTurn=announcedTurnKey!==null&&announcedTurnKey!==turnKey&&!g.finished;
 announcedTurnKey=turnKey;
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
 g.players.forEach((player,i)=>{const tab=document.createElement('button');tab.type='button';tab.className='score-player-tab'+(i===viewPlayer?' selected':'');tab.textContent=(player.bot?'🤖 ':'')+player.name;tab.setAttribute('aria-pressed',String(i===viewPlayer));tab.onclick=()=>{viewPlayer=i;render()};playerTabs.append(tab)});
 $('sheet').append(playerTabs);
 $('online-mode').textContent='Modus: '+({'classic':'Klassisch','joker':'Joker','triple-free':'Drei Spalten frei','top-down':'Von oben nach unten','bottom-up':'Von unten nach oben','triple-mixed':'Drei Spalten gemischt'}[g.mode]||g.mode);
 g.players.forEach((player,i)=>{const el=document.createElement('div');el.className='player'+(i===g.turn&&!g.finished?' active':'')+(announceTurn&&i===g.turn?' turn-arrived':'');el.textContent=(player.bot?'🤖 ':'👤 ')+player.name+' · '+(player.sheet.reduce((n,col)=>n+totals(col).total,0)+(player.jokerBonus||0))+' P.';$('players').append(el)});
 $('status').textContent=g.finished?'🏆 Partie beendet':p.name+' · Wurf '+g.rolls+' / '+(g.extraRollActive?4:3)+(mine?' · Du bist dran':'');
 g.dice.forEach((n,i)=>{const b=document.createElement('button');b.type='button';b.className='die'+(g.held[i]?' held':'')+(g.rolls===0?' unrolled':'');b.style.setProperty('--die-index',i);if(g.rolls){const face=document.createElement('span');face.className='pips face-'+n;for(let k=0;k<9;k++){const pip=document.createElement('i');pip.className='pip pip-'+k;face.append(pip)}b.append(face)}else{const ready=document.createElement('span');ready.className='die-ready';ready.textContent='?';b.append(ready)}b.setAttribute('aria-label','Würfel '+(i+1)+': '+(g.rolls?n:'noch nicht geworfen'));b.disabled=!mine||busy||g.rolls===0||g.rolls>=(g.extraRollActive?4:3);b.onclick=()=>send({type:'hold',index:i});$('dice').append(b)});
 const limit=g.extraRollActive?4:3;
 const joker=$('extra-roll-joker'),dieJoker=$('extra-die-joker');
 joker.hidden=false;
 dieJoker.hidden=false;
 const rerollJoker=$('reroll-joker');rerollJoker.hidden=false;
 $('joker-panel').hidden=false;
 $('joker-panel').title=g.extraJokers?'Joker für diese Partie verfügbar':'Joker wurden in der Lobby für diese Partie nicht aktiviert';
 const used=!!p.extraRollUsed;
 const available=g.extraJokers&&mine&&!busy&&g.rolls===0&&!used&&!g.extraRollActive;
 joker.disabled=!available;
 joker.classList.toggle('joker-active',!!g.extraRollActive);
 joker.classList.toggle('joker-used',used&&!g.extraRollActive);
 joker.title=g.extraRollActive?'Aktiv: 4 Würfe':used?'Bereits eingesetzt':g.rolls>0?'Nur vor dem ersten Wurf aktivierbar':mine?'Jetzt für 4 Würfe aktivieren':'Nur im eigenen Zug aktivierbar';
 joker.setAttribute('aria-label','Glückswurf-Joker: '+joker.title);
 $('extra-roll-joker-label').textContent=g.extraRollActive?'4 Würfe':used?'Verbraucht':'+1 Wurf';
 const dieUsed=!!p.extraDieUsed;
 const dieAvailable=g.extraJokers&&mine&&!busy&&g.rolls===0&&!dieUsed&&!g.extraDieActive;
 dieJoker.disabled=!dieAvailable;
 dieJoker.classList.toggle('joker-active',!!g.extraDieActive);
 dieJoker.classList.toggle('joker-used',dieUsed&&!g.extraDieActive);
 dieJoker.title=g.extraDieActive?'Aktiv: 6 Würfel':dieUsed?'Bereits eingesetzt':g.rolls>0?'Nur vor dem ersten Wurf aktivierbar':mine?'Jetzt mit 6 Würfeln spielen':'Nur im eigenen Zug aktivierbar';
 dieJoker.setAttribute('aria-label','Sechster Würfel: '+dieJoker.title);
 $('extra-die-joker-label').textContent=g.extraDieActive?'6 Würfel':dieUsed?'Verbraucht':'+1 Würfel';
 rerollJoker.disabled=!g.extraJokers||!mine||busy||g.rolls<1||!!p.rerollUsed;
 rerollJoker.classList.toggle('joker-used',!!p.rerollUsed);
 rerollJoker.title=!g.extraJokers?'In der Lobby nicht aktiviert':p.rerollUsed?'Bereits verwendet':g.rolls<1?'Ab dem ersten Wurf verfügbar':'Alle Würfel neu werfen';
 $('reroll-joker-label').textContent=p.rerollUsed?'Verbraucht':'Neuwurf';
 $('roll').disabled=!mine||busy||g.rolls>=limit;
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
 CATEGORIES.forEach((label,c)=>{const tr=document.createElement('tr');tr.className='score-category'+(c===6?' score-section-start':'');const name=document.createElement('td');name.className='score-label';name.textContent=label;tr.append(name);[[shownPlayer,viewPlayer]].forEach(([player,i])=>player.sheet.forEach((col,j)=>{const td=document.createElement('td');td.className='score-player-cell'+(i===g.turn&&!g.finished?' score-current-player':'');const value=col[c];if(value!==null){td.textContent=player.crossedOut?.[j]?.[c]?'—':String(value);td.classList.add('score-ink')}else if(mine&&i===g.turn&&g.rolls>0&&onlineAllowed(g,j).includes(c)){td.textContent='';td.classList.add('score-open','score-row-action');td.setAttribute('role','button');td.tabIndex=0;const choose=()=>chooseScore(g,c,j);td.onclick=choose;td.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}}}else td.textContent='';tr.append(td)}));table.append(tr)});
 for(const [label,key] of [['Oberer Teil','upper'],['Bonus (63+)','bonus'],['Gesamt','total']]){const tr=document.createElement('tr');tr.className='score-summary score-'+key;const td=document.createElement('td');td.textContent=label;tr.append(td);[[shownPlayer,viewPlayer]].forEach(([player,i])=>player.sheet.forEach(col=>{const cell=document.createElement('td');const sums=totals(col);cell.textContent=key==='bonus'&&sums.upper<63?sums.upper+' / 63':key==='total'?sums.total+(player.jokerBonus||0):sums[key];tr.append(cell)}));table.append(tr)}
 if(g.mode==='joker'){const tr=document.createElement('tr');tr.className='score-summary';const td=document.createElement('td');td.textContent='Jokerbonus';tr.append(td);[[shownPlayer,viewPlayer]].forEach(([player,i])=>{const cell=document.createElement('td');cell.className='player-tint-'+(i%4);cell.textContent=player.jokerBonus||0;tr.append(cell)});table.append(tr)}
 $('sheet').append(table);
 }
 $('notice').textContent=g.finished?'Partie beendet':!mine?'Warte auf '+p.name+' …':g.rolls===(g.extraRollActive?4:3)?'Würfe abgeschlossen – Wertung wählen!':g.rolls?'Wertung wählen oder erneut würfeln.':'Jetzt würfeln!';
 if(g.finished){const result=document.createElement('p');result.textContent='🏆 '+(g.standings||[]).map(x=>x.name+': '+x.total+' Punkte').join(' · ');$('online-result').append(result);if(snapshot?.host){const finish=document.createElement('button');finish.type='button';finish.textContent='✓ Partie abschließen und zurück zur Lobby';finish.onclick=async()=>{if(busy)return;busy=true;finish.disabled=true;try{await request('/finish',{});location.assign('./lobby.html?room='+encodeURIComponent(code)+'&stay=1')}catch(e){status('Abschließen fehlgeschlagen: '+e.message);busy=false;finish.disabled=false}};$('online-result').append(finish)}}
}
async function request(path,body=null){const u=user();if(!u)throw Error('Bitte zuerst online anmelden');const token=await u.getIdToken(),res=await fetch(base+'/api/hub/rooms/'+encodeURIComponent(code)+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'SERVER_ERROR');return data.room}
async function refresh(){if(!valid||!user())return;try{const fresh=await request('');if(!snapshot||Number(fresh.revision)>=Number(snapshot.revision)){snapshot=fresh;render()}}catch(e){status('Raum nicht verfügbar: '+e.message)}}
async function send(action){const g=current();if(!g||busy)return;busy=true;render();try{const fresh=await request('/kniffel/action',{matchId:snapshot.match.id,revision:g.revision,action});if(!snapshot||Number(fresh.revision)>=Number(snapshot.revision))snapshot=fresh;status('Aktion bestätigt');render()}catch(e){status('Aktion abgelehnt: '+e.message);await refresh()}finally{busy=false;render()}}
$('roll').onclick=()=>send({type:'roll'});
$('extra-roll-joker').onclick=()=>send({type:'extra-roll'});
$('extra-die-joker').onclick=()=>send({type:'extra-die'});
$('reroll-joker').onclick=()=>send({type:'reroll'});
async function connect(){if(!valid||!user()||ws||connecting||document.hidden)return;connecting=true;try{const socket=new WebSocket(base.replace(/^http/i,'ws')+'/hub');ws=socket;socket.onopen=async()=>{try{const token=await user().getIdToken();if(ws===socket){socket.send(JSON.stringify({type:'subscribe',code,profileIdToken:token}));heartbeat=setInterval(()=>{if(ws===socket&&socket.readyState===1)socket.send(JSON.stringify({type:'ping'}))},30000)}}catch(_){socket.close()}};socket.onmessage=e=>{let msg;try{msg=JSON.parse(e.data)}catch(_){return}if(msg.type==='room'&&msg.room?.code===code){if(!snapshot||Number(msg.room.revision)>=Number(snapshot.revision)){snapshot=msg.room;render();status('Raum synchronisiert')}}if(msg.type==='error')status('Verbindung: '+msg.error)};socket.onclose=()=>{if(heartbeat){clearInterval(heartbeat);heartbeat=null}if(ws===socket)ws=null;render();if(!document.hidden)retryTimer=setTimeout(connect,4500)};socket.onerror=()=>socket.close()}catch(e){status(e.message)}finally{connecting=false}}
if(!valid)status('Bitte Kniffel über die Online-Spielauswahl mit einem gültigen Raum öffnen.');
else{const boot=async()=>{if(!user())return;await refresh();connect()};boot();window.addEventListener('spielonline-change',boot);document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();connect()}else if(ws){ws.close();ws=null}})}
