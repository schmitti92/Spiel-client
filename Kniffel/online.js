import {CATEGORIES,MODES,scoreForGame,allowedCategories,totals} from './rules.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),code=String(params.get('room')||'').toUpperCase(),base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const valid=/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(code);
$('online-room').textContent='Raum '+(valid?code:'nicht verbunden');
$('online-back').href='./lobby.html'+(valid?'?room='+encodeURIComponent(code):'');
let snapshot=null,ws=null,busy=false,connecting=false,retryTimer=null,heartbeat=null,viewPlayer=null,lastTurnKey=null,announcedTurnKey=null;
const user=()=>{const s=window.SpielOnline?.state?.();return s?.status==='online'&&s?.user?.getIdToken?s.user:null};
const status=t=>$('notice').textContent=t;
const current=()=>snapshot?.match?.game==='kniffel'?snapshot.match.kniffel:null;
function render(){
 const g=current();
 $('online-connection').textContent=ws?.readyState===1?'🟢 Live':'🟡 Verbinde …';
 $('players').replaceChildren();$('sheet').replaceChildren();$('dice').replaceChildren();$('online-result').replaceChildren();
 if(!g){$('status').textContent='Warte auf Kniffel-Partie …';$('roll').disabled=true;$('extra-roll-joker').hidden=true;return}
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
 const joker=$('extra-roll-joker');
 joker.hidden=!g.extraJokers;
 const used=!!p.extraRollUsed;
 const available=mine&&!busy&&g.rolls===0&&!used&&!g.extraRollActive;
 joker.disabled=!available;
 joker.classList.toggle('joker-active',!!g.extraRollActive);
 joker.classList.toggle('joker-used',used&&!g.extraRollActive);
 joker.title=g.extraRollActive?'Aktiv: 4 Würfe':used?'Bereits eingesetzt':g.rolls>0?'Nur vor dem ersten Wurf aktivierbar':mine?'Jetzt für 4 Würfe aktivieren':'Nur im eigenen Zug aktivierbar';
 joker.setAttribute('aria-label','Glückswurf-Joker: '+joker.title);
 $('extra-roll-joker-label').textContent=g.extraRollActive?'4 Würfe':used?'Verbraucht':'+1 Wurf';
 $('roll').disabled=!mine||busy||g.rolls>=limit;
 const table=document.createElement('table');if(!['classic','joker'].includes(g.mode))table.className='variant-table';
 const head=document.createElement('tr');head.className='score-head';
 const categoryHead=document.createElement('th');categoryHead.textContent='Kategorie';categoryHead.rowSpan=2;head.append(categoryHead);
 {const th=document.createElement('th');th.textContent=shownPlayer.name;th.colSpan=shownPlayer.sheet.length;th.className='score-player-head';head.append(th)}
 table.append(head);
 const directions=document.createElement('tr');directions.className='score-directions';
 const symbol={Aufwärts:'↑',Abwärts:'↓',Frei:'='};
 [[shownPlayer,viewPlayer]].forEach(([player,i])=>MODES[g.mode].columns.forEach((column,j)=>{const th=document.createElement('th');const icon=symbol[column]||'=';th.textContent=icon;th.title=player.name+' – '+(column==='Aufwärts'?'von unten nach oben':column==='Abwärts'?'von oben nach unten':'freie Reihenfolge');th.setAttribute('aria-label',th.title);th.className='score-direction';directions.append(th)}));
 table.append(directions);
 CATEGORIES.forEach((label,c)=>{const tr=document.createElement('tr');tr.className='score-category'+(c===6?' score-section-start':'');const name=document.createElement('td');name.className='score-label';name.textContent=label;tr.append(name);[[shownPlayer,viewPlayer]].forEach(([player,i])=>player.sheet.forEach((col,j)=>{const td=document.createElement('td');td.className='score-player-cell'+(i===g.turn&&!g.finished?' score-current-player':'');const value=col[c];if(value!==null){td.textContent=value;td.classList.add('score-ink')}else if(mine&&i===g.turn&&g.rolls>0&&allowedCategories(g,j).includes(c)){const button=document.createElement('button');button.type='button';button.className='score-choice';button.textContent=scoreForGame(g,c,j);button.title=label+' eintragen';button.onclick=()=>{if(confirm(label+(player.sheet.length>1?' · '+MODES[g.mode].columns[j]:'')+' mit '+button.textContent+' Punkten eintragen?'))send({type:'score',category:c,column:j})};td.append(button);td.classList.add('score-open')}else td.textContent='–';tr.append(td)}));table.append(tr)});
 for(const [label,key] of [['Oberer Teil','upper'],['Bonus (63+)','bonus'],['Gesamt','total']]){const tr=document.createElement('tr');tr.className='score-summary score-'+key;const td=document.createElement('td');td.textContent=label;tr.append(td);[[shownPlayer,viewPlayer]].forEach(([player,i])=>player.sheet.forEach(col=>{const cell=document.createElement('td');const sums=totals(col);cell.textContent=key==='bonus'&&sums.upper<63?sums.upper+' / 63':key==='total'?sums.total+(player.jokerBonus||0):sums[key];tr.append(cell)}));table.append(tr)}
 if(g.mode==='joker'){const tr=document.createElement('tr');tr.className='score-summary';const td=document.createElement('td');td.textContent='Jokerbonus';tr.append(td);[[shownPlayer,viewPlayer]].forEach(([player,i])=>{const cell=document.createElement('td');cell.className='player-tint-'+(i%4);cell.textContent=player.jokerBonus||0;tr.append(cell)});table.append(tr)}
 $('sheet').append(table);
 $('notice').textContent=g.finished?'Partie beendet':!mine?'Warte auf '+p.name+' …':g.rolls===(g.extraRollActive?4:3)?'Würfe abgeschlossen – Wertung wählen!':g.rolls?'Wertung wählen oder erneut würfeln.':'Jetzt würfeln!';
 if(g.finished){const result=document.createElement('p');result.textContent='🏆 '+(g.standings||[]).map(x=>x.name+': '+x.total+' Punkte').join(' · ');$('online-result').append(result)}
}
async function request(path,body=null){const u=user();if(!u)throw Error('Bitte zuerst online anmelden');const token=await u.getIdToken(),res=await fetch(base+'/api/hub/rooms/'+encodeURIComponent(code)+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'SERVER_ERROR');return data.room}
async function refresh(){if(!valid||!user())return;try{const fresh=await request('');if(!snapshot||Number(fresh.revision)>=Number(snapshot.revision)){snapshot=fresh;render()}}catch(e){status('Raum nicht verfügbar: '+e.message)}}
async function send(action){const g=current();if(!g||busy)return;busy=true;render();try{const fresh=await request('/kniffel/action',{matchId:snapshot.match.id,revision:g.revision,action});if(!snapshot||Number(fresh.revision)>=Number(snapshot.revision))snapshot=fresh;status('Aktion bestätigt');render()}catch(e){status('Aktion abgelehnt: '+e.message);await refresh()}finally{busy=false;render()}}
$('roll').onclick=()=>send({type:'roll'});
$('extra-roll-joker').onclick=()=>send({type:'extra-roll'});
async function connect(){if(!valid||!user()||ws||connecting||document.hidden)return;connecting=true;try{const socket=new WebSocket(base.replace(/^http/i,'ws')+'/hub');ws=socket;socket.onopen=async()=>{try{const token=await user().getIdToken();if(ws===socket){socket.send(JSON.stringify({type:'subscribe',code,profileIdToken:token}));heartbeat=setInterval(()=>{if(ws===socket&&socket.readyState===1)socket.send(JSON.stringify({type:'ping'}))},30000)}}catch(_){socket.close()}};socket.onmessage=e=>{let msg;try{msg=JSON.parse(e.data)}catch(_){return}if(msg.type==='room'&&msg.room?.code===code){if(!snapshot||Number(msg.room.revision)>=Number(snapshot.revision)){snapshot=msg.room;render();status('Raum synchronisiert')}}if(msg.type==='error')status('Verbindung: '+msg.error)};socket.onclose=()=>{if(heartbeat){clearInterval(heartbeat);heartbeat=null}if(ws===socket)ws=null;render();if(!document.hidden)retryTimer=setTimeout(connect,4500)};socket.onerror=()=>socket.close()}catch(e){status(e.message)}finally{connecting=false}}
if(!valid)status('Bitte Kniffel über die Online-Spielauswahl mit einem gültigen Raum öffnen.');
else{const boot=async()=>{if(!user())return;await refresh();connect()};boot();window.addEventListener('spielonline-change',boot);document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();connect()}else if(ws){ws.close();ws=null}})}
