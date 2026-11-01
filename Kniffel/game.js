import {CATEGORIES,score,totals,createGame,roll,hold,commit} from './rules.js';import {chooseCategory,botHold} from './bots.js';
const $=id=>document.getElementById(id);
let game=null;let pendingScore=null;let celebrationShownFor=null;const activeBotGames=new WeakSet();const symbols=['','⚀','⚁','⚂','⚃','⚄','⚅'];const slots=$('slots');for(let i=0;i<4;i++){const div=document.createElement('div');div.className='slot';div.innerHTML='<input aria-label="Spielername" maxlength="20" value="Spieler '+(i+1)+'"><select aria-label="Spielertyp"><option value="human">Mensch</option><option value="bot">Computer</option><option value="off">Nicht dabei</option></select>';div.querySelector('select').value=i===0?'human':i===1?'bot':'off';slots.append(div);}
$('start').onclick=()=>{const players=[...slots.children].map((el,i)=>({name:el.querySelector('input').value.trim()||'Spieler '+(i+1),type:el.querySelector('select').value})).filter(p=>p.type!=='off');if(!players.length){alert('Mindestens einen Spieler auswählen');return;}pendingScore=null;celebrationShownFor=null;clearTurnChange();game=createGame(players);$('setup').hidden=true;$('game').hidden=false;render();runBot();};$('new').onclick=()=>{pendingScore=null;closeScorePreview();closeCeremony();clearTurnChange();game=null;$('setup').hidden=false;$('game').hidden=true;};$('roll').onclick=()=>{if(!isHuman())return;try{roll(game);render(true);}catch(e){message(e.message);}};function isHuman(){return game&&!game.finished&&game.players[game.turn].type==='human';}function message(t){$('notice').textContent=t;}
function render(animate=false){const p=game.players[game.turn];$('players').replaceChildren(...game.players.map((player,i)=>{const el=document.createElement('div');el.className='player'+(i===game.turn&&!game.finished?' active':'');el.textContent=(player.type==='bot'?'🤖 ':'👤 ')+player.name+' · '+totals(player.sheet).total+' P.';return el;}));$('status').textContent=game.finished?'🏆 Partie beendet':p.name+' · Wurf '+game.rolls+' / 3';$('dice').replaceChildren(...game.dice.map((n,i)=>{const b=document.createElement('button');b.className='die'+(game.held[i]?' held':'')+(animate&&!game.held[i]?' just-rolled':'')+(game.rolls===0?' unrolled':'');b.style.setProperty('--die-index',i);b.innerHTML=game.rolls?'<span class="pips face-'+n+'">'+Array.from({length:9},(_,k)=>'<i class="pip pip-'+k+'"></i>').join('')+'</span>':'<span class="die-ready" aria-hidden="true">?</span>';b.setAttribute('aria-label','Würfel '+(i+1)+': '+(game.rolls?n:'noch nicht geworfen'));b.disabled=!isHuman()||game.rolls===0||game.rolls===3;b.onclick=()=>{if(!isHuman()||game.rolls===0)return;hold(game,i);render();};return b;}));$('roll').disabled=!isHuman()||game.rolls===3;$('sheet').replaceChildren(makeTable());if(game.finished){showCeremony();const max=Math.max(...game.players.map(x=>totals(x.sheet).total));message('🏆 '+game.players.filter(x=>totals(x.sheet).total===max).map(x=>x.name).join(' & ')+' gewinnt mit '+max+' Punkten!');}else message(p.type==='bot'?'Computer überlegt …':game.rolls===3?'Drei Würfe abgeschlossen – wähle jetzt eine Wertung!':game.rolls?'Wertung wählen oder erneut würfeln.':'Jetzt würfeln!');}
function makeTable(){const table=document.createElement('table'),head=document.createElement('tr');['Kategorie',...game.players.map(p=>p.name)].forEach(s=>{const th=document.createElement('th');th.textContent=s;th.className='score-player-head';head.append(th);});table.append(head);head.className='score-head';CATEGORIES.forEach((label,c)=>{const tr=document.createElement('tr'),name=document.createElement('td');tr.className='score-category'+(c===6?' score-section-start':'');name.textContent=label;name.className='score-label';tr.append(name);game.players.forEach((p,i)=>{const td=document.createElement('td'),v=p.sheet[c];td.classList.add('score-player-cell');if(i===game.turn&&!game.finished)td.classList.add('score-current-player');if(v!==null){td.textContent=v;td.classList.add('score-ink');}else if(i===game.turn&&isHuman()&&game.rolls>0){const b=document.createElement('button');b.textContent=score(game.dice,c);b.title=label+' eintragen';b.className='score-choice';b.setAttribute('aria-label',label+': '+b.textContent+' Punkte eintragen');b.onclick=()=>showScorePreview(c);td.append(b);td.classList.add('score-open');}else td.textContent='–';tr.append(td);});table.append(tr);});for(const [label,key] of [['Oberer Teil','upper'],['Bonus (63+)','bonus'],['Gesamt','total']]){const tr=document.createElement('tr'),td=document.createElement('td');tr.className='score-summary score-'+key;td.textContent=label;tr.append(td);game.players.forEach((p,i)=>{const td=document.createElement('td');td.classList.add('score-player-cell');if(i===game.turn&&!game.finished)td.classList.add('score-current-player');td.textContent=key==='bonus'&&totals(p.sheet).upper<63?totals(p.sheet).upper+' / 63':totals(p.sheet)[key];tr.append(td);});table.append(tr);}return table;}
async function runBot(){
 const session=game;
 if(!session||activeBotGames.has(session))return;
 activeBotGames.add(session);
 try{
  while(game===session&&!session.finished&&session.players[session.turn].type==='bot'){
   const current=game,botIndex=game.turn,previous=game.players[botIndex].name;
   await new Promise(r=>setTimeout(r,750));if(game!==current)return;
   roll(game);render(true);
   for(let i=1;i<3;i++){
    await new Promise(r=>setTimeout(r,780));if(game!==current)return;
    botHold(game);roll(game);render(true);
   }
   await new Promise(r=>setTimeout(r,720));if(game!==current)return;
   commit(game,chooseCategory(game));render();
   if(!game.finished)showTurnChange(previous,game.players[game.turn].name);
  }
 }catch(error){if(game===session)message('Computerzug fehlgeschlagen: '+error.message);}
 finally{activeBotGames.delete(session);}
}


