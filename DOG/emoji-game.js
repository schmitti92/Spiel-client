import {isEmojiUnlocked,emojiById,loadEmojiSlots} from './dog-emojis.js?v=3';
/* DOG emoji quickbar lives in the shared extension panel.
   Only a small emoji ID travels over the existing Render hub socket. */
let panelRoot=null,overlay=null,displayTimer=null,seenIds=new Set();
export function showDogEmoji(event){
 const item=emojiById(event?.emojiId);if(!item)return;
 if(event?.eventId){
  if(seenIds.has(event.eventId))return;
  seenIds.add(event.eventId);
  if(seenIds.size>70)seenIds=new Set([event.eventId]);
 }
 if(!overlay){
  overlay=document.createElement('div');
  overlay.className='dog-emoji-overlay';overlay.setAttribute('aria-live','polite');
  overlay.innerHTML='<div class="dog-emoji-effect"><span class="dog-emoji-effect-icon"></span><span class="dog-emoji-effect-name"></span></div>';
  document.body.appendChild(overlay);
 }
 overlay.querySelector('.dog-emoji-effect-icon').textContent=item.emoji;
 overlay.querySelector('.dog-emoji-effect-name').textContent=event?.senderName||'';
 overlay.classList.remove('is-showing');
 void overlay.offsetWidth;
 overlay.classList.add('is-showing');
 clearTimeout(displayTimer);
 displayTimer=setTimeout(()=>overlay?.classList.remove('is-showing'),3000);
}
export function showDogEmojiError(reason){
 const messages={COOLDOWN:'Bitte 5 Sekunden zwischen Emojis warten.',NOT_CONNECTED:'Online-Verbindung noch nicht bereit.',
  EMOJI_LOCKED:'Dieses Emoji ist noch nicht freigeschaltet.',NO_DOG_MATCH:'DOG-Partie nicht aktiv.',
  NOT_A_PARTICIPANT:'Nur mitspielende Personen können Emojis senden.',NOT_A_MEMBER:'Du bist nicht mehr im Raum.'};
 const message=messages[reason]||'Emoji konnte nicht gesendet werden.';
 const status=panelRoot?.querySelector('[data-emoji-game-status]');
 if(status)status.textContent=message;
 let toast=document.getElementById('dog-emoji-error-toast');
 if(!toast){
  toast=document.createElement('div');toast.id='dog-emoji-error-toast';
  toast.setAttribute('role','status');toast.className='dog-emoji-error-toast';document.body.appendChild(toast);
 }
 toast.textContent=message;toast.hidden=false;
 clearTimeout(showDogEmojiError._timer);
 showDogEmojiError._timer=setTimeout(()=>{toast.hidden=true;},2600);
}
export function mountDogEmojiGame({send}){
 if(panelRoot)return;
 panelRoot=document.getElementById('dog-emoji-panel-root');
 if(!panelRoot)return;
 panelRoot.innerHTML='<p class="dog-emoji-panel-intro">Wähle ein Emoji. Es erscheint bei allen Spielern groß in der Bildschirmmitte.</p><div class="dog-emoji-panel-grid" data-emoji-buttons role="group" aria-label="Fünf Emoji-Schnelltasten"></div><p class="dog-emoji-panel-status" data-emoji-game-status role="status">Deine Schnelltasten kannst du in der DOG-Lobby anpassen.</p>';
 const btnArea=panelRoot.querySelector('[data-emoji-buttons]');
 const status=panelRoot.querySelector('[data-emoji-game-status]');
 let lastSend=-Infinity;
 function renderSlots(){
  const slots=loadEmojiSlots();
  btnArea.replaceChildren(...slots.map((id,i)=>{
   const item=emojiById(id),button=document.createElement('button');button.type='button';
   button.className='dog-emoji-panel-tile';
   button.disabled=!item||!isEmojiUnlocked(id);
   button.title=item?item.name:'Leer – in der Lobby belegen';
   button.setAttribute('aria-label',item?item.name:'Schnellplatz '+(i+1)+' leer');
   const icon=document.createElement('span');icon.className='dog-emoji-panel-icon';icon.textContent=item?.emoji||'＋';
   const caption=document.createElement('small');caption.textContent=item?.name||'Frei';
   button.append(icon,caption);
   if(item&&isEmojiUnlocked(id))button.addEventListener('click',async()=>{
    const remaining=5000-(Date.now()-lastSend);
    if(remaining>0){status.textContent='Noch '+Math.ceil(remaining/1000)+' Sekunden bis zum nächsten Emoji.';return;}
    lastSend=Date.now();
    status.textContent='Emoji wird gesendet …';
    try{
     await send(id);
     // Do not hide the panel after sending: users can react again instantly
     // once the server-enforced cooldown expires.
     status.textContent='Emoji ausgewählt · Nächstes Emoji nach 5 Sekunden.';
    }catch(e){
     lastSend=-Infinity;
     showDogEmojiError(e?.message||'NOT_CONNECTED');
    }
   });
   return button;
  }));
 }
 window.addEventListener('dog-extension-change',e=>{
  if(e.detail?.id==='emojis'){
   renderSlots();
   status.textContent='Ein Emoji antippen, um es an alle Spieler zu senden.';
  }
 });
 window.addEventListener('dog-emojis-changed',renderSlots);
 window.addEventListener('dog-cosmetics-verified',renderSlots);
 renderSlots();
}
