/* Tor 10: server-owned ready state, reaction and 30s result.
 * One action ID is persisted and retried, never a new random outcome on retry.
 */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const room=new URLSearchParams(location.search).get('room');
 const suffix=room&&/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room)?'?room='+encodeURIComponent(room):'';
 $('to-map').href='./dog-tor-map.html'+suffix;
 $('to-forge').href='./dog-ascension.html'+suffix;
 const auth=()=>{const v=window.SpielOnline?.state?.();
  return v?.status==='online'&&v.user?.uid&&v.profile?.setupComplete!==false?v:null;};
 let view=null,account=null,working=false,serverOffset=0,lastLoad=0,inflight=null;
 let lastHeroSignature=''; // No 250ms remount of unchanged multiplayer cards
 let lastReadyMask='',readyBurstUntil=0;
 const miniUi=window.DogBossMinigames?.create($('mini-game'),
  (round,answer,step=0)=>command('minigame',false,{round,answer,step}),
  (round,step,choice)=>combatFx?.previewDodge?.(view,round,step,choice,now()));
 const combatFx=window.DogBossCombatFX?.create($('combat-scene'),10);
 const preflight=window.DogBossPreflight?.create(10);
 const liveUi=window.DogBossLiveUI?.create($('arena'));
 const director=window.DogBossDirector?.create($('arena'));
 const key=uid=>'dog:boss10:pending:'+uid;
 const newId=()=>globalThis.crypto?.randomUUID?.()?
  'boss10-'+globalThis.crypto.randomUUID():
  'boss10-'+Date.now()+'-'+Math.random().toString(36).slice(2,15);
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
    (state?.miniGames?.version>=2?
     !!state?.miniGames?.myAnswers?.[request.payload?.round]?.attempts?.[request.payload?.step??0]:
     !!state?.miniGames?.myAnswers?.[request.payload?.round])||settled:
   request.command==='finish'&&settled;
  if(confirmed){clear(uid);return 'confirmed';}
  // An old unanswered minigame must never lock the next seven-second round.
  // This check uses the shared clock, without extra Firestore reads.
  if(request.command==='minigame'&&state?.phase==='fighting'){
   const round=request.payload?.round;
   const entry=Number.isInteger(round)?state.miniGames?.rounds?.[round]:null;
   if(entry&&now()>=(state.startedAt||0)+entry.endMs+(Array.isArray(request.payload?.answer)?2200:250)){
    clear(uid);return 'expired';
   }
  }
  return false;
 }

 function message(str){$('status').textContent=str;}
 async function request(method,route,body,uid,timeoutMs=18000){
  const me=auth();if(!me||me.user.uid!==uid)throw Error('LOGIN_REQUIRED');
  const token=await me.user.getIdToken();
  if(auth()?.user?.uid!==uid)throw Error('ACCOUNT_CHANGED');
  const ctl=typeof AbortController==='function'?new AbortController():null;
  const timeout=ctl?setTimeout(()=>ctl.abort(),timeoutMs):null;
  try{
   const requestStartedAt=Date.now();
   const response=await fetch(API+'/api/dog/gates/boss10'+route,{
    method,cache:'no-store',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    ...(body?{body:JSON.stringify(body)}:{}),...(ctl?{signal:ctl.signal}:{})
   });
   const data=await response.json().catch(()=>({error:'DOG_BOSS10_UNAVAILABLE'}));
   if(!response.ok||data?.ok!==true)throw Error(data?.error||'DOG_BOSS10_UNAVAILABLE');
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
   readyBurstUntil=Date.now()+6000;
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
   detail.textContent=!m?'Wartet auf einen Helden':!m.eligible?'Tor 9 noch nicht geschafft':
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
  preflight?.update(view,now());
  const duration=(Number(view?.endsAt)>Number(view?.startedAt)?
   view.endsAt-view.startedAt:view?.miniGames?.version===3?40000:
    view?.miniGames?.version===4?50000:
    view?.miniGames?.version===5?60000:64000);
  const time=state==='fighting'?remaining():state==='cooldown'?cooling():duration;
  $('timer').textContent=formatTime(time);
  $('timer-fill').style.width=(state==='fighting'?Math.min(100,time/duration*100):state==='victory'?0:100)+'%';
  const bossLeft=Number(view?.bossLiveHp??view?.result?.hpRemaining??view?.bossHp)||0;
  const bossMax=Number(view?.bossHp)||0;
  $('boss-hp').textContent=view?
   bossLeft.toLocaleString('de-DE')+' / '+bossMax.toLocaleString('de-DE'):'– / –';
  const text=$('battle-message');
  text.textContent=state==='waiting'?'⚔️ Team bereit machen':
   state==='fighting'?'⚔️ '+(view?.roster?.length||0)+' Helden im Kampf':
   state==='victory'?'🏆 Boss besiegt!':
   state==='cooldown'?'💀 Boss überlebt':
   'Verbindung zur Bossarena wird hergestellt …';
  const outcome=$('outcome');
  outcome.hidden=!['victory','cooldown'].includes(state);
  outcome.className='outcome'+(state==='cooldown'?' loss':'');
  outcome.textContent=state==='victory'?
   '🏆 Boss besiegt! '+Number(view?.result?.damage||0).toLocaleString('de-DE')+
    ' Schaden verursacht. Schmiede-Level 2 ist für eure Gruppe freigeschaltet.':
   state==='cooldown'?'💀 Boss überlebt! '+Number(view?.result?.damage||0).toLocaleString('de-DE')+
    ' Schaden von '+(view?.bossHp||0).toLocaleString('de-DE')+
    ' nötigen LP. Die gemeinsame Kampfpause endet in '+formatTime(cooling())+'.':'';
  liveUi?.update(view,now());
  director?.update(view);
 }
 async function reload(force=false){
  const uid=auth()?.user?.uid;
  if(!uid){account=null;view=null;message('🔒 Für den gemeinsamen Bosskampf bitte mit einem Online-Spielerprofil anmelden.');render();return;}
  if(inflight)return inflight;
  if(!force&&Date.now()-lastLoad<3000)return;
  if(uid!==account){view=null;lastLoad=0;}
  account=uid;
  const task=request('GET','',null,uid).then(data=>{
   if(auth()?.user?.uid!==uid)return;
   view=data;serverOffset=Number.isFinite(data._clockOffsetMs)?
    data._clockOffsetMs:Number(data.serverNow||Date.now())-Date.now();
   noteReadyChange(data);lastLoad=Date.now();
   const restored=acknowledgePending(uid,data);
   render();
   if(restored==='confirmed')message('✅ Die zuvor offene Bossaktion wurde mit dem Serverstand abgeglichen.');
   else if(restored==='expired')message('⏱️ Das vorige Minispiel ist abgelaufen. Die nächste Aufgabe ist wieder spielbar.');
   else if(!pending(uid)){
    message(data.phase==='waiting'?
     !data.eligible?'🔒 Erst das normale Tor 9 abschließen.':
     data.canStart?'⚔️ Du kannst starten oder auf weitere Helden warten. Zu dritt gewinnt ihr am ehesten.':
     '✅ Klicke auf Bereit, damit du am Kampf teilnehmen kannst.':
     data.phase==='fighting'?'⚔️ Der Bosskampf läuft. Löse die drei taktischen Minispiele!':
     data.phase==='victory'?'🏆 Der Sieg wurde serverseitig bestätigt.':'⚒️ Verbessert eure Ausrüstung für den nächsten Versuch.');
   }
  }).catch(()=>{
   // Throttle failed polling as well; otherwise every animation tick could
   // immediately retry a failed GET and burn Firebase requests.
   lastLoad=Date.now();
   // Retain the last confirmed boss state during brief network outages.
   message('⚠️ Verbindung unterbrochen. Letzter Bossstand bleibt sichtbar; Wiederverbindung läuft.');render();
  });
  inflight=task;
  try{await task}finally{if(inflight===task)inflight=null}
 }
 async function command(action,retry=false,payload=null){
  const uid=auth()?.user?.uid;
  if(!uid||working)return false;
  const older=pending(uid);
  if(retry&&!older)return false;
  if(!retry&&older)return false;
  const req=older||{id:newId(),command:action,payload};
  if(!older&&!save(uid,req)){
   message('⚠️ Auftrag konnte nicht lokal gesichert werden. Aktion wurde nicht gesendet.');return false;
  }
  working=true;render();
  message('⏳ Server prüft und speichert den Auftrag …');
  try{
   const data=await request('POST','/'+req.command,{requestId:req.id,...(req.payload||{})},uid,
    req.command==='minigame'?4500:18000);
   if(auth()?.user?.uid!==uid)return;
   clear(uid);view=data.view;serverOffset=Number.isFinite(data._clockOffsetMs)?
    data._clockOffsetMs:Number(data.view.serverNow||Date.now())-Date.now();
   noteReadyChange(data.view);
   render();
   message(req.command==='ready'?
    (view.phase==='fighting'?'⚔️ Drei Helden bereit – Kampf über '+Math.round((view.endsAt-view.startedAt)/1000)+' Sekunden gestartet.':
     '✅ Bereitschaft gespeichert. Du kannst starten oder auf weitere Helden warten.'):
    req.command==='start'?'⚔️ Der Kampf mit '+view.roster.length+' Helden hat begonnen.':
    req.command==='react'?'⚡ Reaktionsbonus für das Team gespeichert.':
    req.command==='minigame'?
     (Array.isArray(req.payload?.answer)?
      '🧮 Blitz-Mathe: '+Number(data.result?.correctCount||0)+' von '+
       req.payload.answer.length+' Aufgaben richtig.':
      (data.result?.correct?'✅ Treffer bestätigt!':'❌ Nicht getroffen.'))+
      ' Dein Bonus: '+Number(data.result?.bonusPercent||0).toLocaleString('de-DE')+' %.':
    data.result?.win?'🏆 Boss 10 besiegt. Schmiedestufe freigeschaltet!':
    '💀 Der Bosskampf ist entschieden. Eine erneute Herausforderung folgt nach der Kampfpause.');
  }catch(e){
   if(['DOG_BOSS10_NEEDS_THREE','DOG_BOSS10_PREREQUISITES','DOG_BOSS10_ALREADY_WON',
    'DOG_BOSS10_RUNNING','DOG_BOSS10_COOLDOWN','DOG_BOSS10_NOT_RUNNING',
    'DOG_BOSS10_STILL_FIGHTING','DOG_MINIGAME_TOO_LATE','DOG_MINIGAME_NOT_RUNNING','DOG_MINIGAME_NOT_PARTICIPANT','DOG_MINIGAME_MISSING','DOG_MINIGAME_BAD_ROUND','DOG_MINIGAME_BAD_ANSWER','DOG_MINIGAME_BAD_STEP',
    'DOG_MINIGAME_STEP_ORDER','DOG_MINIGAME_TOO_FAST','NOT_DOG_TEAM_MEMBER','DOG_BOSS10_RECEIPT_CONFLICT'].includes(e.message))
    clear(uid);
   message('⚠️ Der Auftrag wurde nicht bestätigt: '+e.message+
    '. Bei einer unbekannten Verbindungslage kannst du ihn sicher wiederholen.');
   // Another player may have already reconciled the result after the
   // 40-second deadline. Fetch the official outcome rather than showing
   // an obsolete local request forever.
   if(['DOG_BOSS10_NOT_RUNNING','DOG_BOSS10_ALREADY_WON'].includes(e.message))
    void reload(true);
  }finally{working=false;render();}
  return true;
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
  const cleared=account?acknowledgePending(account,view):false;
  if(cleared==='expired')message('⏱️ Vorige Aufgabe freigegeben – du kannst die nächste wieder spielen.');
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
  // Start updates arrive sooner on all three screens. The server's
  // startedAt/endsAt timestamps remain authoritative and still define
  // exactly the server-assigned combat duration, independent of each browser's latency.
  const openingFight=view?.phase==='fighting'&&
   now()<(view.startedAt||0)+5000;
  const elapsed=now()-(view?.startedAt||0);
  const exchangeWindow=view?.phase==='fighting'&&view?.miniGames?.version>=3&&
   view.miniGames.rounds.some((r,i)=>{
    const next=view.miniGames.rounds[i+1];
    const windowEnd=next?.startMs??(view.endsAt-view.startedAt);
    return elapsed>=r.endMs&&elapsed<windowEnd;
   });
  const dodgeActive=view?.phase==='fighting'&&view?.miniGames?.version>=5&&
    view.miniGames.rounds.some(r=>r.kind==='dodge'&&elapsed>=r.startMs&&elapsed<r.endMs);
   const delay=exchangeWindow?850:dodgeActive?850:openingFight?1200:
   view?.phase==='fighting'?2800:
   waitingReady&&Date.now()<readyBurstUntil?900:
   waitingReady?3800:15000;
  // Scene-only refresh: get the latest server-confirmed team shield and
  // shared hits while all devices play their cinematic exchange.
  if(!working&&Date.now()-lastLoad>delay)
   void reload(exchangeWindow===true);
 },250);
 void reload(true);
})();
