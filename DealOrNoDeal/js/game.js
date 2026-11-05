
'use strict';const $=id=>document.getElementById(id),code=new URLSearchParams(location.search).get('room'),base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,''),values=[1,100,500,1000,2500,5000,7500,10000,20000,30000,40000,50000,75000,100000,500000,1000000,2500000,5000000,7500000,10000000,20000000,30000000,40000000,50000000,75000000,100000000],eur=v=>(v/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'});let g=null,busy=false,lastReveal=null,revealTimer=null,lastError='';
$('back').href='lobby.html?room='+encodeURIComponent(code||'');
function user(){const s=window.SpielOnline?.state?.();return s?.status==='online'?s.user:null}
function myId(){return user()?.uid||null}
async function request(method,path,body){let u=user();if(!u)throw Error('Bitte anmelden');let token=await u.getIdToken();let r=await fetch(base+'/api/deal-or-no-deal/'+encodeURIComponent(code)+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});let data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'SERVER_ERROR');return data}
function button(label,fn){let b=document.createElement('button');b.className='btn';b.textContent=label;b.disabled=busy;b.onclick=fn;return b}
async function action(type,extra={}){if(!g||busy)return;busy=true;lastError='';$('status').textContent='⏳ '+(type==='open'?'Koffer wird geöffnet …':'Aktion wird gespeichert …');try{let data=await request('POST','/action',{type,...extra,revision:g.revision,id:crypto.randomUUID()});g=data.game;render()}catch(e){lastError='⚠️ Aktion fehlgeschlagen: '+e.message;await poll();$('status').textContent=lastError}finally{busy=false;render();if(lastError)$('status').textContent=lastError}}
function turn(){if(!g)return null;for(let i=0;i<g.order.length;i++){let id=g.order[(g.turnIndex+i)%g.order.length];if(g.players.some(p=>p.id===id&&p.deal===null))return id}return null}
function free(i){return !g.opened.includes(i)&&!g.players.some(p=>p.case===i)}
function currentDecision(){let h=g?.history?.at(-1);return h?.participants.includes(myId())&&!h.decisions.some(d=>d.id===myId())?myId():null}
function makeCase(index,opened,owner,pending){const b=document.createElement('button');b.className='case';b.type='button';b.setAttribute('aria-label',opened?'Koffer '+(index+1)+': '+eur(opened.amount):owner?'Persönlicher Koffer '+(index+1):'Koffer '+(index+1));const shell=document.createElement('span');shell.className='case-shell';const handle=document.createElement('span');handle.className='case-handle';const inside=document.createElement('span');inside.className='case-interior';const amount=document.createElement('span');amount.className='case-amount';amount.textContent=opened?eur(opened.amount):'';inside.append(amount);const lid=document.createElement('span');lid.className='case-lid';const locks=document.createElement('span');locks.className='case-locks';locks.setAttribute('aria-hidden','true');locks.innerHTML='<i></i><i></i>';const number=document.createElement('span');number.className='case-number';number.textContent=owner?'◆':index+1;lid.append(number,locks);shell.append(handle,inside,lid);b.append(shell);if(opened)b.classList.add('opened');if(owner)b.classList.add('personal');if(pending){b.classList.add('revealing');b.setAttribute('aria-label','Koffer '+(index+1)+' wird gerade geöffnet')}return b}
const bankerPhrases=["Ich bin heute in Spendierlaune. Genießen Sie diesen seltenen Moment, bevor meine Buchhaltung mich wieder einfängt!","Mein professioneller Rat: Nehmen Sie das Geld. Mein unprofessioneller Rat: Spielen Sie weiter. Ich liebe fremdes Risiko!","Mein Taschenrechner nennt dieses Angebot hervorragend. Zugegeben, ich habe ihn selbst programmiert.","Für dieses Geld müssten manche Menschen lange arbeiten. Sie müssen nur einen Knopf drücken. Und selbst das scheint schwerzufallen!","Ich höre Ihr Herz bis in mein Büro schlagen. Oder ist das nur mein Geld, das Sie gerade ablehnen möchten?","Ich wollte weniger anbieten. Aber meine Sekretärin meinte, ich soll heute wenigstens einmal nett sein.","Sie glauben, in Ihrem Koffer steckt die Million? Ich glaube übrigens auch, dass mein nächster Lottoschein gewinnt.","Ich biete echtes Geld gegen einen unbekannten Koffer. Ein ausgezeichnetes Geschäft. Besonders für mich!","Natürlich können Sie weiterspielen. Ich habe nichts dagegen, wenn Sie mein schönes Angebot gegen 50 Cent eintauschen.","Wissen Sie, ich mag Sie. Würde ich Sie nicht mögen, hätte ich einfach aufgelegt!","Mein Kontostand bittet mich gerade, dieses Gespräch sofort zu beenden. Ich ignoriere ihn nur für Sie!","Bei diesem Angebot würde sogar mein Goldfisch Deal rufen. Und der hat sonst wirklich nichts zu sagen.","Ich habe die Zahlen dreimal geprüft. Zweimal mit dem Taschenrechner, einmal mit meinem überragenden Bauchgefühl.","Manche nennen mich geizig. Ich nenne es eine ausgeprägte Liebe zu meinem eigenen Geld.","Ich sehe schon, Sie wollen die Spannung. Meine Finanzabteilung bevorzugt übrigens Langeweile und niedrige Auszahlungen.","Das ist kein gewöhnliches Angebot. Das ist ein kleines Wunder mit zwei Nachkommastellen!","Sie können auf den großen Gewinn hoffen. Ich kann auf Ihren nächsten Fehler hoffen. Jeder braucht ein Hobby.","Meine Berater sagen: Seien Sie vernünftig. Ich sage: Machen Sie es spannend. Aber bitte auf Ihre Kosten!","Wenn Sie Nein sagen, tue ich ganz tapfer. Innerlich jubelt allerdings mein Sparschwein.","Ich habe Ihnen ein Angebot gemacht, das selbst mein Steuerberater für großzügig hält. Er musste sich danach erst einmal hinsetzen."];
function bankerPhrase(h){
 const seed=String(g?.id||'')+':'+String(h.round);
 let hash=2166136261;for(let i=0;i<seed.length;i++){hash=Math.imul(hash^seed.charCodeAt(i),16777619)}
 return bankerPhrases[(hash>>>0)%bankerPhrases.length];
}
function updateBankerCall(){
 const call=$('banker-call');
 if(!g||g.phase!=='decision'||!g.history?.length){call.hidden=true;call.classList.remove('call-entering');call.removeAttribute('data-offer-key');return}
 const h=g.history.at(-1);
 const offerKey=String(g.id)+'-'+String(h.round)+'-'+String(h.offer);
 if(call.dataset.offerKey!==offerKey){setAvatarReaction('thinking',2400);call.dataset.offerKey=offerKey;call.classList.remove('call-entering');void call.offsetWidth;if(!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches)call.classList.add('call-entering')}
 call.hidden=false;
 $('banker-call-quote').textContent='„'+bankerPhrase(h)+'“';
 $('banker-call-amount').textContent=eur(h.offer);
 const remainingCases=26-(g.openedAmounts?.length||0);
 const finalChoice=remainingCases<=3;
 $('final-choice-compare').hidden=!finalChoice;
 if(finalChoice){
  $('final-choice-offer').textContent=eur(h.offer);
  $('final-choice-footnote').textContent=remainingCases===1?'Der letzte Koffer. Nimmst du das sichere Angebot oder riskierst du alles?':remainingCases+' Koffer sind noch im Spiel. Wie viel Risiko gehst du ein?';
 }
 const mine=h.participants.includes(myId())&&!h.decisions.some(d=>d.id===myId());
 const voted=h.decisions.some(d=>d.id===myId());
 $('banker-call-sub').textContent=(26-(g.openedAmounts?.length||0))+' Kofferwerte noch im Spiel · '+(mine?'Entscheide jetzt selbst: Deal oder No Deal?':voted?'Deine Stimme ist gespeichert. Warte auf die anderen Spieler.':'Die Spieler stimmen gleichzeitig ab …');
 const total=h.participants.length;
 const castVotes=h.decisions.length;
 $('banker-vote-progress-fill').style.width=(total?100*castVotes/total:0)+'%';
 $('banker-vote-progress-text').textContent=castVotes+' von '+total+' Stimmen abgegeben · Entscheidungen geheim';
 $('banker-call-actions').hidden=!mine;
 $('banker-call-wait').hidden=!!mine;
 $('banker-call-deal').disabled=busy;
 $('banker-call-no-deal').disabled=busy;
}
$('banker-call-deal').addEventListener('click',()=>action('decide',{deal:true}));
$('banker-call-no-deal').addEventListener('click',()=>action('decide',{deal:false}));
let lastVoteRevealKey='';let voteRevealTimer=null;
function closeVoteReveal(){if(voteRevealTimer!==null){clearTimeout(voteRevealTimer);voteRevealTimer=null}if(lastVoteRevealKey)sessionStorage.setItem(lastVoteRevealKey,'seen');$('vote-reveal').hidden=true}
function revealVotesAfterAll(){
 if(!g||!g.history?.length)return;
 const h=g.history.at(-1);
 if(g.phase==='decision'||!h.participants?.length||h.decisions?.length!==h.participants.length)return;
 const key='deal-vote-reveal:'+g.id+':'+h.round;
 if(lastVoteRevealKey===key||sessionStorage.getItem(key)==='seen')return;
 const accepted=h.decisions.filter(d=>d.deal===true);
 lastVoteRevealKey=key;
 if(!accepted.length){sessionStorage.setItem(key,'seen');$('vote-reveal').hidden=true;return}
 const list=$('vote-reveal-list');list.replaceChildren();
 for(const d of accepted){
  const player=g.players.find(p=>p.id===d.id);
  const item=document.createElement('div');item.className='deal-accepted-person';
  const name=document.createElement('div');name.className='deal-accepted-name';name.textContent=(player?.name||'Ein Spieler')+' hat den Deal angenommen!';
  const amount=document.createElement('strong');amount.className='deal-accepted-amount';amount.textContent=eur(h.offer);
  item.append(name,amount);list.append(item);
 }
 $('vote-reveal').hidden=false;
 if(voteRevealTimer!==null)clearTimeout(voteRevealTimer);
 voteRevealTimer=setTimeout(closeVoteReveal,5500);
}
$('vote-reveal-close').addEventListener('click',closeVoteReveal);

