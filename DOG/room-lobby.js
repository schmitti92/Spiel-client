/* DOG-only waiting room on top of the existing online hub.
 * This module renders public room data and emits user actions. hub-lobby.js
 * remains the sole owner of authenticated HTTP/WS requests and game start.
 */
import {renderDogRoomBoard} from './room-board-preview.js?v=3';
import {summarizeDogRoomLobby} from './room-lobby-state.js?v=2';
import {createDogRoomWelcomeFilm} from './room-lobby-video.js?v=3';
import {guardDesignerLink} from './designer-level-access.js?v=3';
import {readPreferredDogCosmetic} from './cosmetic-equipment.js?v=1';

const $=id=>document.getElementById(id);
const root=$('dog-room-lobby');
const welcomeFilm=createDogRoomWelcomeFilm({root});
const COLORS=['#ff7770','#5ec6ff','#80dda6','#ffd56c'];
const COLOR_NAMES=['Rot','Blau','Grün','Gelb'];
const COLOR_KEYS=['red','blue','green','yellow'];
let current=null,roomSignature='',previewVisible=false,wasOpen=false;
let lastSyncKey='',lastSyncAt=0,lastRoomBusy=false;
const designerGate=guardDesignerLink($('dog-room-designer'),{
 lockedText:'🔒 Brettdesigner · Level 2',unlockedText:'🎨 Brettdesigner',
 onStatus:({allowed,level,error})=>{
  setText('dog-room-profile-level',Number.isInteger(level)?'Level '+level:error==='LOGIN_REQUIRED'?'Bitte anmelden':'Level nicht verfügbar');
  const note=$('dog-room-designer-note');if(!note)return;
  note.textContent=allowed?'✅ Für dich freigeschaltet':
   level?'🔒 Dein Level '+level+' · Freigabe ab Level 2':
   error==='LOGIN_REQUIRED'?'Bitte mit deinem Profil anmelden':'Levelprüfung aktuell nicht möglich';
 }
});
function setText(id,value){
 const node=$(id),text=String(value);
 if(node && node.textContent!==text)node.textContent=text;
}
function feedback(text='',error=false){
 const node=$('dog-room-feedback');
 if(!node)return;
 node.textContent=String(text);
 node.dataset.error=error?'true':'false';
}
function make(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);
 return node;
}
function roomSeatColor(player,active,playing){
 if(playing){
  const roster=current?.match?.dog?.players;
  if(Array.isArray(roster)){
   const matchPlayer=roster.find(p=>p.uid===player.uid);
   if(Number.isInteger(matchPlayer?.seat))return COLOR_KEYS[matchPlayer.seat]||null;
  }
  if(player.me&&Number.isInteger(current?.match?.dogSeat))return COLOR_KEYS[current.match.dogSeat]||null;
 }
 return COLOR_KEYS.includes(player.colorPref)?player.colorPref:null;
}
function paintProfile(me){
 if(!me){setText('dog-room-profile-name','Spielerprofil');return;}
 setText('dog-room-profile-name',me.name);
 const avatar=$('dog-room-profile-avatar');
 const picture=window.DogAvatars?.css?.(me.dogAvatar);
 avatar.classList.toggle('is-picture',typeof picture==='string'&&!!picture);
 avatar.style.cssText=typeof picture==='string'?picture:'';
 if(!picture)avatar.textContent='♟';
}
function renderRoster(players,busy=false,playing=false){
 const active=players.filter(p=>p.participating);
 const signature=JSON.stringify([
  active.map(p=>[p.uid,p.name,p.ready,p.host,p.me,p.dogAvatar,p.colorPref]),
  players.filter(p=>!p.participating).map(p=>p.name),
  busy,playing,current?.match?.dogSeat
 ]);
 if(signature===roomSignature)return;
 roomSignature=signature;
 const used=new Set(active.map(p=>p.colorPref).filter(key=>COLOR_KEYS.includes(key)));
 const cards=[];
 for(let seat=0;seat<4;seat++){
  const player=active[seat];
  const assigned=player?roomSeatColor(player,active,playing):null;
  const colorIndex=COLOR_KEYS.indexOf(assigned);
  const card=make('div','dog-room-player'+(player?.host?' is-host':'')+(!player?' is-free':'')+(player?.me?' is-me':''));
  card.dataset.seat=String(seat);
  if(assigned)card.style.setProperty('--seat-color',COLORS[colorIndex]);
  const avatar=make('span','dog-room-player-avatar'+(player?'':' is-empty'));
  avatar.setAttribute('aria-hidden','true');
  avatar.style.color=assigned?COLORS[colorIndex]:COLORS[seat];
  if(player){
   const art=window.DogAvatars?.css?.(player.dogAvatar);
   if(typeof art==='string'&&art){
    avatar.classList.add('is-picture');
    avatar.style.cssText=art;
   }else avatar.textContent='♟';
  }else avatar.textContent='♟';
  const name=make('strong','dog-room-player-name',player?.name||'Platz '+(seat+1));
  const state=make('span','dog-room-player-status'+(player?.ready?' is-ready':''),
   !player?'frei':player.ready?'✓ Bereit':'Wartet');
  card.append(avatar,name,state);
  if(player?.host)card.append(make('small','dog-room-player-meta','👑 Host'+(player.me?' (Du)':'')));
  else if(player?.me)card.append(make('small','dog-room-player-meta','Du'));

  if(player?.me&&player.participating){
   const picker=make('div','dog-room-color-picker');
   picker.setAttribute('role','group');
   picker.setAttribute('aria-label',playing?'DOG-Farbe für die nächste Partie wählen':'Deine DOG-Spielfarbe wählen');
   const selected=player.colorPref||assigned;
   for(let i=0;i<4;i++){
    const key=COLOR_KEYS[i],chosen=selected===key,taken=used.has(key)&&!chosen;
    const button=make('button','dog-room-color-dot'+(chosen?' is-selected':''));button.type='button';
    button.dataset.dogColorChoice=key;
    button.style.setProperty('--choice-color',COLORS[i]);
    button.disabled=busy||taken;
    button.setAttribute('aria-label',COLOR_NAMES[i]+(taken?' – bereits vergeben':chosen?' – ausgewählt':playing?' für die nächste Partie wählen':' wählen'));
    button.setAttribute('aria-pressed',String(chosen));
    button.title=COLOR_NAMES[i]+(taken?' · belegt':chosen?' · erneut antippen für automatische Zuweisung':playing?' · nächste Partie':' wählen');
    picker.append(button);
   }
   card.append(picker);
   const nextIndex=COLOR_KEYS.indexOf(player.colorPref);
   card.append(make('small','dog-room-color-hint',playing?
    'Jetzt: '+(colorIndex<0?'–':COLOR_NAMES[colorIndex])+' · Nächste: '+(nextIndex<0?'Automatisch':COLOR_NAMES[nextIndex]):
    assigned?'Farbe: '+COLOR_NAMES[colorIndex]:'🎨 Spielfarbe wählen'));
  }else if(player){
   const status=make('small','dog-room-color-hint',assigned?'● '+COLOR_NAMES[colorIndex]:'Farbe automatisch');
   if(assigned)status.style.color=COLORS[colorIndex];
   card.append(status);
  }else{
   const dots=make('div','dog-room-free-colors');
   dots.setAttribute('aria-hidden','true');
   for(let i=0;i<4;i++){
    const dot=make('span','dog-room-free-color');
    dot.style.background=COLORS[i];dots.append(dot);
   }
   card.append(dots);
  }
  cards.push(card);
 }
 $('dog-room-roster').replaceChildren(...cards);
}
function send(kind,extra={}){
 window.dispatchEvent(new CustomEvent('dog-room-lobby-action',{detail:{kind,...extra}}));
}
function roomLink(path,roomCode){
 const returnPath='../hub-lobby.html?'+new URLSearchParams({room:roomCode,stage:'1'}).toString();
 return path+'?return='+encodeURIComponent(returnPath);
}
// Restore only explicitly chosen, server-verified rewards. A new device with
// no preference must never overwrite another device's equipment.
function syncEquipment(snapshot,busy=false){
 if(busy||!snapshot||!['preparing','playing'].includes(snapshot.phase))return;
 const me=snapshot.players?.find(p=>p.me);
 if(!me||!me.participating)return;
 const choices=[
  ['nameFrame','dogNameFrame'],
  ['activeIcon','dogActiveIcon']
 ];
 for(const [kind,field] of choices){
  const desired=readPreferredDogCosmetic(kind,{uid:me.uid});
  if(desired===undefined||(me[field]||null)===desired)continue;
  const key=snapshot.code+':'+me.uid+':'+kind+':'+desired;
  if(key===lastSyncKey&&Date.now()-lastSyncAt<20000)return;
  lastSyncKey=key;lastSyncAt=Date.now();send('cosmetic',{kind,unlockId:desired});return;
 }
 // A portrait selected before joining a room should also appear online.
 const avatar=window.DogAvatars?.preferredOnlineAvatar?.();
 if(Number.isInteger(avatar)&&me.dogAvatar!==avatar){
  const key=snapshot.code+':'+me.uid+':avatar:'+avatar;
  if(key===lastSyncKey&&Date.now()-lastSyncAt<20000)return;
  lastSyncKey=key;lastSyncAt=Date.now();send('avatar',{avatar});return;
 }
 lastSyncKey='';
}
function update(snapshot,busy=false){
 const state=summarizeDogRoomLobby(snapshot,busy);
 lastRoomBusy=busy;
 const active=!!state;
 root.hidden=!active;
 document.body.classList.toggle('dog-room-open',active);
 const shell=document.querySelector('.shell');
 if(shell){shell.inert=active;if(active)shell.setAttribute('aria-hidden','true');else shell.removeAttribute('aria-hidden');}
 if(!active){
  welcomeFilm.close();
  current=null;roomSignature='';previewVisible=false;wasOpen=false;lastSyncKey='';
  if($('dog-room-rules').open)$('dog-room-rules').close();
  return;
 }
 current=snapshot;
 if(!wasOpen){
  wasOpen=true;feedback('');
  welcomeFilm.arrive(state.code,{playing:state.playing});
 }
 const roomCode=state.code;
 setText('dog-room-code',roomCode);
 $('dog-room-back').href='spielauswahl-online.html?'+new URLSearchParams({room:roomCode,stay:'1'}).toString();
 designerGate.updateTarget(roomLink('DOG/design-studio.html',roomCode));
 $('dog-room-unlocks').href=roomLink('DOG/sammlung.html',roomCode);
 $('dog-room-christmas').href='DOG/christmas-event.html?'+new URLSearchParams({room:roomCode,return:'../hub-lobby.html?'+new URLSearchParams({room:roomCode,stage:'1'})}).toString();
 if(!previewVisible){
  renderDogRoomBoard($('dog-room-board-preview'));previewVisible=true;
 }
 const players=Array.isArray(snapshot.players)?snapshot.players:[];
 const me=state.me;
 const ready=state.readyCount;
 const spectatorCount=state.spectatorCount;
 const playing=state.playing,finished=state.finished;
 const total=state.activeCount;
 paintProfile(me);
 renderRoster(players,busy,playing||finished);
 setText('dog-room-count',total+' Spieler im Raum');
 setText('dog-room-ready-count',finished?'🏆 Runde beendet':playing?'Partie läuft':'Bereit '+ready+'/'+total);
 const percent=state.readyPercent;
 $('dog-room-progress-fill').style.width=percent+'%';
 $('dog-room-progress').setAttribute('aria-valuenow',String(percent));
 const note=finished?'Die Partie ist beendet. Der Host kann jetzt eine neue DOG-Runde im selben Raum vorbereiten.'
  :playing?'Die Partie ist gestartet. Du kannst jederzeit ins Spiel zurückkehren.'
  :!me?.participating?'Du schaust zu. Der Host kann dir einen Spielplatz zuweisen.'
  :total===1?'DOG ergänzt freie Plätze automatisch mit Computergegnern.'
  :ready===total?'Alle bereit. Die Partie wird jetzt vom Server gestartet.'
  :'Warte auf die Bereitschaft aller aktiven Mitspieler.';
 setText('dog-room-readiness-note',note+(spectatorCount?' · '+spectatorCount+' Zuschauer':''));
 const botPanel=$('dog-room-bot-settings'),botSelect=$('dog-room-bot-count');
 const twoHumans=total===2&&snapshot.phase==='preparing';
 botPanel.hidden=!twoHumans;
 if(twoHumans){
  const count=[0,1,2].includes(snapshot.settings?.botCount)?snapshot.settings.botCount:2;
  botSelect.value=String(count);
  botSelect.disabled=busy||!snapshot.host;
  setText('dog-room-bot-note',snapshot.host?
   '👑 Du bestimmst die Bot-Anzahl. Bei einer Änderung müssen alle erneut bereit sein.':
   '👑 Der Host wählt die Bot-Anzahl für eure Partie.');
 }
 const join=$('dog-room-join'),readyButton=$('dog-room-ready'),start=$('dog-room-start');
 const canPlay=!!me?.participating;
 if(finished){
  join.textContent=snapshot.match?.participating?'🏆 Siegerehrung ansehen':'Zuschauer';
  join.disabled=!state.joinEnabled;
  readyButton.hidden=true;
  start.hidden=!state.hostStartVisible;
  start.textContent='↻ Neue Runde vorbereiten';
  start.disabled=!state.hostStartEnabled;
  start.title=state.hostStartHint;
 }else if(playing){
  join.textContent=snapshot.match?.participating?'▶ Zur laufenden Partie':'Zuschauer';
  join.disabled=!state.joinEnabled;
  readyButton.hidden=true;
  start.hidden=true;
 }else{
  readyButton.hidden=false;
  readyButton.textContent=me?.ready?'✓ Bereitschaft zurücknehmen':'✓ Ich bin bereit';
  readyButton.disabled=!state.readyEnabled;
  join.textContent=canPlay?(me.ready?'✓ Spiel beigetreten':'⇥ Spiel beitreten'):'Spielplatz vom Host';
  join.disabled=!state.joinEnabled;
  // The existing server starts DOG automatically on the final ready action.
  // Host Start is a convenience that submits the host's own readiness once
  // everybody else is ready; it does NOT call the Challenge-only /start route.
  start.hidden=!state.hostStartVisible;
  start.textContent='▶ Partie starten';
  start.disabled=!state.hostStartEnabled;
  start.title=state.hostStartHint;
 }
 if(busy)feedback('Aktion wird vom Server bestätigt …');
 if(!busy)syncEquipment(snapshot,false);
}
$('dog-room-bot-count').addEventListener('change',event=>{
 if(!current||current.phase!=='preparing'||!current.host||
    current.players.filter(p=>p.participating).length!==2)return;
 const botCount=Number(event.target.value);
 if(![0,1,2].includes(botCount))return;
 send('bots',{botCount});
});
$('dog-room-roster').addEventListener('click',event=>{
 const button=event.target.closest('button[data-dog-color-choice]');
 if(!button||button.disabled||!['preparing','playing'].includes(current?.phase))return;
 const mine=current?.players?.find(p=>p.me&&p.participating);
 if(!mine)return;
 const color=button.dataset.dogColorChoice;
 if(!COLOR_KEYS.includes(color))return;
 send('color',{color:mine.colorPref===color?null:color});
});
function handleAction(event){
 const button=event.currentTarget,kind=button.dataset.dogRoomAction;
 if(kind)send(kind);
}
for(const [id,kind] of [['dog-room-join','join'],['dog-room-ready','ready'],['dog-room-start','start'],['dog-room-refresh','refresh']]){
 const button=$(id);
 button.dataset.dogRoomAction=kind;
 button.addEventListener('click',handleAction);
}
$('dog-room-copy').addEventListener('click',async()=>{
 const code=current?.code;if(!code)return;
 try{await navigator.clipboard.writeText(code);feedback('Raumcode '+code+' kopiert.');}
 catch{feedback('Raumcode: '+code);}
});
function syncFullscreen(){
 const active=!!document.fullscreenElement;
 setText('dog-room-fullscreen',active?'⛶ Vollbild verlassen':'⛶ Vollbild');
 $('dog-room-fullscreen').setAttribute('aria-pressed',String(active));
}
$('dog-room-fullscreen').addEventListener('click',async()=>{
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
 }catch{feedback('Vollbild wird auf diesem Gerät nicht unterstützt.',true);}
 syncFullscreen();
});
document.addEventListener('fullscreenchange',syncFullscreen);
const rules=$('dog-room-rules');
$('dog-room-rules-open').addEventListener('click',()=>{if(!rules.open)rules.showModal();});
$('dog-room-rules-close').addEventListener('click',()=>rules.close());
window.addEventListener('pageshow',()=>{if(!root.hidden){renderDogRoomBoard($('dog-room-board-preview'));}});
window.addEventListener('dog-cosmetics-verified',()=>{if(current&&!root.hidden)syncEquipment(current,lastRoomBusy);});
window.addEventListener('dog-christmas-avatars-ready',()=>{if(current&&!root.hidden)syncEquipment(current,lastRoomBusy);});
window.addEventListener('dog-equipment-changed',()=>{if(current&&!root.hidden)syncEquipment(current,lastRoomBusy);});
window.addEventListener('storage',e=>{
 if(e.key==='dog:appearance:v1'&&!root.hidden)renderDogRoomBoard($('dog-room-board-preview'));
});
window.DOGRoomLobby=Object.freeze({update,feedback});
window.dispatchEvent(new Event('dog-room-lobby-ready'));
