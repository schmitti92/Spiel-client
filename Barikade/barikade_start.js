/* Barikade Online-Vorraum V10. Firebase/Firestore-Server ist immer maßgeblich. */
(()=>{
'use strict';
const el=id=>document.getElementById(id),q=new URL(location.href).searchParams;
const code=String(q.get('room')||'').toUpperCase();
const GOOD=/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/;
const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const COLOR={red:'#f34850',blue:'#298cff',yellow:'#f7c442',green:'#39be6b'};
let room=null,busy=false,loading=false,ws=null,pollTimer=null,retry=null,currentUser=null;
const hostOnly=s=>room?.host&&room.phase==='preparing'&&!busy&&s!==false;
function note(msg='',error=false){el('status').textContent=msg;el('status').classList.toggle('error',error);}
function home(extra=''){return '../spielauswahl-online.html?room='+encodeURIComponent(code)+extra;}
function profile(){
 const state=window.SpielOnline?.state?.();
 return state?.status==='online'&&state?.profile?.setupComplete!==false&&state?.user?.getIdToken?state:null;
}
async function request(suffix='',method='GET',body){
 const p=profile();if(!p)throw Error('LOGIN_REQUIRED');
 const uid=p.user.uid,token=await p.user.getIdToken();
 if(profile()?.user.uid!==uid)throw Error('LOGIN_REQUIRED');
 const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),14000);
 try{
  const response=await fetch(api+'/api/hub/rooms/'+code+suffix,{
   method,mode:'cors',cache:'no-store',signal:ac.signal,
   headers:{Authorization:'Bearer '+token,...(body!==undefined?{'Content-Type':'application/json'}:{})},
   body:body===undefined?undefined:JSON.stringify(body)
  });
  const result=await response.json();
  if(!response.ok||result?.ok!==true)throw Error(result?.error||'SERVER_ERROR');
  return result.room;
 }finally{clearTimeout(timeout);}
}
const errors={HOST_ONLY:'Nur der Host darf das ändern.',ROOM_NOT_FOUND:'Raum abgelaufen oder nicht vorhanden.',
 NOT_A_MEMBER:'Bitte trete zuerst dem gemeinsamen Raum bei.',LOGIN_REQUIRED:'Online-Anmeldung erforderlich.',
 MATCH_IN_PROGRESS:'Während des Spiels können keine Regeln geändert werden.',
 NO_BARIKADE_SETUP:'Barikade ist momentan nicht ausgewählt.',INVALID_SETTINGS:'Diese Einstellung ist nicht zulässig.',
 GAME_SEATS_FULL:'Alle vier Spielerplätze sind belegt.',PLAYERS_NOT_READY:'Bitte warten, bis alle aktiven Spieler bereit sind.',
 HOST_MUST_PLAY:'Der Host muss mitspielen.',SPECTATOR_CANNOT_READY:'Zuschauer können sich nicht bereit melden.',
 NO_ACTIVE_MATCH:'Es läuft gerade keine Partie.',ROOM_ALREADY_PLAYING:'Die Partie läuft bereits.'};
