'use strict';
function cancelFinaleTimers(){for(const t of finaleTimers)clearTimeout(t);finaleTimers=[]}
function finaleLater(fn,delay){finaleTimers.push(setTimeout(fn,delay))}
function finishFinaleCinema(){replayFinaleLocally=false;cancelFinaleTimers();if(finaleSequenceKey)sessionStorage.setItem('finale-watched:'+finaleSequenceKey,'yes');$('finale-cinema').hidden=true;$('finale-sparks').replaceChildren();window.dispatchEvent(new Event('deal-finale-finished'))}
$('finale-skip').addEventListener('click',finishFinaleCinema);
// Replay only presentation state; never repeat payouts, case opening, or rewards.
let replayFinaleLocally=false;
function replayFinaleSequence(){
 if(!g||g.phase!=='final'||!Array.isArray(g.finalValues)||!g.finalValues.length){
  $('status').textContent='⚠️ Finale-Daten fehlen noch. Bitte Verbindung prüfen.';
  return;
 }
 replayFinaleLocally=true;
 cancelFinaleTimers();
 if(finaleRecoveryTimer){clearTimeout(finaleRecoveryTimer);finaleRecoveryTimer=null}
 const key=String(g.id)+':finale';
 sessionStorage.removeItem('finale-watched:'+key);
 // An interrupted banker announcement must not suppress a deliberate replay.
 if(voteRevealTimer!==null){clearTimeout(voteRevealTimer);voteRevealTimer=null}
 finalDealRevealUntil=0;
 $('vote-reveal').hidden=true;
 $('finale-cinema').hidden=true;
 finaleSequenceKey='';
 $('status').textContent='🎬 Finale wird erneut abgespielt. Danach wird der Siegerbonus geprüft.';
 startFinaleCinema();
}
window.addEventListener('deal-replay-finale-sequence',replayFinaleSequence);
// Ordinary restarts must wait for both shared award stages (ties need no winner wheel).
function finaleBonusesComplete(game){
 if(!game||game.phase!=='final')return false;
 const payouts=(game.finalValues||[]).map(v=>v.payout);
 if(payouts.length>1&&payouts.filter(v=>v===Math.max(...payouts)).length>1)return true;
 const key='final:'+game.id,spunAt=Number(game.christmasWheelSpins?.[key]||0);
 const hammer=game.christmasHammerWheel;
 return Boolean(spunAt&&game.christmasWheelClosed?.[key]&&hammer?.gameId===game.id
  &&Number.isFinite(hammer.startedAt)&&Date.now()-hammer.startedAt>=4300);
}
let finaleControlTimer=null;
function updateFinaleStartControl(){
 if(typeof g==='undefined'||g?.phase!=='final')return;
 const ready=finaleBonusesComplete(g),button=$('final-replay');
 if(button&&!finaleRestartBusy){
  button.disabled=!ready;
  button.textContent=ready?'🎬 Neue Runde starten':'⏳ Siegerbonus noch nicht abgeschlossen';
  button.title=ready?'Der Host kann die nächste Partie starten.':'Zuerst Kartenpaket und Hammerauslosung abschließen.';
 }
 const messages=$('final-replay-status');
 if(messages&&(!messages.textContent||messages.dataset.bonusNotice==='yes')){
  messages.textContent=ready?'✅ Siegerehrung abgeschlossen – bereit für die nächste Runde.':'🎁 Bitte zuerst die Karten bestätigen und danach das Hammerrad drehen.';
  messages.dataset.bonusNotice='yes';
 }
 clearTimeout(finaleControlTimer);
 const waitMs=Number(g.christmasHammerWheel?.startedAt||0)+4400-Date.now();
 if(!ready&&waitMs>0&&waitMs<5000)finaleControlTimer=setTimeout(updateFinaleStartControl,waitMs);
}
window.addEventListener('deal-game-state-change',updateFinaleStartControl);
// Restart is a server-authoritative host action, never a local reset of shared game state.
let finaleRestartBusy=false;
async function restartFromFinale(skipFinalWheel=false){
 if(finaleRestartBusy||!g||g.phase!=='final')return;
 if(!skipFinalWheel&&!finaleBonusesComplete(g)){$('final-replay-status').textContent='🎁 Zuerst das Siegerpaket bestätigen und das Hammerrad vollständig auslosen.';$('final-replay-status').dataset.bonusNotice='no';return;}
 const currentGameId=g.id;
 const buttons=[$('finale-replay'),$('final-replay')];
 const messages=[$('finale-cinema-status'),$('final-replay-status')];
 finaleRestartBusy=true;buttons.forEach(b=>{b.disabled=true;b.textContent='⏳ Neue Runde wird vorbereitet …'});messages.forEach(m=>m.textContent='Der Host startet eine neue gemeinsame Partie …');
 try{
  const u=window.SpielOnline?.state?.()?.user;
  if(!u?.getIdToken)throw Error('Bitte mit deinem Online-Profil anmelden.');
  const token=await u.getIdToken();
  const response=await fetch(String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'')+'/api/deal-or-no-deal/'+encodeURIComponent(code)+'/start',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({skipFinalWheel})});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error(data.error||'START_FAILED');
  // The shared room and players remain intact. Reload the game with its new server state.
  sessionStorage.removeItem('finale-watched:'+currentGameId+':finale');
  location.assign('./game.html?room='+encodeURIComponent(code));
 }catch(e){
  const message=e.message==='HOST_ONLY'?'Nur der Raum-Host kann eine neue Runde starten. Bitte warte auf den Host.':e.message==='FINAL_WHEEL_PENDING'?'🎡 Zuerst muss das Sieger-Glücksrad beendet werden.':e.message==='MATCH_ALREADY_RUNNING'?'Eine neue Partie läuft bereits. Lade die Spielansicht neu.':'Neustart nicht möglich: '+e.message;
  messages.forEach(m=>m.textContent=message);
 }finally{finaleRestartBusy=false;buttons.forEach((b,i)=>{b.disabled=false;b.textContent=i===0?'🎬 Direkt neue Runde starten':'🎬 Neue Runde starten'});updateFinaleStartControl()}
}
$('finale-replay').addEventListener('click',()=>restartFromFinale());
$('final-replay').addEventListener('click',()=>restartFromFinale());
$('final-recover').addEventListener('click',()=>{if(confirm('Das Sieger-Glücksrad wirklich überspringen und eine neue Partie starten? Bereits vergebene Karten bleiben erhalten.'))restartFromFinale(true)});
$('final-lobby').href='lobby.html?room='+encodeURIComponent(code||'');
let finaleRecoveryTimer=null;
function startFinaleCinema(){
 // The final accepted banker offer must be announced for three seconds first.
 if(!$('vote-reveal').hidden||Date.now()<finalDealRevealUntil){
  // A lost banker close timer must never block the final reveal indefinitely.
  const wait=Math.max(100,Math.min(3500,finalDealRevealUntil-Date.now()+100));
  if(!finaleRecoveryTimer)finaleRecoveryTimer=setTimeout(()=>{finaleRecoveryTimer=null;if(g?.phase==='final'){if(Date.now()>=finalDealRevealUntil&&!$('vote-reveal').hidden)closeVoteReveal();startFinaleCinema()}},wait);
  return;
 }
 if(!g||g.phase!=='final'||!Array.isArray(g.finalValues)||!g.finalValues.length){if(!$('finale-cinema').hidden){cancelFinaleTimers();$('finale-cinema').hidden=true}return}
 const key=String(g.id)+':finale';
 // A stale in-memory key must not suppress a finale whose dialog is hidden.
 // This can happen when another UI layer interrupted the first reveal.
 if(finaleSequenceKey===key&&!$('finale-cinema').hidden)return;
 if(sessionStorage.getItem('finale-watched:'+key)==='yes')return;
 finaleSequenceKey=key;cancelFinaleTimers();clearSceneTransition();resetCaseCamera();
 const entries=g.finalValues.map(f=>({f,p:g.players.find(p=>p.id===f.id)}));
 const ascending=[...entries].sort((a,b)=>a.f.amount-b.f.amount||a.f.case-b.f.case);
 const top=Math.max(...entries.map(x=>x.f.payout));
 const winners=entries.filter(x=>x.f.payout===top);
 const grid=$('finale-cases');grid.replaceChildren();grid.classList.remove('champion-phase','finale-suspense');$('finale-sparks').replaceChildren();$('finale-tension').textContent='DIE ENTSCHEIDUNG NAHT …';$('finale-stage-live')?.remove();
 $('finale-skip').hidden=true;$('finale-champion').hidden=true;$('finale-replay').hidden=true;$('finale-cinema-status').textContent='';$('final-replay-status').textContent='';$('finale-cinema').hidden=false;
 $('finale-title').textContent='Die letzten '+entries.length+' Koffer';
 $('finale-caption').textContent='Welcher Koffer enthält wie viel Geld?';
 const cards=new Map();
 for(const {f,p} of entries){const card=document.createElement('div');card.className='finale-player';const name=document.createElement('div');name.className='finale-player-name';name.textContent=p?.name||'Spieler';const avatar=document.createElement('img');avatar.className='finale-player-avatar';avatar.src=(p?.avatar===11?'assets/weihnachts_event/reindeer-9985063_640.jpg':p?.avatar===12?'assets/weihnachts_event/file_0000000052f88210a16983ce1ff8c3e0.png':p?.avatar===13?'assets/weihnachts_event/schneemann_charakter.png':p?.avatar===2?'assets/bert-avatar.webp':p?.avatar===3?'assets/ernie-avatar.webp':p?.avatar===5?'assets/buero-portrait-02-avatar.webp':p?.avatar===7?'assets/avatar-portrait-05-avatar.webp':p?.avatar===1?'assets/buero-portrait-01-avatar.webp':p?.avatar===4?'assets/heinz-becker-avatar.webp':'assets/avatar-'+(Number.isInteger(p?.avatar)&&p.avatar>=1&&p.avatar<=10?p.avatar:1)+'.svg');avatar.alt='Figur von '+(p?.name||'Spieler');const brief=document.createElement('div');brief.className='finale-briefcase';const front=document.createElement('div');front.className='finale-briefcase-front';front.textContent=f.case+1;const back=document.createElement('div');back.className='finale-briefcase-back';back.textContent=eur(f.amount);brief.append(front,back);const note=document.createElement('div');note.className='finale-player-note';note.textContent='Koffer '+(f.case+1);card.append(name,avatar,brief,note);grid.append(card);cards.set(f.id,{card,note,f,p})}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 // All clients use the same server-issued finale timestamp. A late joiner
 // catches up rather than replaying the entire sequence several seconds late.
 // A final accepted DEAL gets its own three-second announcement before the
 // personal-case ceremony. Subtract it from the shared timeline so the first
 // large suitcase is never skipped when that vote announcement finishes.
 const finalBallot=g.history?.at(-1);
 const dealAnnouncementMs=finalBallot?.decisions?.some(d=>d.deal===true)?3000:0;
 const finaleEpoch=Number(g.finalStartedAt)+dealAnnouncementMs;
 const finaleElapsed=!replayFinaleLocally&&Number.isFinite(g.finalStartedAt)
  ?Math.max(0,Date.now()-finaleEpoch):0;
 const at=ms=>Math.max(0,ms-finaleElapsed);

 // Every participant's case is shown as a large, animated suitcase.
 // The order is by case contents (smallest first), but payouts/winner use the
 // actual accepted deal or case value as supplied by the server.
 const spotlight=$('finale-spotlight');
 const spotlightAvatar=$('finale-spotlight-avatar');
 const spotlightName=$('finale-spotlight-name');
 const spotlightNumber=$('finale-spotlight-case-number');
 const spotlightValue=$('finale-spotlight-value');
 const spotlightResult=$('finale-spotlight-result');
 const spotlightProgress=$('finale-spotlight-progress');
 const spotlightStatus=$('finale-spotlight-status');
 spotlight.hidden=true;
 spotlight.dataset.state='closed';
 const introAt=reduced?150:1600;
 const slotLength=reduced?1450:3100;
 const openAfter=reduced?180:1050;
 const championAt=introAt+ascending.length*slotLength+(reduced?120:480);
 const finaleFinishAt=championAt+(reduced?1700:3500);
 const openedCase=new Set();
 function showMiniCase(entry){
  if(openedCase.has(entry.f.id))return;
  openedCase.add(entry.f.id);
  const x=cards.get(entry.f.id);
  if(!x)return;
  x.card.classList.add('revealed','group-reveal');
  x.note.textContent='Koffer '+(entry.f.case+1)+' · Inhalt: '+eur(entry.f.amount);
 }
 function showLargeCase(entry,index,opened=false){
  const {f,p}=entry;
  const x=cards.get(f.id);
  if(!x)return;
  spotlight.hidden=false;
  spotlight.dataset.playerId=String(f.id);
  spotlight.dataset.state=opened?'open':'closed';
  spotlight.classList.remove('finale-spotlight-arrival');
  // Restart the entrance effect when the next contestant steps forward.
  void spotlight.offsetWidth;
  spotlight.classList.add('finale-spotlight-arrival');
  spotlightName.textContent=p?.name||'Spieler';
  spotlightProgress.textContent='PERSÖNLICHER KOFFER · '+(index+1)+' / '+ascending.length;
  spotlightNumber.textContent='KOFFER '+(f.case+1);
  spotlightAvatar.src=x.card.querySelector('.finale-player-avatar')?.src||'';
  spotlightAvatar.alt='Spielfigur von '+(p?.name||'Spieler');
  spotlightValue.textContent=opened?eur(f.amount):'';
  spotlightStatus.textContent=opened?'DER KOFFER IST GEÖFFNET':'Dieser Koffer wurde zu Spielbeginn gewählt';
  spotlightResult.textContent=opened
   ? (p?.deal!=null?'Kofferinhalt: '+eur(f.amount)+' · DEAL angenommen: '+eur(f.payout):'Kofferinhalt und Gewinn: '+eur(f.amount))
   :'Der Geldbetrag bleibt bis zum Öffnen geheim.';
  grid.querySelectorAll('.finale-player').forEach(c=>c.classList.remove('on-stage'));
  x.card.classList.add('on-stage');
  grid.classList.remove('finale-suspense');
  $('finale-title').textContent='Der persönliche Koffer von '+(p?.name||'Spieler');
  $('finale-tension').textContent=opened?'✨ KOFFER '+(f.case+1)+' ENTHÜLLT':'🧳 KOFFER '+(f.case+1)+' – WAS STECKT DRIN?';
  $('finale-caption').textContent=opened?'Das Geheimnis des anfangs ausgewählten Koffers ist gelüftet.':'Der ausgewählte Koffer wird jetzt geöffnet …';
  if(opened)showMiniCase(entry);
 }
 function openLargeCase(entry){
  if(spotlight.hidden||spotlight.dataset.playerId!==String(entry.f.id))return;
  // First insert the actual server value, then animate the golden lid away.
  spotlightValue.textContent=eur(entry.f.amount);
  spotlight.dataset.state='open';
  spotlightStatus.textContent='DER KOFFER IST GEÖFFNET';
  spotlightResult.textContent=entry.p?.deal!=null
   ? 'Kofferinhalt: '+eur(entry.f.amount)+' · DEAL angenommen: '+eur(entry.f.payout)
   : 'Kofferinhalt und Gewinn: '+eur(entry.f.amount);
  $('finale-tension').textContent='✨ KOFFER '+(entry.f.case+1)+' ENTHÜLLT';
  $('finale-caption').textContent=entry.p?.deal!=null
   ? 'Der Kofferwert ist sichtbar – der angenommene Deal bleibt der Gewinn.'
   : 'Der Kofferwert ist der tatsächliche Gewinn.';
  showMiniCase(entry);
 }
 if(!reduced&&finaleElapsed<introAt){
  grid.classList.add('finale-suspense');
  for(const [word,ms] of [['3',450],['2',850],['1',1250]]){
   if(finaleElapsed<=ms)finaleLater(()=>{$('finale-tension').textContent=word},at(ms));
  }
 }
 ascending.forEach((entry,index)=>{
  const startAt=introAt+index*slotLength,openAt=startAt+openAfter,endAt=startAt+slotLength;
  if(finaleElapsed>=openAt)showMiniCase(entry);
  if(finaleElapsed>=startAt&&finaleElapsed<endAt){
   showLargeCase(entry,index,finaleElapsed>=openAt);
   if(finaleElapsed<openAt)finaleLater(()=>openLargeCase(entry),at(openAt));
  }else if(finaleElapsed<startAt){
   finaleLater(()=>showLargeCase(entry,index),at(startAt));
   finaleLater(()=>openLargeCase(entry),at(openAt));
  }
 });
 function revealChampion(){
  if($('finale-cinema').hidden)return;
  spotlight.hidden=true;
  grid.classList.add('champion-phase');
  grid.querySelectorAll('.finale-player').forEach(c=>c.classList.remove('on-stage'));
  $('finale-tension').textContent='🏆 DIE ENTSCHEIDUNG IST GEFALLEN 🏆';
  for(const entry of ascending)showMiniCase(entry);
  for(let i=0;i<45&&!reduced;i++){
   const piece=document.createElement('i');
   piece.className='finale-confetti';
   piece.style.left=(i*37%100)+'%';
   piece.style.setProperty('--drift',((i*19%110)-55)+'px');
   piece.style.setProperty('--delay',(i*13%45)/100+'s');
   piece.style.background=['#ffe5a0','#e5a840','#ffffff','#78b9ff'][i%4];
   $('finale-sparks').append(piece);
  }
  for(const w of winners){
   const x=cards.get(w.f.id);
   x.card.classList.add('winner','champion-focus');
   x.note.textContent='🏆 '+(w.p?.deal!=null?'Deal: ':'Gewinn: ')+eur(w.f.payout);
  }
  $('finale-title').textContent=winners.length>1?'Wir haben mehrere Gewinner!':'Der Gewinner steht fest!';
  $('finale-caption').textContent='Entscheidend ist die tatsächliche Auszahlung – inklusive angenommener Deals.';
  $('finale-champion-name').textContent=winners.map(w=>w.p?.name||'Spieler').join(' & ');
  $('finale-champion-value').textContent='Gewinn: '+eur(top);
  $('finale-champion').hidden=false;
  $('finale-replay').hidden=true;
  $('finale-skip').hidden=false;
  $('finale-skip').textContent=winners.length===1?'🎁 Weiter zum Siegerbonus ›':'✓ Siegerehrung schließen';
 }
 if(finaleElapsed>=championAt)revealChampion();
 else finaleLater(revealChampion,at(championAt));
 finaleLater(()=>{if(!$('finale-cinema').hidden)finishFinaleCinema()},at(finaleFinishAt));
 // Keep the ceremony visible until the player chooses a new round or the results.
 // No automatic close: the winner and replay action remain accessible.
}
/* V47 — centralized visual scene director. Server phases remain authoritative. */
let lastSceneKey='',sceneTimer=null,sceneEpoch=0;
