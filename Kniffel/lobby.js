const $=id=>document.getElementById(id),q=new URLSearchParams(location.search),code=String(q.get('room')||'').toUpperCase(),valid=/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(code),base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');let room=null,ws=null,heartbeat=null,retry=null,busy=false;
$('room').textContent=valid?code:'Kein Raum';$('back').href='../spielauswahl-online.html'+(valid?'?room='+encodeURIComponent(code)+'&stay=1':'?stay=1');
const user=()=>{const s=window.SpielOnline?.state?.();return s?.status==='online'&&s?.profile?.setupComplete!==false&&s?.user?.getIdToken?s.user:null};
const message=t=>$('error').textContent=t;
function render(){const host=!!room?.host,preparing=room?.phase==='preparing'&&room?.game==='kniffel',playing=room?.match?.game==='kniffel'&&room?.phase==='playing',finished=playing&&room.match.status?.phase==='finished';$('slots').replaceChildren();const players=room?.players||[];for(let i=0;i<4;i++){const d=document.createElement('div');d.className='slot';const p=players[i];d.textContent=p?(p.host?'👑 ':'')+(p.testBot?'🤖 ':'👤 ')+p.name+(p.ready?' · Bereit':''):'Platz '+(i+1)+' · frei';$('slots').append(d)}$('mode').disabled=!host||(playing&&!finished)||busy;$('extra-jokers').disabled=!host||(playing&&!finished)||busy;$('joker-count').disabled=!host||(playing&&!finished)||busy;$('choose').disabled=!host||(playing&&!finished)||busy;$('bots').disabled=$('save-bots').disabled=!host||!preparing||busy;$('ready').disabled=!preparing||!players.some(p=>p.me&&p.participating)||busy;$('play').disabled=!playing;$('cancel-game').hidden=!(host&&playing&&!finished);$('cancel-game').disabled=busy;$('ready').textContent=players.find(p=>p.me)?.ready?'Nicht bereit':'Bereit';if(room?.settings?.kniffel?.mode)$('mode').value=room.settings.kniffel.mode;if(room?.settings?.kniffel){$('extra-jokers').checked=room.settings.kniffel.extraJokers===true;$('joker-count').value=String(room.settings.kniffel.jokerCount??1);}$('phase').textContent=playing?finished?'Partie beendet – Host kann ein neues Spiel vorbereiten.':'Partie läuft – du kannst einsteigen.':preparing?'Modus festlegen, Computer hinzufügen und bereit melden.':room?.phase==='playing'?'Im Raum läuft ein anderes Spiel.':'Der Host kann Kniffel auswählen.';$('status').textContent=room?'Raum bestätigt · '+players.filter(p=>!p.testBot).length+' echte Teilnehmer · '+(ws?.readyState===1?'Live verbunden':'Verbindung wird hergestellt'):'Warte auf Raumverbindung …'}
let statsSignature='',statsLastFetch=0,statsLoading=false;
function renderStats(stats){
 const target=$('kniffel-stats');target.replaceChildren();
 if(!stats.length){const p=document.createElement('p');p.className='muted';p.textContent='Noch keine Spieler im Raum.';target.append(p);return;}
 for(const player of stats){
  const card=document.createElement('div');card.className='stat-card';
  const name=document.createElement('div');name.className='stat-name';name.textContent='👤 '+player.name;
  const numbers=document.createElement('div');numbers.className='stat-numbers';
  for(const [label,value] of [['🏆 Siege',player.wins],['🎲 Rekord',player.highestScore],['Partien',player.played]]){
   const item=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');
   strong.textContent=String(value);small.textContent=label;item.append(strong,small);numbers.append(item);
  }
  card.append(name,numbers);target.append(card);
 }
}
async function loadStats(force=false){
 if(!valid||!user()||!room||statsLoading)return;
 const signature=(room.players||[]).filter(p=>!p.testBot).map(p=>p.uid).sort().join('|');
 if(!force&&signature===statsSignature&&Date.now()-statsLastFetch<15000)return;
 statsLoading=true;
 try{
  const token=await user().getIdToken();
  const response=await fetch(base+'/api/hub/rooms/'+encodeURIComponent(code)+'/kniffel/stats',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'STATS_ERROR');
  renderStats(data.stats||[]);statsSignature=signature;statsLastFetch=Date.now();
 }catch(e){const el=$('kniffel-stats');if(el&&!el.querySelector('.stat-card'))el.textContent='Statistiken vorübergehend nicht verfügbar.';}
 finally{statsLoading=false;}
}
async function request(path,body){const p=user();if(!p)throw Error('Bitte zuerst online anmelden');const token=await p.getIdToken();const res=await fetch(base+'/api/hub/rooms/'+encodeURIComponent(code)+path,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await res.json();if(!res.ok||data.ok!==true)throw Error(data.error||'SERVER_ERROR');return data.room}
async function action(path,body){if(busy)return;busy=true;render();message('');try{const next=await request(path,body);if(!room||next.revision>=room.revision)room=next;render();void loadStats(true);navigate()}catch(e){message('Aktion fehlgeschlagen: '+e.message)}finally{busy=false;render()}}
$('choose').onclick=async()=>{const mode=$('mode').value,extraJokers=$('extra-jokers').checked,jokerCount=Number($('joker-count').value);if(room?.game!=='kniffel'||room?.phase!=='preparing'||room?.match?.status?.phase==='finished'){await action('/select',{game:'kniffel'})}if(room?.game==='kniffel'&&room.phase==='preparing')await action('/kniffel/settings',{mode,extraJokers,jokerCount})};
$('save-bots').onclick=()=>action('/kniffel/test-players',{count:Number($('bots').value)});
$('ready').onclick=()=>action('/ready',{ready:!room?.players?.find(p=>p.me)?.ready});
$('play').onclick=()=>location.assign('./online.html?room='+encodeURIComponent(code));
$('cancel-game').onclick=async()=>{
 if(!room?.host||room?.phase!=='playing'||room?.match?.game!=='kniffel')return;
 if(!window.confirm('Aktuelles Kniffel-Spiel jetzt für alle Spieler beenden? Die Partie wird als abgebrochen gespeichert, ohne Sieger oder reguläre Spielstatistik.'))return;
 if(busy)return;
 busy=true;render();message('Partie wird beendet …');
 try{
  const next=await request('/cancel',{});
  if(!room||next.revision>=room.revision)room=next;
  message('Partie beendet und als abgebrochen erfasst. Eine neue Partie kann vorbereitet werden.');
 }catch(e){message('Beenden fehlgeschlagen: '+e.message)}
 finally{busy=false;render()}
};
function navigate(){if(q.get('stay')==='1')return;if(room?.match?.game==='kniffel'&&room.phase==='playing'&&room.match.status?.phase!=='finished')location.replace('./online.html?room='+encodeURIComponent(code))}
async function refresh(){if(!valid||!user())return;try{const next=await request('');if(!room||next.revision>=room.revision)room=next;render();void loadStats();navigate()}catch(e){message('Raumverbindung: '+e.message)}}
function connect(){if(!valid||!user()||document.hidden||ws)return;const socket=new WebSocket(base.replace(/^http/i,'ws')+'/hub');ws=socket;socket.onopen=async()=>{try{const token=await user().getIdToken();if(ws!==socket)return;socket.send(JSON.stringify({type:'subscribe',code,profileIdToken:token}));heartbeat=setInterval(()=>{if(ws===socket&&socket.readyState===1)socket.send(JSON.stringify({type:'ping'}))},30000)}catch(e){socket.close()}};socket.onmessage=e=>{let data;try{data=JSON.parse(e.data)}catch(_){return}if(data.type==='room'&&data.room?.code===code){if(!room||data.room.revision>=room.revision)room=data.room;render();void loadStats();navigate()}if(data.type==='error')message(data.error)};socket.onclose=()=>{if(heartbeat)clearInterval(heartbeat);heartbeat=null;if(ws===socket)ws=null;render();if(!document.hidden)retry=setTimeout(connect,4500)};socket.onerror=()=>socket.close()}
function boot(){if(!user())return;void refresh();connect()}
if(!valid)message('Bitte Kniffel über die gemeinsame Online-Spielauswahl öffnen.');else{boot();window.addEventListener('spielonline-change',boot);document.addEventListener('visibilitychange',()=>{if(document.hidden){if(ws){ws.close();ws=null}if(retry)clearTimeout(retry)}else boot()})}
render();
