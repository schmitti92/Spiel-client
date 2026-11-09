'use strict';
// Update the stable money board in place; avoid rebuilding 26 DOM nodes per socket update.
function updateMoneyBoard(openedAmounts){
 const root=$('money'),gone=new Set(openedAmounts.map(a=>a.amount));
 const boardValues=g?.caseCount===26?values.filter(v=>v!==300000000):values;
 if(root.children.length!==boardValues.length){
  const fragment=document.createDocumentFragment();
  for(const value of boardValues){const node=document.createElement('span');node.textContent=eur(value);fragment.append(node)}
  root.replaceChildren(fragment);
 }
 for(let i=0;i<boardValues.length;i++){
  const node=root.children[i],value=boardValues[i];
  node.classList.toggle('gone',gone.has(value));
  node.classList.toggle('just-eliminated',directorLatestAmount===value&&directorLatestUntil>Date.now());
 }
}
let historyRenderKey='';
function updateHistoryBoard(history){
 const key=JSON.stringify(history.map(h=>[h.round,h.offer]));
 const root=$('history-list');
 if(key===historyRenderKey&&root.children.length===history.length)return;
 historyRenderKey=key;
 const fragment=document.createDocumentFragment();
 for(const h of history){const line=document.createElement('div');line.className='history-entry';const a=document.createElement('span');a.textContent='Runde '+h.round;const b=document.createElement('strong');b.textContent=eur(h.offer);line.append(a,b);fragment.append(line)}
 root.replaceChildren(fragment);
}
function render(){if(!g||g.phase==='final'){resetCaseCamera();clearTimeout(prizeFlashDelay);clearTimeout(prizeFlashTimer);$('prize-flash').classList.remove('active');$('prize-flash').setAttribute('aria-hidden','true')}if(!g){resetAvatarReaction();document.body.classList.remove('show-high-stakes','show-final-stakes','reveal-spotlight')}announceScene();updateBankerCall();document.body.classList.toggle('offer-moment',g?.phase==='decision');if(!g){cancelFinaleTimers();$('finale-cinema').hidden=true;finaleSequenceKey='';$('final-show').hidden=true;$('bank-history').open=false;$('history-list').replaceChildren();$('bank-quote').textContent='„Jeder Koffer verändert das Spiel. Wie mutig bist du?“';$('show-phase').textContent='Warte auf den Spielstart';$('studio-progress-fill').style.width='0%';$('show-round').textContent='27 Koffer · bis zu 4 Spieler';$('header-round').textContent=$('show-round').textContent;$('offer').classList.remove('offer-active');$('status').textContent='Noch keine Partie gestartet. Gehe zur Lobby und starte als Host.';$('cases').replaceChildren();for(let i=0;i<27;i++){let b=makeCase(i,null,null,false);b.disabled=true;$('cases').append(b)}$('money-summary').textContent='27 Beträge im Spiel';$('money').replaceChildren();for(let v of values){let x=document.createElement('span');x.textContent=eur(v);$('money').append(x)}$('players').replaceChildren();$('actions').replaceChildren();$('actions').append(button('← Zur Lobby',()=>location.assign('lobby.html?room='+encodeURIComponent(code||''))));$('offer').textContent='Der Banker wartet auf den Spielstart.';return}$('show-phase').textContent=({select:'Die Kandidaten wählen ihre Koffer',open:'Die Kofferjagd läuft',reveal:'Der Koffer wird enthüllt',decision:'Der Banker macht ein Angebot',final:'Das große Finale',finished:'Die Show ist beendet'})[g.phase]||'Goldstudio Live';$('show-round').textContent='Runde '+Math.max(1,(g.round||0)+1)+' · '+g.opened.length+' / '+(g.caseCount||26)+' geöffnet';$('header-round').textContent=$('show-round').textContent;$('studio-progress-fill').style.width=(g.opened.length/(g.caseCount||26)*100).toFixed(1)+'%';$('bank-quote').textContent=g.phase==='decision'?'„Mein Angebot liegt auf dem Tisch. Deal oder No Deal?“':g.phase==='reveal'?'„Was verbirgt sich hinter diesem goldenen Deckel?“':g.phase==='final'?'„Jetzt kommt die Wahrheit ans Licht!“':g.phase==='open'?'„Ein einziger Koffer kann alles verändern.“':'„Willkommen in meiner Show.“';updateHistoryBoard(g.history||[]);let who=g.phase==='select'?g.order[g.selectionIndex]:g.phase==='open'?turn():g.phase==='decision'?currentDecision():null;let p=g.players.find(x=>x.id===who);$('status').textContent=g.phase==='select'?'Persönliche Koffer wählen: '+p?.name:g.phase==='open'?'Koffer öffnen: '+p?.name:g.phase==='reveal'?'Der Koffer wird geöffnet …':g.phase==='decision'?'Bankangebot · Alle Spieler stimmen gleichzeitig ab':g.phase==='final'?'🏆 Finale: Persönliche Koffer werden enthüllt':'Partie beendet';
const caseGrid=$('cases');const oldCases=Array.from(caseGrid.children);const newCases=[];for(let i=0;i<(g.caseCount||26);i++){const opened=g.openedAmounts.find(x=>x.case===i),owner=g.players.find(x=>x.case===i),pending=g.pending?.case===i;const signature=[opened?.amount??'',owner?.id??'',pending?'reveal':''].join('|');let b=oldCases[i];if(!b||b.dataset.signature!==signature){b=makeCase(i,opened,owner,pending);b.dataset.signature=signature}b.disabled=busy||!free(i)||!['select','open'].includes(g.phase)||who!==myId();b.onclick=()=>action(g.phase==='select'?'select':'open',{case:i});newCases.push(b)}for(let i=0;i<newCases.length;i++){if(oldCases[i]!==newCases[i]){if(oldCases[i])oldCases[i].replaceWith(newCases[i]);else caseGrid.append(newCases[i])}}while(caseGrid.children.length>newCases.length)caseGrid.lastElementChild.remove();
const remaining=(g.caseCount||26)-g.openedAmounts.length;
 document.body.classList.toggle('show-high-stakes',g.phase!=='final'&&remaining<=8);
 document.body.classList.toggle('show-final-stakes',g.phase!=='final'&&remaining<=3);
 directorReveal();studioCommentObserve(g);$('money-summary').textContent=((g.caseCount||26)-g.openedAmounts.length)+' Beträge übrig · '+g.openedAmounts.length+' ausgeschieden';updateMoneyBoard(g.openedAmounts);
const playerRoot=$('players');const oldPlayers=new Map(Array.from(playerRoot.children).map(el=>[el.dataset.playerId,el]));for(let p of g.players){let el=oldPlayers.get(String(p.id))||document.createElement('div');el.dataset.playerId=String(p.id);const playerClass='player'+(p.id===who?' turn':'')+(p.deal!==null?' dealt':'');if(el.className!==playerClass)el.className=playerClass;if(avatarReactionType&&avatarReactionUntil>Date.now()){const personality=(Number.isInteger(p.avatar)?p.avatar:g.players.indexOf(p))%4;const reactions={shock:['shock','disbelief','shock','freeze'],cheer:['cheer','relief','cheer','smile'],curious:['curious','thinking','curious','thinking'],thinking:['thinking','curious','thinking','freeze']};const reaction=(reactions[avatarReactionType]||[])[personality]||avatarReactionType;if(el.dataset.reaction!==reaction)el.dataset.reaction=reaction;}else if(el.dataset.reaction)delete el.dataset.reaction;const avatar=el.querySelector('.candidate-avatar')||document.createElement('span');if(avatar.className!=='candidate-avatar')avatar.className='candidate-avatar';const avatarId=Number.isInteger(p.avatar)&&p.avatar>=1&&p.avatar<=13?p.avatar:(g.players.indexOf(p)%4+1);const avatarFile=avatarId===12?'weihnachts_event/file_0000000052f88210a16983ce1ff8c3e0.png':avatarId===11?'weihnachts_event/reindeer-9985063_640.jpg':avatarId===13?'weihnachts_event/schneemann_charakter.png':({1:'buero-portrait-01-avatar.webp',2:'bert-avatar.webp',3:'ernie-avatar.webp',4:'heinz-becker-avatar.webp',5:'buero-portrait-02-avatar.webp',7:'avatar-portrait-05-avatar.webp'}[avatarId]||'avatar-'+avatarId+'.svg');const candidateImage="url('"+new URL('assets/'+avatarFile,document.baseURI).href+"')";if(avatar.dataset.candidateImage!==candidateImage){avatar.style.setProperty('--candidate-image',candidateImage);avatar.dataset.candidateImage=candidateImage;}if(avatar.getAttribute('role')!=='img')avatar.setAttribute('role','img');if(avatar.getAttribute('aria-label')!=='Gewählter Spielcharakter')avatar.setAttribute('aria-label','Gewählter Spielcharakter');const avatarDelay=(-((g.players.indexOf(p)*1.7)%6)).toFixed(1)+'s';if(avatar.dataset.avatarDelay!==avatarDelay){avatar.style.setProperty('--avatar-delay',avatarDelay);avatar.dataset.avatarDelay=avatarDelay;}const personalityValue=String((Number.isInteger(p.avatar)?p.avatar:g.players.indexOf(p))%4);if(avatar.dataset.personality!==personalityValue)avatar.dataset.personality=personalityValue;const avatarNumberValue=String(avatarId);if(avatar.dataset.avatarNumber!==avatarNumberValue)avatar.dataset.avatarNumber=avatarNumberValue;if(!avatar.querySelector('.avatar-portrait')){const portrait=document.createElement('span');portrait.className='avatar-portrait';portrait.setAttribute('aria-hidden','true');avatar.append(portrait);const face=document.createElement('span');face.className='avatar-expression';face.setAttribute('aria-hidden','true');face.append(document.createElement('span'),document.createElement('span'),document.createElement('span'));avatar.append(face)}const portraitImage=avatar.querySelector('img.candidate-photo')||document.createElement('img');portraitImage.className='candidate-photo';portraitImage.alt='';if(!portraitImage.dataset.imageConfigured){portraitImage.decoding='async';portraitImage.loading='eager';portraitImage.dataset.imageConfigured='yes';}const chosenSrc=new URL('assets/'+avatarFile,document.baseURI).href;if(portraitImage.dataset.source!==chosenSrc){portraitImage.dataset.source=chosenSrc;portraitImage.src=chosenSrc;portraitImage.onerror=()=>{portraitImage.onerror=null;portraitImage.src=new URL('assets/avatar-1.svg',document.baseURI).href}}if(!portraitImage.isConnected)avatar.append(portraitImage);if(avatar.parentElement!==el)el.append(avatar);
let title=el.querySelector('.candidate-name');if(!title){title=document.createElement('strong');title.className='candidate-name';el.append(title)}if(title.textContent!==p.name)title.textContent=p.name;
let badge=el.querySelector('.candidate-badge');if(!badge){badge=document.createElement('span');badge.className='candidate-badge';el.append(badge)}const badgeText=p.id===who?'Am Zug':p.deal!==null?'Deal gesichert':'Kandidat';if(badge.textContent!==badgeText)badge.textContent=badgeText;
let desc=el.querySelector('.candidate-status');if(!desc){desc=document.createElement('div');desc.className='candidate-status';el.append(desc)}const statusText=p.deal!==null?'🤝 DEAL · '+eur(p.deal):'Noch im Spiel';if(desc.textContent!==statusText)desc.textContent=statusText;
let c=el.querySelector('.personalcase');if(p.case!==null){if(!c){c=document.createElement('div');c.className='personalcase';el.append(c)}let f=g.finalValues?.find(x=>x.id===p.id);const caseText='🧳 '+(p.case+1)+(f?' · '+eur(f.amount):'');if(c.textContent!==caseText)c.textContent=caseText}else if(c)c.remove();if(!el.isConnected||el.parentElement!==playerRoot)playerRoot.append(el);oldPlayers.delete(String(p.id))}for(const stale of oldPlayers.values())stale.remove();
$('final-show').hidden=!(g.phase==='final'&&Array.isArray(g.finalValues)&&sessionStorage.getItem('final-wheel-complete:'+g.id)==='yes');if(!$('final-show').hidden){const sorted=[...g.finalValues].sort((a,b)=>b.payout-a.payout);const max=Math.max(1,...sorted.map(x=>x.payout));$('final-sub').textContent=sorted.filter(x=>x.payout===max).map(x=>g.players.find(p=>p.id===x.id)?.name||'Spieler').join(' & ')+' gewinnt!';$('final-rankings').replaceChildren();for(let f of sorted){const el=document.createElement('div');el.className='final-contender'+(f.payout===max?' winner':'');const name=document.createElement('span');name.className='final-name';name.textContent=(f.payout===max?'🏆 ':'')+(g.players.find(p=>p.id===f.id)?.name||'Spieler');const winnerPlayer=g.players.find(p=>p.id===f.id);if(winnerPlayer){const portrait=document.createElement('img');portrait.className='final-avatar';portrait.src=winnerPlayer.avatar===11?'assets/weihnachts_event/reindeer-9985063_640.jpg':winnerPlayer.avatar===12?'assets/weihnachts_event/file_0000000052f88210a16983ce1ff8c3e0.png':winnerPlayer.avatar===13?'assets/weihnachts_event/schneemann_charakter.png':((Number.isInteger(winnerPlayer.avatar)&&winnerPlayer.avatar>=1&&winnerPlayer.avatar<=10?winnerPlayer.avatar:(g.players.indexOf(winnerPlayer)%4+1))===2?'assets/bert-avatar.webp':(Number.isInteger(winnerPlayer.avatar)&&winnerPlayer.avatar>=1&&winnerPlayer.avatar<=10?winnerPlayer.avatar:(g.players.indexOf(winnerPlayer)%4+1))===3?'assets/ernie-avatar.webp':(Number.isInteger(winnerPlayer.avatar)&&winnerPlayer.avatar>=1&&winnerPlayer.avatar<=10?winnerPlayer.avatar:(g.players.indexOf(winnerPlayer)%4+1))===5?'assets/buero-portrait-02-avatar.webp':(Number.isInteger(winnerPlayer.avatar)&&winnerPlayer.avatar>=1&&winnerPlayer.avatar<=10?winnerPlayer.avatar:(g.players.indexOf(winnerPlayer)%4+1))===7?'assets/avatar-portrait-05-avatar.webp':(Number.isInteger(winnerPlayer.avatar)&&winnerPlayer.avatar>=1&&winnerPlayer.avatar<=10?winnerPlayer.avatar:(g.players.indexOf(winnerPlayer)%4+1))===1?'assets/buero-portrait-01-avatar.webp':(Number.isInteger(winnerPlayer.avatar)&&winnerPlayer.avatar>=1&&winnerPlayer.avatar<=10?winnerPlayer.avatar:(g.players.indexOf(winnerPlayer)%4+1))===4?'assets/heinz-becker-avatar.webp':'assets/avatar-'+(Number.isInteger(winnerPlayer.avatar)&&winnerPlayer.avatar>=1&&winnerPlayer.avatar<=10?winnerPlayer.avatar:(g.players.indexOf(winnerPlayer)%4+1))+'.svg');portrait.alt='Figur von '+winnerPlayer.name;el.append(portrait)}const track=document.createElement('div');track.className='final-track';const bar=document.createElement('span');bar.className='final-bar';bar.style.setProperty('--final-width',(f.payout/max*100).toFixed(2)+'%');track.append(bar);const pay=document.createElement('span');pay.className='final-payout';pay.textContent=eur(f.payout);const detail=document.createElement('div');detail.className='final-detail';detail.textContent='Koffer '+(f.case+1)+' · Inhalt: '+eur(f.amount)+(g.players.find(p=>p.id===f.id)?.deal!==null?' · Deal angenommen':' · No Deal');el.append(name,track,pay,detail);$('final-rankings').append(el)}}
$('offer').classList.toggle('offer-active',g.phase==='decision');$('offer').textContent=g.phase==='decision'?'Bankangebot für alle: '+eur(g.offer):g.history.length?'Letztes Angebot: '+eur(g.history.at(-1).offer):'Der Banker wartet.';
$('actions').replaceChildren();$('final-extra-actions')?.replaceChildren();if(g.phase==='reveal'&&g.pending?.actor===myId()&&!busy){$('status').textContent='🧳 Koffer '+(g.pending.case+1)+' öffnet sich – Enthüllung läuft …';$('actions').append(button('🧳 Enthüllung jetzt abschließen',()=>action('ack-reveal')));if(lastReveal!==g.pending.eventId){lastReveal=g.pending.eventId;clearTimeout(revealTimer);revealTimer=setTimeout(()=>{if(g?.phase==='reveal'&&g.pending?.eventId===lastReveal)action('ack-reveal')},2200)}
 // Recover from a transient failed acknowledgement or a stale WebSocket
 // revision. The server still validates the actor and applies it exactly once.
 if(!revealRecoveryTimer){revealRecoveryTimer=setTimeout(()=>{revealRecoveryTimer=null;if(g?.phase==='reveal'&&g.pending?.actor===myId()&&!busy){action('ack-reveal')}},6500)}}if(g.phase==='final'&&$('finale-cinema').hidden){
 updateFinaleStartControl();
 const extraActions=$('final-extra-actions')||$('actions');
 const recover=button('🎡 Sieger-Glücksrad erneut prüfen',()=>{
  recover.textContent='⏳ Siegerbonus wird geprüft …';
  $('status').textContent='🎡 Manuelle Siegerbonus-Prüfung gestartet …';
  window.dispatchEvent(new Event('deal-final-wheel-retry'));
  setTimeout(()=>{if(recover.isConnected&&recover.textContent.includes('geprüft'))recover.textContent='🎡 Sieger-Glücksrad erneut prüfen'},5000);
 });
 recover.disabled=false;extraActions.append(recover);
 const replay=button('🎬 Finale komplett wiederholen',()=>window.dispatchEvent(new Event('deal-replay-finale-sequence')));
 replay.disabled=false;extraActions.append(replay);
 const finish=button('✅ Zur Lobby ohne weiteren Bonus',()=>{
  if(!confirm('Zur Lobby zurückkehren? Noch offene Karten- und Hammerauslosungen bleiben ausstehend und können bei einer Rückkehr zur Partie fortgesetzt werden.'))return;
  // Leaving the room is not proof that the shared card and hammer awards finished.
  // Do not poison the completion flag: players must still be able to resume a pending wheel.
  sessionStorage.setItem('finale-watched:'+String(g.id)+':finale','yes');
  location.assign('lobby.html?room='+encodeURIComponent(code||''));
 });
 finish.disabled=false;extraActions.append(finish);
}
if(g.phase==='open'&&who!==myId())$('status').textContent+=' · Du bist gerade nicht am Zug.';if(g.phase==='final'&&g.finalValues){let max=Math.max(...g.finalValues.map(x=>x.payout));$('status').textContent='🏆 '+g.finalValues.filter(x=>x.payout===max).map(x=>g.players.find(p=>p.id===x.id)?.name).join(' & ')+' gewinnt mit '+eur(max)}revealVotesAfterAll();startFinaleCinema()}
window.addEventListener('deal-final-wheel-complete',()=>{if(g?.phase==='final'){render();$('final-show').scrollIntoView({behavior:'smooth',block:'start'})}});
let revealRecoveryTimer=null;
// Local-only finale recovery: no network request or Firestore read.
setInterval(()=>{
 if(document.hidden||!g||g.phase!=='final')return;
 const key=String(g.id)+':finale';
 if(!$('finale-cinema').hidden)return;
 if(sessionStorage.getItem('finale-watched:'+key)==='yes')return;
 startFinaleCinema();
},5000);
let polling=false,lastStateChange=Date.now();
async function poll(){if(!code||!user()||document.hidden||polling)return;polling=true;lastHttpSafetySync=Date.now();try{let data=await request('GET','');if(!g||!data.game||data.game.id!==g.id||Number(data.game.revision)>Number(g.revision)){lastStateChange=Date.now();g=data.game;render();window.dispatchEvent(new Event('deal-game-state-change'))}}catch(e){$('status').textContent='Verbindung: '+e.message}finally{polling=false}}
function pollDelay(){if(!g)return 5000;if(g.phase==='final'||g.phase==='done')return 30000;if(g.phase==='select'||g.phase==='reveal'||g.phase==='decision')return 2500;if(Date.now()-lastStateChange>60000)return 8000;return 4000}
// The server remains authoritative. WebSocket is an optional push channel;
// HTTP remains available during reconnects and for older backend deployments.
let dealSocket=null,dealSocketReady=false,dealSocketRetry=0,dealSocketLastMessage=0,dealSocketConnecting=false,lastHttpSafetySync=0;
let lastSocketHeartbeat=0;
let reconnectTimer=null;
function scheduleDealReconnect(){
 if(reconnectTimer||document.hidden||!code||!user())return;
 const wait=Math.min(8000,750*2**Math.min(dealSocketRetry,4));
 reconnectTimer=setTimeout(()=>{reconnectTimer=null;if(!document.hidden)connectDealSocket()},wait);
}

