/* The 100 Gates / first shared battle. No client-side combat authority.
 * The server owns HP, defeat, a single team-wide 10-minute cooldown and receipt replay. */
(()=>{'use strict';
 const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const $=id=>document.getElementById(id);
 const room=new URLSearchParams(location.search).get('room')||'';
 if(/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room)){
  for(const id of ['boss-back','boss-forge-link','boss-defeat-forge','boss-victory-back']){
   $(id).href=$(id).getAttribute('href')+'?room='+encodeURIComponent(room);
  }
 }
 const num=n=>Math.max(0,Number(n)||0).toLocaleString('de-DE');
 const node=(tag,klass,value)=>{
  const result=document.createElement(tag);
  if(klass)result.className=klass;
  if(value!==undefined)result.textContent=String(value);
  return result;
 };
 const auth=()=>{
  const state=window.SpielOnline?.state?.();
  return state?.status==='online'&&state.user?.uid&&state.profile?.setupComplete!==false?state:null;
 };
 const pendingKey=uid=>'dog:boss:pending:'+uid;
 const receiptPattern=/^[A-Za-z0-9_-]{12,90}$/;
 function pending(account){
  if(!account)return null;
  try{
   const value=JSON.parse(localStorage.getItem(pendingKey(account))||'null');
   if(!value||!receiptPattern.test(value.id)||
      !['join','act','restart','reaction-start'].includes(value.command))return null;
   if(value.command==='act'&&!['attack','power','guard','special','reaction'].includes(value.move))return null;
   return value;
  }catch{return null;}
 }
 const savePending=(account,value)=>{
  try{
   const key=pendingKey(account),serialized=JSON.stringify(value);
   localStorage.setItem(key,serialized);
   return localStorage.getItem(key)===serialized;
  }catch{return false;}
 };
 const clearPending=account=>{try{localStorage.removeItem(pendingKey(account));}catch{}};
 const newId=()=>globalThis.crypto?.randomUUID?.()?
  'boss-'+globalThis.crypto.randomUUID():
  'boss-'+Date.now()+'-'+Math.random().toString(36).slice(2,15);
 let uid=null,view=null,busy=false,session=0,lastLoadedAt=0,loadedFor=null,
  loading=null,loadingUid=null,notice='',noticeType='',serverOffset=0,
  reactionVisible=false,reactionTicket=null;
 function status(message,type=''){
  notice=message;noticeType=type;
  $('boss-status').textContent=message;
  $('boss-status').className='boss-status'+(type?' '+type:'');
 }
 async function request(method,route,body,account){
  const original=auth();
  if(!original||original.user.uid!==account)throw Error('LOGIN_REQUIRED');
  const token=await original.user.getIdToken();
  if(auth()?.user?.uid!==account)throw Error('ACCOUNT_CHANGED');
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),20000):null;
  try{
   const response=await fetch(API+'/api/dog/boss/'+route,{
    method,cache:'no-store',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    body:body?JSON.stringify(body):undefined,
    ...(controller?{signal:controller.signal}:{})
   });
   const data=await response.json().catch(()=>({error:'BOSS_UNAVAILABLE'}));
   if(!response.ok||data?.ok!==true)throw Error(data?.error||'BOSS_UNAVAILABLE');
   if(auth()?.user?.uid!==account)throw Error('ACCOUNT_CHANGED');
   return data;
  }catch(e){
   if(controller?.signal.aborted)throw Error('BOSS_TIMEOUT');
   throw e;
  }finally{if(timer!==null)clearTimeout(timer);}
 }
 const viewer=()=>auth()?.user?.uid===uid;
 const canSend=()=>!!uid&&viewer()&&!!view&&!busy&&!pending(uid);
 const serverNow=()=>Date.now()+serverOffset;
 function closeReaction(message){
  reactionVisible=false;reactionTicket=null;
  $('boss-reaction-challenge').hidden=true;
  if(message)status(message);
 }
 function reactionTick(){
  if(!reactionVisible||!reactionTicket)return;
  if(document.hidden||!viewer()||!view||
     !['ready','fighting'].includes(view.phase)||
     reactionTicket.turn!==view.bossTurn||
     reactionTicket.attempt!==view.attempt){
   closeReaction();return;
  }
  const now=serverNow(),remaining=reactionTicket.expiresAt-now;
  const duration=Math.max(1,reactionTicket.expiresAt-reactionTicket.startAt);
  const fraction=Math.max(0,Math.min(1,(now-reactionTicket.startAt)/duration));
  $('boss-reaction-pointer').style.left=(fraction*100).toFixed(1)+'%';
  $('boss-reaction-time').textContent=(Math.max(0,remaining)/1000).toFixed(1).replace('.',',')+' s';
  $('boss-reaction-message').textContent=Math.abs(now-reactionTicket.targetAt)<400?
   '✨ GOLDENE TREFFERZONE – JETZT!':
   'Beobachte den Balken und drücke im goldenen Bereich.';
  const over=remaining<=0;
  $('boss-reaction-hit').disabled=over||busy;
  if(over){
   closeReaction('⏱️ Reaktionsfenster vorbei. Du kannst normal angreifen.');
   render();
  }
 }
 function openReaction(ticket){
  if(!ticket||!Number.isSafeInteger(ticket.startAt)||
     !Number.isSafeInteger(ticket.targetAt)||!Number.isSafeInteger(ticket.expiresAt)||
     ticket.expiresAt<=serverNow()||
     ticket.turn!==view?.bossTurn||ticket.attempt!==view?.attempt)return;
  reactionTicket=ticket;reactionVisible=true;
  $('boss-reaction-challenge').hidden=false;
  reactionTick();
  render();
 }
 function renderTeam(){
  const area=$('boss-team');area.replaceChildren();
  const members=view?.members||[];
  $('boss-team-size').textContent=members.length+' / 3 Helden';
  for(const member of members){
   const data=view.heroes?.[member.uid],hp=Math.max(0,Number(data?.hp||0));
   const max=Math.max(1,Number(data?.maxHp||100));
   const mine=uid===member.uid;
   const card=node('article','boss-hero-card'+(mine?' is-me':'')+(hp===0?' is-down':''));
   card.append(node('span','boss-hero-icon',hp===0?'💀':data?.guard?'🛡️':'⚔️'));
   const info=node('div','boss-hero-info');
   info.append(node('strong',null,member.name+(mine?' (du)':'')));
   info.append(node('small',null,hp===0?'Besiegt':data?.guard?'Verteidigung aktiv':'Kampfbereit'));
   const bar=node('div','boss-hero-bar');
   const fill=node('span');fill.style.width=(100*hp/max).toFixed(1)+'%';
   bar.append(fill);info.append(bar,node('small','boss-hero-value',num(hp)+' / '+num(max)+' LP'));
   card.append(info);area.append(card);
  }
  for(let i=members.length;i<3;i++){
   area.append(node('div','boss-empty-slot',['🛡️','⚔️','✨'][i]+' Platz für Held '+(i+1)));
  }
 }
 function remainingMs(){
  return Math.max(0,(view?.cooldownUntil||0)-(Date.now()+serverOffset));
 }
 function renderClock(){
  if(!view||view.phase!=='cooldown')return;
  const total=Math.ceil(remainingMs()/1000),minutes=Math.floor(total/60),seconds=total%60;
  $('boss-countdown').textContent=String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0');
  const canRestart=!!viewer()&&view.isMember&&!busy&&!pending(uid)&&total===0;
  $('boss-restart').hidden=!canRestart;
  $('boss-restart').disabled=!canRestart;
  $('boss-cooldown-note').textContent=total>0?
   'Der gemeinsame Bosskampf ist gesperrt. Nutzt die Zeit für Rohstoffkisten und Schmiedeverbesserungen.':
   'Die Kampfpause ist vorbei! Jetzt könnt ihr denselben Boss erneut versuchen – mit vollen LP.';
 }
 function render(){
  const loggedIn=viewer(),joined=loggedIn&&!!view?.isMember;
  const percent=view?100*view.bossHp/Math.max(1,view.bossMaxHp):100;
  $('boss-hp-text').textContent=view?num(view.bossHp)+' / '+num(view.bossMaxHp)+' LP':'– / – LP';
  $('boss-hp-track').setAttribute('aria-valuenow',String(view?.bossHp??0));
  $('boss-hp-fill').style.width=Math.max(0,Math.min(100,percent))+'%';
  $('boss-attempt').textContent=String(view?.attempt||1);
  // Boss phases and telegraphed attacks are provided by the server.
  const bossPhase=Math.min(3,Math.max(1,Number(view?.bossPhase)||1));
  const charging=!!view?.bossCharged&&view?.phase==='fighting';
  $('boss-phase-status').dataset.phase=String(bossPhase);
  $('boss-art-stage').dataset.phase=String(bossPhase);
  $('boss-phase-label').textContent='PHASE '+bossPhase+' VON 3';
  $('boss-phase-name').textContent=view?.bossPhaseName||
   ['Der erwachte Wächter','Die Glut erwacht','Das letzte Inferno'][bossPhase-1];
  $('boss-telegraph').textContent=view?.bossTelegraph||
   '⚔️ Der Aschewächter beobachtet die Gruppe.';
  $('boss-telegraph').classList.toggle('is-warning',charging);
  $('boss-art-stage').classList.toggle('boss-charging',charging);
  $('boss-monster').classList.toggle('boss-monster-inferno',
   bossPhase===3&&view?.phase==='fighting');
  $('boss-tactical-tip').textContent=charging?
   '🛡️ Jetzt „Verteidigen“ wählen: Die Explosion trifft den nächsten handelnden Helden.':
   bossPhase===3?'🔥 Im Inferno sind Gegenschläge stärker – achtet auf eure Lebenspunkte.':
   bossPhase===2?'🔥 Unter 50 % Bossleben lädt der Wächter regelmäßig eine Explosion auf.':
   '🛡️ Wenn der Wächter glüht, kann der nächste Held mit „Verteidigen“ reagieren.';
  renderTeam();
  const defeat=!!view&&view.phase==='cooldown';
  const victory=!!view&&view.phase==='victory';
  $('boss-defeat-panel').hidden=!defeat;
  $('boss-victory-panel').hidden=!victory;
  // No guessed local advice: only show the battle's actual server calculation.
  const analysis=defeat?view.defeatAnalysis:null;
  $('boss-defeat-analysis').hidden=!analysis;
  if(analysis){
   const category=['attack','defense','balanced'].includes(analysis.category)?
    analysis.category:'balanced';
   $('boss-defeat-analysis').dataset.reason=category;
   $('boss-analysis-title').textContent=analysis.title;
   $('boss-analysis-summary').textContent=analysis.summary;
   const pct=Math.min(100,Math.max(0,Number(analysis.bossProgressPct)||0));
   $('boss-analysis-fill').style.width=pct+'%';
   $('boss-analysis-track').setAttribute('aria-valuenow',String(pct));
   const total=Number(analysis.teamActions)||0;
   const avg=Number(analysis.averageDamage)||0;
   const missing=analysis.estimatedMoreActions;
   $('boss-analysis-metrics').textContent=total>0?
    total+' Teamaktionen · durchschnittlich '+num(avg)+' Schaden pro Aktion'+
    (Number.isFinite(missing)&&missing>0?' · etwa '+num(missing)+' weitere Aktionen benötigt':''):
    'Der Boss hatte noch '+num(analysis.bossRemaining)+' LP.';
   $('boss-analysis-advice').textContent='⚒️ '+analysis.recommendation;
  }
  $('boss-monster').classList.toggle('boss-monster-down',defeat||victory);
  renderClock();
  const joinButton=$('boss-join');
  joinButton.hidden=joined||!!view&&!view.canJoin;
  joinButton.disabled=!loggedIn||!view||busy||!!pending(uid)||joined||!view.canJoin;
  const who=$('boss-member-info');
  who.textContent=!loggedIn?'Bitte über das Spieleportal mit deinem Profil anmelden.':
   !view?'Lade die Heldengruppe …':
   joined?'✓ Du gehörst zur gemeinsamen Heldengruppe.':
   !view.canJoin?'Das Team aus drei Helden ist bereits vollständig.':
   'Noch '+(3-view.members.length)+' freie Plätze · Beitritt bleibt dauerhaft gespeichert.';
  const player=joined?view.heroes?.[uid]:null;
  const allowed=canSend()&&joined&&(view.phase==='ready'||view.phase==='fighting')&&player?.hp>0;
  for(const button of document.querySelectorAll('[data-move]')){
   button.disabled=!allowed||reactionVisible;
  }
  const ticket=view?.reactionChallenge;
  const ticketValid=ticket&&ticket.turn===view?.bossTurn&&ticket.attempt===view?.attempt;
  $('boss-reaction-start').disabled=!allowed||reactionVisible||
   (!!ticketValid&&serverNow()>=ticket.expiresAt);
  $('boss-reaction-start').textContent=ticketValid?'⚡ Reaktion fortsetzen':'⚡ Reaktion starten';
  $('boss-reaction-hit').disabled=busy||!reactionVisible;
  $('boss-pending-wrap').hidden=!loggedIn||!pending(uid);
  $('boss-retry').disabled=!loggedIn||busy||!pending(uid);
  $('boss-refresh').disabled=busy;
  const log=$('boss-log');log.replaceChildren();
  for(const entry of (view?.log||[]).slice(0,10))log.append(node('li',null,entry));
  if(!view?.log?.length)log.append(node('li',null,'Noch kein Kampfbericht. Die Heldengruppe wartet auf ihren ersten Einsatz.'));
  if(!notice){
   $('boss-status').textContent=!loggedIn?'🔒 Bitte mit dem Online-Spielerprofil anmelden.':
    !view?'Verbindung zur Bossarena wird aufgebaut …':
    !!pending(uid)?'⚠️ Ein Auftrag ist noch offen. Bitte sicher wiederholen.':
    defeat?'💀 Das gesamte Team ist besiegt. 10 Minuten Kampfpause.':
    victory?'🏆 Tor 1 geschafft!':
    joined?'⚔️ Gemeinsam kämpfen – jeder Schlag zählt für das ganze Team.':
    '🛡️ Tritt der Heldengruppe bei, um gemeinsam zu kämpfen.';
  }
 }
 function apply(data){
  if(reactionVisible&&(data?.reactionChallenge?.turn!==reactionTicket?.turn||
      data?.reactionChallenge?.attempt!==reactionTicket?.attempt||
      !['ready','fighting'].includes(data.phase)))closeReaction();
  view=data;lastLoadedAt=Date.now();
  serverOffset=Number(data.serverNow||Date.now())-Date.now();
  notice='';noticeType='';$('boss-status').className='boss-status';
  render();
 }
 function reload(force=false){
  const account=auth()?.user?.uid||null;
  if(!account){uid=null;view=null;loadedFor=null;notice='';render();return Promise.resolve();}
  if(busy&&!force)return Promise.resolve();
  if(loading&&loadingUid===account)return loading;
  if(!force&&uid===account&&view&&Date.now()-lastLoadedAt<40000)return Promise.resolve();
  uid=account;
  const which=++session;
  status('↻ Bossarena wird synchronisiert …');
  render();
  const work=request('GET','me',null,account).then(data=>{
   if(uid!==account||which!==session||!viewer())return;
   apply(data);
  }).catch(e=>{
   if(uid!==account||which!==session)return;
   view=null;status('⚠️ Bossdaten nicht erreichbar. Prüfe deine Verbindung und aktualisiere.','bad');render();
  });
  loading=work;loadingUid=account;
  void work.finally(()=>{
   if(loading===work){loading=null;loadingUid=null;}
  });
  return work;
 }
 const definitive=new Set(['INVALID_BOSS_MOVE','INVALID_BOSS_COMMAND',
  'BOSS_REACTION_NOT_READY',
  'BOSS_STATE_STALE',
  'NOT_BOSS_MEMBER','BOSS_TEAM_FULL','BOSS_COOLDOWN_ACTIVE','BOSS_ALREADY_WON',
  'BOSS_HERO_DOWN','BOSS_NO_RESTART','BOSS_RECEIPT_CONFLICT','INVALID_REQUEST_ID']);
 function effect(result){
  if(!result||result.type!=='combat')return;
  const number=$('boss-hit-number');
  number.classList.remove('boss-hit-animate');
  number.textContent='−'+num(result.damage)+' LP';
  void number.offsetWidth;
  number.classList.add('boss-hit-animate');
  $('boss-monster').classList.remove('boss-monster-hit');
  void $('boss-monster').offsetWidth;
  $('boss-monster').classList.add('boss-monster-hit');
 }
 async function command(type,move,retry=false){
  if(busy||!uid||!viewer())return;
  const account=uid,epoch=session,prior=pending(account);
  if(prior&&!retry){status('⚠️ Zuerst die offene Aktion sicher wiederholen.','bad');return;}
  if(!prior&&retry)return;
  if(!prior&&!view)return;
  const op=prior||{id:newId(),command:type,...(type==='act'?
   {move,expectedTurn:Number.isSafeInteger(view?.bossTurn)?view.bossTurn:0}:{})};
  if(!prior&&!savePending(account,op)){
   status('⚠️ Die Auftragskennung konnte nicht gespeichert werden. Keine Kampfaktion gesendet.','bad');
   return;
  }
  busy=true;render();
  let refreshAfterCommand=false;
  status('⚔️ Der Server berechnet die gemeinsame Kampfaktion …');
  try{
   const payload=await request('POST',op.command,
    {requestId:op.id,...(op.command==='act'?{move:op.move,
     ...(op.expectedTurn===undefined?{}:{expectedTurn:op.expectedTurn})}:{})},account);
   if(uid!==account||epoch!==session||!viewer())throw Error('ACCOUNT_CHANGED');
   clearPending(account);apply(payload);
   if(op.command==='reaction-start'&&payload.reactionChallenge)
    openReaction(payload.reactionChallenge);
   if(!payload.replayed)effect(payload.result);
   status(payload.replayed?'✓ Eure letzte Aktion wurde sicher wiederhergestellt.':
    payload.result?.defeated?'💀 Das Team ist gefallen. Zehn Minuten Kampfpause!':
    payload.result?.victory?'🏆 Der Aschewächter wurde besiegt!':
    op.command==='restart'?'⚔️ Versuch '+payload.attempt+': Der gleiche Boss startet wieder mit vollen LP.':
    op.command==='join'?'🛡️ Du bist der Heldengruppe beigetreten!':
    op.command==='reaction-start'?'⚡ Das Reaktionsfenster läuft – triff die goldene Zone!':
    payload.result?.reactionGrade?
     '⚡ Reaktion '+payload.result.reactionGrade+'! +'+
     payload.result.reactionBonusPct+' % · '+num(payload.result.damage)+' Schaden.':
    payload.result?.chargedAttack?'🔥 Flammenexplosion! '+
     num(payload.result.retaliation)+' LP Gegenschaden – '+num(payload.result.damage)+' Schaden am Boss.':
    payload.result?.phaseChanged?'🔥 Bossphase '+payload.result.bossPhase+' beginnt! '+
     num(payload.result.damage)+' Schaden verursacht.':
    '⚔️ '+num(payload.result?.damage)+' Schaden verursacht!','good');
  }catch(e){
   if(uid!==account||epoch!==session)return;
   if(definitive.has(e.message)){
    clearPending(account);
    status(e.message==='BOSS_STATE_STALE'?
     '⚠️ Ein anderer Held hat angegriffen. Lade die neue Bosswarnung, bevor du handelst.':
     '↻ Der Bosszustand hat sich geändert ('+e.message+'). Lade den aktuellen Stand.','bad');
    refreshAfterCommand=true;
   }else status('⚠️ Die Antwort ist nicht sicher bestätigt. Bitte „Letzte Aktion sicher wiederholen“ verwenden.','bad');
  }finally{
   busy=false;
   if(uid!==account||epoch!==session||!viewer()){
    uid=null;view=null;notice='';render();void reload(true);
   }else{
    render();
    if(refreshAfterCommand)void reload(true);
   }
  }
 }
 for(const button of document.querySelectorAll('[data-move]')){
  button.addEventListener('click',()=>void command('act',button.dataset.move));
 }
 $('boss-reaction-start').addEventListener('click',()=>{
  if(!canSend()||reactionVisible||!view?.isMember||
     !['ready','fighting'].includes(view.phase)||!view.heroes?.[uid]?.hp)return;
  const ticket=view.reactionChallenge;
  if(ticket&&ticket.turn===view.bossTurn&&ticket.attempt===view.attempt){
   openReaction(ticket);
  }else void command('reaction-start');
 });
 $('boss-reaction-hit').addEventListener('click',()=>{
  if(!reactionVisible||!reactionTicket||!canSend())return;
  if(serverNow()>reactionTicket.expiresAt){closeReaction('⏱️ Zeit vorbei.');render();return;}
  closeReaction();void command('act','reaction');
 });
 $('boss-reaction-dismiss').addEventListener('click',()=>{
  closeReaction('⚡ Reaktionsversuch abgebrochen. Du kannst normal angreifen.');
  render();
 });
 $('boss-join').addEventListener('click',()=>void command('join'));
 $('boss-restart').addEventListener('click',()=>void command('restart'));
 $('boss-retry').addEventListener('click',()=>{
  const op=pending(uid);if(op)void command(op.command,op.move,true);
 });
 $('boss-refresh').addEventListener('click',()=>void reload(true));
 window.addEventListener('spielonline-change',()=>{
  const account=auth()?.user?.uid||null;
  if(account!==uid){
   closeReaction();++session;uid=account;view=null;notice='';
   if(busy){render();return;}
  }
  void reload();
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&reactionVisible){closeReaction();render();}
  if(!document.hidden&&!busy)void reload();
 });
 // Local timing animation has no network calls; server scores the actual tap.
 setInterval(reactionTick,50);
 // Countdown changes every second locally; no Firebase reads are triggered.
 setInterval(renderClock,1000);
 // At most one remote refresh per minute while the arena remains visible.
 setInterval(()=>{
  if(!document.hidden&&!busy&&auth()?.user?.uid===uid&&view?.isMember)
   void reload();
 },60000);
 render();void reload();
})();