import {CATEGORIES,MODES,scoreForGame,allowedCategories,totals} from './rules.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),code=String(params.get('room')||'').toUpperCase(),base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const valid=/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(code);
$('online-room').textContent='Raum '+(valid?code:'nicht verbunden');
$('online-back').href='../spielauswahl-online.html'+(valid?'?room='+encodeURIComponent(code):'');
let snapshot=null,ws=null,busy=false,connecting=false,retryTimer=null,heartbeat=null;
const user=()=>{const s=window.SpielOnline?.state?.();return s?.status==='online'&&s?.user?.getIdToken?s.user:null};
const status=t=>$('online-status').textContent=t;
const current=()=>snapshot?.match?.game==='kniffel'?snapshot.match.kniffel:null;
function render(){
 const g=current(),match=snapshot?.match;
 $('online-connection').textContent=ws?.readyState===1?'🟢 Live':'🟡 Verbindung wird hergestellt';
 $('online-mode').textContent=g?'Modus: '+(g.mode||'classic'):'Warte auf Kniffel';
 const board=$('online-board'),dice=$('online-dice');board.replaceChildren();dice.replaceChildren();$('online-result').replaceChildren();
 if(!g){$('online-turn').textContent=snapshot?.phase==='preparing'?'Warte auf Spielstart':'Keine laufende Kniffel-Partie';$('online-roll').disabled=true;return}
 const player=g.players[g.turn],mine=!!player&&player.uid===user()?.uid&&!g.finished;
 $('online-turn').textContent=g.finished?'Partie beendet':player.name+' · Wurf '+g.rolls+' / 3'+(mine?' · Du bist dran':'');
 for(let i=0;i<5;i++){const b=document.createElement('button');b.type='button';b.textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][g.dice[i]-1];b.className=g.held[i]?'held':'';b.title=g.held[i]?'Würfel freigeben':'Würfel halten';b.disabled=!mine||busy||g.rolls<1||g.rolls>=3;b.onclick=()=>send({type:'hold',index:i});dice.append(b)}
 $('online-roll').disabled=!mine||busy||g.rolls>=3;
 const table=document.createElement('table'),head=document.createElement('tr');
 for(const label of ['Kategorie',...g.players.flatMap(p=>MODES[g.mode].columns.map(c=>p.name+' '+c))]){const th=document.createElement('th');th.textContent=label;head.append(th)}table.append(head);
 for(let c=0;c<13;c++){const tr=document.createElement('tr'),td=document.createElement('td');td.textContent=CATEGORIES[c];tr.append(td);g.players.forEach((p,i)=>p.sheet.forEach((col,j)=>{const cell=document.createElement('td');if(col[c]!==null)cell.textContent=col[c];else if(mine&&i===g.turn&&g.rolls>0&&allowedCategories(g,j).includes(c)){const button=document.createElement('button');button.type='button';button.textContent=scoreForGame(g,c,j);button.disabled=busy;button.onclick=()=>{if(confirm(CATEGORIES[c]+' · '+MODES[g.mode].columns[j]+' mit '+button.textContent+' Punkten eintragen?'))send({type:'score',category:c,column:j})};cell.append(button)}else cell.textContent='–';tr.append(cell)}));table.append(tr)}
 for(const [label,key] of [['Oberer Teil','upper'],['Bonus','bonus'],['Gesamt','total']]){const tr=document.createElement('tr'),td=document.createElement('td');td.textContent=label;tr.append(td);g.players.forEach(p=>p.sheet.forEach(col=>{const cell=document.createElement('td');cell.textContent=totals(col)[key];tr.append(cell)}));table.append(tr)}board.append(table);
 if(g.mode==='joker'){const extra=document.createElement('p');extra.textContent='🎲 Joker-Zusatzpunkte: '+g.players.map(p=>p.name+' '+(p.jokerBonus||0)).join(' · ');board.append(extra)}
 if(g.finished){const p=document.createElement('p');p.textContent='🏆 '+(g.standings||[]).map(x=>x.name+': '+x.total+' Punkte').join(' · ');$('online-result').append(p)}
}
async function request(path,body=null){const u=user();if(!u)throw Error('Bitte zuerst online anmelden');const token=await u.getIdToken(),res=await fetch(base+'/api/hub/rooms/'+encodeURIComponent(code)+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'SERVER_ERROR');return data.room}
async function refresh(){if(!valid||!user())return;try{snapshot=await request('');render()}catch(e){status('Raum nicht verfügbar: '+e.message)}}
async function send(action){const g=current();if(!g||busy)return;busy=true;render();try{snapshot=await request('/kniffel/action',{matchId:snapshot.match.id,revision:g.revision,action});status('Aktion bestätigt');render()}catch(e){status('Aktion abgelehnt: '+e.message);await refresh()}finally{busy=false;render()}}
$('online-roll').onclick=()=>send({type:'roll'});
async function connect(){if(!valid||!user()||ws||connecting||document.hidden)return;connecting=true;try{const socket=new WebSocket(base.replace(/^http/i,'ws')+'/hub');ws=socket;socket.onopen=async()=>{try{const token=await user().getIdToken();if(ws===socket){socket.send(JSON.stringify({type:'subscribe',code,profileIdToken:token}));heartbeat=setInterval(()=>{if(ws===socket&&socket.readyState===1)socket.send(JSON.stringify({type:'ping'}))},30000)}}catch(_){socket.close()}};socket.onmessage=e=>{let msg;try{msg=JSON.parse(e.data)}catch(_){return}if(msg.type==='room'&&msg.room?.code===code){snapshot=msg.room;render();status('Raum synchronisiert')}if(msg.type==='error')status('Verbindung: '+msg.error)};socket.onclose=()=>{if(heartbeat){clearInterval(heartbeat);heartbeat=null}if(ws===socket)ws=null;render();if(!document.hidden)retryTimer=setTimeout(connect,4500)};socket.onerror=()=>socket.close()}catch(e){status(e.message)}finally{connecting=false}}
if(!valid)status('Bitte Kniffel über die Online-Spielauswahl mit einem gültigen Raum öffnen.');
else{const boot=async()=>{if(!user())return;await refresh();connect()};boot();window.addEventListener('spielonline-change',boot);document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();connect()}else if(ws){ws.close();ws=null}})}