function applyDealState(next){
 if(!next)return;
 if(!g||next.id!==g.id||Number(next.revision)>Number(g.revision)){
  lastStateChange=Date.now();g=next;render();window.dispatchEvent(new Event('deal-game-state-change'));
 }
}
async function connectDealSocket(){
 if(!code||!user()||dealSocketConnecting||dealSocket?.readyState===WebSocket.OPEN||dealSocket?.readyState===WebSocket.CONNECTING||dealSocket?.readyState===WebSocket.CLOSING)return;
 dealSocketConnecting=true;
 try{
  const token=await user().getIdToken();
  if(!user())return;
  const ws=new WebSocket(base.replace(/^http/,'ws')+'/deal-or-no-deal');
  dealSocket=ws;dealSocketReady=false;dealSocketConnecting=false;
  ws.onopen=()=>{if(dealSocket!==ws){ws.close();return}dealSocketRetry=0;ws.send(JSON.stringify({type:'subscribe',code,token}))};
  ws.onmessage=event=>{
   if(dealSocket!==ws)return;
   let msg;try{msg=JSON.parse(event.data)}catch{return}
   if(msg.type==='deal-subscribed'||msg.type==='pong'){if(msg.type==='deal-subscribed')dealSocketReady=true;dealSocketLastMessage=Date.now()}
   if(msg.type==='deal-state'&&dealSocketReady){dealSocketLastMessage=Date.now();applyDealState(msg.game)}
   if(msg.type==='deal-error'){dealSocketReady=false;console.warn('Deal stream:',msg.error)}
  };
  ws.onclose=()=>{if(dealSocket===ws){dealSocket=null;dealSocketReady=false;dealSocketRetry=Math.min(dealSocketRetry+1,6);scheduleDealReconnect()}};
  ws.onerror=()=>{if(dealSocket===ws)dealSocketReady=false};
 }catch(e){console.warn('Deal stream reconnect:',e);dealSocketRetry=Math.min(dealSocketRetry+1,6);scheduleDealReconnect()}finally{dealSocketConnecting=false}
}
function dealSocketHealthy(){return dealSocketReady&&dealSocket?.readyState===WebSocket.OPEN&&Date.now()-dealSocketLastMessage<45000}
async function pollLoop(){
 if(!document.hidden){
  if(!dealSocket||dealSocket.readyState===WebSocket.CLOSED)connectDealSocket();
  if(dealSocketHealthy()&&Date.now()-lastSocketHeartbeat>=24000){try{dealSocket.send(JSON.stringify({type:'ping',revision:Number.isSafeInteger(Number(g?.revision))&&g?Number(g.revision):undefined}));lastSocketHeartbeat=Date.now()}catch{}}
  if(dealSocket?.readyState===WebSocket.OPEN&&!dealSocketHealthy()&&dealSocketLastMessage&&Date.now()-dealSocketLastMessage>45000)dealSocket.close();
  // Safety sync catches missed broadcasts if clients reach different Render instances.
  if(!dealSocketHealthy()||Date.now()-lastHttpSafetySync>=60000)await poll();
 }
 const delay=dealSocketHealthy()?8000:Math.max(pollDelay(),Math.min(15000,1000*2**dealSocketRetry));
 setTimeout(pollLoop,delay);
}
$('studio-refresh').addEventListener('click',()=>window.location.reload());
$('studio-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement){await document.exitFullscreen()}else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen()}else{$('status').textContent='Vollbild wird von diesem Browser nicht unterstützt.'}}catch(e){$('status').textContent='Vollbild nicht verfügbar: '+e.message}});document.addEventListener('fullscreenchange',()=>{document.body.classList.toggle('is-fullscreen',!!document.fullscreenElement);$('studio-fullscreen').textContent=document.fullscreenElement?'⛶ Vollbild beenden':'⛶ Vollbild'});render();window.addEventListener('spielonline-change',poll);document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(!dealSocket||dealSocket.readyState===WebSocket.CLOSED)connectDealSocket();poll();if(dealSocket?.readyState===WebSocket.OPEN){try{dealSocket.send(JSON.stringify({type:'ping'}))}catch{}}}});window.addEventListener('pageshow',e=>{if(e.persisted)poll()});pollLoop();
