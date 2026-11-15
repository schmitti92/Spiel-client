/* DOG-only waiting room on top of the existing online hub.
 * This module renders public room data and emits user actions. hub-lobby.js
 * remains the sole owner of authenticated HTTP/WS requests and game start.
 */
import {renderDogRoomBoard} from './room-board-preview.js?v=1';

const $=id=>document.getElementById(id);
const root=$('dog-room-lobby');
const COLORS=['#ff7770','#5ec6ff','#80dda6','#ffd56c'];
let current=null,roomSignature='',previewVisible=false,wasOpen=false;
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
function renderRoster(players){
 const active=players.filter(p=>p.participating);
 const signature=JSON.stringify([active.map(p=>[p.uid,p.name,p.ready,p.host,p.me,p.dogAvatar]),players.filter(p=>!p.participating).map(p=>p.name)]);
 if(signature===roomSignature)return;
 roomSignature=signature;
 const cards=[];
 for(let seat=0;seat<4;seat++){
  const player=active[seat];
  const card=make('div','dog-room-player'+(player?.host?' is-host':'')+(!player?' is-free':''));
  card.dataset.seat=String(seat);
  const avatar=make('span','dog-room-player-avatar'+(player?'':' is-empty'));
  avatar.setAttribute('aria-hidden','true');
  avatar.style.color=COLORS[seat];
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
  cards.push(card);
 }
 $('dog-room-roster').replaceChildren(...cards);
}
function send(kind){
 window.dispatchEvent(new CustomEvent('dog-room-lobby-action',{detail:{kind}}));
}
function roomLink(path,roomCode){
 const returnPath='../hub-lobby.html?'+new URLSearchParams({room:roomCode,stage:'1'}).toString();
 return path+'?return='+encodeURIComponent(returnPath);
}
function update(snapshot,busy=false){
 const active=!!snapshot&&snapshot.game==='dog'&&['preparing','playing'].includes(snapshot.phase);
 root.hidden=!active;
 document.body.classList.toggle('dog-room-open',active);
 const shell=document.querySelector('.shell');
 if(shell){shell.inert=active;if(active)shell.setAttribute('aria-hidden','true');else shell.removeAttribute('aria-hidden');}
 if(!active){
  current=null;roomSignature='';previewVisible=false;wasOpen=false;
  if($('dog-room-rules').open)$('dog-room-rules').close();
  return;
 }
 current=snapshot;
 if(!wasOpen){wasOpen=true;feedback('');}
 const roomCode=String(snapshot.code||'').toUpperCase();
 setText('dog-room-code',roomCode);
 $('dog-room-back').href='spielauswahl-online.html?'+new URLSearchParams({room:roomCode,stay:'1'}).toString();
 $('dog-room-designer').href=roomLink('DOG/design-studio.html',roomCode);
 $('dog-room-unlocks').href=roomLink('DOG/sammlung.html',roomCode);
 if(!previewVisible){
  renderDogRoomBoard($('dog-room-board-preview'));previewVisible=true;
 }
 const players=Array.isArray(snapshot.players)?snapshot.players:[];
 const participating=players.filter(p=>p.participating);
 const me=players.find(p=>p.me);
 const ready=participating.filter(p=>p.ready).length;
 const spectatorCount=players.length-participating.length;
 const playing=snapshot.phase==='playing';
 const total=participating.length;
 renderRoster(players);
 setText('dog-room-count',total+' '+(total===1?'Spieler':'Spieler')+' im Raum');
 setText('dog-room-ready-count',playing?'Partie läuft':'Bereit '+ready+'/'+total);
 const percent=total?Math.round(ready/total*100):0;
 $('dog-room-progress-fill').style.width=percent+'%';
 $('dog-room-progress').setAttribute('aria-valuenow',String(percent));
 const note=playing?'Die Partie ist gestartet. Du kannst jederzeit ins Spiel zurückkehren.'
  :!me?.participating?'Du schaust zu. Der Host kann dir einen Spielplatz zuweisen.'
  :total===1?'DOG ergänzt freie Plätze automatisch mit Computergegnern.'
  :ready===total?'Alle bereit. Die Partie wird jetzt vom Server gestartet.'
  :'Warte auf die Bereitschaft aller aktiven Mitspieler.';
 setText('dog-room-readiness-note',note+(spectatorCount?' · '+spectatorCount+' Zuschauer':''));
 const join=$('dog-room-join'),readyButton=$('dog-room-ready'),start=$('dog-room-start');
 const canPlay=!!me?.participating;
 if(playing){
  join.textContent=snapshot.match?.participating?'▶ Zur laufenden Partie':'Zuschauer';
  join.disabled=busy||!snapshot.match?.participating;
  readyButton.hidden=true;
  start.hidden=true;
 }else{
  readyButton.hidden=false;
  readyButton.textContent=me?.ready?'✓ Bereitschaft zurücknehmen':'✓ Ich bin bereit';
  readyButton.disabled=busy||!canPlay;
  join.textContent=canPlay?(me.ready?'✓ Spiel beigetreten':'⇥ Spiel beitreten'):'Spielplatz vom Host';
  join.disabled=busy||!canPlay||!!me?.ready;
  // The existing server starts DOG automatically on the final ready action.
  // Host Start is a convenience that submits the host's own readiness once
  // everybody else is ready; it does NOT call the Challenge-only /start route.
  const otherPlayersReady=participating.filter(p=>!p.me).every(p=>p.ready);
  start.hidden=!snapshot.host;
  start.textContent='▶ Partie starten';
  start.disabled=busy||!canPlay||!!me?.ready||!otherPlayersReady;
  start.title=!snapshot.host?'Nur der Host kann starten.'
    :me?.ready?'Du bist bereit. Der Server startet automatisch, sobald alle bereit sind.'
    :otherPlayersReady?'Damit meldest du dich bereit. DOG startet sofort, wenn alle bereit sind.'
    :'Die anderen aktiven Mitspieler müssen zuerst bereit sein.';
 }
 if(busy)feedback('Aktion wird vom Server bestätigt …');
}
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
window.addEventListener('storage',e=>{
 if(e.key==='dog:appearance:v1'&&!root.hidden)renderDogRoomBoard($('dog-room-board-preview'));
});
window.DOGRoomLobby=Object.freeze({update,feedback});
window.dispatchEvent(new Event('dog-room-lobby-ready'));
