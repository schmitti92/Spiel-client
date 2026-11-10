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
 const MINI_BOSSES=Object.freeze({
  5:'Steinbrecher',15:'Schattenwolf',25:'Dornenbestie',35:'Kristallgolem',
  45:'Giftstachel',55:'Lavabestie',65:'Seelenjäger',75:'Jungdrache',
  85:'Dunkler Ritter',95:'Todeswächter'
 });
 const $=id=>document.getElementById(id);
 const worldRoot=$('worlds'),details=$('details'),pathList=[];
 const gateButtons=new Map();
 let mapState=null,selectedGate=null,working=false,mapRequestEpoch=0,lastFight=null;
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
 function renderMembers(){
  const area=$('team-members');area.replaceChildren();
  const team=mapState?.members||[];
  if(!team.length){
   area.append($node('div','team-empty','Noch keine bestätigten Teampositionen vorhanden.'));
  }
  for(let i=0;i<3;i++){
   const member=team[i];
   const card=$node('div','member-card hero-'+(i+1)+(member?.isMe?' own':'')); 
   if(member){
    const avatar=$node('span','member-avatar',member.name.slice(0,1).toUpperCase());
    const text=$node('div','member-copy');
    text.append($node('strong',null,member.name+(member.isMe?' (du)':'')));
    text.append($node('span',null,'📍 Aktuell: Tor '+member.currentGate));
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
  const logged=auth();
  const join=$('team-join');
  join.hidden=!logged||!mapState||mapState.isMember||!mapState.canJoin;
  join.disabled=working;
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
     '🐉 Alle drei Spieler treffen sich in der Bossarena. Jeder muss Tor 9 geschafft haben und auf Bereit klicken.';
   }else{
    boss.hidden=true;
    notice.textContent='🔒 Dieser Gruppenboss ist noch nicht implementiert. Sein Start wird hier freigeschaltet, sobald der Server den Kampf unterstützt.';
   }
   return;
  }
  const me=mapState?.progress;
  const done=(gate%10===5?me?.minis:me?.normals)||[];
  const prereq=previousNormal(gate);
  const ready=prereq===null||me?.normals?.includes(prereq);
  const member=!!mapState?.isMember;
  button.disabled=working||!!pending||!member||!ready||done.includes(gate);
  button.textContent=gate%10===5?'👹 Mini-Boss herausfordern':'⚔️ Persönlichen Kampf starten';
  notice.textContent=pending?'⚠️ Ein früherer Kampf bei Tor '+pending.gate+
   ' muss zuerst sicher wiederholt werden.':
   done.includes(gate)?'✅ Dieses Tor hast du bereits besiegt.':
   !auth()?'🔒 Melde dich mit deinem Online-Spielerprofil an, um Kämpfe zu starten.':
   !member?'🛡️ Tritt oben zuerst der Dreier-Expedition bei.':
   !ready?'🔒 Um Tor '+gate+' zu kämpfen, musst du zuerst das normale Tor '+
    prereq+' besiegen. Mini-Bosse und Gruppenbosse blockieren die normalen Tore nicht.':
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
   setTeamStatus('⚠️ Serverpositionen momentan nicht verfügbar. Keine erfundenen Torstände angezeigt.');
  }
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
 async function fightGate(retry=false){
  const account=auth()?.user?.uid;
  if(!account||working||!mapState?.isMember)return;
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
  'Persönlicher Kampf – Tor '+gate;
 const summaryFor=gate=>{
  if(gate===100)return 'Der letzte Wächter verteidigt das DOG-Schloss. Alle drei Spieler müssen ihn gemeinsam besiegen. Erst der bestätigte serverseitige Sieg darf DOG für euch freischalten.';
  if(gate%10===0)return 'Eine gemeinsame Herausforderung für alle drei Helden. Der Sieg schaltet die nächste Stufe in der Schmiede sowie neue Ausrüstungsmöglichkeiten frei.';
  if(gate%10===5)return 'Ein besonders harter Einzelkampf: Eine gute Waffe allein reicht oft nicht. Verstärke auch Rüstung und Fähigkeiten. Nach einem erstmaligen Sieg winkt eine besondere zufällige Belohnung.';
  return 'Ein normaler Einzelkampf mit einer von deiner Ausrüstung abhängigen Gewinnchance zwischen 30 % und 80 %. Du kannst ihn nach einer Niederlage erneut versuchen.';
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
  const kind=gate%10===0?'Gruppenboss':gate%10===5?'Mini-Boss':'Persönlicher Kampf';
  $('gate-detail-kicker').textContent='TOR '+gate+' VON 100 · '+kind.toUpperCase();
  $('gate-detail-title').textContent=titleFor(gate);
  $('gate-detail-summary').textContent=summaryFor(gate);
  $('gate-detail-future').textContent=gate===100?
   '🔒 DOG ist noch verschlossen. Es wird erst nach einem nachgewiesenen Sieg über den letzten gemeinsamen Boss freigeschaltet.':
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
 $('gate-detail-close').addEventListener('click',()=>details.close());
 $('team-refresh').addEventListener('click',()=>void reloadMap());
 $('team-join').addEventListener('click',()=>void joinTeam());
 $('gate-battle-button').addEventListener('click',()=>void fightGate(false));
 $('gate-retry-button').addEventListener('click',()=>void fightGate(true));
 window.addEventListener('spielonline-change',()=>void reloadMap());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!working)void reloadMap();});
 if(typeof window.setInterval==='function'){
  window.setInterval(()=>{if(!document.hidden&&!working)void reloadMap();},60000);
 }
 void reloadMap();
 details.addEventListener('close',()=>{for(const selected of document.querySelectorAll('.gate[aria-pressed="true"]'))selected.setAttribute('aria-pressed','false');});
})();
