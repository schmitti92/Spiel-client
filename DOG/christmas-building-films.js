/**
 * Lichtertal building-upgrade films.
 * Only call showUpgrade after the authenticated Render upgrade endpoint
 * confirms the exact transition. Previews and server refreshes never trigger it.
 * Videos are static GitHub Pages assets: no Firebase access is needed.
 */
export const CHRISTMAS_BUILDING_FILMS=Object.freeze({
 bakery:Object.freeze({
  3:Object.freeze({
   fromLevel:2,
   title:'Das Geheimnis der Weihnachtsbäckerei',
   subtitle:'Johannas Legende vom Winterlicht',
   src:'./assets/1795338590869.mp4',
   poster:'./weihnachtsevent-bilder/weihnachtsbaeckerei_stufe_3.png'
  })
 })
});
export function christmasBuildingFilmForUpgrade(id,fromLevel,toLevel){
 if(!Number.isInteger(fromLevel)||!Number.isInteger(toLevel)||toLevel!==fromLevel+1)return null;
 const film=CHRISTMAS_BUILDING_FILMS[id]?.[toLevel];
 return film?.fromLevel===fromLevel?film:null;
}
export function initChristmasBuildingFilms({onClose=()=>{}}={}){
 const style=document.createElement('style');
 style.textContent=[
  '.dog-building-film-dialog{position:fixed;inset:0;margin:auto;width:min(960px,calc(100vw - 20px));max-height:95dvh;overflow:auto;padding:0;border:1px solid #dabb79;border-radius:18px;background:#112b35;color:#fff2d5;box-shadow:0 25px 90px #000b;z-index:2147483600}',
  '.dog-building-film-dialog::backdrop{background:#020c18e9;backdrop-filter:blur(6px)}',
  '.dog-building-film-dialog header{display:flex;justify-content:space-between;align-items:start;gap:10px;padding:15px 19px;background:linear-gradient(115deg,#465032,#163443)}',
  '.dog-building-film-dialog header span{font-size:12px;letter-spacing:.06em;font-weight:800;color:#f9db99}',
  '.dog-building-film-dialog header h2{font-size:clamp(20px,4vw,29px);margin:4px 0;color:#ffe7ad}',
  '.dog-building-film-dialog header p{font-size:13px;margin:0;color:#e7e8d6}',
  '.dog-building-film-dialog video{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#06131e}',
  '.dog-building-film-footer{padding:15px 19px 19px;display:grid;gap:12px}',
  '.dog-building-film-footer p{margin:0;font-size:14px;line-height:1.45}',
  '.dog-building-film-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:9px}',
  '.dog-building-film-dialog button{font:inherit;min-height:43px;padding:10px 13px;border-radius:10px;border:1px solid #d2b37c;background:#2b4955;color:#fff2d5;cursor:pointer}',
  '.dog-building-film-dialog [data-film-play]{background:#d7ad66;color:#152b36;font-weight:800}',
  '.dog-building-film-dialog [data-film-close]{min-width:44px}',
  '@media(max-width:560px){.dog-building-film-dialog header,.dog-building-film-footer{padding:12px}.dog-building-film-actions button{flex:1 1 43%}}'
 ].join('\n');
 document.head.append(style);
 const dialog=document.createElement('dialog');
 dialog.className='dog-building-film-dialog';
 dialog.setAttribute('aria-label','Lichtertal – Film zum Gebäudeausbau');
 dialog.innerHTML=[
  '<header><div><span>🍪 WEIHNACHTSBÄCKEREI · STUFE 3</span><h2 data-film-title></h2><p data-film-subtitle></p></div>',
  '<button type="button" data-film-close aria-label="Filmfenster schließen">✕</button></header>',
  '<video controls playsinline preload="metadata" aria-label="Geschichtsfilm zum Ausbau der Weihnachtsbäckerei"></video>',
  '<div class="dog-building-film-footer"><p data-film-status role="status">🎬 Dein neuer Geschichtsfilm ist bereit.</p>',
  '<div class="dog-building-film-actions">',
  '<button type="button" data-film-play>▶ Mit Ton abspielen</button>',
  '<button type="button" data-film-restart>↺ Von vorne</button>',
  '<button type="button" data-film-skip>Zurück zum Dorf</button>',
  '</div></div>'
 ].join('');
 document.body.append(dialog);
 const video=dialog.querySelector('video');
 const status=dialog.querySelector('[data-film-status]');
 const play=dialog.querySelector('[data-film-play]');
 let active=false;
 function syncPlayButton(){
  play.textContent=video.ended?'↺ Noch einmal':video.paused?'▶ Mit Ton abspielen':'⏸ Pause';
 }
 function tryPlay(){
  if(!active)return;
  if(video.ended)video.currentTime=0;
  const attempt=video.play();
  if(attempt?.catch)attempt.catch(error=>{
   if(!active||error?.name==='AbortError')return;
   status.textContent='▶ Drücke auf „Mit Ton abspielen“, um den Film zu starten.';
   syncPlayButton();
  });
 }
 function closeFilm(){
  if(!active)return;
  active=false;
  video.pause();
  video.removeAttribute('src');
  video.removeAttribute('poster');
  video.load();
  if(dialog.open)dialog.close();
  onClose();
 }
 function showUpgrade(id,fromLevel,toLevel){
  const film=christmasBuildingFilmForUpgrade(id,fromLevel,toLevel);
  if(!film||active||dialog.open)return false;
  dialog.querySelector('[data-film-title]').textContent=film.title;
  dialog.querySelector('[data-film-subtitle]').textContent=film.subtitle+' · Ausbau '+fromLevel+' → '+toLevel;
  video.src=new URL(film.src,import.meta.url).href;
  video.poster=new URL(film.poster,import.meta.url).href;
  video.muted=false;
  video.load();
  status.textContent='✨ Die Weihnachtsbäckerei hat Stufe 3 erreicht! Der Film startet, sobald dein Browser Ton zulässt.';
  try{dialog.showModal();}catch{video.removeAttribute('src');video.load();return false;}
  active=true;
  syncPlayButton();
  tryPlay();
  return true;
 }
 play.addEventListener('click',()=>{
  if(!active)return;
  if(video.paused)tryPlay();
  else video.pause();
  syncPlayButton();
 });
 dialog.querySelector('[data-film-restart]').addEventListener('click',()=>{
  if(!active)return;
  video.currentTime=0;
  tryPlay();
 });
 dialog.querySelector('[data-film-skip]').addEventListener('click',closeFilm);
 dialog.querySelector('[data-film-close]').addEventListener('click',closeFilm);
 dialog.addEventListener('cancel',event=>{event.preventDefault();closeFilm();});
 video.addEventListener('play',syncPlayButton);
 video.addEventListener('pause',syncPlayButton);
 video.addEventListener('ended',()=>{
  status.textContent='✨ Die Geschichte ist zu Ende. Du kannst sie erneut ansehen oder zum Weihnachtsdorf zurückkehren.';
  syncPlayButton();
 });
 video.addEventListener('error',()=>{
  if(active)status.textContent='⚠️ Das Video konnte nicht geladen werden. Der Gebäudeausbau bleibt trotzdem erhalten.';
 });
 return {showUpgrade,isOpen:()=>dialog.open};
}
