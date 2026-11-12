/* Die 100 Tore: read-only journey map. Never fabricates saved progress or a DOG unlock. */
(()=>{'use strict';
 const WORLDS=Object.freeze([
  {icon:'🌿',name:'Die vergessenen Ruinen',subtitle:'Hier beginnt eure Reise. Drei Helden finden die ersten Spuren des DOG-Schlosses.',description:'Die Wächter erwachen im verwachsenen Steinlabyrinth.'},
  {icon:'🌲',name:'Der verfluchte Wald',subtitle:'Die Dunkelheit wird dichter und eure Ausrüstung muss stärker werden.',description:'Zwischen Schatten und Dornen erwarten euch neue Gegner.'},
  {icon:'💎',name:'Die Kristallhöhlen',subtitle:'Seltene Materialien glitzern an den Wänden – aber die Höhlen werden bewacht.',description:'Hier beginnt die zweite Hälfte eurer Expedition.'},
  {icon:'🌋',name:'Das Flammengebirge',subtitle:'Feuer, Schmiedeglut und Drachenzeichen kündigen die letzten Prüfungen an.',description:'Nur gute Zusammenarbeit bringt euch dem DOG-Schloss näher.'},
  {icon:'🏰',name:'Die Festung der hundert Tore',subtitle:'Das legendäre DOG-Spiel ist bereits zu sehen. Noch trennt euch eine letzte Festung.',description:'Hinter dem hundertsten Tor wartet die letzte gemeinsame Prüfung.'}
 ]);
 const MAJOR_BOSSES=Object.freeze({
  10:'Aschewächter',20:'Schattenfürst',30:'Kristallwurm',40:'Dornenkönig',
  50:'Hüter der Tiefe',60:'Flammendrache',70:'Seelenrichter',
  80:'Eisenkoloss',90:'Festungswächter',100:'Der letzte Wächter'
 });
 const BOSS_ART=Object.freeze({
  10:'aschewaechter.svg',20:'schattenfuerst.svg',
  30:'kristallwurm.svg',40:'dornenkoenig.svg',
  50:'hueter-der-tiefe.svg',60:'flammendrache.svg',
  70:'seelenrichter.svg',80:'eisenkoloss.svg',
  90:'festungswaechter.svg',100:'letzter-waechter.svg'
 });
 const MINI_BOSSES=Object.freeze({
  5:'Steinbrecher',15:'Schattenwolf',25:'Dornenbestie',35:'Kristallgolem',
  45:'Giftstachel',55:'Lavabestie',65:'Seelenjäger',75:'Jungdrache',
  85:'Dunkler Ritter',95:'Todeswächter'
 });
 const $=id=>document.getElementById(id);
 const PILOT_IDS=['dog-live-bot-nova','dog-live-bot-titan'];
 const PILOT_KEY='dog:private-100:link-key';
 const pilotHash=new URLSearchParams(String(location.hash||'').slice(1)).get('k');
 if(pilotHash&&pilotHash.length>=20){
  try{localStorage.setItem(PILOT_KEY,pilotHash)}catch{}
  history.replaceState(null,'',location.pathname+location.search);
 }
 let pilotKey='';
 try{pilotKey=localStorage.getItem(PILOT_KEY)||''}catch{}
 if($('pilot-code'))$('pilot-code').value=pilotKey;
 const worldRoot=$('worlds'),details=$('details'),pathList=[];
 const gateButtons=new Map();
 let mapState=null,selectedGate=null,working=false,mapRequestEpoch=0,lastFight=null,heroSaving=false,stagedHero=null;
 const HERO_CLASSES=['krieger','magierin','waechter'];
 const HERO_LABELS={krieger:'Krieger',magierin:'Magierin',waechter:'Wächter'};
 const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const $node=(tag,klass,text)=>{
  const el=document.createElement(tag);
  if(klass)el.className=klass;
  if(text!==undefined)el.textContent=String(text);
  return el;
 };
 const auth=()=>{
  const state=window.SpielOnline?.state?.();
  return state?.status==='online'&&state.user?.uid&&
   state.profile?.setupComplete!==false?state:null;
 };
 const requestId=()=>globalThis.crypto?.randomUUID?.()?
  'dog-'+globalThis.crypto.randomUUID():
  'dog-'+Date.now()+'-'+Math.random().toString(36).slice(2,15);
 const pendingKey=uid=>'dog:map:pending-fight:'+uid;
 const readPending=uid=>{
  try{
   const v=JSON.parse(localStorage.getItem(pendingKey(uid))||'null');
   return v&&/^[A-Za-z0-9_-]{12,90}$/.test(v.id)&&Number.isSafeInteger(v.gate)&&
    v.gate>=1&&v.gate<=99&&v.gate%10!==0?v:null;
  }catch{return null;}
 };
 const storePending=(uid,data)=>{
  try{localStorage.setItem(pendingKey(uid),JSON.stringify(data));
   return localStorage.getItem(pendingKey(uid))===JSON.stringify(data);
  }catch{return false;}
 };
 const clearPending=uid=>{try{localStorage.removeItem(pendingKey(uid));}catch{}};

 function setTeamStatus(message){$('team-status').textContent=message;}
 async function request(method,route,body,uid){
  const state=auth();
  if(!state||state.user.uid!==uid)throw Error('LOGIN_REQUIRED');
  const token=await state.user.getIdToken();
  if(auth()?.user?.uid!==uid)throw Error('ACCOUNT_CHANGED');
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timeout=controller?setTimeout(()=>controller.abort(),18000):null;
  try{
   const res=await fetch(API+'/api/dog/gates/'+route,{
    method,cache:'no-store',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),...(controller?{signal:controller.signal}:{})
   });
   const data=await res.json().catch(()=>({ok:false,error:'DOG_GATE_UNAVAILABLE'}));
   if(!res.ok||data.ok!==true)throw Error(data.error||'DOG_GATE_UNAVAILABLE');
   if(auth()?.user?.uid!==uid)throw Error('ACCOUNT_CHANGED');
   return data;
  }finally{if(timeout!==null)clearTimeout(timeout);}
 }
 function updateMarkers(){
  for(const [gate,button] of gateButtons){
   const area=button.querySelector('.party-pins');
   if(!area)continue;
   area.replaceChildren();
   const visiting=(mapState?.members||[]).filter(member=>member.currentGate===gate);
   for(const member of visiting){
    const memberIndex=mapState.members.findIndex(m=>m.uid===member.uid);
    const mark=$node('span','party-pin hero-'+(memberIndex+1),member.name.slice(0,1).toUpperCase());
    mark.title=member.name+(member.isMe?' (du)':'')+' · Tor '+gate;
    mark.setAttribute('aria-label',mark.title);
    area.append(mark);
   }
   const count=visiting.length;
   button.setAttribute('aria-label','Tor '+gate+': '+titleFor(gate)+
    (count?' · '+visiting.map(x=>x.name).join(', ')+' hier':'')+'. Details ansehen');
  }
 }

 function renderExpeditionProgress(){
   const verified=mapState?.isMember===true;
   $('expedition-progress').hidden=!verified;
   const victory=verified&&mapState.dogUnlocked===true;
   $('event-castle').dataset.victory=victory?'yes':'no';
   const lock=$('dog-lock');
   lock.textContent=victory?'🏆 Tor 100 besiegt – Expedition abgeschlossen!':'🔒 DOG – noch verschlossen';
   const marks=$('ep-milestones');marks.replaceChildren();
   if(!verified)return;
   const won=new Set((mapState.sharedBosses||[]).filter(n=>Number.isSafeInteger(n)&&n>=10&&n<=100&&n%10===0));
   const own=mapState.progress||{};
   const mine=mapState.members?.find(m=>m.isMe);
   const length=(v,max)=>Array.isArray(v)?Math.min(v.length,max):0;
   $('ep-high').textContent=String(Math.max(1,Math.min(100,mine?.highestGate||own.highestGate||1)));
   $('ep-normal').textContent=length(own.normals,80)+' / 80';
   $('ep-mini').textContent=length(own.minis,10)+' / 10';
   $('ep-boss').textContent=won.size+' / 10';
   $('ep-bar').setAttribute('aria-valuenow',String(won.size));
   $('ep-fill').style.width=(won.size*10)+'%';
   const next=Array.from({length:10},(_,i)=>(i+1)*10).find(n=>!won.has(n));
   $('ep-next').textContent=next?'Nächster Gruppenboss: Tor '+next:'🏆 Alle zehn Wächter besiegt!';
   for(let n=10;n<=100;n+=10){
     const yes=won.has(n);
     const badge=$node('span','ep-mark'+(yes?' won':''),yes?'✓':String(n));
     badge.title='Tor '+n+': '+(yes?'besiegt':'noch offen');
     badge.setAttribute('aria-label',badge.title);
     marks.append(badge);
   }
 }
 function renderMembers(){
   renderExpeditionProgress();
   const botsAdded=mapState?.isMember===true&&
    PILOT_IDS.every(id=>mapState.members?.some(m=>m.uid===id));
   $('pilot-bots').hidden=botsAdded;
   $('pilot-add-bots').disabled=working||!auth();
   if(botsAdded)$('pilot-status').textContent='✅ Nova und Titan spielen mit deinem echten Profil.';
   else $('pilot-status').textContent=auth()?
    '🧪 Du kannst die zwei Bots jetzt hinzufügen.':
    '🔒 Melde dich mit deinem Spielerprofil an.';
  const area=$('team-members');area.replaceChildren();
  const team=mapState?.members||[];
  if(!team.length){
   area.append($node('div','team-empty','Noch keine bestätigten Teampositionen vorhanden.'));
  }
  for(let i=0;i<3;i++){
   const member=team[i];
   const card=$node('div','member-card hero-'+(i+1)+(member?.isMe?' own':'')); 
   if(member){
    const avatar=$node('span','member-avatar dog-hero-art is-'+(HERO_CLASSES.includes(member.heroClass)?member.heroClass:HERO_CLASSES[i]),member.name.slice(0,1).toUpperCase());
    const text=$node('div','member-copy');
    text.append($node('strong',null,member.name+(member.isMe?' (du)':'')));
    text.append($node('span',null,'📍 Aktuell: Tor '+member.currentGate+' · 🎭 '+(HERO_LABELS[member.heroClass]||HERO_LABELS[HERO_CLASSES[i]])));
    text.append($node('small',null,'🏅 Höchstes erreichtes Tor: '+
     (member.highestGate??member.currentGate)));
    text.append($node('small',null,member.lastAttemptAt?
     'Zuletzt kämpfte hier: '+new Date(member.lastAttemptAt).toLocaleString('de-DE'):
     'Noch kein persönlicher Kampf gespeichert'));
    card.append(avatar,text);
   }else{
    card.append($node('span','member-avatar','?'));
    card.append($node('div','member-copy','Freier Heldenplatz'));
   }
   area.append(card);
  }
  const logged=auth(),mine=team.find(m=>m.isMe);
  const locked=mine?.heroLocked===true;
  const mayChoose=!!logged&&!!mapState&&
   ((!!mine&&!locked)||(!mapState.isMember&&mapState.canJoin));
  const summary=$('hero-locked-summary');
  summary.hidden=!locked;
  if(locked)$('hero-locked-name').textContent=HERO_LABELS[mine.heroClass]||'Dein Held';
  const selector=$('hero-selection');
  if(mayChoose){
   selector.hidden=false;
   if(!selector.open)selector.showModal?.();
  }else{
   if(selector.open)selector.close?.();
   selector.hidden=true;
   stagedHero=null;
  }
  for(const choice of (selector.querySelectorAll?.('[data-hero-class]')||[])){
   choice.setAttribute('aria-pressed',String(choice.dataset.heroClass===stagedHero));
   choice.disabled=heroSaving;
  }
  $('hero-confirm').disabled=heroSaving||!stagedHero||!mayChoose;
  // Enrollment is part of the final choice; nobody can join without choosing.
  const join=$('team-join');
  join.hidden=true;join.disabled=true;
  updateMarkers();
  updateGateActions();
 }
 const CHEST_NAMES={wood:'Holzkiste',iron:'Eisenkiste',silver:'Silberkiste',
  gold:'Goldkiste',legendary:'Legendäre Truhe'};
 const PACK_NAMES={small:'Kleines Weihnachtskartenpaket',large:'Großes Weihnachtskartenpaket',
  premium:'Premium-Weihnachtskartenpaket'};
 const HAMMER_NAMES={single:'Einzelhammer',double:'Doppelhammer',lucky:'Goldener Hammer'};
 function displayMiniReward(reward,gate){
  const panel=$('gate-mini-reward');
  panel.hidden=true;
  if(!reward?.granted)return;
  const title=$('gate-mini-reward-title'),detail=$('gate-mini-reward-details');
  const link=$('gate-mini-reward-link');
  link.hidden=true;
  if(reward.kind==='chest'){
   title.textContent='📦 '+(CHEST_NAMES[reward.tier]||'Rohstoffkiste');
   detail.textContent='Eine Kiste mit '+Number(reward.count)+' Rohstoffen wurde dir gutgeschrieben. Du kannst sie im Rohstofflager öffnen.';
   link.href='./dog-expedition.html'+roomSuffix;link.hidden=false;
  }else if(reward.kind==='coins'){
   title.textContent='💰 '+Number(reward.amount).toLocaleString('de-DE')+' €';
   detail.textContent='Die Geldprämie ist auf deinem Deal-or-No-Deal-Konto angekommen.';
  }else if(reward.kind==='cards'){
   title.textContent='🎴 '+(PACK_NAMES[reward.packId]||'Kartenpaket-Gutschein');
   detail.textContent='Ein kostenloses Kartenpaket ist im Weihnachtsevent zur Einlösung bereit.';
  }else if(reward.kind==='hammer'){
   title.textContent='🔨 '+(HAMMER_NAMES[reward.hammer]||'Hammer');
   detail.textContent='Der Hammer ist deinem Eisblock-Inventar gutgeschrieben.';
  }else if(reward.kind==='joker'){
   title.textContent='🃏 Ein Koffer-Joker';
   detail.textContent='Der Joker ist deinem Joker-Inventar gutgeschrieben.';
  }else{
   title.textContent='🎁 Belohnung gespeichert';
   detail.textContent='Deine einmalige Mini-Boss-Belohnung wurde vom Server bestätigt.';
  }
  panel.hidden=false;
 }
 function previousNormal(gate){
  for(let i=gate-1;i>=1;i--)if(i%5!==0)return i;
  return null;
 }
 function updateGateActions(){
  const button=$('gate-battle-button'),boss=$('gate-boss-button');
  const notice=$('gate-fight-status'),pending=auth()?.user?.uid?readPending(auth().user.uid):null;
  $('gate-retry-button').hidden=!pending;
  $('gate-retry-button').disabled=working;
  if(!selectedGate)return;
  const gate=selectedGate,group=gate%10===0;
  button.hidden=group;boss.hidden=!group;
  if(group){
   if(gate===10){
    boss.hidden=false;
    boss.href='./dog-boss10.html'+roomSuffix;
    boss.textContent='🐉 Gemeinsam Boss 10 starten';
    boss.setAttribute('aria-label','Die echte gemeinsame Tor-10-Bossarena betreten');
    notice.textContent=(mapState?.sharedBosses||[]).includes(10)?
     '🏆 Euer gemeinsamer Sieg über Boss 10 ist gespeichert. Die nächste Schmiedestufe ist freigeschaltet.':
     '🐉 Boss 10: Mit 1, 2 oder 3 Helden starten. Nur die Teilnehmer müssen Tor 9 geschafft haben und auf Bereit klicken. Allein ist der Sieg unmöglich, zu dritt habt ihr die besten Chancen.';
   }else{
    boss.hidden=false;
    boss.href='./dog-group-boss.html?gate='+gate+
     (roomSuffix?'&'+roomSuffix.slice(1):'');
    boss.textContent='🐉 Gruppenboss '+gate+' herausfordern';
    boss.setAttribute('aria-label','Bossarena für Tor '+gate+' betreten');
    const previousBoss=gate-10;
    notice.textContent=(mapState?.sharedBosses||[]).includes(gate)?
     '🏆 Boss '+gate+' gemeinsam besiegt! '+(gate===100?
      'Das DOG-Schloss ist von eurer Expedition erreicht worden.':
      'Die nächste Schmiedestufe ist freigeschaltet.'):
     !(mapState?.sharedBosses||[]).includes(previousBoss)?
      '🔒 Vor Boss '+gate+' müsst ihr gemeinsam Boss '+previousBoss+
      ' besiegen. Ihr könnt die Arena schon ansehen, aber noch nicht starten.':
      '🐉 Mit 1, 2 oder 3 vorbereiteten Helden starten. Alleine ist ein Sieg unmöglich; zwei maximale Helden können mit Glück gewinnen. Zu dritt habt ihr die besten Chancen.';
   }
   return;
  }
  const me=mapState?.progress;
  const done=(gate%10===5?me?.minis:me?.normals)||[];
  const prereq=previousNormal(gate);
  const ready=prereq===null||me?.normals?.includes(prereq);
  // A hero may explore five gates past the previous shared boss:
  // up to Tor 15 before Boss 10, Tor 25 before Boss 20, etc.
  const requiredBoss=gate>=16?Math.floor((gate-6)/10)*10:0;
  const bossReady=requiredBoss===0||!!mapState?.sharedBosses?.includes(requiredBoss);
  const member=!!mapState?.isMember&&
  mapState.members?.some(m=>m.isMe&&m.heroLocked===true);
  button.disabled=working||!!pending||!member||!ready||!bossReady||done.includes(gate);
  button.textContent=gate%10===5?'👹 Mini-Boss herausfordern':'⚔️ Schnellkampf starten';
  notice.textContent=pending?'⚠️ Ein früherer Kampf bei Tor '+pending.gate+
   ' muss zuerst sicher wiederholt werden.':
   done.includes(gate)?'✅ Dieses Tor hast du bereits besiegt.':
   !auth()?'🔒 Melde dich mit deinem Online-Spielerprofil an, um Kämpfe zu starten.':
   !member?'🛡️ Tritt oben zuerst der Dreier-Expedition bei.':
   !bossReady?'🔒 Tor '+gate+' wird erst nach eurem gemeinsamen Sieg über Boss '+
    requiredBoss+' freigeschaltet. Bis Tor '+(requiredBoss+5)+
    ' könnt ihr euch ohne diesen Sieg vorwagen.':
   !ready?'🔒 Um Tor '+gate+' zu kämpfen, musst du zuerst das normale Tor '+
    prereq+' besiegen. Mini-Bosse sind optional.':
   '⚔️ Bereit. Das Kampfergebnis wird vom Server berechnet und gespeichert.';
  if(lastFight?.gate===gate)notice.textContent=lastFight.message;
 }
 async function reloadMap(){
  const account=auth()?.user?.uid;
  const epoch=++mapRequestEpoch;
  if(!account){
   mapState=null;
   setTeamStatus('🔒 Melde dich an, damit die gespeicherten Torpositionen angezeigt werden.');
   renderMembers();return;
  }
  try{
   const result=await request('GET','map',null,account);
   if(epoch!==mapRequestEpoch||auth()?.user?.uid!==account)return;
   mapState=result;
   renderMembers();
   setTeamStatus(result.isMember?
    '✅ Positionen geladen · '+result.memberCount+'/3 Helden · Änderungen können beim Aktualisieren sichtbar werden.':
    '🛡️ '+result.memberCount+'/3 Helden sind im Team. Tritt bei, damit dein Tor für die anderen sichtbar wird.');
  }catch(e){
   if(epoch!==mapRequestEpoch)return;
   mapState=null;renderMembers();
   setTeamStatus(e.message==='DOG_EVENT_NOT_PUBLIC'?
    '🔒 Die Expedition ist noch nicht öffentlich. Bitte oben die zwei Testspieler hinzufügen.':
    '⚠️ Serverpositionen momentan nicht verfügbar. Keine erfundenen Torstände angezeigt.');
  }
 }
 async function addTwoBots(){
  const login=auth();
  if(!login){$('pilot-status').textContent='🔒 Bitte zuerst anmelden.';return;}
  if(working)return;
  const code=String($('pilot-code').value||pilotKey).trim();
  if(code.length<20){
   $('pilot-status').textContent='🔑 Öffne deinen privaten Link oder gib den Freigabecode ein.';
   return;
  }
  try{localStorage.setItem(PILOT_KEY,code)}catch{}
  pilotKey=code;working=true;$('pilot-add-bots').disabled=true;
  $('pilot-status').textContent='⏳ Nova und Titan werden mit deinem echten Profil verbunden …';
  try{
   const uid=login.user.uid,token=await login.user.getIdToken();
   if(auth()?.user?.uid!==uid)throw Error('ACCOUNT_CHANGED');
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
   let response;
   try{
    response=await fetch(API+'/api/dog/live-bots/enable',{
     method:'POST',cache:'no-store',signal:controller.signal,
     headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',
      'X-DOG-Preview-Key':code},
     body:'{}'
    });
   }finally{clearTimeout(timer)}
   const value=await response.json().catch(()=>({ok:false,error:'DOG_PILOT_UNAVAILABLE'}));
   if(!response.ok||value.ok!==true)throw Error(value.error||'DOG_PILOT_UNAVAILABLE');
   if(auth()?.user?.uid!==uid)return;
   mapState=value;renderMembers();
   setTeamStatus('✅ Du, Nova und Titan sind verbunden. Du kannst auf der echten Karte Tore spielen.');
  }catch(e){
   $('pilot-status').textContent=['DOG_BOTS_OTHER_PLAYERS_IN_TEAM','DOG_BOTS_OTHER_PLAYERS_IN_PROGRESS'].includes(e.message)?
    '⚠️ In der bisherigen Gruppe sind noch andere echte Spieler. Ihre Daten werden nicht überschrieben.':
    e.message==='DOG_BOTS_RESERVED'?'🔒 Der private Zugang gehört bereits einem anderen Konto.':
    '⚠️ Hinzufügen nicht bestätigt: '+e.message;
  }finally{working=false;$('pilot-add-bots').disabled=!auth();}
 }
 async function chooseHero(heroClass){
  const account=auth()?.user?.uid;
  if(!HERO_CLASSES.includes(heroClass)||!account||heroSaving||!mapState||
   (!mapState.isMember&&!mapState.canJoin)||!$('hero-selection').open)return;
  heroSaving=true;renderMembers();
  $('hero-selection-status').textContent='⏳ Deine endgültige Charakterwahl wird gespeichert …';
  try{
   const result=await request('POST','hero',{heroClass},account);
   if(auth()?.user?.uid!==account)return;
   mapState=result;stagedHero=null;
   setTeamStatus('✅ Dein Held '+HERO_LABELS[heroClass]+' ist dauerhaft festgelegt. Dein Abenteuer kann beginnen!');
  }catch(e){
   const code=e?.message||'DOG_GATE_UNAVAILABLE';
   $('hero-selection-status').textContent=
    code==='DOG_GATE_TEAM_FULL'?'⚠️ Alle drei Expeditionsplätze sind bereits belegt.':
    code==='DOG_HERO_ALREADY_LOCKED'?'🔒 Für dieses Profil wurde bereits ein anderer Held endgültig bestätigt. Aktualisiere die Karte.':
    '⚠️ Die endgültige Wahl wurde nicht bestätigt ('+code+'). Bitte erneut versuchen.';
  }finally{heroSaving=false;renderMembers();}
 }
  async function joinTeam(){
  const account=auth()?.user?.uid;
  if(!account||working||!mapState?.canJoin)return;
  working=true;renderMembers();setTeamStatus('🛡️ Du wirst der Expedition hinzugefügt …');
  try{
   const result=await request('POST','join',{},account);
   if(auth()?.user?.uid!==account)return;
   mapState=result;renderMembers();
   setTeamStatus('✅ Du gehörst zur Dreier-Expedition. Dein Weg beginnt bei Tor 1.');
  }catch(e){setTeamStatus('⚠️ Beitritt nicht bestätigt ('+e.message+'). Bitte aktualisieren.');}
  finally{working=false;renderMembers();}
 }
 function showQuickFightResult(gate,fight,replayed){
  const modal=$('gate-quick-result');
  if(!modal)return;
  const win=!!fight.win;
  modal.classList.toggle('quick-win',win);
  modal.classList.toggle('quick-loss',!win);
  $('gate-quick-result-kicker').textContent='TOR '+gate+' · SCHNELLKAMPF';
  $('gate-quick-result-icon').textContent=win?'🏆':'💀';
  $('gate-quick-result-title').textContent=win?'SIEG!':'NIEDERLAGE';
  $('gate-quick-result-text').textContent=win?
   'Tor '+gate+' wurde besiegt. Dein Fortschritt ist gespeichert.':
   'Tor '+gate+' ist noch nicht besiegt. '+(fight.combat?.feedback?.message||
    'Verbessere deine Ausrüstung und versuche es erneut.');
  const stats=fight.combatStats;
  const area=$('gate-quick-result-stats');
  area.replaceChildren();
  if(stats&&stats.model==='single-roll-summary-v1'){
   const rows=[
    ['Gegner-LP',stats.enemyRemainingHp+' / '+stats.enemyMaxHp],
    ['Dein verursachter Schaden',String(stats.enemyDamageTaken)],
    ['Deine verbleibenden LP',stats.heroRemainingHp+' / '+stats.heroMaxHp],
    ['Erlittener Schaden',String(stats.heroDamageTaken)],
    ['Siegchance',stats.chancePercent+' %'],
    ['Waffenstufe / Rüstungsstufe',stats.weaponLevel+' / '+stats.armorLevel]
   ];
   for(const [label,value] of rows){
    const row=document.createElement('div');row.className='quick-result-stat';
    const key=document.createElement('span');key.textContent=label;
    const val=document.createElement('strong');val.textContent=value;
    row.append(key,val);area.append(row);
   }
   $('gate-quick-result-model').hidden=false;
  }else{
   $('gate-quick-result-model').hidden=true;
   const p=document.createElement('p');p.textContent=
    'Für diesen älteren Kampf sind noch keine LP- und Schadenswerte gespeichert.';
   area.append(p);
  }
  $('gate-quick-result-note').textContent=replayed?
   '✓ Bereits berechnetes Serverergebnis sicher wiederhergestellt.':
   '✓ Ergebnis vom Server berechnet und bestätigt.';
  if(details.open)details.close();
  if(!modal.open)modal.showModal();
 }
 async function fightGate(retry=false){
  const account=auth()?.user?.uid;
  if(!account||working||!mapState?.isMember||
   !mapState.members?.some(m=>m.isMe&&m.heroLocked===true))return;
  const old=readPending(account);
  if(retry&&!old)return;
  if(!retry&&old)return;
  const gate=old?.gate??selectedGate;
  if(!Number.isSafeInteger(gate)||gate%10===0)return;
  const pending=old||{id:requestId(),gate};
  if(!old&&!storePending(account,pending)){
   $('gate-fight-status').textContent='⚠️ Die Aktionskennung konnte nicht gesichert werden. Kampf nicht gestartet.';
   return;
  }
  lastFight=null;
  $('gate-mini-reward').hidden=true;
  working=true;updateGateActions();
  $('gate-fight-status').textContent='⚔️ Der Server berechnet deinen Kampf bei Tor '+gate+' …';
  try{
   const result=await request('POST','fight',pending,account);
   if(auth()?.user?.uid!==account)return;
   clearPending(account);
   mapState=result.map;
   renderMembers();
   const fight=result.result;
   let status=fight.win?
    '🏆 Tor '+gate+' geschafft! Dein Sieg ist gespeichert.':
    '💀 Tor '+gate+' verloren. '+(fight.combat?.feedback?.message||
      'Verbessere deine Ausrüstung und versuche es erneut.');
   if(fight.type==='mini'&&fight.win){
    displayMiniReward(fight.miniReward,gate);
    if(fight.miniReward?.granted)status+=' 🎁 Deine einmalige Belohnung wurde gutgeschrieben!';
   }
   if(result.replayed)status+=' (Sicher wiederhergestellt)';
   lastFight={gate,message:status};
   if(fight.type!=='mini'&&gate%10!==5)showQuickFightResult(gate,fight,!!result.replayed);
   $('gate-fight-status').textContent=status;
   setTeamStatus('✅ Dein gespeichertes Tor wurde aktualisiert.');
  }catch(e){
   // Preserve the request ID after an unknown network/server error.
   // Definitive application errors did not award the fight.
   if(['DOG_GATE_ALREADY_WON','DOG_GATE_PREVIOUS_REQUIRED','DOG_GATE_INVALID',
     'DOG_GATE_COOLDOWN','NOT_DOG_TEAM_MEMBER','DOG_GATE_RECEIPT_CONFLICT'].includes(e.message)){
     clearPending(account);
   }
   $('gate-fight-status').textContent='⚠️ Kampf nicht bestätigt: '+e.message+
    '. Bei unklarem Ergebnis kannst du dieselbe Aktion sicher wiederholen.';
  }finally{working=false;updateGateActions();}
 }

 const params=new URLSearchParams(location.search);
 const room=params.get('room');
 const roomSuffix=room&&/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room)?
  '?room='+encodeURIComponent(room):'';
 if(room&&/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room)){
  const q='?room='+encodeURIComponent(room);
  for(const [id,url] of [['back-event','./dog-expedition.html'],['back-forge','./dog-forge.html']]){
   const a=$(id);if(a)a.href=url+q;
  }
 }
 const titleFor=gate=>gate===100?'Finaler Gruppenboss – Der letzte Wächter':
  gate%10===0?'Gemeinsamer Boss – '+MAJOR_BOSSES[gate]:
  gate%10===5?'Solo-Mini-Boss – '+MINI_BOSSES[gate]:
  'Schnellkampf – Tor '+gate;
 const summaryFor=gate=>{
  if(gate===100)return 'Der letzte Wächter verteidigt das DOG-Schloss. Ein Held darf ihn herausfordern, zwei können nur mit sehr viel Glück siegen. Drei gut aufgerüstete Helden sind eure beste Chance. Erst der bestätigte Sieg darf DOG freischalten.';
  if(gate%10===0)return 'Gemeinsamer Bosskampf: mit 1–3 Helden startbar, aber am besten zu dritt. Der Sieg schaltet die nächste Schmiedestufe und Ausrüstung frei.';
  if(gate%10===5)return 'Ein besonders harter Einzelkampf: Eine gute Waffe allein reicht oft nicht. Verstärke auch Rüstung und Fähigkeiten. Nach einem erstmaligen Sieg winkt eine besondere zufällige Belohnung.';
  return 'Ein Klick genügt: Der Server berechnet sofort Sieg oder Niederlage anhand deiner Ausrüstung (30–80 % Gewinnchance). Das Ergebnis erscheint direkt im Fenster. Nach einer Niederlage kannst du es erneut versuchen.';
 };
 function selectGate(gate,button){
  for(const selected of document.querySelectorAll('.gate[aria-pressed="true"]'))selected.setAttribute('aria-pressed','false');
  button?.setAttribute('aria-pressed','true');
  selectedGate=gate;
  lastFight=null;
  $('gate-mini-reward').hidden=true;
  // The private reward history is part of the authenticated map response;
  // no extra Firebase read is necessary when revisiting an old mini-boss.
  const previousReward=(mapState?.progress?.miniRewards||[])
   .find(entry=>entry.gate===gate)?.reward;
  if(previousReward?.granted)displayMiniReward(previousReward,gate);
  const kind=gate%10===0?'Gruppenboss':gate%10===5?'Mini-Boss':'Schnellkampf';
  $('gate-detail-kicker').textContent='TOR '+gate+' VON 100 · '+kind.toUpperCase();
  $('gate-detail-title').textContent=titleFor(gate);
  const bossPreview=$('gate-boss-preview');
  const bossPortrait=$('gate-boss-portrait');
  if(bossPreview)bossPreview.hidden=gate%10!==0;
  if(bossPortrait&&gate%10===0&&BOSS_ART[gate]){
   const artwork='./dog-boss-art/'+BOSS_ART[gate];
   if(!String(bossPortrait.src||'').endsWith('/'+BOSS_ART[gate]))
    bossPortrait.src=artwork;
   bossPortrait.alt='Tor '+gate+': '+MAJOR_BOSSES[gate];
  }
  $('gate-detail-summary').textContent=summaryFor(gate);
  $('gate-detail-future').textContent=gate===100?
   (mapState?.isMember&&mapState?.dogUnlocked?'🏆 Der Sieg an Tor 100 ist vom Server bestätigt. Die Expedition ist abgeschlossen!':'🔒 Der letzte Wächter muss gemeinsam besiegt werden, damit die Expedition endet.'):
   '⚔️ Kämpfe und Mini-Boss-Belohnungen werden vom Server berechnet und einmalig gespeichert.';
  updateGateActions();
  if(!details.open)details.showModal();
 }
 function drawPaths(){
  for(const {grid,nodes,svg} of pathList){
   if(!grid.isConnected)continue;
   const bounds=grid.getBoundingClientRect();
   if(bounds.width<=0||bounds.height<=0)continue;
   const points=nodes.map(node=>{
    const b=node.getBoundingClientRect();
    return [b.left-bounds.left+b.width/2,b.top-bounds.top+b.height/2];
   });
   svg.setAttribute('viewBox','0 0 '+bounds.width+' '+bounds.height);
   const d=points.map((p,i)=>(i?'L':'M')+' '+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
   const path=svg.querySelector('path');
   path?.setAttribute('d',d);
  }
 }
 function createWorld(index){
  const start=index*20+1,last=start+19,data=WORLDS[index];
  const section=document.createElement('section');section.className='world';
  section.dataset.world=String(index+1);
  section.setAttribute('aria-label','Welt '+(index+1)+': '+data.name);
  const head=document.createElement('header');head.className='world-head';
  const copy=document.createElement('div');
  const eyebrow=document.createElement('span');eyebrow.className='world-label';
  eyebrow.textContent='WELT '+(index+1)+' / 5 · TORE '+start+'–'+last;
  const heading=document.createElement('h2');heading.textContent=data.name;
  const subtitle=document.createElement('p');subtitle.textContent=data.subtitle;
  copy.append(eyebrow,heading,subtitle);
  const icon=document.createElement('span');icon.className='world-icon';
  icon.textContent=data.icon;icon.setAttribute('aria-hidden','true');
  head.append(copy,icon);
  const content=document.createElement('div');content.className='world-content';
  const grid=document.createElement('div');grid.className='gate-map';
  grid.setAttribute('aria-label','Torpfad von '+start+' bis '+last);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('gate-path');svg.setAttribute('aria-hidden','true');
  svg.append(document.createElementNS('http://www.w3.org/2000/svg','path'));
  grid.append(svg);
  const nodes=[];
  for(let i=0;i<20;i++){
   const gate=start+i,row=Math.floor(i/5),col=i%5;
   const button=document.createElement('button');button.type='button';
   const isBoss=gate%10===0,isMini=gate%10===5;
   button.className='gate'+(isBoss?' boss':'')+(isMini?' mini':'')+(gate===100?' final':'');
   button.style.gridRow=String(row+1);
   button.style.gridColumn=String(row%2?5-col:col+1);
   button.setAttribute('aria-label','Tor '+gate+': '+titleFor(gate)+'. Details ansehen');
   button.setAttribute('aria-pressed','false');
   const number=document.createElement('span');number.className='number';number.textContent=String(gate);
   const type=document.createElement('span');type.className='kind';
   type.textContent=isBoss?(gate===100?'🏰':'🐉'):isMini?'👹':'⚔️';
   type.setAttribute('aria-hidden','true');
   button.append(number,type);
   const pins=$node('span','party-pins');pins.setAttribute('aria-hidden','true');button.append(pins);
   button.addEventListener('click',()=>selectGate(gate,button));
   gateButtons.set(gate,button);
   nodes.push(button);grid.append(button);
  }
  content.append(grid);
  const foot=document.createElement('div');foot.className='world-foot';
  const left=document.createElement('span');
  left.textContent='👹 Mini-Bosse '+(start+4)+' und '+(start+14);
  const right=document.createElement('span');
  right.textContent='🐉 Gemeinsame Bosse '+(start+9)+' und '+last;
  foot.append(left,right);
  section.append(head,content,foot);
  worldRoot.append(section);
  pathList.push({grid,nodes,svg});
 }
 WORLDS.forEach((_,index)=>createWorld(index));
 if('ResizeObserver' in window){
  const observer=new ResizeObserver(drawPaths);
  pathList.forEach(({grid})=>observer.observe(grid));
 }else window.addEventListener('resize',drawPaths);
 window.requestAnimationFrame(drawPaths);
 window.addEventListener('load',drawPaths,{once:true});
 $('gate-battle-button').addEventListener('click',()=>void fightGate(false));
 $('gate-retry-button').addEventListener('click',()=>void fightGate(true));
 $('gate-detail-close').addEventListener('click',()=>details.close());
 $('gate-quick-result-close').addEventListener('click',()=>$('gate-quick-result').close());
 $('team-refresh').addEventListener('click',()=>void reloadMap());
 $('pilot-add-bots').addEventListener('click',()=>void addTwoBots());
 $('team-join').addEventListener('click',()=>void joinTeam());
 $('hero-selection').addEventListener('click',e=>{
  const button=e?.target?.closest?.('[data-hero-class]');
  if(!button||heroSaving)return;
  const heroClass=button.dataset.heroClass;
  if(!HERO_CLASSES.includes(heroClass))return;
  stagedHero=heroClass;
  $('hero-selection-status').textContent='⚠️ '+HERO_LABELS[heroClass]+' ist ausgewählt. Mit „Endgültig bestätigen“ wird deine Wahl dauerhaft gesperrt.';
  renderMembers();
 });
 $('hero-confirm').addEventListener('click',()=>void chooseHero(stagedHero));
 $('hero-selection').addEventListener('cancel',e=>e?.preventDefault?.());
 window.addEventListener('spielonline-change',()=>void reloadMap());
 window.addEventListener('dog-developer-updated',()=>{
  const uid=auth()?.user?.uid;
  if(uid)clearPending(uid); // old fight receipts must not replay after a developer reset
  if(details.open)details.close();
  void reloadMap();
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!working)void reloadMap();});
 if(typeof window.setInterval==='function'){
  window.setInterval(()=>{if(!document.hidden&&!working)void reloadMap();},60000);
 }
 void reloadMap();
 details.addEventListener('close',()=>{for(const selected of document.querySelectorAll('.gate[aria-pressed="true"]'))selected.setAttribute('aria-pressed','false');});
})();
