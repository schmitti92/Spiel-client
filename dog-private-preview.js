/* Single-device private 100-Tore test. Server authenticates all actions and
 * simulates both teammates; client never creates fabricated victories. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const API=String(window.SPIELPORTAL_CONFIG?.apiBase||
  'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const KEY='dog:private-100:link-key';
 const ACTION_KEY='dog:private-100:unfinished:';
 const KINDS={wood:'🪵 Holzkiste',iron:'🔩 Eisenkiste',silver:'🥈 Silberkiste',
  gold:'🏆 Goldkiste',legendary:'💎 Legendäre Truhe'};
 const BOSS={
  10:['Der Aschewächter','schattenfuerst'],20:['Schattenfürst','schattenfuerst'],
  30:['Kristallwurm','kristallwurm'],40:['Dornenkönig','dornenkoenig'],
  50:['Hüter der Tiefe','hueter-der-tiefe'],60:['Flammendrache','flammendrache'],
  70:['Seelenrichter','seelenrichter'],80:['Eisenkoloss','eisenkoloss'],
  90:['Festungswächter','festungswaechter'],100:['Der letzte Wächter','letzter-waechter']
 };
 const BOT_IDS=['preview-bot-alpha','preview-bot-beta'];
 let key='',view=null,lastFetch=0,pending=false,offset=0,lastRound=-1;
 let toastUntil=0,connectedUid='',claimed=false;
 const params=new URLSearchParams(location.hash.slice(1));
 const fromHash=params.get('k');
 if(fromHash&&fromHash.length>19){
  try{localStorage.setItem(KEY,fromHash)}catch{}
  history.replaceState(null,'',location.pathname+location.search);
 }
 try{key=localStorage.getItem(KEY)||''}catch{}
 $('test-code').value=key;
 const user=()=>{
  const s=window.SpielOnline?.state?.();
  return s?.status==='online'&&s.user?.getIdToken?s.user:null;
 };
 const clock=()=>Date.now()+offset;
 const fmt=n=>Number(n||0).toLocaleString('de-DE');
 function status(text){$('access-status').textContent=text;}
 function toast(message){
  $('toast').hidden=false;$('toast').textContent=message;toastUntil=Date.now()+4500;
 }
 const queued=()=>{
  const uid=user()?.uid;if(!uid)return null;
  try{const p=JSON.parse(sessionStorage.getItem(ACTION_KEY+uid)||'null');
   return p&&typeof p.requestId==='string'&&/^[A-Za-z0-9_-]{12,90}$/.test(p.requestId)&&
    typeof p.command==='string'&&p.params&&typeof p.params==='object'?p:null;
  }catch{return null}
 };
 const storeQueue=p=>{
  const uid=user()?.uid;if(!uid)return false;
  try{const str=JSON.stringify(p);sessionStorage.setItem(ACTION_KEY+uid,str);
   return sessionStorage.getItem(ACTION_KEY+uid)===str;
  }catch{return false}
 };
 const clearQueue=()=>{
  const uid=user()?.uid;
  if(uid)try{sessionStorage.removeItem(ACTION_KEY+uid)}catch{}
 };
 const requestId=()=>globalThis.crypto?.randomUUID?.()||
  ('preview-'+Date.now()+'-'+Math.random().toString(36).slice(2));
 const errorText=error=>{
  const messages={
   PREVIEW_NOT_AVAILABLE:'Der private Testcode ist falsch oder noch nicht aktiviert.',
   PREVIEW_RESERVED:'Dieser Testzugang wurde bereits für ein anderes Spielerprofil eingerichtet.',
   LOGIN_REQUIRED:'Bitte melde dich mit deinem Spielprofil an.',
   DOG_GATE_COOLDOWN:'Nach einem Kampf gilt eine kurze persönliche Pause.',
   DOG_GATE_PREVIOUS_REQUIRED:'Besiege zuerst die vorhergehenden normalen Tore.',
   DOG_GATE_BOSS_REQUIRED:'Der vorige gemeinsame Boss ist noch nicht besiegt.',
   DOG_BOSS10_COOLDOWN:'Der gemeinsame Boss ist noch in der Erholungspause.',
   DOG_GROUP_COOLDOWN:'Der gemeinsame Boss ist noch in der Erholungspause.',
   DOG_BOSS10_PREREQUISITES:'Die nötigen normalen Tore fehlen noch.',
   DOG_GROUP_PREREQUISITES:'Die nötigen normalen Tore fehlen noch.',
   DOG_MINIGAME_TOO_LATE:'Das Zeitfenster dieser Aufgabe ist bereits vorbei.',
   DOG_MINIGAME_BAD_ANSWER:'Ungültige Antwort.',
   DOG_GATE_ALREADY_WON:'Dieses Tor ist bereits geschafft.',
   DOG_BOSS10_ALREADY_WON:'Dieser Boss wurde bereits besiegt.',
   DOG_GROUP_ALREADY_WON:'Dieser Boss wurde bereits besiegt.',
   DOG_FORGE_BOSS_REQUIRED:'Besiege zuerst den nächsten Gruppenboss.',
   DOG_MATERIALS_MISSING:'Dir fehlen passende Rohstoffe.',
   DOG_FORGE_MAX_LEVEL:'Das maximale Level ist erreicht.'
  };
  return messages[error]||('Servermeldung: '+error);
 };
 async function api(path,body){
  const u=user();if(!u)throw Error('LOGIN_REQUIRED');
  const uid=u.uid,token=await u.getIdToken();
  if(user()?.uid!==uid)throw Error('ACCOUNT_CHANGED');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),13500);
  try{
   const response=await fetch(API+'/api/dog/preview/'+path,{
    method:body===undefined?'GET':'POST',cache:'no-store',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',
     'X-DOG-Preview-Key':key},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
    signal:controller.signal
   });
   const data=await response.json().catch(()=>({ok:false,error:'PREVIEW_UNAVAILABLE'}));
   if(!response.ok||data.ok!==true)throw Error(data.error||'PREVIEW_UNAVAILABLE');
   if(user()?.uid!==uid)throw Error('ACCOUNT_CHANGED');
   return data;
  }finally{clearTimeout(timeout);}
 }
 function showEntrance(message){
  $('intro').hidden=false;$('app').hidden=true;
  if(message)status(message);
  $('login').hidden=!!user();
 }
 function showApp(){ $('intro').hidden=true;$('app').hidden=false; }
 async function unlock(){
  if(pending)return;
  key=$('test-code').value.trim();
  if(!key){status('Bitte den privaten Testlink verwenden oder deinen Testcode eingeben.');return;}
  try{localStorage.setItem(KEY,key)}catch{}
  if(!user()){showEntrance('Zuerst mit dem Online-Spielerprofil anmelden.');return;}
  pending=true;$('unlock').disabled=true;status('Dein persönlicher Testzugang wird geprüft …');
  try{
   await api('access',{});
   claimed=true;connectedUid=user().uid;
   showApp();await refresh(true);
  }catch(e){claimed=false;showEntrance(errorText(e.message));}
  finally{pending=false;$('unlock').disabled=false;}
 }
 async function refresh(force=false){
  if(pending&&!force||!claimed||!user()||document.hidden)return;
  const thisUid=user().uid;
  if(connectedUid!==thisUid){claimed=false;showEntrance('Profil gewechselt. Bitte den Testzugang erneut öffnen.');return;}
  pending=true;lastFetch=Date.now();
  try{
   const data=await api('state');
   offset=Number(data.serverNow||Date.now())-Date.now();
   view=data;render();
  }catch(e){toast(errorText(e.message));}
  finally{pending=false;}
 }
 async function act(command,params={},retry=false){
  if(pending||!claimed)return;
  const existing=queued();
  if(retry&&!existing)return;
  if(!retry&&existing){
   $('retry-action').hidden=false;
   toast('⚠️ Eine Aktion ist noch ungeklärt. Bitte zuerst sicher wiederholen.');
   return;
  }
  const operation=existing||{requestId:requestId(),command,params};
  if(!existing&&!storeQueue(operation)){
   toast('⚠️ Diese Aktion kann im Browser nicht sicher gespeichert werden. Bitte Speicher freigeben.');
   return;
  }
  pending=true;
  try{
   const data=await api('action',{requestId:operation.requestId,
    command:operation.command,...operation.params});
   clearQueue();
   offset=Number(data.view.serverNow||Date.now())-Date.now();
   view=data.view;lastFetch=Date.now();render();
   const result=data.result;
   if(result.type==='normal'||result.type==='mini')
    toast(result.win?'🏆 Tor '+result.gate+' gewonnen!':'⚔️ Tor '+result.gate+' verloren – erneut versuchen.');
   else if(result.type==='ready')
    toast('⚔️ Nova und Titan sind bereit! Gemeinsamer Bosskampf startet.');
   else if(result.type==='minigame')
    toast(result.correct?'✅ Richtig! Schadensbonus gewonnen.':'❌ Diesmal kein Bonus.');
   else if(result.type==='chest')toast('📦 '+KINDS[result.tier]+' verdient ('+result.count+' Rohstoffe)');
   else if(result.type==='open')toast('📦 '+result.drop.count+' Rohstoffe geöffnet und gespeichert.');
   else if(result.type==='upgrade')toast(result.success?'⚒️ Verbesserung erfolgreich!':'🔨 Aufwertung fehlgeschlagen. Rohstoffe verbraucht.');
   else if(result.type==='prepare')toast('🧪 Tor '+result.gate+' für den Schnelltest vorbereitet.');
   else if(result.type==='reset')toast('🔄 Nur der private Teststand wurde zurückgesetzt.');
  }catch(e){
   // A rejected action cannot have been committed. On an ambiguous network
   // failure keep its receipt ID so retry never awards a second chest.
   if(/^(DOG_|FORGE_|INVALID_|NO_|NOT_|PREVIEW_(?!UNAVAILABLE))/.test(e.message||''))
    clearQueue();
   toast(errorText(e.message));
   $('retry-action').hidden=!queued();
  }
  finally{pending=false;}
 }
 const done=(g,p,bosses)=>g%10===0?bosses.includes(g):
  g%10===5?p.minis.includes(g):p.normals.includes(g);
 const previousNormal=g=>{for(let n=g-1;n>=1;n--)if(n%5!==0)return n;return null;};
 function renderGates(){
  const p=view.map.progress,bosses=view.map.sharedBosses||[];
  const gate=$('gate-grid'),nodes=[];
  for(let g=1;g<=100;g++){
   const isBoss=g%10===0,mini=g%10===5;
   const win=done(g,p,bosses),need=previousNormal(g);
   const previousBoss=g>=16?Math.floor((g-6)/10)*10:0;
   const unlocked=(need===null||p.normals.includes(need))&&
    (!previousBoss||bosses.includes(previousBoss));
   const available=isBoss?true:unlocked&&!win;
   const selectedBoss=isBoss&&g===view.bossGate;
   nodes.push('<button type="button" class="gate '+
    (isBoss?'boss ':mini?'mini ':'')+(win?'won ':'')+
    ((g===p.currentGate||selectedBoss)?'current':'')+
    '" data-gate="'+g+'" '+(!available?'disabled':'')+
    ' title="'+(isBoss?'Gruppenboss ':mini?'Mini-Boss ':'Tor ')+g+
    '"><b>'+(isBoss?'🐉 ':mini?'👹 ':'')+g+'</b>'+
    (win?'<span>✓</span>':'')+'</button>');
  }
  gate.innerHTML=nodes.join('');
  $('overall-gate').textContent=p.highestGate||1;
  $('overall-bosses').textContent=bosses.length+' / 10';
  $('overall-chests').textContent=view.inventory.unopened||0;
  $('gate-status').textContent='Deine normalen Tore: '+p.normals.length+
   '/80 · Mini-Bosse: '+p.minis.length+'/10 · Gemeinsame Siege: '+bosses.length+'/10';
 }
 function renderParty(){
  $('party').innerHTML=view.map.members.map(m=>{
   const bot=BOT_IDS.includes(m.uid);
   return '<div class="player '+(bot?'bot':'')+'"><div class="avatar">'+
    (bot?(m.uid===BOT_IDS[0]?'🤖':'🛡️'):'🧑‍🚀')+'</div><div><strong>'+
    (bot?(m.uid===BOT_IDS[0]?'Nova · KI-Mitspieler':'Titan · KI-Mitspieler'):
     'Du · echter Spieler')+'</strong><small>'+
    (bot?'Automatisch bereit und aktiv':'Deine Eingaben entscheiden')+
    ' · Tor '+m.highestGate+'</small></div></div>';
  }).join('');
 }
 const battleState=()=>{
  const b=view?.boss;return b?.phase==='fighting'?b:null;
 };
 function renderBoss(){
  const b=view.boss,gate=view.bossGate,title=BOSS[gate]||BOSS[10];
  $('boss-gate-label').textContent='GEMEINSAMER BOSS · TOR '+gate;
  $('boss-title').textContent=gate===10?'Der Aschewächter':title[0];
  $('boss-image').src='./dog-boss-art/'+title[1]+'.svg';
  $('boss-status').textContent=b.won?'🏆 Besiegt':
   b.phase==='fighting'?'⚔️ Kampf läuft':b.phase==='cooldown'?'⏳ Erholung':'⚔️ Bereit';
  $('boss-hp').textContent=fmt(b.bossHp)+' Boss-LP · '+(b.roster?.length||0)+' Teilnehmer';
  const remaining=Number(b.result?.hpRemaining);
  $('boss-health').style.width=Number.isFinite(remaining)&&b.result?
   Math.max(0,Math.min(100,100*remaining/b.bossHp))+'%':'100%';
  $('boss-people').innerHTML=(b.members||[]).map(m=>
   '<span class="'+(m.ready?'ready':'')+'">'+(m.uid===user()?.uid?'🧑‍🚀 ': '🤖 ')+
   (m.uid===user()?.uid?'Du':m.name)+' '+(m.ready?'✓':'')+'</span>').join('');
  const eligible=b.eligible===true;
  $('ready').hidden=b.phase==='fighting'||b.won;
  $('ready').disabled=pending||!eligible||b.phase==='cooldown';
  $('ready').textContent='⚔️ Jetzt mit zwei Bots gegen Boss '+gate+' kämpfen';
  $('boss-info').textContent=b.won?'🏆 Gemeinsam besiegt. Der nächste Abschnitt ist freigeschaltet.':
   b.phase==='fighting'?'Alle drei Helden kämpfen gerade gemeinsam. Die Bots lösen ihre Aufgaben automatisch.':
   b.phase==='cooldown'?'Der Boss erholt sich. Zum schnellen Wiederholen kannst du das Kapitel unten neu vorbereiten.':
   eligible?'Bereit! Nova und Titan schließen sich deinem Kampf automatisch an.':
   '🔒 Zuerst die acht normalen Tore dieses Kapitels besiegen – oder unten den Schnelltest wählen.';
  const result=b.result;
  $('boss-result').textContent=result?
   (result.win?'🏆 Sieg! ':'❌ Niederlage. ')+
    'Teamschaden: '+fmt(result.damage)+' · Rest-LP: '+fmt(result.hpRemaining)+
    ' · Teilnehmer: '+result.participants:'';
  renderChallenge();
  paintClock();
 }
 function renderChallenge(){
  const b=battleState(),root=$('challenge');
  if(!b?.miniGames){root.hidden=true;lastRound=-1;return;}
  const elapsed=clock()-b.startedAt;
  const round=b.miniGames.rounds.find(r=>elapsed>=r.startMs&&elapsed<r.endMs);
  if(!round){root.hidden=true;lastRound=-1;return;}
  root.hidden=false;
  const completed=b.miniGames.myAnswers?.[round.round];
  const bots=b.miniGames.completedBy||{};
  if(round.round===lastRound&&root.dataset.answered===String(!!completed))return;
  lastRound=round.round;root.dataset.answered=String(!!completed);
  let content='<p class="eyebrow">REAKTIONSPRÜFUNG '+(round.round+1)+'/3 · '+
   'Nova '+(bots[BOT_IDS[0]]||0)+'/3 · Titan '+(bots[BOT_IDS[1]]||0)+'/3</p>';
  const titles={dodge:'🛡️ Weiche dem Angriff aus!',math:'🧠 Rechne blitzschnell!',
   reaction:'⚡ Reagiere im richtigen Moment!',target:'🎯 Triff den beweglichen Schwachpunkt!'};
  content+='<h3>'+titles[round.kind]+'</h3>';
  if(completed){
   content+='<p class="message">'+(completed.correct?'✅ Richtig!':'❌ Verpasst!')+
    ' – der nächste Angriff folgt automatisch.</p>';
  }else if(round.kind==='math'){
   content+='<p class="message">'+round.question+'</p><div class="choices">'+
    round.options.map((n,i)=>'<button data-answer="'+i+'">'+n+'</button>').join('')+'</div>';
  }else if(round.kind==='dodge'){
   content+='<p class="message">Wähle das einzige sichere Feld.</p><div class="choices">'+
    Array.from({length:round.lanes},(_,i)=>'<button data-answer="'+i+'">'+
     (i===round.dangerIndex||i===round.secondDangerIndex?'💥 Gefahr':'🛡️ Sicher')+
     '<small style="display:block">Feld '+(i+1)+'</small></button>').join('')+'</div>';
  }else if(round.kind==='reaction'){
   content+='<p id="reaction-cue" class="message">Beobachte den Countdown. Drücke bei GRÜN.</p>'+
    '<button class="reaction" data-answer="1">⚡ JETZT!</button>';
  }else if(round.kind==='target'){
   content+='<p class="message">Der goldene Trefferpunkt bewegt sich. Tippe im richtigen Feld!</p>'+
    '<div class="choices">'+Array.from({length:round.lanes},(_,i)=>
     '<button data-answer="'+i+'" data-target="'+i+'">🎯 '+(i+1)+'</button>').join('')+'</div>';
  }
  content+='<p class="timer" id="round-clock"></p>';
  root.innerHTML=content;
  paintChallenge();
 }
 function paintChallenge(){
  const b=battleState(),round=b?.miniGames?.rounds.find(r=>{
   const e=clock()-b.startedAt;return e>=r.startMs&&e<r.endMs;
  });
  if(!round||$('challenge').hidden)return;
  const elapsed=clock()-b.startedAt;
  if($('round-clock'))$('round-clock').textContent=
   'Noch '+Math.max(0,Math.ceil((round.endMs-elapsed)/1000))+' Sekunden';
  if(round.kind==='reaction'&&$('reaction-cue')){
   const close=Math.abs(elapsed-round.targetMs)<=round.toleranceMs;
   $('reaction-cue').textContent=close?'🟢 GRÜN – JETZT DRÜCKEN!':
    elapsed<round.targetMs?'⏳ Ring lädt …':'🔴 Signal vorbei';
   $('challenge').querySelector('.reaction')?.classList.toggle('active',close);
  }
  if(round.kind==='target'){
   const phase=Math.max(0,Math.floor((elapsed-round.startMs)/round.stepMs));
   const current=(round.initialIndex+phase)%round.lanes;
   $('challenge').querySelectorAll('[data-target]').forEach(el=>{
    el.style.background=Number(el.dataset.target)===current?'#d4ac64':'#243f56';
    el.style.color=Number(el.dataset.target)===current?'#162337':'#fff';
   });
  }
 }
 function paintClock(){
  const b=view?.boss;if(!b)return;
  const secs=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+
   String(n%60).padStart(2,'0');
  if(b.phase==='fighting'){
   const left=Math.max(0,Math.ceil((b.endsAt-clock())/1000));
   $('boss-timer').textContent='⏱️ '+secs(left);
  }else if(b.phase==='cooldown'){
   const left=Math.max(0,Math.ceil((b.cooldownUntil-clock())/1000));
   $('boss-timer').textContent='⏳ '+secs(left);
  }else $('boss-timer').textContent=b.won?'🏆 Besiegt':'⏱️ 00:30';
  paintChallenge();
 }
 function renderMaterials(){
  const inventory=view.inventory,counts=Object.fromEntries(Object.keys(KINDS).map(k=>[k,0]));
  for(const offer of inventory.expeditionChests||[])if(Object.hasOwn(counts,offer.tier))
   counts[offer.tier]+=offer.quantity||0;
  $('chest-list').innerHTML=Object.entries(KINDS).map(([tier,name])=>
   '<div class="chest-row"><div><b>'+name+'</b><small>Vorhanden: '+counts[tier]+
   '</small></div><button data-open="'+tier+'" '+(counts[tier]?'':'disabled')+
   '>Öffnen</button></div>').join('');
  const translate={
   focus_dust:'Fokusstaub',power_crystal:'Machtkristall',battle_essence:'Kampfessenz',
   war_rune:'Kriegsrune',soul_shard:'Seelensplitter',life_dust:'Lebensstaub',
   guard_crystal:'Schutzkristall',life_essence:'Lebensessenz',
   guardian_rune:'Wächterrune',phoenix_feather:'Phönixfeder',
   iron:'Eisen',forge_coal:'Schmiedekohle',steel_core:'Stahlkern',
   mithril:'Mithril',dragonsteel:'Drachenstahl'
  };
  $('resources').innerHTML=Object.entries(inventory.resources).map(([name,count])=>
   '<div class="resource">'+(translate[name]||name)+'<b>'+fmt(count)+'</b></div>').join('');
 }
 function renderForge(){
  const quoteIds=['weapon','armor','attack_power','destruction','vitality','blocking'];
  const labels={weapon:'⚔️ Waffe',armor:'🛡️ Rüstung',attack_power:'💥 Angriff',
   destruction:'💀 Zerstörung',vitality:'❤️ Lebensenergie',blocking:'🛡️ Blocken'};
  const quotes=view.forge.quotes||[];
  $('forge-items').innerHTML=quoteIds.map(id=>{
   const q=quotes.find(q=>q.itemId===id);if(!q)return '';
   const cost=Object.entries(q.cost||{}).map(([k,v])=>v+' '+k.replace(/_/g,' ')).join(' + ');
   return '<div class="forge-row"><div><b>'+labels[id]+' · Lvl '+q.level+
    '</b><small>'+(q.maxed?'Maximalstufe erreicht':q.locked?
     '🔒 Nächster Boss notwendig':'Kosten: '+(cost||'–'))+
    '</small></div><button data-forge="'+id+'" data-level="'+q.level+'" '+
    (!q.affordable?'disabled':'')+'>Verbessern</button></div>';
  }).join('');
 }
 function render(){
  if(!view)return;showApp();renderGates();renderParty();renderBoss();renderMaterials();renderForge();
  $('retry-action').hidden=!queued();
 }
 $('unlock').onclick=unlock;
 $('retry-action').onclick=()=>act(null,{},true);
 $('login').onclick=()=>window.SpielOnline?.openLogin?.();
 $('ready').onclick=()=>act('ready',{gate:view.bossGate});
 $('chest').onclick=()=>act('chest');
 $('prepare').onclick=()=>{
  if(!window.confirm('Nur deinen PRIVATEN Testspielstand für Tor '+$('chapter').value+
   ' vorbereiten? Die bisherigen Testtore und Testmaterialien werden ersetzt.'))return;
  act('prepare',{gate:Number($('chapter').value)});
 };
 $('reset').onclick=()=>{
  if(window.confirm('Nur den privaten 100-Tore-Testspielstand wirklich zurücksetzen?'))
   act('reset');
 };
 $('gate-grid').addEventListener('click',e=>{
  const btn=e.target.closest('[data-gate]');if(!btn||btn.disabled)return;
  const gate=Number(btn.dataset.gate);
  if(gate%10===0)act('select',{gate});
  else act('fight',{gate});
 });
 $('challenge').addEventListener('click',e=>{
  const btn=e.target.closest('[data-answer]');
  if(!btn||!view?.boss||btn.disabled)return;
  act('minigame',{gate:view.bossGate,round:lastRound,answer:Number(btn.dataset.answer)});
 });
 $('chest-list').addEventListener('click',e=>{
  const b=e.target.closest('[data-open]');if(b&&!b.disabled)act('open',{tier:b.dataset.open});
 });
 $('forge-items').addEventListener('click',e=>{
  const b=e.target.closest('[data-forge]');
  if(b&&!b.disabled)act('forge',{itemId:b.dataset.forge,expectedLevel:Number(b.dataset.level)});
 });
 window.addEventListener('spielonline-change',()=>{
  const u=user();
  if(!u){
   connectedUid='';claimed=false;
   showEntrance('Bitte mit deinem Online-Spielerprofil anmelden.');
  }else if(!claimed){void unlock();}
 });
 document.addEventListener('visibilitychange',()=>{
  // Repeated focus changes during an idle preview must not read Firestore.
  if(!document.hidden&&claimed&&(!view||Date.now()-lastFetch>
   (view.boss?.phase==='fighting'?1500:60000)))void refresh();
 });
 window.setInterval(()=>{
  if(Date.now()>toastUntil)$('toast').hidden=true;
  if(!claimed||!view)return;
  paintClock();
  // Private playtest: 60s idle recovery instead of expensive 6s GETs.
  // Keep 1.5s polling exclusively while a shared boss is fighting.
  const interval=view.boss?.phase==='fighting'?1500:60000;
  if(!pending&&!document.hidden&&Date.now()-lastFetch>interval)void refresh();
 },300);
 if(user()&&key)void unlock();
 else showEntrance(key?'Bitte mit deinem Spielerprofil anmelden.':'Nur mit einem privaten Testlink zugänglich.');
})();
