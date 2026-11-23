/**
 * DOG Christmas: one-time "Der erste Funke" film.
 * A light is real only when an accepted Render room projection increments
 * its authoritative match.christmas.giftCount. No reads, writes or polling.
 * The watched marker is scoped to the signed-in profile on this device.
 */
import {markDogVideoSeen} from './video-library-watched.js?v=2';
const SEEN_PREFIX='dog-first-light-film-seen-v1:';
const VIDEO='./assets/Lichtertal_Der_erste_Funke_120_Sekunden.mp4';

export function shouldShowFirstLightFilm({uid,seat,matchId,phase,christmas,previousGiftCount=null}={}){
 if(!uid||!matchId||!Number.isInteger(seat)||seat<0||seat>3||
    (phase==='finished'&&previousGiftCount!==0)||christmas?.enabled!==true)return false;
 const count=christmas.giftCount;
 if(!Number.isSafeInteger(count)||count<1)return false;
 // On a live 0 -> 1 transition, show to everyone in the match.
 // Also allow a reconnect directly after the first capture (count 1);
 // never launch simply because an old match already contains many gifts.
 return previousGiftCount===0||(previousGiftCount===null&&count===1);
}

export function initDogFirstLightFilm({currentUid=()=>null}={}){
 const style=document.createElement('style');
 style.textContent=[
  '.dog-first-light-dialog{position:fixed;inset:0;margin:auto;width:min(1000px,calc(100vw - 16px));max-height:96dvh;overflow:auto;border:1px solid #e0c17d;border-radius:18px;padding:0;background:#0b2230;color:#fff4d9;box-shadow:0 25px 100px #000c;z-index:2147483601}',
  '.dog-first-light-dialog::backdrop{background:#020b16ed;backdrop-filter:blur(6px)}',
  '.dog-first-light-dialog header{padding:15px 18px;background:linear-gradient(120deg,#3d472e,#173948);display:flex;justify-content:space-between;gap:15px;align-items:start}',
  '.dog-first-light-dialog header h2{font-size:clamp(20px,4vw,29px);color:#ffdf9d;margin:4px 0}',
  '.dog-first-light-dialog header p{font-size:13px;color:#eee5c8;margin:0}',
  '.dog-first-light-dialog video{width:100%;display:block;aspect-ratio:16/9;object-fit:contain;background:#06121e}',
  '.dog-first-light-footer{padding:14px 18px 18px;display:grid;gap:11px}',
  '.dog-first-light-footer p{margin:0;line-height:1.4;font-size:14px}',
  '.dog-first-light-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:9px}',
  '.dog-first-light-dialog button{border:1px solid #d5b779;border-radius:10px;background:#2a4c59;color:#fff3d8;padding:10px 15px;min-height:43px;font:inherit;cursor:pointer}',
  '.dog-first-light-dialog [data-first-light-play]{background:#e4bd70;color:#162c33;font-weight:800}',
  '@media(max-width:560px){.dog-first-light-dialog header,.dog-first-light-footer{padding:11px}.dog-first-light-actions button{flex:1 1 43%}}'
 ].join('\n');
 document.head.append(style);
 const dialog=document.createElement('dialog');
 dialog.className='dog-first-light-dialog';
 dialog.setAttribute('aria-label','Das Weihnachtswunder von Lichtertal – Der erste Funke');
 dialog.innerHTML=[
  '<header><div><p>⭐ DAS ERSTE WEIHNACHTSLICHT IST GEFUNDEN!</p><h2>Das Weihnachtswunder von Lichtertal</h2><p>Der erste Funke · Einführungsfilm (2 Minuten)</p></div>',
  '<button type="button" data-first-light-close aria-label="Film schließen">✕</button></header>',
  '<video controls playsinline preload="none" aria-label="Der erste Funke – Film mit deutscher Erzählung"></video>',
  '<div class="dog-first-light-footer"><p data-first-light-status role="status">✨ Ein Licht hat Lichtertal erreicht. Entdecke, wie ihr das Weihnachtsdorf gemeinsam retten könnt!</p>',
  '<div class="dog-first-light-actions"><button type="button" data-first-light-play>▶ Mit Ton abspielen</button>',
  '<button type="button" data-first-light-restart>↺ Noch einmal</button>',
  '<button type="button" data-first-light-skip>Zurück zum DOG-Spiel</button></div></div>'
 ].join('');
 document.body.append(dialog);
 const video=dialog.querySelector('video');
 const play=dialog.querySelector('[data-first-light-play]');
 const status=dialog.querySelector('[data-first-light-status]');
 const memorySeen=new Set();
 let pendingUid=null,activeUid=null;
 const seenKey=uid=>SEEN_PREFIX+uid;
 const hasSeen=uid=>{
  if(memorySeen.has(uid))return true;
  try{return localStorage.getItem(seenKey(uid))==='1';}catch{return false;}
 };
 function remember(uid){
  memorySeen.add(uid);
  try{localStorage.setItem(seenKey(uid),'1');}catch{}
 }
 function syncPlay(){
  play.textContent=video.ended?'↺ Noch einmal':video.paused?'▶ Mit Ton abspielen':'⏸ Pause';
 }
 function tryPlay(){
  if(!activeUid)return;
  if(video.ended)video.currentTime=0;
  const task=video.play();
  if(task?.catch)task.catch(e=>{
   if(e?.name==='AbortError'||!activeUid)return;
   status.textContent='▶ Bitte „Mit Ton abspielen“ antippen, damit der Film mit deutscher Tonspur startet.';
   syncPlay();
  });
 }
 function close(){
  if(!activeUid)return;
  activeUid=null;
  video.pause();
  video.removeAttribute('src');
  video.load();
  if(dialog.open)dialog.close();
 }
 const otherModalOpen=()=>Array.from(document.querySelectorAll('dialog[open]')).some(x=>x!==dialog);
 function open(uid){
  if(!uid||currentUid()!==uid||hasSeen(uid)||activeUid)return false;
  if(document.hidden||otherModalOpen()){
   pendingUid=uid;
   return false;
  }
  try{dialog.showModal();}catch{pendingUid=uid;return false;}
  activeUid=uid;pendingUid=null;
  remember(uid); // Never reopen on repeated sockets, rematches or page reloads.
  video.src=new URL(VIDEO,import.meta.url).href;
  video.muted=false;
  video.load();
  status.textContent='✨ Dein erstes Weihnachtslicht ist gefunden! So bringt ihr Lichtertal gemeinsam zum Leuchten.';
  syncPlay();
  tryPlay();
  return true;
 }
 function retryPending(){
  if(!pendingUid)return;
  if(currentUid()!==pendingUid){pendingUid=null;return;}
  open(pendingUid);
 }
 document.addEventListener('visibilitychange',retryPending);
 document.addEventListener('close',retryPending,true);
 window.addEventListener('spielonline-change',retryPending);
 play.addEventListener('click',()=>{
  if(!activeUid)return;
  if(video.paused)tryPlay();
  else video.pause();
  syncPlay();
 });
 dialog.querySelector('[data-first-light-restart]').addEventListener('click',()=>{
  if(!activeUid)return;
  video.currentTime=0;
  tryPlay();
 });
 dialog.querySelector('[data-first-light-skip]').addEventListener('click',close);
 dialog.querySelector('[data-first-light-close]').addEventListener('click',close);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 video.addEventListener('play',syncPlay);
 video.addEventListener('pause',syncPlay);
 video.addEventListener('ended',()=>{
  if(activeUid)void markDogVideoSeen('first-light');
  status.textContent='🎄 Der erste Funke ist erwacht! Jetzt könnt ihr gemeinsam weitere Weihnachtslichter sammeln.';
  syncPlay();
 });
 video.addEventListener('error',()=>{
  status.textContent='⚠️ Der Film konnte nicht geladen werden. Dein Weihnachtslicht bleibt erhalten.';
 });
 return {
  observe(data){
   const uid=data?.uid;
   if(!shouldShowFirstLightFilm(data)||hasSeen(uid)||activeUid)return false;
   open(uid);
   return true;
  },
  isOpen:()=>dialog.open
 };
}
