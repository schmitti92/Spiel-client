'use strict';
function cancelFinaleTimers(){for(const t of finaleTimers)clearTimeout(t);finaleTimers=[]}
function finaleLater(fn,delay){finaleTimers.push(setTimeout(fn,delay))}
function finishFinaleCinema(){cancelFinaleTimers();if(finaleSequenceKey)sessionStorage.setItem('finale-watched:'+finaleSequenceKey,'yes');$('finale-cinema').hidden=true;$('finale-sparks').replaceChildren();$('final-show').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});window.dispatchEvent(new Event('deal-finale-finished'))}
$('finale-skip').addEventListener('click',finishFinaleCinema);
// Restart is a server-authoritative host action, never a local reset of shared game state.
let finaleRestartBusy=false;
async function restartFromFinale(){
 if(finaleRestartBusy||!g||g.phase!=='final')return;
 const currentGameId=g.id;
 const buttons=[$('finale-replay'),$('final-replay')];
 const messages=[$('finale-cinema-status'),$('final-replay-status')];
 finaleRestartBusy=true;buttons.forEach(b=>{b.disabled=true;b.textContent='⏳ Neue Runde wird vorbereitet …'});messages.forEach(m=>m.textContent='Der Host startet eine neue gemeinsame Partie …');
 try{
  const u=window.SpielOnline?.state?.()?.user;
  if(!u?.getIdToken)throw Error('Bitte mit deinem Online-Profil anmelden.');
  const token=await u.getIdToken();
  const response=await fetch(String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'')+'/api/deal-or-no-deal/'+encodeURIComponent(code)+'/start',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store'});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error(data.error||'START_FAILED');
  // The shared room and players remain intact. Reload the game with its new server state.
  sessionStorage.removeItem('finale-watched:'+currentGameId+':finale');
  location.assign('./game.html?room='+encodeURIComponent(code));
 }catch(e){
  const message=e.message==='HOST_ONLY'?'Nur der Raum-Host kann eine neue Runde starten. Bitte warte auf den Host.':e.message==='MATCH_ALREADY_RUNNING'?'Eine neue Partie läuft bereits. Lade die Spielansicht neu.':'Neustart nicht möglich: '+e.message;
  messages.forEach(m=>m.textContent=message);
 }finally{finaleRestartBusy=false;buttons.forEach((b,i)=>{b.disabled=false;b.textContent=i===0?'🎬 Direkt neue Runde starten':'🎬 Neue Runde starten'})}
}
$('finale-replay').addEventListener('click',restartFromFinale);
$('final-replay').addEventListener('click',restartFromFinale);
$('final-lobby').href='lobby.html?room='+encodeURIComponent(code||'');
function startFinaleCinema(){
 // The final accepted banker offer must be announced for three seconds first.
 if(!$('vote-reveal').hidden||Date.now()<finalDealRevealUntil)return;
 if(!g||g.phase!=='final'||!Array.isArray(g.finalValues)||!g.finalValues.length){if(!$('finale-cinema').hidden){cancelFinaleTimers();$('finale-cinema').hidden=true}return}
 const key=String(g.id)+':finale';
 if(finaleSequenceKey===key||sessionStorage.getItem('finale-watched:'+key)==='yes')return;
 finaleSequenceKey=key;cancelFinaleTimers();clearSceneTransition();resetCaseCamera();
 const entries=g.finalValues.map(f=>({f,p:g.players.find(p=>p.id===f.id)}));
 const ascending=[...entries].sort((a,b)=>a.f.amount-b.f.amount||a.f.case-b.f.case);
 const top=Math.max(...entries.map(x=>x.f.payout));
 const winners=entries.filter(x=>x.f.payout===top);
 const grid=$('finale-cases');grid.replaceChildren();grid.classList.remove('champion-phase','finale-suspense');$('finale-sparks').replaceChildren();$('finale-tension').textContent='DIE ENTSCHEIDUNG NAHT …';$('finale-stage-live')?.remove();
 $('finale-champion').hidden=true;$('finale-replay').hidden=true;$('finale-cinema-status').textContent='';$('final-replay-status').textContent='';$('finale-cinema').hidden=false;
 $('finale-title').textContent='Die letzten '+entries.length+' Koffer';
 $('finale-caption').textContent='Welcher Koffer enthält wie viel Geld?';
 const cards=new Map();
 for(const {f,p} of entries){const card=document.createElement('div');card.className='finale-player';const name=document.createElement('div');name.className='finale-player-name';name.textContent=p?.name||'Spieler';const avatar=document.createElement('img');avatar.className='finale-player-avatar';avatar.src=(p?.avatar===11?'assets/weihnachts_event/reindeer-9985063_640.jpg':p?.avatar===12?'assets/weihnachts_event/file_0000000052f88210a16983ce1ff8c3e0.png':p?.avatar===13?'assets/weihnachts_event/schneemann_charakter.png':p?.avatar===2?'assets/bert-avatar.webp':p?.avatar===3?'assets/ernie-avatar.webp':p?.avatar===5?'assets/buero-portrait-02-avatar.webp':p?.avatar===7?'assets/avatar-portrait-05-avatar.webp':p?.avatar===1?'assets/buero-portrait-01-avatar.webp':p?.avatar===4?'assets/heinz-becker-avatar.webp':'assets/avatar-'+(Number.isInteger(p?.avatar)&&p.avatar>=1&&p.avatar<=10?p.avatar:1)+'.svg');avatar.alt='Figur von '+(p?.name||'Spieler');const brief=document.createElement('div');brief.className='finale-briefcase';const front=document.createElement('div');front.className='finale-briefcase-front';front.textContent=f.case+1;const back=document.createElement('div');back.className='finale-briefcase-back';back.textContent=eur(f.amount);brief.append(front,back);const note=document.createElement('div');note.className='finale-player-note';note.textContent='Koffer '+(f.case+1);card.append(name,avatar,brief,note);grid.append(card);cards.set(f.id,{card,note,f,p})}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const first=ascending[0];
 if(!reduced){grid.classList.add('finale-suspense');finaleLater(()=>{$('finale-tension').textContent='3'},450);finaleLater(()=>{$('finale-tension').textContent='2'},850);finaleLater(()=>{$('finale-tension').textContent='1'},1250)}
 finaleLater(()=>{const x=cards.get(first.f.id);x.card.classList.add('revealed','first-reveal');grid.classList.remove('finale-suspense');x.note.textContent='Kofferinhalt: '+eur(first.f.amount);$('finale-tension').textContent='ERSTE ENTHÜLLUNG';$('finale-caption').textContent='Der kleinste Kofferinhalt wird enthüllt …'},reduced?100:1600);
 finaleLater(()=>{for(const {f} of ascending.slice(1)){const x=cards.get(f.id);x.card.classList.add('revealed','group-reveal');x.note.textContent='Kofferinhalt: '+eur(f.amount)}$('finale-tension').textContent='ALLE KOFFERSCHÄTZE ENTHÜLLT';$('finale-caption').textContent='Alle übrigen Koffer werden gleichzeitig enthüllt!'},reduced?200:4100);
 finaleLater(()=>{grid.classList.add('champion-phase');$('finale-tension').textContent='🏆 DIE ENTSCHEIDUNG IST GEFALLEN 🏆';for(let i=0;i<45&&!reduced;i++){const piece=document.createElement('i');piece.className='finale-confetti';piece.style.left=(i*37%100)+'%';piece.style.setProperty('--drift',((i*19%110)-55)+'px');piece.style.setProperty('--delay',(i*13%45)/100+'s');piece.style.background=['#ffe5a0','#e5a840','#ffffff','#78b9ff'][i%4];$('finale-sparks').append(piece)}for(const w of winners){const x=cards.get(w.f.id);x.card.classList.add('winner','champion-focus');x.note.textContent='🏆 '+(w.p?.deal!==null?'Deal: ':'Gewinn: ')+eur(w.f.payout)}$('finale-title').textContent=winners.length>1?'Wir haben mehrere Gewinner!':'Der Gewinner steht fest!';$('finale-caption').textContent='Entscheidend ist die tatsächliche Auszahlung – inklusive angenommener Deals.';$('finale-champion-name').textContent=winners.map(w=>w.p?.name||'Spieler').join(' & ');$('finale-champion-value').textContent='Gewinn: '+eur(top);$('finale-champion').hidden=false;$('finale-replay').hidden=false},reduced?300:6600);
 // Keep the ceremony visible until the player chooses a new round or the results.
 // No automatic close: the winner and replay action remain accessible.
}
/* V47 — centralized visual scene director. Server phases remain authoritative. */
let lastSceneKey='',sceneTimer=null,sceneEpoch=0;
