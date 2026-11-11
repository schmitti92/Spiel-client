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
 const miniUi=window.DogBossMinigames?.create($('mini-game'),
  (round,answer)=>void command('minigame',false,{round,answer}));
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
    !!state?.miniGames?.myAnswers?.[request.payload?.round]||settled:
   request.command==='finish'&&settled;
  if(confirmed){clear(uid);return true;}
  return false;
 }

 function message(str){$('status').textContent=str;}
 async function request(method,route,body,uid){
  const me=auth();if(!me||me.user.uid!==uid)throw Error('LOGIN_REQUIRED');
  const token=await me.user.getIdToken();
  if(auth()?.user?.uid!==uid)throw Error('ACCOUNT_CHANGED');
  const ctl=typeof AbortController==='function'?new AbortController():null;
  const timeout=ctl?setTimeout(()=>ctl.abort(),18000):null;
  try{
   const response=await fetch(API+'/api/dog/gates/boss10'+route,{
    method,cache:'no-store',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    ...(body?{body:JSON.stringify(body)}:{}),...(ctl?{signal:ctl.signal}:{})
   });
   const data=await response.json().catch(()=>({error:'DOG_BOSS10_UNAVAILABLE'}));
   if(!response.ok||data?.ok!==true)throw Error(data?.error||'DOG_BOSS10_UNAVAILABLE');
   if(auth()?.user?.uid!==uid)throw Error('ACCOUNT_CHANGED');
   return data;
  }finally{if(timeout!==null)clearTimeout(timeout);}
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
  const area=$('heroes');area.replaceChildren();
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
   state==='fighting'?'🔥 '+(view?.roster?.length||0)+' Helden greifen an! Reagiert innerhalb von 30 Sekunden.':
   state==='victory'?'🏆 Der Aschewächter ist besiegt. Die Schmiede ist aufgestiegen!':
   state==='cooldown'?'💀 Der Wächter hat das Team zurückgedrängt. Bereitet euch auf den nächsten Versuch vor.':
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
 }
 async function reload(force=false){
  const uid=auth()?.user?.uid;
  if(!uid){account=null;view=null;message('🔒 Für den gemeinsamen Bosskampf bitte mit einem Online-Spielerprofil anmelden.');render();return;}
  if(inflight)return inflight;
  if(!force&&Date.now()-lastLoad<3000)return;
  account=uid;
  const task=request('GET','',null,uid).then(data=>{
   if(auth()?.user?.uid!==uid)return;
   view=data;serverOffset=Number(data.serverNow||Date.now())-Date.now();lastLoad=Date.now();
   const restored=acknowledgePending(uid,data);
   render();
   if(restored)message('✅ Die zuvor offene Bossaktion wurde mit dem Serverstand abgeglichen.');
   else if(!pending(uid)){
    message(data.phase==='waiting'?
     !data.eligible?'🔒 Erst das normale Tor 9 abschließen.':
     data.canStart?'⚔️ Du kannst starten oder auf weitere Helden warten. Zu dritt gewinnt ihr am ehesten.':
     '✅ Klicke auf Bereit, damit du am Kampf teilnehmen kannst.':
     data.phase==='fighting'?'⚔️ Der Bosskampf läuft. Löse die drei taktischen Minispiele!':
     data.phase==='victory'?'🏆 Der Sieg wurde serverseitig bestätigt.':'⚒️ Verbessert eure Ausrüstung für den nächsten Versuch.');
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
   clear(uid);view=data.view;serverOffset=Number(data.view.serverNow||Date.now())-Date.now();
   render();
   message(req.command==='ready'?
    (view.phase==='fighting'?'⚔️ Drei Helden bereit – 30-Sekunden-Kampf gestartet.':
     '✅ Bereitschaft gespeichert. Du kannst starten oder auf weitere Helden warten.'):
    req.command==='start'?'⚔️ Der Kampf mit '+view.roster.length+' Helden hat begonnen.':
    req.command==='react'?'⚡ Reaktionsbonus für das Team gespeichert.':
    req.command==='minigame'?
     (data.result?.correct?'✅ Minispiel gelöst!':'❌ Minispiel nicht geschafft.')+
      ' Dein Bonus: '+Number(data.result?.bonusPercent||0).toLocaleString('de-DE')+' %.':
    data.result?.win?'🏆 Boss 10 besiegt. Schmiedestufe freigeschaltet!':
    '💀 Der Bosskampf ist entschieden. Eine erneute Herausforderung folgt nach der Kampfpause.');
  }catch(e){
   if(['DOG_BOSS10_NEEDS_THREE','DOG_BOSS10_PREREQUISITES','DOG_BOSS10_ALREADY_WON',
    'DOG_BOSS10_RUNNING','DOG_BOSS10_COOLDOWN','DOG_BOSS10_NOT_RUNNING',
    'DOG_BOSS10_STILL_FIGHTING','DOG_MINIGAME_TOO_LATE','DOG_MINIGAME_NOT_RUNNING','DOG_MINIGAME_NOT_PARTICIPANT','DOG_MINIGAME_MISSING','DOG_MINIGAME_BAD_ROUND','DOG_MINIGAME_BAD_ANSWER','NOT_DOG_TEAM_MEMBER','DOG_BOSS10_RECEIPT_CONFLICT'].includes(e.message))
    clear(uid);
   message('⚠️ Der Auftrag wurde nicht bestätigt: '+e.message+
    '. Bei einer unbekannten Verbindungslage kannst du ihn sicher wiederholen.');
   // Another player may have already reconciled the result after the
   // 30-second deadline. Fetch the official outcome rather than showing
   // an obsolete local request forever.
   if(['DOG_BOSS10_NOT_RUNNING','DOG_BOSS10_ALREADY_WON'].includes(e.message))
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
  const delay=view?.phase==='fighting'?3200:
   view?.phase==='waiting'&&view?.members?.some(m=>m.ready)?3200:15000;
  if(!working&&Date.now()-lastLoad>delay)void reload();
 },250);
 void reload(true);
})();
