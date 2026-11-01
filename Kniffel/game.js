import {CATEGORIES,score,totals,createGame,roll,hold,commit} from './rules.js';import {chooseCategory,botHold} from './bots.js';
const $=id=>document.getElementById(id);
function isFullscreen(){return Boolean(document.fullscreenElement||document.webkitFullscreenElement);}
function showFullscreenStatus(message){
 const notice=$('fullscreen-hint');if(!notice)return;
 notice.hidden=false;notice.textContent=message;
}
function updateFullscreenButton(){
 const active=isFullscreen();
 $('fullscreen').textContent=active?'⛶ Vollbild verlassen':'⛶ Vollbild';
 $('fullscreen').setAttribute('aria-pressed',String(active));
 if(active){$('fullscreen-hint').hidden=true;}
}
async function requestFullscreen(){
 if(isFullscreen())return true;
 showFullscreenStatus('Vollbild wird angefordert …');
 const root=document.documentElement;
 const fn=root.requestFullscreen||root.webkitRequestFullscreen;
 if(typeof fn!=='function'){
  showFullscreenStatus('Dieser Browser bietet hier keine Vollbild-Funktion. Für eine Ansicht ohne Browserleisten Kniffel über das Browsermenü zum Startbildschirm hinzufügen und von dort öffnen.');
  return false;
 }
 try{
  await Promise.resolve(fn.call(root));
  if(isFullscreen()){updateFullscreenButton();return true;}
  showFullscreenStatus('Der Browser hat nicht in den Vollbildmodus gewechselt. Versuche Kniffel als Startbildschirm-App zu öffnen.');
  return false;
 }catch(error){
  console.warn('Kniffel fullscreen rejected',error);
  showFullscreenStatus('Vollbild wurde vom Browser blockiert ('+(error?.name||'nicht unterstützt')+'). Öffne Kniffel über „Zum Startbildschirm hinzufügen“, falls dein Browser diese Option anbietet.');
  return false;
 }
}
$('fullscreen').addEventListener('click',()=>{
 if(isFullscreen()){
  const fn=document.exitFullscreen||document.webkitExitFullscreen;
  if(fn)Promise.resolve(fn.call(document)).catch(error=>showFullscreenStatus('Vollbild konnte nicht verlassen werden: '+error.name));
 }else void requestFullscreen();
});
document.addEventListener('fullscreenchange',updateFullscreenButton);
document.addEventListener('webkitfullscreenchange',updateFullscreenButton);
$('fullscreen-hint').addEventListener('click',()=>{$('fullscreen-hint').hidden=true;});
let game=null;const symbols=['','⚀','⚁','⚂','⚃','⚄','⚅'];const slots=$('slots');for(let i=0;i<4;i++){const div=document.createElement('div');div.className='slot';div.innerHTML='<input aria-label="Spielername" maxlength="20" value="Spieler '+(i+1)+'"><select aria-label="Spielertyp"><option value="human">Mensch</option><option value="bot">Computer</option><option value="off">Nicht dabei</option></select>';div.querySelector('select').value=i===0?'human':i===1?'bot':'off';slots.append(div);}
$('start').onclick=()=>{const players=[...slots.children].map((el,i)=>({name:el.querySelector('input').value.trim()||'Spieler '+(i+1),type:el.querySelector('select').value})).filter(p=>p.type!=='off');if(!players.length){alert('Mindestens einen Spieler auswählen');return;}game=createGame(players);$('setup').hidden=true;$('game').hidden=false;render();runBot();};$('new').onclick=()=>{game=null;$('setup').hidden=false;$('game').hidden=true;};$('roll').onclick=()=>{if(!isHuman())return;try{roll(game);render();}catch(e){message(e.message);}};function isHuman(){return game&&!game.finished&&game.players[game.turn].type==='human';}function message(t){$('notice').textContent=t;}
function render(){const p=game.players[game.turn];$('players').replaceChildren(...game.players.map((player,i)=>{const el=document.createElement('div');el.className='player'+(i===game.turn&&!game.finished?' active':'');el.textContent=(player.type==='bot'?'🤖 ':'👤 ')+player.name+' · '+totals(player.sheet).total+' P.';return el;}));$('status').textContent=game.finished?'🏆 Partie beendet':p.name+' · Wurf '+game.rolls+' / 3';$('dice').replaceChildren(...game.dice.map((n,i)=>{const b=document.createElement('button');b.className='die'+(game.held[i]?' held':'');b.innerHTML=game.rolls?'<span class="pips face-'+n+'">'+Array.from({length:9},(_,k)=>'<i class="pip pip-'+k+'"></i>').join('')+'</span>':'<span class="die-empty">?</span>';b.setAttribute('aria-label','Würfel '+(i+1)+': '+(game.rolls?n:'noch nicht geworfen'));b.disabled=!isHuman()||game.rolls===0||game.rolls===3;b.onclick=()=>{hold(game,i);render();};return b;}));$('roll').disabled=!isHuman()||game.rolls===3;$('sheet').replaceChildren(makeTable());if(game.finished){const max=Math.max(...game.players.map(x=>totals(x.sheet).total));message('🏆 '+game.players.filter(x=>totals(x.sheet).total===max).map(x=>x.name).join(' & ')+' gewinnt mit '+max+' Punkten!');}else message(p.type==='bot'?'Computer überlegt …':game.rolls?'Wertung wählen oder erneut würfeln.':'Jetzt würfeln!');}
function makeTable(){const table=document.createElement('table'),head=document.createElement('tr');['Kategorie',...game.players.map(p=>p.name)].forEach(s=>{const th=document.createElement('th');th.textContent=s;head.append(th);});table.append(head);CATEGORIES.forEach((label,c)=>{const tr=document.createElement('tr'),name=document.createElement('td');name.textContent=label;tr.append(name);game.players.forEach((p,i)=>{const td=document.createElement('td'),v=p.sheet[c];if(v!==null)td.textContent=v;else if(i===game.turn&&isHuman()&&game.rolls>0){const b=document.createElement('button');b.textContent=score(game.dice,c);b.title=label+' eintragen';b.onclick=()=>{commit(game,c);render();runBot();};td.append(b);}else td.textContent='–';tr.append(td);});table.append(tr);});for(const [label,key] of [['Oberer Teil','upper'],['Bonus (63+)','bonus'],['Gesamt','total']]){const tr=document.createElement('tr'),td=document.createElement('td');td.textContent=label;tr.append(td);game.players.forEach(p=>{const td=document.createElement('td');td.textContent=totals(p.sheet)[key];tr.append(td);});table.append(tr);}return table;}
async function runBot(){while(game&&!game.finished&&game.players[game.turn].type==='bot'){const current=game;await new Promise(r=>setTimeout(r,400));if(game!==current)return;roll(game);render();for(let i=1;i<3;i++){await new Promise(r=>setTimeout(r,400));if(game!==current)return;botHold(game);roll(game);render();}await new Promise(r=>setTimeout(r,350));if(game!==current)return;commit(game,chooseCategory(game));render();}}