const err=e=>errors[e?.message]||e?.message||'Verbindung zum Spielserver fehlgeschlagen.';
function gameUrl(snapshot){
 const m=snapshot.match,p=profile();
 if(!m?.participating||!/^B[A-HJ-NP-Z2-9]{9}$/.test(m.gameCode)||!p)throw Error('MATCH_CODE_INVALID');
 const settings=m.settings||{};
 try{
  localStorage.setItem('barikade_room',m.gameCode);
  localStorage.setItem('barikade_mode',snapshot.host?'host':'client');
  localStorage.setItem('barikade_playerName',p.profile?.name||'Spieler');
  localStorage.setItem('barikade_nameKey',p.profile?.name||'Spieler');
  localStorage.setItem('barikade_requested_color_'+m.gameCode,m.myColor||'');
  localStorage.setItem('barikade_action_mode',settings.mode==='action'?'action':'classic');
  localStorage.setItem('barikade_boss_mode',settings.bossMode?'boss':'off');
  localStorage.setItem('barikade_joker_count_'+m.gameCode,String(settings.jokerStartCount??3));
  localStorage.setItem('barikade_event_field_count_'+m.gameCode,String(settings.eventFieldCount??8));
  localStorage.setItem('barikade_boss_event_trigger_'+m.gameCode,String(settings.bossEventTrigger??2));
  localStorage.setItem('barikade_board_theme_'+m.gameCode,settings.boardTheme||'wood');
  localStorage.removeItem('barikade_sessionToken');
 }catch(_e){}
 return 'barikade.html?compact=1&hub='+encodeURIComponent(snapshot.code)+'&players='+m.playerCount+'&match='+encodeURIComponent(m.id);
}
function receive(next){
 if(!next||next.code!==code)return;
 if(next.game!=='barikade'){location.replace(home());return;}
 room=next;
 if(room.phase==='playing'&&room.match?.participating){
  try{location.replace(gameUrl(room));}catch(e){note(err(e),true);}
  return;
 }
 render();
}
async function mutate(route,body){
 if(busy||!room)return;
 busy=true;render();
 try{receive(await request(route,'POST',body));}
 catch(e){note(err(e),true);}
 finally{busy=false;render();}
}
function make(tag,className,txt){
 const e=document.createElement(tag);
 if(className)e.className=className;
 if(txt!==undefined)e.textContent=txt;
 return e;
}
const safeNum=v=>Number.isFinite(Number(v))?Number(v):0;
function renderChat(){
 const list=el('chat-messages'),messages=room?.chat||[];
 if(!Array.isArray(messages)||!messages.length){
  list.replaceChildren(make('p','no-chat',room?.chatEnabled?'Noch keine Nachrichten. Schreib die erste!':'Der gemeinsame Raumchat wird vorbereitet.'));
 }else{
  list.replaceChildren(...messages.slice(-35).map(m=>{
   const item=make('div','chat-line');
   const title=make('strong','',m.name||'Spieler');
   const time=make('time','',new Date(m.at||Date.now()).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}));
   const body=make('div','',m.text||'');
   item.append(title,time,body);return item;
  }));
 }
 const enabled=!!room?.chatEnabled&&!!profile();
 el('chat-input').disabled=!enabled;
 el('chat-send').disabled=!enabled||busy;
 el('chat-hint').textContent=enabled?'Nachrichten sind für alle Mitglieder dieses gemeinsamen Raums sichtbar.':'Raumchat benötigt die serverseitige Erweiterung.';
}
function renderPlayers(){
 const playing=room.players.filter(p=>p.participating);
 el('player-amount').textContent='('+playing.length+'/'+(room.maxPlayers||4)+')';
 el('active-count').textContent=playing.length+' / '+(room.maxPlayers||4);
 const list=el('player-list');
 list.replaceChildren(...room.players.map((p,i)=>{
  const item=make('div','player-card'+(p.host?' host':''));
  item.style.setProperty('--player',Object.values(COLOR)[i%4]);
  const portrait=make('span','portrait',(p.name||'?').trim().slice(0,1).toUpperCase());
  const name=make('div','player-name',p.name||'Spieler');
  const sub=make('small','',(p.host?'Host · ':'')+(p.me?'Du · ':'')+(p.participating?'Spieler':'Zuschauer'));
  if(p.host){const crown=make('span','host-label','👑 Host');name.append(crown);}
  name.append(sub);
  const state=make('span','ready-chip'+(p.ready?' yes':''),p.participating?(p.ready?'✔ Bereit':'◯ Wartet'):'👁');
  item.append(portrait,name,state);
  if(hostOnly()&&!p.host){
   const btn=make('button','seat-switch',p.participating?'Zuschauen':'Mitspielen');
   btn.type='button';btn.disabled=busy;
   btn.addEventListener('click',()=>mutate('/seats',{seat:p.seat,participating:!p.participating}));
   item.append(btn);
  }
  return item;
 }));
 const slots=Math.max(0,(room.maxPlayers||4)-playing.length);
 if(slots)list.append(make('div','player-card','＋ '+slots+' freie'+(slots===1?'r Platz':' Plätze')+' – Freunde einladen'));
}
function render(){
 if(!room)return;
 el('loading').classList.add('hidden');el('lobby').classList.remove('hidden');
 el('room-code').textContent=code;
 const s=room.settings||{},canEdit=hostOnly();
 el('host-status').textContent=room.host?'👑 Du bist Host – nur du darfst Regeln und Plätze ändern.':'🔒 Der Host legt alle Regeln und Plätze fest.';
 el('board-choice').textContent=({wood:'Holz',classic:'Klassisch',stone:'Stein'})[s.boardTheme]||'Klassisch';
 document.querySelectorAll('[data-board]').forEach(btn=>{
  btn.classList.toggle('selected',s.boardTheme===btn.dataset.board);
  btn.disabled=!canEdit;
  btn.setAttribute('aria-pressed',String(s.boardTheme===btn.dataset.board));
 });
 el('board-stage').dataset.theme=s.boardTheme||'wood';
 const eventSlider=el('event-count');
 if(eventSlider){const count=Math.max(5,Math.min(20,Number.isInteger(Number(s.eventFieldCount))?Number(s.eventFieldCount):8));if(document.activeElement!==eventSlider)eventSlider.value=String(count);el('event-count-value').textContent=count+' Ereignisfelder';eventSlider.disabled=!canEdit;}
 document.querySelectorAll('[data-boss]').forEach(b=>{b.classList.toggle('active',String(s.bossMode)===b.dataset.boss);b.disabled=!canEdit;});
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',s.mode===b.dataset.mode);b.disabled=!canEdit;});
 document.querySelectorAll('[data-joker]').forEach(b=>{b.classList.toggle('active',safeNum(b.dataset.joker)===s.jokerStartCount||(b.dataset.joker==='0'&&s.mode==='classic'));b.disabled=!canEdit;});
 document.querySelectorAll('[data-color]').forEach(b=>{b.classList.toggle('active',s.colorMode===b.dataset.color);b.disabled=!canEdit;});
 const me=room.players.find(p=>p.me);
 const canColor=room.phase==='preparing'&&me?.participating&&s.colorMode==='manual';
 el('color-pick-wrap').classList.toggle('hidden',!canColor);
 el('color-pick').disabled=busy||!canColor;
 el('color-pick').value=me?.colorPref||'';
 [...el('color-pick').options].forEach(o=>{o.disabled=!!o.value&&room.players.some(p=>!p.me&&p.participating&&p.colorPref===o.value);});
 renderPlayers();renderChat();
 const playing=room.players.filter(p=>p.participating),ready=playing.filter(p=>p.ready).length;
 const own=room.players.find(p=>p.me);
 el('ready-btn').textContent=own?.ready?'✔ Bereitmeldung zurücknehmen':'✓ Ich bin bereit';
 el('ready-btn').classList.toggle('is-ready',!!own?.ready);
 el('ready-btn').disabled=busy||room.phase!=='preparing'||!own?.participating;
 el('start-btn').disabled=busy||!(room.phase==='playing'&&room.match?.participating)&&(!room.host||ready<2||ready!==playing.length||room.phase!=='preparing');
 el('start-btn').textContent=room.phase==='playing'?'▶ Zur laufenden Partie':'▶ Spiel starten';
 el('leave-btn').disabled=busy||room.phase==='playing';
 if(room.phase==='preparing')note(playing.length<2?'Noch ein Mitspieler erforderlich.':ready+' von '+playing.length+' Spielern bereit. '+(ready===playing.length?'Die Partie startet automatisch.':'Warten auf alle Spieler.'));
 else note('Die Partie läuft. Spieler wechseln automatisch auf das Spielbrett.');
}
async function poll(){
 if(loading||busy||document.hidden||!profile()||!room)return;
 loading=true;try{receive(await request());}catch(e){note(err(e),true);}finally{loading=false;}
}
function connect(){
 if(ws||!room||!profile())return;
 const sock=new WebSocket(api.replace(/^http/i,'ws')+'/hub');ws=sock;
 let last=Date.now();
 sock.onopen=async()=>{
  try{const p=profile(),token=await p.user.getIdToken();
   if(ws===sock&&sock.readyState===1)sock.send(JSON.stringify({type:'subscribe',code,profileIdToken:token}));
  }catch(_e){try{sock.close()}catch(_x){}}
 };
 sock.onmessage=e=>{let msg;try{msg=JSON.parse(e.data);}catch(_e){return;}
  if(msg?.type==='room'&&msg.room?.code===code){last=Date.now();receive(msg.room);}
  if(msg?.type==='pong')last=Date.now();
 };
 sock.onerror=()=>{};
 sock.onclose=()=>{if(ws!==sock)return;ws=null;retry=setTimeout(()=>{retry=null;connect();},5000);};
}
function disconnect(){if(retry){clearTimeout(retry);retry=null;}if(ws){const old=ws;ws=null;try{old.onclose=null;old.close()}catch(_e){}}}
async function boot(){
 if(!GOOD.test(code)){el('loading').textContent='Ungültiger Raumcode – bitte erneut beitreten.';return;}
 el('back-link').href=home('&choose=1');
 const check=setInterval(async()=>{
  if(!profile())return;
  clearInterval(check);
  try{receive(await request());connect();pollTimer=setInterval(polling,4500);}
  catch(e){el('loading').textContent='Raum konnte nicht geöffnet werden: '+err(e);}
 },300);
 function polling(){void poll();}
}
function updateSettings(delta){
 if(!hostOnly())return;
 void mutate('/settings',{settings:{...room.settings,...delta}});
}
const eventSlider=el('event-count');
if(eventSlider){eventSlider.addEventListener('input',()=>{el('event-count-value').textContent=eventSlider.value+' Ereignisfelder';});eventSlider.addEventListener('change',()=>{if(hostOnly())updateSettings({eventFieldCount:Number(eventSlider.value)});});}
document.querySelectorAll('[data-boss]').forEach(b=>b.addEventListener('click',()=>updateSettings({bossMode:b.dataset.boss==='true'})));
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>updateSettings({mode:b.dataset.mode})));
document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>updateSettings({colorMode:b.dataset.color})));
document.querySelectorAll('[data-joker]').forEach(b=>b.addEventListener('click',()=>{
 if(!hostOnly())return;
 const count=Number(b.dataset.joker);
 if(count===0){note('Joker lassen sich derzeit durch Wahl des klassischen Spielmodus vermeiden.');updateSettings({mode:'classic'});}
 else updateSettings({jokerStartCount:count,mode:'action'});
}));
document.querySelectorAll('[data-board]').forEach(b=>b.addEventListener('click',()=>updateSettings({boardTheme:b.dataset.board})));
document.querySelectorAll('[data-preview]').forEach(b=>b.addEventListener('click',()=>{
 note('🎨 '+b.querySelector('strong').textContent+' ist nur eine Vorschau. Aktuell sind Klassisch, Holz und Stein im Spiel verfügbar.');
}));
el('color-pick').addEventListener('change',e=>{if(room?.phase==='preparing')void mutate('/color',{color:e.target.value||null});});
el('theme-prev').addEventListener('click',()=>el('theme-next').previousElementSibling.scrollBy({left:-215,behavior:'smooth'}));
el('theme-next').addEventListener('click',()=>el('theme-next').previousElementSibling.scrollBy({left:215,behavior:'smooth'}));
el('preview-full').addEventListener('click',async()=>{
 const target=el('board-stage');
 if(document.fullscreenElement){await document.exitFullscreen?.();return;}
 try{await target.requestFullscreen?.();}catch(_e){note('Vollbild ist in diesem Browser nicht verfügbar.');}
});
el('ready-btn').addEventListener('click',()=>{
 const me=room?.players?.find(p=>p.me);
 if(me?.participating&&room.phase==='preparing')void mutate('/ready',{ready:!me.ready});
});
el('start-btn').addEventListener('click',()=>{
 if(!room||busy)return;
 if(room.phase==='playing'&&room.match?.participating){location.assign(gameUrl(room));return;}
 if(!room.host)return;
 const players=room.players.filter(p=>p.participating);
 if(players.length<2||!players.every(p=>p.ready)){note('Warte, bis mindestens zwei Spieler bereit sind.');return;}
 void mutate('/start',{});
});
el('leave-btn').addEventListener('click',async()=>{
 if(!room||room.phase==='playing')return;
 await mutate('/leave',{});
 location.assign('../hub-lobby.html');
});
async function invite(source){
 const inviteURL=new URL('../hub-lobby.html?invite='+encodeURIComponent(code),location.href).href;
 const label='Spiele Barikade mit uns! Raumcode: '+code+' '+inviteURL;
 try{
  if(source==='whatsapp'){window.open('https://wa.me/?text='+encodeURIComponent(label),'_blank','noopener');return;}
  if(source==='share'&&navigator.share){await navigator.share({title:'Barikade – Spieleabend',text:'Unser Raumcode: '+code,url:inviteURL});return;}
  await navigator.clipboard.writeText(source==='copy'?code:label);
  note(source==='copy'?'📋 Raumcode kopiert.':'🔗 Einladung kopiert.');
 }catch(e){if(e?.name!=='AbortError')note('Teile den Code '+code+' mit deinen Freunden.');}
}
el('share-whatsapp').addEventListener('click',()=>invite('whatsapp'));
el('share-link').addEventListener('click',()=>invite('share'));
el('share-copy').addEventListener('click',()=>invite('text'));
el('copy-room').addEventListener('click',()=>invite('copy'));
el('invite-seat').addEventListener('click',()=>invite('share'));
el('chat-form').addEventListener('submit',async e=>{
 e.preventDefault();
 const input=el('chat-input'),msg=input.value.trim();
 if(!room?.chatEnabled||!msg||msg.length>300||busy)return;
 input.value='';
 await mutate('/chat',{text:msg});
});
window.addEventListener('spielonline-change',()=>{const p=profile();
 if(!p){disconnect();room=null;el('lobby').classList.add('hidden');el('loading').classList.remove('hidden');el('loading').textContent='Bitte melde dich mit deinem Online-Profil an.';}
 else if(room){void poll();connect();}
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void poll();});
window.addEventListener('pagehide',()=>{disconnect();if(pollTimer)clearInterval(pollTimer);});
async function showOriginalBoard(){
 const target=el('board-content');
 try{
  const result=await fetch('board.json',{cache:'force-cache'}),data=await result.json();
  if(!Array.isArray(data.nodes)||!Array.isArray(data.edges))throw Error('BOARD_DATA_INVALID');
  const NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','310 -100 740 800');
  svg.setAttribute('role','img');svg.setAttribute('aria-label','Brettvorschau des originalen Barikade-Spielbretts');
  const tag=(name,attrs)=>{const n=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
  const defs=tag('defs',{});const gradient=tag('linearGradient',{id:'surface',x1:'0',y1:'0',x2:'0',y2:'1'});
  gradient.append(tag('stop',{offset:'0%','stop-color':'#ded1b0'}),tag('stop',{offset:'100%','stop-color':'#9d9e92'}));defs.append(gradient);svg.append(defs);
  svg.append(tag('rect',{x:330,y:-52,width:700,height:724,rx:27,fill:'#2c372f',stroke:'#efdbab','stroke-width':6,opacity:'.93'}));
  const map=new Map(data.nodes.map(n=>[n.id,n]));
  for(const edge of data.edges){
    const a=map.get(edge[0]),b=map.get(edge[1]);if(!a||!b)continue;
    svg.append(tag('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#b68c5f','stroke-width':11,'stroke-linecap':'round',opacity:'.65'}));
  }
  for(const node of data.nodes){
    const color=node.flags?.startColor||node.flags?.houseColor;
    const paint=COLOR[color]||(node.flags?.goal?'#ffcb48':'url(#surface)');
    const radius=node.kind==='house'?12:13;
    svg.append(tag('circle',{cx:node.x,cy:node.y+3,r:radius+2,fill:'#1f2723',opacity:'.55'}));
    svg.append(tag('circle',{cx:node.x,cy:node.y,r:radius,fill:paint,stroke:color?'#ffffff':'#53463c','stroke-width':color?2.5:1.5}));
    if(node.flags?.goal){const crown=tag('text',{x:node.x,y:node.y+6,'text-anchor':'middle','font-size':20,fill:'#724a08'});crown.textContent='♛';svg.append(crown);}
  }
  target.replaceChildren(svg);
 }catch(_e){target.replaceChildren(make('p','', 'Brettvorschau ist momentan nicht verfügbar.'));}
}
void showOriginalBoard();
void boot();
})();