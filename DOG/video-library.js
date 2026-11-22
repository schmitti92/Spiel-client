/** In-game DOG Videothek. Opens only on request, reads one verified Render
 * archive snapshot, never polls Firebase and never grants game rewards.
 */
import {DOG_VIDEO_CATALOG,getDogFilm} from './video-library-catalog.js?v=2';
import {markDogVideoSeen} from './video-library-watched.js?v=2';

const BASE=String(globalThis.window?.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const $=id=>document.getElementById(id);
const verifiedUser=()=>{
 const s=window.SpielOnline?.state?.();
 return s?.status==='online'&&s.user?.uid&&s.user?.getIdToken?s.user:null;
};
const clipUrl=path=>new URL(path,import.meta.url).href;
const plural=n=>n===1?'Szene':'Szenen';
const localWatched=(uid,id)=>{
 try{
  if(id==='first-light')return localStorage.getItem('dog-first-light-film-seen-v1:'+uid)==='1';
  if(id==='tree-2'||id==='tree-3')return localStorage.getItem('dog-christmas-tree-film-v1:'+uid+':'+id.slice(-1))==='done';
  return localStorage.getItem('dog-videothek-watched-synced-v1:'+uid+':'+id)==='1';
 }catch{return false;}
};
export function filteredDogVideoLibrary(available,watched,category='Alle'){
 const allowed=new Set(Array.isArray(available)?available:[]);
 const seen=new Set(Array.isArray(watched)?watched:[]);
 return DOG_VIDEO_CATALOG.filter(f=>allowed.has(f.id)&&(category==='Alle'||f.category===category))
  .map(f=>({...f,watched:seen.has(f.id)}));
}

export function initDogVideoLibrary(){
 const button=$('dog-video-library-open');
 const dialog=$('dog-video-library');
 if(!button||!dialog)return null;
 const gallery=$('dog-video-library-gallery');
 const cards=$('dog-video-library-cards');
 const loading=$('dog-video-library-loading');
 const total=$('dog-video-library-total');
 const filter=$('dog-video-library-filter');
 const viewer=$('dog-video-library-viewer');
 const heading=$('dog-video-library-film-heading');
 const description=$('dog-video-library-film-description');
 const player=$('dog-video-library-player');
 const progress=$('dog-video-library-progress');
 const play=$('dog-video-library-play');
 const sound=$('dog-video-library-sound');
 const next=$('dog-video-library-next');
 const back=$('dog-video-library-back');
 const close=$('dog-video-library-close');
 const retry=$('dog-video-library-retry');
 let snapshot=null,uid=null,active=null,clip=0,played=0,failed=false,requestIndex=0;
 const isAvailable=id=>Array.isArray(snapshot?.available)&&snapshot.available.includes(id);
 const watchedSet=()=>{
  const seen=new Set(snapshot?.watched||[]);
  if(uid)for(const f of DOG_VIDEO_CATALOG)if(isAvailable(f.id)&&localWatched(uid,f.id))seen.add(f.id);
  return seen;
 };
 const notice=text=>{loading.textContent=text||'';loading.hidden=!text;};
 function stop(){
  player.pause();
  player.removeAttribute('src');player.removeAttribute('poster');
  player.load();
  active=null;clip=0;played=0;failed=false;
  viewer.hidden=true;gallery.hidden=false;
 }
 function paint(){
  cards.replaceChildren();
  if(!snapshot)return;
  const seen=watchedSet();
  const list=filteredDogVideoLibrary(snapshot.available,[...seen],filter.value);
  const all=filteredDogVideoLibrary(snapshot.available,[...seen]);
  total.textContent='🎬 '+all.length+' von '+DOG_VIDEO_CATALOG.length+
   ' Filmen freigeschaltet · '+all.filter(f=>f.watched).length+' als angesehen bekannt';
  if(!list.length){
   const empty=document.createElement('p');empty.className='dog-videothek-empty';
   empty.textContent='Für diesen Bereich ist noch kein Film freigeschaltet.';
   cards.append(empty);return;
  }
  for(const f of list){
   const tile=document.createElement('button');
   tile.type='button';tile.className='dog-videothek-tile';
   tile.setAttribute('aria-label',f.title+' ansehen');
   const image=document.createElement('div');image.className='dog-videothek-art';
   if(f.poster){
    const picture=document.createElement('img');picture.loading='lazy';
    picture.alt='';picture.src=clipUrl(f.poster);image.append(picture);
   }else image.textContent=f.icon;
   const info=document.createElement('div');info.className='dog-videothek-tile-info';
   const label=document.createElement('small');label.textContent=f.icon+' '+f.category;
   const title=document.createElement('strong');title.textContent=f.title;
   const meta=document.createElement('span');
   meta.textContent=f.clips.length+' '+plural(f.clips.length)+' · '+(f.watched?'✅ Angesehen':'✨ Freigeschaltet');
   info.append(label,title,meta);
   tile.append(image,info);
   tile.addEventListener('click',()=>showFilm(f.id));
   cards.append(tile);
  }
 }
 async function fetchLibrary(){
  const viewerProfile=verifiedUser();
  snapshot=null;uid=null;paint();
  if(!viewerProfile){
   notice('🔒 Bitte melde dich mit deinem Online-Spielerprofil an, um deine freigeschalteten Filme zu sehen.');
   return;
  }
  const tokenUid=viewerProfile.uid,serial=++requestIndex;
  notice('🎬 Deine freigeschalteten Filme werden vom Spielserver geprüft …');
  retry.disabled=true;
  try{
   const token=await viewerProfile.getIdToken();
   if(verifiedUser()?.uid!==tokenUid||serial!==requestIndex)return;
   const response=await fetch(BASE+'/api/hub/dog/video-library',{
    cache:'no-store',headers:{Authorization:'Bearer '+token}
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok||data.ok!==true||!data.library||!Array.isArray(data.library.available))
    throw Error(data.error||'VIDEO_LIBRARY_UNAVAILABLE');
   if(verifiedUser()?.uid!==tokenUid||serial!==requestIndex)return;
   snapshot=data.library;uid=tokenUid;
   notice('');paint();
  }catch(error){
   if(serial!==requestIndex)return;
   notice('⚠️ Videothek konnte nicht geladen werden. Prüfe die Verbindung zu Render und versuche es erneut.');
   console.warn('[DOG Videothek] Laden fehlgeschlagen',error?.message||error);
  }finally{retry.disabled=false;}
 }
 function playCurrent(){
  if(!active)return;
  if(player.ended){player.currentTime=0;}
  const attempt=player.play();
  if(attempt?.catch)attempt.catch(error=>{
   if(!active||error.name==='AbortError')return;
   progress.textContent='⚠️ Wiedergabe konnte nicht gestartet werden. Bitte Play erneut drücken.';
  });
 }
 function syncPlay(){
  play.textContent=player.paused?'▶ Abspielen':'⏸ Pause';
  sound.textContent=player.muted?'🔊 Ton einschalten':'🔇 Ton ausschalten';
 }
 function setClip(auto=false){
  if(!active)return;
  if(clip>=active.clips.length){
   player.pause();player.removeAttribute('src');player.load();
   progress.textContent=failed?
    '⚠️ Mindestens eine Szene konnte nicht vollständig abgespielt werden.':
    '✅ Film vollständig angesehen! Du kannst ihn jederzeit erneut starten.';
   play.textContent='↺ Erneut abspielen';
   next.disabled=true;
   if(!failed&&played===active.clips.length){
    snapshot.watched=[...new Set([...(snapshot.watched||[]),active.id])];
    void markDogVideoSeen(active.id);
    paint();
   }
   return;
  }
  player.pause();player.src=clipUrl(active.clips[clip]);
  if(active.poster)player.poster=clipUrl(active.poster);
  player.load();next.disabled=clip>=active.clips.length-1;
  progress.textContent='🎞️ Szene '+(clip+1)+' von '+active.clips.length+' · '+active.title;
  syncPlay();
  if(auto)playCurrent();
 }
 function showFilm(id){
  if(!isAvailable(id)||!uid||verifiedUser()?.uid!==uid)return;
  const film=getDogFilm(id);
  if(!film)return;
  active=film;clip=0;played=0;failed=false;
  heading.textContent=film.icon+' '+film.title;
  description.textContent=film.description;
  gallery.hidden=true;viewer.hidden=false;
  player.muted=false;setClip();
  back.focus();
 }
 button.addEventListener('click',()=>{
  if(dialog.open)return;
  dialog.showModal();
  stop();void fetchLibrary();
 });
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{requestIndex++;stop();});
 dialog.addEventListener('cancel',()=>{requestIndex++;stop();});
 filter.addEventListener('change',paint);
 retry.addEventListener('click',()=>void fetchLibrary());
 back.addEventListener('click',()=>{stop();paint();});
 play.addEventListener('click',()=>{
  if(!active)return;
  if(clip>=active.clips.length){clip=0;played=0;failed=false;setClip();}
  if(player.paused)playCurrent();else player.pause();
 });
 sound.addEventListener('click',()=>{player.muted=!player.muted;syncPlay();});
 next.addEventListener('click',()=>{
  if(!active||clip>=active.clips.length-1)return;
  failed=true;clip++;setClip();
 });
 player.addEventListener('ended',()=>{
  if(!active)return;
  played++;clip++;setClip(true);
 });
 player.addEventListener('error',()=>{
  if(!active||!player.getAttribute('src'))return;
  failed=true;progress.textContent='⚠️ Diese Videodatei konnte nicht geladen werden. Du kannst die nächste Szene öffnen.';
 });
 player.addEventListener('play',syncPlay);
 player.addEventListener('pause',syncPlay);
 window.addEventListener('spielonline-change',()=>{
  if(dialog.open&&verifiedUser()?.uid!==uid&&uid)dialog.close();
 });
 return {open:()=>button.click(),isOpen:()=>dialog.open};
}
