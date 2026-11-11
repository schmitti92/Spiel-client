/* Gruppenbosse Tor 20–100: server-owned ready/start, reaction and 30s result.
 * One action ID is persisted and retried, never a new random outcome on retry.
 */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const params=new URLSearchParams(location.search);
 const requestedGate=Number(params.get('gate'));
 const gate=Number.isSafeInteger(requestedGate)&&requestedGate>=20&&requestedGate<=100&&
  requestedGate%10===0?requestedGate:null;
 const room=params.get('room');
 const GROUP_NAMES={20:'Schattenfürst',30:'Kristallwurm',40:'Dornenkönig',
  50:'Hüter der Tiefe',60:'Flammendrache',70:'Seelenrichter',
  80:'Eisenkoloss',90:'Festungswächter',100:'Der letzte Wächter'};
 const bossName=GROUP_NAMES[gate]||'Unbekannter Wächter';
 const route='/api/dog/gates/boss/'+gate;
 document.title='🐉 Tor '+gate+' · '+bossName+' · Die 100 Tore';
 $('group-kicker').textContent='TOR '+gate+' VON 100 · GEMEINSAMER BOSS';
 $('group-title').textContent=bossName;
 $('group-enemy').textContent=bossName;
 $('group-reward').textContent=gate===100?'DOG freischalten':
  'Schmiede Lv. '+(gate/10+1);
 $('boss-name').textContent=bossName;
 const suffix=room&&/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room)?'?room='+encodeURIComponent(room):'';
 $('to-map').href='./dog-tor-map.html'+suffix;
 $('to-forge').href='./dog-ascension.html'+suffix;
 const auth=()=>{const v=window.SpielOnline?.state?.();
  return v?.status==='online'&&v.user?.uid&&v.profile?.setupComplete!==false?v:null;};
 let view=null,account=null,working=false,serverOffset=0,lastLoad=0,inflight=null;
 let lastHeroSignature=''; // No 250ms remount of unchanged multiplayer cards
 let lastReadyMask='',readyBurstUntil=0;
 const miniUi=window.DogBossMinigames?.create($('mini-game'),
  (round,answer)=>void command('minigame',false,{round,answer}));
 const combatFx=window.DogBossCombatFX?.create($('combat-scene'),gate);
 const key=uid=>'dog:groupboss:'+gate+':pending:'+uid;
 const newId=()=>globalThis.crypto?.randomUUID?.()?
  'boss'+gate+'-'+globalThis.crypto.randomUUID():
  'boss'+gate+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,15);
 function pending(uid){
  try{const value=JSON.parse(localStorage.getItem(key(uid))||'null');
   return value&&/^[A-Za-z0-9_-]{12,90}$/.test(value.id)&&
    ['ready','start','react','minigame','finish'].includes(value.command)?value:null;
  }catch{return null;}
 }
 function save(uid,data){
  try{const str=JSON.stringify(data);localStorage.setItem(key(uid),str);
   return localStorage.getItem(key(uid))===str;
  }catch{return false;}
 }
 function clear(uid){try{localStorage.removeItem(key(uid))}catch{}}
 // If a request succeeded but its response was lost, the GET state can
 // confirm that it already happened. Clear only when the server's phase
 // or this hero's readiness/reaction definitively confirms the action.
 function acknowledgePending(uid,state){
  const request=pending(uid);if(!request)return false;
  const mine=state?.members?.find(m=>m.uid===uid);
  const settled=state?.phase==='victory'||state?.phase==='cooldown';
  const confirmed=request.command==='ready'?
   !!mine?.ready||settled:
   request.command==='start'?
    (state?.phase==='fighting'&&state?.roster?.some(m=>m.uid===uid))||settled:
   request.command==='react'?!!mine?.reacted||settled||state?.phase==='waiting':
   request.command==='minigame'?
    !!state?.miniGames?.myAnswers?.[request.payload?.round]||settled:
   request.command==='finish'&&settled;
  if(confirmed){clear(uid);return true;}
  return false;
 }

 function message(str){$('status').textContent=str;}
 async function request(method,action,body,uid){
  const me=auth();if(!me||me.user.uid!==uid)throw Error('LOGIN_REQUIRED');
  const token=await me.user.getIdToken();
  if(auth()?.user?.uid!==uid)throw Error('ACCOUNT_CHANGED');
  const ctl=typeof AbortController==='function'?new AbortController():null;
  const timeout=ctl?setTimeout(()=>ctl.abort(),18000):null;
  try{
   const requestStartedAt=Date.now();
   const response=await fetch(API+route+action,{
    method,cache:'no-store',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    ...(body?{body:JSON.stringify(body)}:{}),...(ctl?{signal:ctl.signal}:{})
   });
   const data=await response.json().catch(()=>({error:'DOG_GROUP_UNAVAILABLE'}));
   if(!response.ok||data?.ok!==true)throw Error(data?.error||'DOG_GROUP_UNAVAILABLE');
   if(auth()?.user?.uid!==uid)throw Error('ACCOUNT_CHANGED');
   // serverNow is stamped near the server response, not when the browser
   // receives it. Compensate only for a bounded transfer delay so an
   // occasional slow Firestore transaction cannot shift the UI by seconds.
   const receivedAt=Date.now();
   const stamped=Number(data?.view?.serverNow??data?.serverNow);
   if(Number.isFinite(stamped))
    data._clockOffsetMs=stamped-receivedAt+
     Math.min(250,Math.max(0,(receivedAt-requestStartedAt)/2));
   return data;
  }finally{if(timeout!==null)clearTimeout(timeout);}
 }
 function noteReadyChange(next){
  const mask=(next?.members||[]).filter(m=>m.ready).map(m=>m.uid).join('|');
  if(mask!==lastReadyMask){
   lastReadyMask=mask;
   readyBurstUntil=Date.now()+12000;
  }
 }
 const now=()=>Date.now()+serverOffset;
 const remaining=()=>Math.max(0,(view?.endsAt||0)-now());
 const cooling=()=>Math.max(0,(view?.cooldownUntil||0)-now());
 const secs=ms=>Math.ceil(ms/1000);
 const formatTime=ms=>{
  const s=secs(ms);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
 };
 function render(){
  const current=auth()?.user?.uid||null;
  const logged=!!current&&current===account;
  const state=view?.phase||'unavailable';
  $('phase').textContent=state==='waiting'?'⏳ Team sammelt sich':
   state==='fighting'?'⚔️ Kampf läuft':
   state==='victory'?'🏆 Boss besiegt':
   state==='cooldown'?'💀 Kampfpause':'Verbindung prüfen';
  $('arena')?.setAttribute('data-phase',state);
  const members=view?.members||[];
  $('ready-count').textContent=members.filter(x=>x.ready).length+' / 3 bereit · '+
   (state==='fighting'?(view?.participantCount||view?.roster?.length||0)+' kämpfen':
    'zu dritt empfohlen');
  const area=$('heroes');
  const heroSignature=JSON.stringify(members.map(m=>m?
   [m.uid,m.name,m.ready,m.eligible,m.reacted]:null));
  if(heroSignature!==lastHeroSignature){
   lastHeroSignature=heroSignature;
   area.replaceChildren();
   for(let i=0;i<3;i++){
   const m=members[i];
   const card=document.createElement('article');card.className='hero'+(m?.ready?' is-ready':'');
   const portrait=document.createElement('span');portrait.className='hero-portrait';
   portrait.textContent=m?.name?.charAt(0)?.toUpperCase()||'?';
   const info=document.createElement('div');
   const title=document.createElement('strong');title.textContent=m?.name||'Freier Heldenplatz';
   const detail=document.createElement('small');
   detail.textContent=!m?'Wartet auf einen Helden':!m.eligible?'Vorherige Tore noch nicht geschafft':
    m.reacted?'⚡ Reaktion ausgeführt':m.ready?'✅ Bereit':'⏳ Noch nicht bereit';
   info.append(title,detail);card.append(portrait,info);area.append(card);
   }
  }
  const mine=members.find(m=>m.uid===account);
  const pendingOp=account?pending(account):null;
  const cooldownExpired=state==='cooldown'&&cooling()===0;
  const canReady=logged&&view?.isMember&&view?.eligible&&
   ((state==='waiting'&&!mine?.ready)||cooldownExpired);
  const ready=$('ready-button');
  ready.hidden=state==='fighting'||state==='victory';
  ready.disabled=!canReady||working||!!pendingOp;
  ready.textContent=state==='cooldown'&&cooling()===0?
   '⚔️ Neuen Versuch vorbereiten':'✅ Ich bin bereit';
  const start=$('start-button');
  start.hidden=state!=='waiting'||!mine?.ready;
  start.disabled=working||!!pendingOp||!logged||!view?.canStart;
  start.textContent='⚔️ Mit '+members.filter(m=>m.ready).length+
   ' Helden starten';
  const reaction=$('react-button');
  reaction.hidden=state!=='fighting'||!!view?.miniGames;
  reaction.disabled=!logged||working||!!pendingOp||!!mine?.reacted||remaining()<=0||
   !view?.roster?.some(m=>m.uid===account);
  reaction.textContent=mine?.reacted?'⚡ Reaktion gezählt':'⚡ Reaktion! Angriff verstärken';
  miniUi?.update(view,now(),logged&&!working&&!pendingOp&&
   !!view?.roster?.some(m=>m.uid===account));
  combatFx?.update(view,now());
  $('retry-button').hidden=!pendingOp;
  $('retry-button').disabled=working;
  const time=state==='fighting'?remaining():state==='cooldown'?cooling():30000;
  $('timer').textContent=formatTime(time);
  $('timer-fill').style.width=(state==='fighting'?Math.min(100,time/30000*100):state==='victory'?0:100)+'%';
  const bossLeft=view?.result&&state==='victory'||state==='cooldown'?
   view?.result?.hpRemaining:view?.bossHp;
  $('boss-hp').textContent=view?Number(bossLeft||0).toLocaleString('de-DE')+' LP':'– LP';
  const text=$('battle-message');
  text.textContent=state==='waiting'?'Bereit machen und mit 1, 2 oder 3 Helden starten. Zu dritt sind eure Chancen am größten.':
   state==='fighting'?'🔥 '+(view?.roster?.length||0)+' Helden gegen '+bossName+'! Reagiert innerhalb von 30 Sekunden.':
   state==='victory'?'🏆 '+bossName+' ist besiegt! Fortschritt für das Team gespeichert.':
   state==='cooldown'?'💀 Der Wächter hat das Team zurückgedrängt. Bereitet euch auf den nächsten Versuch vor.':
   'Verbindung zur Bossarena wird hergestellt …';
  const outcome=$('outcome');
  outcome.hidden=!['victory','cooldown'].includes(state);
  outcome.className='outcome'+(state==='cooldown'?' loss':'');
  outcome.textContent=state==='victory'?
   '🏆 '+bossName+' besiegt! '+Number(view?.result?.damage||0).toLocaleString('de-DE')+
    ' Schaden. '+(gate===100?
    'Der Sieg an Tor 100 ist gespeichert. Die DOG-Spielberechtigung wird noch separat angebunden!':
    'Die nächste Schmiedestufe ist für eure Gruppe freigeschaltet.'):
   state==='cooldown'?'💀 Boss überlebt! '+Number(view?.result?.damage||0).toLocaleString('de-DE')+
    ' Schaden von '+(view?.bossHp||0).toLocaleString('de-DE')+
    ' nötigen LP. Die gemeinsame Kampfpause endet in '+formatTime(cooling())+'.':'';
 }
 async function reload(force=false){
  const uid=auth()?.user?.uid;
  if(!gate){message('⚠️ Ungültiges Boss-Tor. Bitte die Karte verwenden.');render();return;}
  if(!uid){account=null;view=null;message('🔒 Für den gemeinsamen Bosskampf bitte mit einem Online-Spielerprofil anmelden.');render();return;}
  if(inflight)return inflight;
  if(!force&&Date.now()-lastLoad<3000)return;
  account=uid;
  const task=request('GET','',null,uid).then(data=>{
   if(auth()?.user?.uid!==uid)return;
   view=data;serverOffset=Number.isFinite(data._clockOffsetMs)?
    data._clockOffsetMs:Number(data.serverNow||Date.now())-Date.now();
   noteReadyChange(data);lastLoad=Date.now();
   const restored=acknowledgePending(uid,data);
   render();
   if(restored)message('✅ Die zuvor offene Bossaktion wurde mit dem Serverstand abgeglichen.');
   else if(!pending(uid)){
    message(data.phase==='waiting'?
     !data.eligible?'🔒 Zuerst die normalen Tore vor diesem Boss und den vorherigen Gruppenboss schaffen.':
     data.canStart?'⚔️ Du kannst starten oder auf weitere Helden warten. Zu dritt gewinnt ihr am ehesten.':
     '✅ Klicke auf Bereit, damit du am Kampf teilnehmen kannst.':
     data.phase==='fighting'?'⚔️ Der Bosskampf läuft. Löse die drei taktischen Minispiele!':
     data.phase==='victory'?'🏆 Der gemeinsame Boss-Sieg wurde serverseitig bestätigt.':'⚒️ Verbessert eure Ausrüstung für den nächsten Versuch.');
   }
  }).catch(()=>{
   view=null;message('⚠️ Die Bossdaten konnten nicht geladen werden. Bitte Verbindung prüfen und aktualisieren.');render();
  });
  inflight=task;
  try{await task}finally{if(inflight===task)inflight=null}
 }
 async function command(action,retry=false,payload=null){
  const uid=auth()?.user?.uid;
  if(!uid||working)return;
  const older=pending(uid);
  if(retry&&!older)return;
  if(!retry&&older)return;
  const req=older||{id:newId(),command:action,payload};
  if(!older&&!save(uid,req)){
   message('⚠️ Auftrag konnte nicht lokal gesichert werden. Aktion wurde nicht gesendet.');return;
  }
  working=true;render();
  message('⏳ Server prüft und speichert den Auftrag …');
  try{
   const data=await request('POST','/'+req.command,{requestId:req.id,...(req.payload||{})},uid);
   if(auth()?.user?.uid!==uid)return;
   clear(uid);view=data.view;serverOffset=Number.isFinite(data._clockOffsetMs)?
    data._clockOffsetMs:Number(data.view.serverNow||Date.now())-Date.now();
   noteReadyChange(data.view);
   render();
   message(req.command==='ready'?
    (view.phase==='fighting'?'⚔️ Drei Helden bereit – 30-Sekunden-Kampf gestartet.':
     '✅ Bereitschaft gespeichert. Du kannst starten oder auf weitere Helden warten.'):
    req.command==='start'?'⚔️ Der Kampf mit '+view.roster.length+' Helden hat begonnen.':
    req.command==='react'?'⚡ Reaktionsbonus für das Team gespeichert.':
    req.command==='minigame'?
     (data.result?.correct?'✅ Minispiel gelöst!':'❌ Minispiel nicht geschafft.')+
      ' Dein Bonus: '+Number(data.result?.bonusPercent||0).toLocaleString('de-DE')+' %.':
    data.result?.win?'🏆 Gruppenboss '+gate+' besiegt. '+(gate===100?'DOG ist freigeschaltet!':'Schmiedestufe erhöht!'):
    '💀 Der Bosskampf ist entschieden. Eine erneute Herausforderung folgt nach der Kampfpause.');
  }catch(e){
   if(['DOG_GROUP_NOT_READY','DOG_GROUP_PREREQUISITES','DOG_GROUP_ALREADY_WON',
    'DOG_GROUP_RUNNING','DOG_GROUP_COOLDOWN','DOG_GROUP_NOT_RUNNING',
    'DOG_GROUP_STILL_FIGHTING','DOG_MINIGAME_TOO_LATE','DOG_MINIGAME_NOT_RUNNING','DOG_MINIGAME_NOT_PARTICIPANT','DOG_MINIGAME_MISSING','DOG_MINIGAME_BAD_ROUND','DOG_MINIGAME_BAD_ANSWER','DOG_GROUP_NOT_PARTICIPANT','NOT_DOG_TEAM_MEMBER','DOG_GROUP_RECEIPT_CONFLICT'].includes(e.message))
    clear(uid);
   message('⚠️ Der Auftrag wurde nicht bestätigt: '+e.message+
    '. Bei einer unbekannten Verbindungslage kannst du ihn sicher wiederholen.');
   // Another player may have already reconciled the result after the
   // 30-second deadline. Fetch the official outcome rather than showing
   // an obsolete local request forever.
   if(['DOG_GROUP_NOT_RUNNING','DOG_GROUP_ALREADY_WON'].includes(e.message))
    void reload(true);
  }finally{working=false;render();}
 }
 $('ready-button').addEventListener('click',()=>void command('ready'));
 $('start-button').addEventListener('click',()=>void command('start'));
 $('react-button').addEventListener('click',()=>void command('react'));
 $('retry-button').addEventListener('click',()=>void command(null,true));
 $('refresh').addEventListener('click',()=>void reload(true));
 window.addEventListener('spielonline-change',()=>void reload(true));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void reload(true)});
 window.setInterval?.(()=>{
  if(document.hidden)return;
  render();
  if(view?.phase==='fighting'&&remaining()===0&&!working&&!pending(account)){
   void command('finish');return;
  }
  // Waiting heroes need to notice the shared start before the first
  // challenge at second 3. Keep the idle/no-ready state economical.
  // Briefly poll faster after a readiness change so all three clients
  // enter the first challenge promptly; fall back to economical polling
  // if the group waits for minutes. No animation-frame backend requests.
  const waitingReady=view?.phase==='waiting'&&view?.members?.some(m=>m.ready);
  const delay=view?.phase==='fighting'?2800:
   waitingReady&&Date.now()<readyBurstUntil?1400:
   waitingReady?3800:15000;
  if(!working&&Date.now()-lastLoad>delay)void reload();
 },250);
 void reload(true);
})();
