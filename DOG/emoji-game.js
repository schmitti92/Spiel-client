import {DOG_EMOJI_STARTERS,emojiById,loadEmojiSlots} from './dog-emojis.js?v=1';
/* Lightweight quick-picker and local-only emoji animation.
   Online transport is injected by app.js and only sends short IDs. */
let popup=null,overlay=null,displayTimer=null,seenIds=new Set();
export function showDogEmoji(event){
 const item=emojiById(event?.emojiId);if(!item)return;
 if(event?.eventId){
  if(seenIds.has(event.eventId))return;
  seenIds.add(event.eventId);
  if(seenIds.size>70)seenIds=new Set([event.eventId]);
 }
 if(!overlay){
  overlay=document.createElement('div');overlay.className='dog-emoji-overlay';overlay.setAttribute('aria-live','polite');
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
 if(popup?.hidden)return;
 const label=popup?.querySelector('[data-emoji-game-status]');
 if(label)label.textContent=messages[reason]||'Emoji konnte nicht gesendet werden.';
}
export function mountDogEmojiGame({send}){
 if(popup)return;
 popup=document.createElement('div');popup.className='dog-emoji-quickpick';popup.hidden=true;
 popup.setAttribute('role','group');popup.setAttribute('aria-label','DOG Emoji-Schnellauswahl');
 popup.innerHTML='<div class="dog-emoji-game-title">😄 Schnell-Emojis <button type="button" data-emoji-close aria-label="Schließen">×</button></div><div class="dog-emoji-game-grid" data-emoji-buttons></div><small data-emoji-game-status>In der DOG-Lobby anpassbar.</small>';
 document.body.appendChild(popup);
 const btnArea=popup.querySelector('[data-emoji-buttons]'),status=popup.querySelector('[data-emoji-game-status]');
 let lastSend=-Infinity;
 function position(){
  const anchor=document.querySelector('[data-dog-extra="emojis"]');
  if(!anchor)return;
  const rect=anchor.getBoundingClientRect(),width=popup.offsetWidth||330;
  popup.style.left=Math.max(8,Math.min(innerWidth-width-8,rect.left-(width-rect.width)/2))+'px';
  popup.style.top=Math.max(8,Math.min(innerHeight-popup.offsetHeight-8,rect.top-popup.offsetHeight-9))+'px';
 }
 function close(){popup.hidden=true;}
 function open(){
  const slots=loadEmojiSlots();
  btnArea.replaceChildren(...slots.map((id,i)=>{
   const item=emojiById(id),button=document.createElement('button');button.type='button';
   button.className='dog-emoji-game-tile';button.disabled=!item||!DOG_EMOJI_STARTERS.includes(id);
   button.title=item?item.name:'Leer – in der Lobby belegen';
   button.setAttribute('aria-label',item?item.name:'Schnellplatz '+(i+1)+' leer');
   button.textContent=item?.emoji||'＋';
   if(item)button.addEventListener('click',async()=>{
    if(Date.now()-lastSend<5000){status.textContent='Noch einen Moment: 5 Sekunden Abklingzeit.';return;}
    lastSend=Date.now();
    close();
    try{await send(id);}catch(e){lastSend=-Infinity;popup.hidden=false;showDogEmojiError(e?.message||'NOT_CONNECTED');}
   });
   return button;
  }));
  status.textContent='Bis zu 5 Plätze · in der Lobby anpassen';
  popup.hidden=false;
  position();
 }
 window.addEventListener('dog-emojis-open',()=>popup.hidden?open():close());
 popup.querySelector('[data-emoji-close]').addEventListener('click',close);
 document.addEventListener('pointerdown',event=>{
  if(popup?.hidden)return;
  if(!popup.contains(event.target)&&!event.target.closest('[data-dog-extra="emojis"]'))close();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 window.addEventListener('resize',()=>{if(!popup.hidden)position();});
}
