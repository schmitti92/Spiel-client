/**
 * DOG room welcome film.
 *
 * Opens when a player arrives at the DOG waiting room (never on the generic
 * hub screen). Video playback requires an intentional click so that sound
 * works on mobile browsers.
 *
 * One automatic showing per room/profile/browser tab session. The welcome
 * film can always be reopened with the "Lobbyfilm ansehen" button.
 */
import {markDogVideoSeen} from './video-library-watched.js?v=1';
export function createDogRoomWelcomeFilm({root}){
 const videoUrl=new URL('./assets/42667997_1795277919445597.mp4',import.meta.url).href;
 const css=document.createElement('style');
 css.id='dog-room-welcome-video-style';
 css.textContent=[
  '.dog-room-welcome-film{position:fixed;inset:0;margin:auto;padding:0;width:min(960px,calc(100vw - 22px));max-height:94dvh;overflow:auto;background:#0c2432;color:#fff2d4;border:1.5px solid #d3b075;border-radius:20px;box-shadow:0 32px 100px #000b;z-index:2147483610}',
  '.dog-room-welcome-film::backdrop{background:#04121cf0;backdrop-filter:blur(5px)}',
  '.dog-room-welcome-film [hidden]{display:none!important}',
  '.dog-room-welcome-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px;background:linear-gradient(110deg,#173f50,#102631)}',
  '.dog-room-welcome-header h2{margin:4px 0;font-size:clamp(21px,4vw,32px);color:#ffe4a0}',
  '.dog-room-welcome-header p{margin:0;color:#d5e2e4;font-size:13px}',
  '.dog-room-welcome-eyebrow{font-size:11px;letter-spacing:.16em;font-weight:900;color:#f8cb7e}',
  '.dog-room-welcome-film video{width:100%;aspect-ratio:16/9;object-fit:contain;display:block;background:#06121b}',
  '.dog-room-welcome-footer{padding:15px 18px 18px;display:grid;gap:12px;text-align:center}',
  '.dog-room-welcome-footer p{margin:0;font-size:14px;line-height:1.45}',
  '.dog-room-welcome-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:9px}',
  '.dog-room-welcome-actions button,.dog-room-welcome-header button{font:inherit;min-height:42px;padding:10px 14px;border:1px solid #c9ae7b;border-radius:11px;color:#fff1d5;background:#264955;cursor:pointer}',
  '.dog-room-welcome-actions [data-play]{color:#102631;background:#d3aa66;font-weight:850}',
  '.dog-room-welcome-actions button:focus-visible,.dog-room-welcome-header button:focus-visible{outline:3px solid #ffda87;outline-offset:2px}',
  '#dog-room-welcome-replay{font-size:12px;white-space:nowrap}',
  '@media(max-width:600px){.dog-room-welcome-header{padding:13px}.dog-room-welcome-footer{padding:12px}.dog-room-welcome-actions button{flex:1 1 45%}}'
 ].join('\n');
 document.head.append(css);

 const dialog=document.createElement('dialog');
 dialog.className='dog-room-welcome-film';
 dialog.setAttribute('aria-labelledby','dog-room-welcome-film-title');
 dialog.innerHTML=[
  '<header class="dog-room-welcome-header"><div>',
  '<span class="dog-room-welcome-eyebrow">🐾 DOG · WILLKOMMEN</span>',
  '<h2 id="dog-room-welcome-film-title">Willkommen in der Spiellobby!</h2>',
  '<p>Dein DOG-Film zum Start der gemeinsamen Spielrunde.</p>',
  '</div><button type="button" data-close aria-label="Intro schließen">✕</button></header>',
  '<video playsinline controls preload="metadata" aria-label="DOG-Lobby-Begrüßungsvideo"></video>',
  '<div class="dog-room-welcome-footer">',
  '<p data-status role="status">▶ Starte das Video selbst, damit du den Originalton hören kannst.</p>',
  '<div class="dog-room-welcome-actions">',
  '<button type="button" data-play>▶ Mit Ton abspielen</button>',
  '<button type="button" data-mute>🔇 Ton ausschalten</button>',
  '<button type="button" data-restart>↺ Von vorne</button>',
  '<button type="button" data-dismiss>Zur Spiellobby</button>',
  '</div></div>'
 ].join('');
 document.body.append(dialog);
 const video=dialog.querySelector('video');
 const play=dialog.querySelector('[data-play]');
 const mute=dialog.querySelector('[data-mute]');
 const status=dialog.querySelector('[data-status]');
 const dismiss=dialog.querySelector('[data-dismiss]');
 const replay=document.createElement('button');
 replay.id='dog-room-welcome-replay';
 replay.className='dog-room-utility';
 replay.type='button';
 replay.textContent='🎬 Lobbyfilm ansehen';
 replay.title='Das DOG-Begrüßungsvideo erneut ansehen';
 (root.querySelector('.dog-room-top-actions')||root).append(replay);

 const seenInMemory=new Set();
 const viewedKey=roomCode=>{
  const uid=window.SpielOnline?.state?.()?.user?.uid||'visitor';
  return 'dog-room-welcome-video-v2:'+uid+':'+roomCode;
 };
 const wasShown=key=>{
  if(seenInMemory.has(key))return true;
  try{return sessionStorage.getItem(key)==='1';}catch{return false;}
 };
 const markShown=key=>{
  seenInMemory.add(key);
  try{sessionStorage.setItem(key,'1');}catch{}
 };
 const updateButtons=()=>{
  play.textContent=video.paused?'▶ Mit Ton abspielen':'⏸ Pause';
  mute.textContent=video.muted?'🔊 Ton einschalten':'🔇 Ton ausschalten';
 };
 const close=()=>{
  video.pause();
  video.removeAttribute('src');
  video.load();
  if(dialog.open)dialog.close();
 };
 const open=()=>{
  if(dialog.open||root.hidden||!document.body.classList.contains('dog-room-open'))return false;
  // A post-match Christmas intro has priority if it is already visible.
  if(document.querySelector('.dog-reveal-overlay:not([hidden])'))return false;
  video.src=videoUrl;
  video.autoplay=false;
  video.muted=false;
  video.currentTime=0;
  video.load();
  status.textContent='▶ Starte das Video selbst, damit du den Originalton hören kannst.';
  dismiss.textContent='Zur Spiellobby';
  updateButtons();
  try{dialog.showModal();return true;}
  catch(error){console.warn('[DOG welcome film] Modal unavailable:',error?.message||error);return false;}
 };
 const arrive=(roomCode,{playing=false}={})=>{
  if(playing||!roomCode||root.hidden)return;
  const key=viewedKey(roomCode);
  if(wasShown(key))return;
  // Mark only when the modal is really displayed, never when another film blocks it.
  if(open())markShown(key);
 };
 play.addEventListener('click',()=>{
  if(!dialog.open)return;
  if(!video.paused){video.pause();updateButtons();return;}
  const attempt=video.play();
  if(attempt?.catch)attempt.catch(error=>{
   if(!dialog.open||error?.name==='AbortError')return;
   status.textContent='▶ Dein Browser benötigt einen weiteren Klick auf Play.';
   console.warn('[DOG welcome film] Playback:',error?.message||error);
   updateButtons();
  });
  updateButtons();
 });
 mute.addEventListener('click',()=>{video.muted=!video.muted;updateButtons();});
 dialog.querySelector('[data-restart]').addEventListener('click',()=>{
  if(!dialog.open)return;
  video.pause();video.currentTime=0;
  status.textContent='▶ Film ist bereit. Mit Play und Ton starten.';
  updateButtons();
 });
 dismiss.addEventListener('click',close);
 dialog.querySelector('[data-close]').addEventListener('click',close);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 replay.addEventListener('click',open);
 video.addEventListener('play',updateButtons);
 video.addEventListener('pause',updateButtons);
 video.addEventListener('ended',()=>{
  void markDogVideoSeen('welcome');
  status.textContent='✅ Dein DOG-Lobbyfilm ist zu Ende. Viel Spaß beim Spielen!';
  dismiss.textContent='🐾 Jetzt zur Spiellobby';
  updateButtons();
 });
 video.addEventListener('error',()=>{
  status.textContent='⚠️ Video konnte nicht geladen werden. Du kannst die Spiellobby trotzdem verwenden.';
  updateButtons();
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open)video.pause();});
 return {arrive,close,isOpen:()=>dialog.open};
}