// A score is committed only after an explicit confirmation.
function closeScorePreview(){document.getElementById('score-preview')?.remove();pendingScore=null;}
function showScorePreview(category){
 if(!isHuman()||game.rolls===0||game.players[game.turn].sheet[category]!==null)return;
 closeScorePreview();
 const current=game,turn=game.turn,rolls=game.rolls,value=score(game.dice,category);
 pendingScore={current,turn,rolls,category};
 const overlay=document.createElement('div');overlay.id='score-preview';overlay.className='score-preview-overlay';
 overlay.innerHTML='<div class="score-preview-card" role="dialog" aria-modal="true" aria-labelledby="score-preview-title"><div class="score-preview-caption">Wertung eintragen?</div><h2 id="score-preview-title"></h2><div class="score-preview-value"></div><p>Diese Wertung kann danach nicht mehr geändert werden.</p><div class="score-preview-actions"><button type="button" class="score-preview-cancel">Zurück</button><button type="button" class="score-preview-confirm">Eintragen</button></div></div>';
 overlay.querySelector('h2').textContent=CATEGORIES[category];overlay.querySelector('.score-preview-value').textContent=value+' Punkte';
 const cancel=()=>closeScorePreview();overlay.querySelector('.score-preview-cancel').onclick=cancel;
 overlay.onclick=e=>{if(e.target===overlay)cancel();};
 overlay.querySelector('.score-preview-confirm').onclick=()=>{
  if(game!==current||game.turn!==turn||game.rolls!==rolls||!isHuman()||game.players[turn].sheet[category]!==null){closeScorePreview();return;}
  closeScorePreview();try{const previous=game.players[game.turn].name;commit(game,category);render();if(!game.finished)showTurnChange(previous,game.players[game.turn].name);runBot();}catch(e){message(e.message);}
 };
 document.body.append(overlay);overlay.querySelector('.score-preview-confirm').focus();
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pendingScore){e.preventDefault();closeScorePreview();}});

// Turn notifications never block input or interfere with the game state.
let turnNoticeTimeout;
function clearTurnChange(){clearTimeout(turnNoticeTimeout);const status=$('turn-change');if(status)status.hidden=true;}
function showTurnChange(previous,next){
 const status=$('turn-change');if(!status)return;
 status.textContent='✓ '+previous+' fertig · '+next+' ist dran';status.hidden=false;
 clearTimeout(turnNoticeTimeout);turnNoticeTimeout=setTimeout(()=>{status.hidden=true;},2200);
}
function closeCeremony(){document.getElementById('kniffel-ceremony')?.remove();}
function showCeremony(){
 if(!game?.finished||celebrationShownFor===game)return;
 celebrationShownFor=game;
 const sorted=game.players.map((p,i)=>({name:p.name,points:totals(p.sheet).total,index:i})).sort((a,b)=>b.points-a.points);
 const overlay=document.createElement('div');overlay.id='kniffel-ceremony';overlay.className='score-preview-overlay';
 const panel=document.createElement('section');panel.className='score-preview-card kniffel-results';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Endergebnis');
 const title=document.createElement('h2');title.textContent='🏆 Partie beendet';panel.append(title);
 const winners=sorted.filter(p=>p.points===sorted[0].points);const subtitle=document.createElement('p');subtitle.textContent=winners.map(p=>p.name).join(' & ')+(winners.length>1?' teilen sich den Sieg!':' gewinnt!');panel.append(subtitle);
 const list=document.createElement('ol');list.className='kniffel-rankings';let last=null,rank=0;
 sorted.forEach((p,i)=>{if(p.points!==last)rank=i+1;last=p.points;const row=document.createElement('li');row.textContent=rank+'. '+p.name+' — '+p.points+' Punkte';list.append(row);});panel.append(list);
 const actions=document.createElement('div');actions.className='score-preview-actions';const close=document.createElement('button');close.textContent='Punkteblock ansehen';close.onclick=closeCeremony;const again=document.createElement('button');again.textContent='Neue Partie';again.className='score-preview-confirm';again.onclick=()=>{$('new').click();};actions.append(close,again);panel.append(actions);overlay.append(panel);document.body.append(overlay);
}