let finaleSequenceKey='',finaleTimers=[];
function cancelFinaleTimers(){for(const t of finaleTimers)clearTimeout(t);finaleTimers=[]}
function finaleLater(fn,delay){finaleTimers.push(setTimeout(fn,delay))}
function finishFinaleCinema(){cancelFinaleTimers();if(finaleSequenceKey)sessionStorage.setItem('finale-watched:'+finaleSequenceKey,'yes');$('finale-cinema').hidden=true;$('finale-sparks').replaceChildren();$('final-show').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}
$('finale-skip').addEventListener('click',finishFinaleCinema);
function startFinaleCinema(){
 if(!g||g.phase!=='final'||!Array.isArray(g.finalValues)||!g.finalValues.length){if(!$('finale-cinema').hidden){cancelFinaleTimers();$('finale-cinema').hidden=true}return}
 const key=String(g.id)+':finale';
 if(finaleSequenceKey===key||sessionStorage.getItem('finale-watched:'+key)==='yes')return;
 finaleSequenceKey=key;cancelFinaleTimers();clearSceneTransition();resetCaseCamera();
 const entries=g.finalValues.map(f=>({f,p:g.players.find(p=>p.id===f.id)}));
 const ascending=[...entries].sort((a,b)=>a.f.amount-b.f.amount||a.f.case-b.f.case);
 const top=Math.max(...entries.map(x=>x.f.payout));
 const winners=entries.filter(x=>x.f.payout===top);
 const grid=$('finale-cases');grid.replaceChildren();grid.classList.remove('champion-phase','finale-suspense');$('finale-sparks').replaceChildren();$('finale-tension').textContent='DIE ENTSCHEIDUNG NAHT …';$('finale-stage-live')?.remove();
 $('finale-champion').hidden=true;$('finale-cinema').hidden=false;
 $('finale-title').textContent='Die letzten '+entries.length+' Koffer';
 $('finale-caption').textContent='Welcher Koffer enthält wie viel Geld?';
 const cards=new Map();
 for(const {f,p} of entries){const card=document.createElement('div');card.className='finale-player';const name=document.createElement('div');name.className='finale-player-name';name.textContent=p?.name||'Spieler';const avatar=document.createElement('img');avatar.className='finale-player-avatar';avatar.src='assets/avatar-'+(Number.isInteger(p?.avatar)&&p.avatar>=1&&p.avatar<=10?p.avatar:1)+'.svg';avatar.alt='Figur von '+(p?.name||'Spieler');const brief=document.createElement('div');brief.className='finale-briefcase';const front=document.createElement('div');front.className='finale-briefcase-front';front.textContent=f.case+1;const back=document.createElement('div');back.className='finale-briefcase-back';back.textContent=eur(f.amount);brief.append(front,back);const note=document.createElement('div');note.className='finale-player-note';note.textContent='Koffer '+(f.case+1);card.append(name,avatar,brief,note);grid.append(card);cards.set(f.id,{card,note,f,p})}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const first=ascending[0];
 if(!reduced){grid.classList.add('finale-suspense');finaleLater(()=>{$('finale-tension').textContent='3'},450);finaleLater(()=>{$('finale-tension').textContent='2'},850);finaleLater(()=>{$('finale-tension').textContent='1'},1250)}
 finaleLater(()=>{const x=cards.get(first.f.id);x.card.classList.add('revealed','first-reveal');grid.classList.remove('finale-suspense');x.note.textContent='Kofferinhalt: '+eur(first.f.amount);$('finale-tension').textContent='ERSTE ENTHÜLLUNG';$('finale-caption').textContent='Der kleinste Kofferinhalt wird enthüllt …'},reduced?100:1600);
 finaleLater(()=>{for(const {f} of ascending.slice(1)){const x=cards.get(f.id);x.card.classList.add('revealed','group-reveal');x.note.textContent='Kofferinhalt: '+eur(f.amount)}$('finale-tension').textContent='ALLE KOFFERSCHÄTZE ENTHÜLLT';$('finale-caption').textContent='Alle übrigen Koffer werden gleichzeitig enthüllt!'},reduced?200:4100);
 finaleLater(()=>{grid.classList.add('champion-phase');$('finale-tension').textContent='🏆 DIE ENTSCHEIDUNG IST GEFALLEN 🏆';for(let i=0;i<45&&!reduced;i++){const piece=document.createElement('i');piece.className='finale-confetti';piece.style.left=(i*37%100)+'%';piece.style.setProperty('--drift',((i*19%110)-55)+'px');piece.style.setProperty('--delay',(i*13%45)/100+'s');piece.style.background=['#ffe5a0','#e5a840','#ffffff','#78b9ff'][i%4];$('finale-sparks').append(piece)}for(const w of winners){const x=cards.get(w.f.id);x.card.classList.add('winner','champion-focus');x.note.textContent='🏆 '+(w.p?.deal!==null?'Deal: ':'Gewinn: ')+eur(w.f.payout)}$('finale-title').textContent=winners.length>1?'Wir haben mehrere Gewinner!':'Der Gewinner steht fest!';$('finale-caption').textContent='Entscheidend ist die tatsächliche Auszahlung – inklusive angenommener Deals.';$('finale-champion-name').textContent=winners.map(w=>w.p?.name||'Spieler').join(' & ');$('finale-champion-value').textContent='Gewinn: '+eur(top);$('finale-champion').hidden=false},reduced?300:6600);
 finaleLater(finishFinaleCinema,reduced?1500:11300);
}
/* V47 — centralized visual scene director. Server phases remain authoritative. */
let lastSceneKey='',sceneTimer=null,sceneEpoch=0;
function clearSceneTransition(){
 clearTimeout(sceneTimer);sceneTimer=null;
 const overlay=$('scene-transition');if(overlay){overlay.classList.remove('active');overlay.setAttribute('aria-hidden','true')}
}
function announceScene(){
 if(!g){lastSceneKey='';sceneEpoch++;clearSceneTransition();return}
 const phase=g.phase,round=g.round||0;
 const key=String(g.id)+'|'+phase+'|'+(phase==='decision'||phase==='open'?round:phase==='reveal'?g.pending?.eventId||'':'');
 if(key===lastSceneKey)return;
 const previous=lastSceneKey;lastSceneKey=key;const epoch=++sceneEpoch;
 clearSceneTransition();
 if(!previous||previous.split('|')[0]!==String(g.id))return;
 const captions={select:['DIE SHOW BEGINNT','Wählt eure persönlichen Glückskoffer'],final:['DAS GROSSE FINALE','Wer nimmt den höchsten Gewinn mit nach Hause?']};
 const info=captions[phase]||(phase==='open'&&previous.includes('|decision|')?['RUNDE '+(round+1),'Die Jagd nach dem großen Geld geht weiter']:null);
 /* During banker decisions the central phone modal is the main broadcast scene.
    Do not obscure the offer with a competing full-screen transition. */
 if(!info||document.hidden)return;
 const overlay=$('scene-transition');
 $('scene-title').textContent=info[0];$('scene-subtitle').textContent=info[1];
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');
 sceneTimer=setTimeout(()=>{if(epoch===sceneEpoch)clearSceneTransition()},phase==='final'?1600:950);
}
let directorLastGame='',directorSeenOpened=new Set(),prizeFlashTimer=null,prizeFlashDelay=null,directorLatestAmount=null,directorLatestUntil=0,cameraSequenceTimer=null,cameraSequenceCase=-1;
/* V55: reactions are derived from public server state; no secret votes are exposed. */
let avatarReactionGame='',avatarReactionUntil=0,avatarReactionType='',avatarReactionTimer=null;
let candidateCutawayTimer=null,candidateCutawayToken=0;
function closeCandidateCutaway(){
 clearTimeout(candidateCutawayTimer);candidateCutawayToken++;
 const panel=$('candidate-cutaway');if(panel){panel.hidden=true;panel.setAttribute('aria-hidden','true');panel.classList.remove('is-visible')}
}
function showCandidateCutaway(kind,caption,duration=2650){
 if(!g||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 if(g.phase==='final'||!g.players?.length)return;
 const current=g.players.find(p=>p.id===g.currentPlayerId)||g.players.find(p=>p.id===g.turnPlayerId)||g.players[0];
 if(!current)return;
 const avatarNumber=Number.isInteger(current.avatar)&&current.avatar>=1&&current.avatar<=10?current.avatar:g.players.indexOf(current)%4+1;
 const panel=$('candidate-cutaway');if(!panel)return;
 clearTimeout(candidateCutawayTimer);const token=++candidateCutawayToken;
 panel.dataset.mood=kind;
 $('candidate-cutaway-portrait').style.backgroundImage="url('assets/avatar-"+avatarNumber+".svg?v=57')";
 $('candidate-cutaway-name').textContent=current.name;
 $('candidate-cutaway-caption').textContent=caption;
 $('candidate-cutaway-kicker').textContent=kind==='shock'?'● LIVE · SCHOCKREAKTION':kind==='cheer'?'● LIVE · ERLEICHTERUNG':'● LIVE · KANDIDATENREAKTION';
 panel.hidden=false;panel.setAttribute('aria-hidden','true');panel.classList.remove('is-visible');
 requestAnimationFrame(()=>{if(token===candidateCutawayToken)panel.classList.add('is-visible')});
 candidateCutawayTimer=setTimeout(()=>{if(token===candidateCutawayToken)closeCandidateCutaway()},duration);
}

function setAvatarReaction(type,duration=2100){
 if(!g||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 avatarReactionType=type;avatarReactionUntil=Date.now()+duration;
 clearTimeout(avatarReactionTimer);
 avatarReactionTimer=setTimeout(()=>{avatarReactionType='';avatarReactionUntil=0;document.querySelectorAll('.player').forEach(el=>el.removeAttribute('data-reaction'))},duration);
}
function resetAvatarReaction(){
 clearTimeout(avatarReactionTimer);avatarReactionType='';avatarReactionUntil=0;
 document.querySelectorAll('.player').forEach(el=>el.removeAttribute('data-reaction'));
}
function resetCaseCamera(){
 clearTimeout(cameraSequenceTimer);cameraSequenceTimer=null;cameraSequenceCase=-1;
 document.body.classList.remove('case-camera-reveal','case-camera-afterglow');delete document.body.dataset.revealMood;
 const grid=$('cases');if(grid)for(const el of grid.children)el.classList.remove('camera-hero');
}
function showCaseCamera(caseIndex){
 resetCaseCamera();
 if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const grid=$('cases'),target=grid?.children[caseIndex];
 if(!target)return;
 cameraSequenceCase=caseIndex;target.classList.add('camera-hero');
 document.body.classList.add('case-camera-reveal');
 cameraSequenceTimer=setTimeout(()=>{
  document.body.classList.remove('case-camera-reveal');
  document.body.classList.add('case-camera-afterglow');
  cameraSequenceTimer=setTimeout(()=>resetCaseCamera(),850);
 },1050);
}
function directorReveal(){
 if(!g){resetCaseCamera();clearTimeout(prizeFlashTimer);clearTimeout(prizeFlashDelay);$('prize-flash').classList.remove('active');$('prize-flash').setAttribute('aria-hidden','true');directorLastGame='';directorSeenOpened.clear();directorLatestAmount=null;directorLatestUntil=0;document.body.classList.remove('reveal-spotlight');return}
 document.body.classList.toggle('reveal-spotlight',g.phase==='reveal');
 if(g.phase==='reveal'&&Number.isInteger(g.pending?.case)){
  const stage=document.querySelector('.case-stage'),grid=$('cases'),target=grid?.children[g.pending.case];
  if(stage&&target){const a=stage.getBoundingClientRect(),b=target.getBoundingClientRect();if(a.width&&a.height){stage.style.setProperty('--camera-x',((b.left+b.width/2-a.left)/a.width*100).toFixed(2)+'%');stage.style.setProperty('--camera-y',((b.top+b.height/2-a.top)/a.height*100).toFixed(2)+'%')}}
 }
 const gameKey=String(g.id);const amounts=g.openedAmounts||[];
 if(directorLastGame!==gameKey){closeCandidateCutaway();resetAvatarReaction();avatarReactionGame=gameKey;resetCaseCamera();clearTimeout(prizeFlashTimer);clearTimeout(prizeFlashDelay);$('prize-flash').classList.remove('active');$('prize-flash').setAttribute('aria-hidden','true');directorLastGame=gameKey;directorSeenOpened=new Set(amounts.map(x=>x.case));return}
 const newlyOpened=amounts.filter(x=>!directorSeenOpened.has(x.case));
 for(const item of amounts)directorSeenOpened.add(item.case);
 if(!newlyOpened.length||g.phase==='final')return;
 const item=newlyOpened.at(-1);directorLatestAmount=item.amount;directorLatestUntil=Date.now()+1800;
 const prizeScale=Array.isArray(values)&&values.length?values:[];
 const sortedScale=[...prizeScale].sort((a,b)=>a-b);
 const highThreshold=sortedScale[Math.floor(sortedScale.length*.8)]??Infinity;
 const lowThreshold=sortedScale[Math.floor(sortedScale.length*.25)]??-Infinity;
 const huge=item.amount>=highThreshold,small=item.amount<=lowThreshold;
 const mood=huge?'loss':small?'relief':'neutral';
 setAvatarReaction(huge?'shock':small?'cheer':'curious',2300);showCandidateCutaway(huge?'shock':small?'cheer':'curious',huge?'Ein großer Gewinn ist verloren!':small?'Die hohen Gewinne bleiben im Spiel!':'Ein weiterer Koffer ist geöffnet.',2550);
 const label=huge?'SCHOCK IM GOLDSTUDIO!':small?'GLÜCK GEHABT!':'KOFFER '+(item.case+1)+' GEÖFFNET';
 const flash=$('prize-flash');
 clearTimeout(prizeFlashTimer);clearTimeout(prizeFlashDelay);
 flash.classList.remove('active');flash.setAttribute('aria-hidden','true');
 const showReveal=()=>{
  if(!g||String(g.id)!==gameKey||g.phase==='final')return;
  flash.classList.toggle('prize-huge',huge);flash.classList.toggle('prize-relief',small);
  $('prize-flash-kicker').textContent=label;
  $('prize-flash-value').textContent=eur(item.amount);
  $('prize-flash-note').textContent=huge?'Ein Spitzenbetrag ist ausgeschieden!':small?'Ein kleiner Betrag ist weg – die großen Chancen bleiben!':'Das Rennen um den Hauptgewinn geht weiter.';
  flash.classList.add('active');flash.setAttribute('aria-hidden','false');
  prizeFlashTimer=setTimeout(()=>{flash.classList.remove('active');flash.setAttribute('aria-hidden','true')},matchMedia('(prefers-reduced-motion: reduce)').matches?650:1350);
 };
 /* Reveal follows the physical lid instead of racing it. The authoritative
    game state and all controls update immediately, without any artificial wait. */
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const target=$('cases')?.children[item.case];
 showCaseCamera(item.case);
 document.body.dataset.revealMood=mood;
 if(target&&!reduced){target.classList.add('case-newly-opened');target.addEventListener('animationend',()=>target.classList.remove('case-newly-opened'),{once:true})}
 prizeFlashDelay=setTimeout(showReveal,reduced?0:700);
}
function render(){if(!g||g.phase==='final'){resetCaseCamera();clearTimeout(prizeFlashDelay);clearTimeout(prizeFlashTimer);$('prize-flash').classList.remove('active');$('prize-flash').setAttribute('aria-hidden','true')}if(!g){resetAvatarReaction();document.body.classList.remove('show-high-stakes','show-final-stakes','reveal-spotlight')}announceScene();updateBankerCall();document.body.classList.toggle('offer-moment',g?.phase==='decision');if(!g){cancelFinaleTimers();$('finale-cinema').hidden=true;finaleSequenceKey='';$('final-show').hidden=true;$('bank-history').open=false;$('history-list').replaceChildren();$('bank-quote').textContent='„Jeder Koffer verändert das Spiel. Wie mutig bist du?“';$('show-phase').textContent='Warte auf den Spielstart';$('studio-progress-fill').style.width='0%';$('show-round').textContent='26 Koffer · bis zu 4 Spieler';$('header-round').textContent=$('show-round').textContent;$('offer').classList.remove('offer-active');$('status').textContent='Noch keine Partie gestartet. Gehe zur Lobby und starte als Host.';$('cases').replaceChildren();for(let i=0;i<26;i++){let b=makeCase(i,null,null,false);b.disabled=true;$('cases').append(b)}$('money-summary').textContent='26 Beträge im Spiel';$('money').replaceChildren();for(let v of values){let x=document.createElement('span');x.textContent=eur(v);$('money').append(x)}$('players').replaceChildren();$('actions').replaceChildren();$('actions').append(button('← Zur Lobby',()=>location.assign('lobby.html?room='+encodeURIComponent(code||''))));$('offer').textContent='Der Banker wartet auf den Spielstart.';return}$('show-phase').textContent=({select:'Die Kandidaten wählen ihre Koffer',open:'Die Kofferjagd läuft',reveal:'Der Koffer wird enthüllt',decision:'Der Banker macht ein Angebot',final:'Das große Finale',finished:'Die Show ist beendet'})[g.phase]||'Goldstudio Live';$('show-round').textContent='Runde '+Math.max(1,(g.round||0)+1)+' · '+g.opened.length+' / 26 geöffnet';$('header-round').textContent=$('show-round').textContent;$('studio-progress-fill').style.width=(g.opened.length/26*100).toFixed(1)+'%';$('bank-quote').textContent=g.phase==='decision'?'„Mein Angebot liegt auf dem Tisch. Deal oder No Deal?“':g.phase==='reveal'?'„Was verbirgt sich hinter diesem goldenen Deckel?“':g.phase==='final'?'„Jetzt kommt die Wahrheit ans Licht!“':g.phase==='open'?'„Ein einziger Koffer kann alles verändern.“':'„Willkommen in meiner Show.“';$('history-list').replaceChildren();for(let h of g.history||[]){const line=document.createElement('div');line.className='history-entry';const a=document.createElement('span');a.textContent='Runde '+h.round;const b=document.createElement('strong');b.textContent=eur(h.offer);line.append(a,b);$('history-list').append(line)}let who=g.phase==='select'?g.order[g.selectionIndex]:g.phase==='open'?turn():g.phase==='decision'?currentDecision():null;let p=g.players.find(x=>x.id===who);$('status').textContent=g.phase==='select'?'Persönliche Koffer wählen: '+p?.name:g.phase==='open'?'Koffer öffnen: '+p?.name:g.phase==='reveal'?'Der Koffer wird geöffnet …':g.phase==='decision'?'Bankangebot · Alle Spieler stimmen gleichzeitig ab':g.phase==='final'?'🏆 Finale: Persönliche Koffer werden enthüllt':'Partie beendet';
const caseGrid=$('cases');const oldCases=Array.from(caseGrid.children);const newCases=[];for(let i=0;i<26;i++){const opened=g.openedAmounts.find(x=>x.case===i),owner=g.players.find(x=>x.case===i),pending=g.pending?.case===i;const signature=[opened?.amount??'',owner?.id??'',pending?'reveal':''].join('|');let b=oldCases[i];if(!b||b.dataset.signature!==signature){b=makeCase(i,opened,owner,pending);b.dataset.signature=signature}b.disabled=busy||!free(i)||!['select','open'].includes(g.phase)||who!==myId();b.onclick=()=>action(g.phase==='select'?'select':'open',{case:i});newCases.push(b)}for(let i=0;i<newCases.length;i++){if(oldCases[i]!==newCases[i]){if(oldCases[i])oldCases[i].replaceWith(newCases[i]);else caseGrid.append(newCases[i])}}
const remaining=26-g.openedAmounts.length;
 document.body.classList.toggle('show-high-stakes',g.phase!=='final'&&remaining<=8);
 document.body.classList.toggle('show-final-stakes',g.phase!=='final'&&remaining<=3);
 directorReveal();$('money-summary').textContent=(26-g.openedAmounts.length)+' Beträge übrig · '+g.openedAmounts.length+' ausgeschieden';$('money').replaceChildren();for(let v of values){let x=document.createElement('span');x.textContent=eur(v);if(g.openedAmounts.some(a=>a.amount===v))x.className='gone';if(directorLatestAmount===v&&directorLatestUntil>Date.now())x.classList.add('just-eliminated');$('money').append(x)}
const previousAvatars=new Map(Array.from($('players').children).map(el=>[el.dataset.playerId,el.querySelector('.candidate-avatar')]));$('players').replaceChildren();for(let p of g.players){let el=document.createElement('div');el.dataset.playerId=String(p.id);el.className='player'+(p.id===who?' turn':'')+(p.deal!==null?' dealt':'');if(avatarReactionType&&avatarReactionUntil>Date.now()){const personality=(Number.isInteger(p.avatar)?p.avatar:g.players.indexOf(p))%4;const reactions={shock:['shock','disbelief','shock','freeze'],cheer:['cheer','relief','cheer','smile'],curious:['curious','thinking','curious','thinking'],thinking:['thinking','curious','thinking','freeze']};el.dataset.reaction=(reactions[avatarReactionType]||[])[personality]||avatarReactionType;}const avatar=previousAvatars.get(String(p.id))||document.createElement('span');avatar.className='candidate-avatar';avatar.style.setProperty('--candidate-image',"url('assets/avatar-"+(Number.isInteger(p.avatar)&&p.avatar>=1&&p.avatar<=10?p.avatar:(g.players.indexOf(p)%4+1))+".svg?v=57')");avatar.setAttribute('role','img');avatar.setAttribute('aria-label','Gewählter Spielcharakter');avatar.style.setProperty('--avatar-delay',(-((g.players.indexOf(p)*1.7)%6)).toFixed(1)+'s');avatar.dataset.personality=String((Number.isInteger(p.avatar)?p.avatar:g.players.indexOf(p))%4);avatar.dataset.avatarNumber=String(Number.isInteger(p.avatar)&&p.avatar>=1&&p.avatar<=10?p.avatar:(g.players.indexOf(p)%4+1));if(!avatar.querySelector('.avatar-portrait')){const portrait=document.createElement('span');portrait.className='avatar-portrait';portrait.setAttribute('aria-hidden','true');avatar.append(portrait);const face=document.createElement('span');face.className='avatar-expression';face.setAttribute('aria-hidden','true');face.append(document.createElement('span'),document.createElement('span'),document.createElement('span'));avatar.append(face)}el.append(avatar);let title=document.createElement('strong');title.className='candidate-name';title.textContent=p.name;el.append(title);let badge=document.createElement('span');badge.className='candidate-badge';badge.textContent=p.id===who?'Am Zug':p.deal!==null?'Deal gesichert':'Kandidat';el.append(badge);let desc=document.createElement('div');desc.className='candidate-status';desc.textContent=p.deal!==null?'🤝 DEAL · '+eur(p.deal):'Noch im Spiel';el.append(desc);if(p.case!==null){let c=document.createElement('div');c.className='personalcase';let f=g.finalValues?.find(x=>x.id===p.id);c.textContent='🧳 '+(p.case+1)+(f?' · '+eur(f.amount):'');el.append(c)}$('players').append(el)}
$('final-show').hidden=!(g.phase==='final'&&Array.isArray(g.finalValues));if(!$('final-show').hidden){const sorted=[...g.finalValues].sort((a,b)=>b.payout-a.payout);const max=Math.max(1,...sorted.map(x=>x.payout));$('final-sub').textContent=sorted.filter(x=>x.payout===max).map(x=>g.players.find(p=>p.id===x.id)?.name||'Spieler').join(' & ')+' gewinnt!';$('final-rankings').replaceChildren();for(let f of sorted){const el=document.createElement('div');el.className='final-contender'+(f.payout===max?' winner':'');const name=document.createElement('span');name.className='final-name';name.textContent=(f.payout===max?'🏆 ':'')+(g.players.find(p=>p.id===f.id)?.name||'Spieler');const winnerPlayer=g.players.find(p=>p.id===f.id);if(winnerPlayer){const portrait=document.createElement('img');portrait.className='final-avatar';portrait.src='assets/avatar-'+(Number.isInteger(winnerPlayer.avatar)&&winnerPlayer.avatar>=1&&winnerPlayer.avatar<=10?winnerPlayer.avatar:(g.players.indexOf(winnerPlayer)%4+1))+'.svg';portrait.alt='Figur von '+winnerPlayer.name;el.append(portrait)}const track=document.createElement('div');track.className='final-track';const bar=document.createElement('span');bar.className='final-bar';bar.style.setProperty('--final-width',(f.payout/max*100).toFixed(2)+'%');track.append(bar);const pay=document.createElement('span');pay.className='final-payout';pay.textContent=eur(f.payout);const detail=document.createElement('div');detail.className='final-detail';detail.textContent='Koffer '+(f.case+1)+' · Inhalt: '+eur(f.amount)+(g.players.find(p=>p.id===f.id)?.deal!==null?' · Deal angenommen':' · No Deal');el.append(name,track,pay,detail);$('final-rankings').append(el)}}
$('offer').classList.toggle('offer-active',g.phase==='decision');$('offer').textContent=g.phase==='decision'?'Bankangebot für alle: '+eur(g.offer):g.history.length?'Letztes Angebot: '+eur(g.history.at(-1).offer):'Der Banker wartet.';
$('actions').replaceChildren();if(g.phase==='reveal'&&g.pending?.actor===myId()&&!busy){$('status').textContent='🧳 Koffer '+(g.pending.case+1)+' öffnet sich – Enthüllung läuft …';$('actions').append(button('🧳 Enthüllung jetzt abschließen',()=>action('ack-reveal')));if(lastReveal!==g.pending.eventId){lastReveal=g.pending.eventId;clearTimeout(revealTimer);revealTimer=setTimeout(()=>{if(g?.phase==='reveal'&&g.pending?.eventId===lastReveal)action('ack-reveal')},3200)}}if(g.phase==='open'&&who!==myId())$('status').textContent+=' · Du bist gerade nicht am Zug.';if(g.phase==='final'&&g.finalValues){let max=Math.max(...g.finalValues.map(x=>x.payout));$('status').textContent='🏆 '+g.finalValues.filter(x=>x.payout===max).map(x=>g.players.find(p=>p.id===x.id)?.name).join(' & ')+' gewinnt mit '+eur(max)}revealVotesAfterAll();startFinaleCinema()}
async function poll(){if(!code||!user())return;try{let data=await request('GET','');if(!g||data.game?.revision!==g.revision){g=data.game;render()}}catch(e){$('status').textContent='Verbindung: '+e.message}}
$('studio-refresh').addEventListener('click',()=>window.location.reload());
$('studio-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement){await document.exitFullscreen()}else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen()}else{$('status').textContent='Vollbild wird von diesem Browser nicht unterstützt.'}}catch(e){$('status').textContent='Vollbild nicht verfügbar: '+e.message}});document.addEventListener('fullscreenchange',()=>{document.body.classList.toggle('is-fullscreen',!!document.fullscreenElement);$('studio-fullscreen').textContent=document.fullscreenElement?'⛶ Vollbild beenden':'⛶ Vollbild'});render();window.addEventListener('spielonline-change',poll);document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});window.addEventListener('pageshow',e=>{if(e.persisted)poll()});setInterval(()=>{if(!document.hidden)poll()},1800);poll();
