/**
 * Christmas reveals after a finished, server-verified DOG online match.
 * Only the server can confirm the intro and the portal unlock.
 */
import {markDogVideoSeen} from './video-library-watched.js?v=3';
const BASE=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const css=[
'html:not(.dog-christmas-portal-open) [data-dog-event-link],html:not(.dog-christmas-portal-open) [data-meta-album-link],html:not(.dog-christmas-portal-open) #dog-room-christmas,html:not(.dog-christmas-portal-open) #dog-christmas-event-link,html:not(.dog-christmas-portal-open) #dog-player-level-link{display:none!important}',
'html.dog-christmas-entry-page:not(.dog-christmas-page-ready) body > :not(script):not(style):not(#dog-christmas-entry-gate):not(.dog-reveal-overlay){visibility:hidden!important}',
'.dog-reveal-overlay{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:16px;background:#07141ff5;color:#fff2d1;font:inherit}',
'.dog-reveal-overlay[hidden]{display:none!important}.dog-reveal-card{width:min(960px,100%);max-height:96dvh;overflow:auto;border:1.5px solid #c3a46b;border-radius:21px;background:#09202c;box-shadow:0 25px 85px #000b;text-align:center}',
'.dog-reveal-card video{width:100%;aspect-ratio:16/9;object-fit:contain;background:#051623;display:block}',
'.dog-reveal-fallback{aspect-ratio:16/9;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 80%,#476e5d,#1a3845 55%,#0a1928);position:relative;overflow:hidden}',
'.dog-reveal-fallback[hidden]{display:none!important}.dog-reveal-fallback span{font-size:clamp(92px,19vw,210px);filter:drop-shadow(0 0 28px #f9d976);animation:dogStarGlow 3s ease-in-out infinite alternate}',
'.dog-reveal-fallback h2{position:absolute;bottom:7%;left:5%;right:5%;text-shadow:0 2px 15px #001;font-size:clamp(22px,4vw,46px)}',
'@keyframes dogStarGlow{to{filter:drop-shadow(0 0 60px #fff2b4)}}',
'.dog-reveal-footer{padding:15px 16px 19px;display:grid;justify-items:center;gap:12px}.dog-reveal-footer p{margin:0;font-size:clamp(13px,1.6vw,17px)}',
'.dog-reveal-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}.dog-reveal-actions button,.dog-reveal-actions a{font:inherit;font-weight:800;color:#fff0ca;background:#294b55;border:1px solid #d4af68;padding:11px 16px;border-radius:11px;text-decoration:none;cursor:pointer}',
'.dog-reveal-actions a{background:#785623;color:white}',
'#dog-christmas-entry-gate{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:radial-gradient(ellipse at 50% 20%,#224657,#071725 70%);color:#ffeed0;font:inherit}',
'#dog-christmas-entry-gate[hidden]{display:none!important}.dog-entry-card{width:min(440px,100%);padding:24px;border:1px solid #bfa66c;border-radius:18px;background:#102c39;text-align:center}',
'.dog-entry-card h1{font-size:25px;margin:0 0 12px}.dog-entry-card p{line-height:1.5}.dog-entry-card a,.dog-entry-card button{font:inherit;display:inline-block;padding:11px 14px;background:#dbb765;color:#132b35;font-weight:800;border-radius:10px;border:0;text-decoration:none;cursor:pointer}',
'.dog-entry-card input{padding:10px;border-radius:9px;border:1px solid #cbb47f;width:100px;max-width:35vw;background:white;color:#132b35}'
].join('\n');
if(!document.getElementById('dog-christmas-intro-css')){
 const style=document.createElement('style');
 style.id='dog-christmas-intro-css';style.textContent=css;document.head.append(style);
}
const profile=()=>{
 const p=window.SpielOnline?.state?.();
 return p?.status==='online'&&p.user?.getIdToken?p:null;
};
const chris=p=>String(p?.profile?.name||'').trim().toLowerCase()==='chris';
const devUnlocked=p=>{
 if(!p||!chris(p))return false;
 try{
  const uid=p.user.uid,v=JSON.parse(localStorage.getItem('dog-christmas-dev-preview-v1:'+uid)||'{}');
  return v.active===true&&sessionStorage.getItem('dog-christmas-dev-pin-v1:'+uid)==='1';
 }catch{return false;}
};
async function api(suffix='',method='GET'){
 const before=profile();if(!before)throw Error('LOGIN_REQUIRED');
 const uid=before.user.uid,token=await before.user.getIdToken();
 if(profile()?.user?.uid!==uid)throw Error('PROFILE_CHANGED');
 const response=await fetch(BASE+'/api/hub/dog/christmas-intro'+suffix,{
  method,cache:'no-store',headers:{Authorization:'Bearer '+token}
 });
 const data=await response.json().catch(()=>({}));
 if(response.status===404){
  // Compatibility while Render is still deploying the new per-profile
  // intro endpoint: entitlement STILL comes from verified server statistics.
  // Only the "video already watched" receipt is temporarily browser-local.
  const statsResponse=await fetch(BASE+'/api/hub/dog/stats',{
   cache:'no-store',headers:{Authorization:'Bearer '+token}
  });
  const stats=await statsResponse.json().catch(()=>({}));
  if(!statsResponse.ok||stats.ok!==true)throw Error('INTRO_SERVER_NOT_READY');
  if(profile()?.user?.uid!==uid)throw Error('PROFILE_CHANGED');
  const played=Number(stats.stats?.played)||0;
  // The legacy statistics endpoint does not expose a trusted match timestamp.
  // Take a per-profile baseline while the event is still hidden: a NEW
  // verified completed match must advance the server counter before reveal.
  const baselineKey='dog-christmas-reveal-baseline-v1:'+uid;
  let baseline=Number(localStorage.getItem(baselineKey));
  if(localStorage.getItem(baselineKey)===null||!Number.isSafeInteger(baseline)){
   baseline=played;localStorage.setItem(baselineKey,String(baseline));
  }
  const eligible=played>baseline;
  const key='dog-christmas-video-seen-v1:'+uid;
  if(method==='POST'){
   if(!eligible)throw Error('DOG_CHRISTMAS_INTRO_LOCKED');
   localStorage.setItem(key,'1');
   return {ok:true,completed:true,eligible,localFallback:true};
  }
  return {ok:true,eligible,introReady:eligible,completed:eligible&&localStorage.getItem(key)==='1',localFallback:true};
 }
 if(!response.ok||data.ok!==true)throw Error(data.error||'INTRO_SERVER_NOT_READY');
 // A new server-confirmed event baseline must override every old local
 // cinematic receipt and developer test slider on each player's device.
 // Run BEFORE the legacy film auto-ack migration below.
 if(data.resetId&&method==='GET'){
  const marker='dog-christmas-applied-reset-v1:'+uid;
  try{
   if(localStorage.getItem(marker)!==data.resetId){
    for(const prefix of [
     'dog-christmas-video-seen-v1:','dog-christmas-reveal-baseline-v1:',
     'dog-christmas-dev-preview-v1:','dog-christmas-dev-pin-v1:'
    ]){
     localStorage.removeItem(prefix+uid);sessionStorage.removeItem(prefix+uid);
    }
    localStorage.setItem(marker,data.resetId);
   }
  }catch{}
 }
 // Transparently migrate a previously watched local video once the new
 // server endpoint has become available.
 if(method==='GET'&&data.eligible&&!data.completed&&localStorage.getItem('dog-christmas-video-seen-v1:'+uid)==='1'){
  // A device may still hold a pre-reset 'film watched' flag. Never let that
  // legacy local flag re-acknowledge Chris's cleared online intro receipt.
  if(chris(before)){
   const resetResponse=await fetch(BASE+'/api/hub/dog/chris-christmas-reset/status',{
    cache:'no-store',headers:{Authorization:'Bearer '+token}
   }).catch(()=>null);
   const reset=await resetResponse?.json().catch(()=>null);
   if(!resetResponse?.ok||reset?.ok!==true)return data;
   if(reset.alreadyReset){
    localStorage.removeItem('dog-christmas-video-seen-v1:'+uid);
    localStorage.removeItem('dog-christmas-reveal-baseline-v1:'+uid);
    return data;
   }
  }
  const ack=await fetch(BASE+'/api/hub/dog/christmas-intro/complete',{
   method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+token}
  });
  const stored=await ack.json().catch(()=>({}));
  if(ack.ok&&stored.completed===true)return {...data,completed:true};
 }
 return data;
}
let introVisible=false;
export function showChristmasIntro(onDone=()=>{},onLater=()=>{}){
 if(introVisible)return;
 introVisible=true;
 const overlay=document.createElement('div');overlay.className='dog-reveal-overlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label','Das Weihnachtswunder von Lichtertal');
 const card=document.createElement('div');card.className='dog-reveal-card';
 const clips=[
  './assets/281209346_1795276244245420.mp4', // the winter legend (new recording)
  './assets/905698533_1795276252169292.mp4', // arrival in Lichtertal (new recording)
  './assets/1072510991_1795276258065893.mp4', // Frau Berger's warning (new recording)
  './assets/658840420_1795276265000111.mp4' // the first Christmas light (new recording)
 ];
 const video=document.createElement('video');
 video.autoplay=false;video.controls=true;video.playsInline=true;video.muted=false;video.preload='none';
 video.poster=new URL('./assets/lichtertal-intro-poster.jpg',import.meta.url).href;
 const fallback=document.createElement('div');fallback.className='dog-reveal-fallback';fallback.hidden=true;
 fallback.innerHTML='<span aria-hidden="true">🎄</span><h2>✨ Das Weihnachtswunder von Lichtertal ✨</h2>';
 const footer=document.createElement('div');footer.className='dog-reveal-footer';
 footer.innerHTML='<p data-progress aria-live="polite">🎬 Introfilm · 4 Szenen · etwa 60 Sekunden</p><p>🎧 Starte den Film selbst, damit du alle deutschen Dialoge mit Ton hören kannst.</p><div class="dog-reveal-actions"><button type="button" data-play>▶ Mit Ton abspielen</button><button type="button" data-sound>🔇 Ton ausschalten</button><button type="button" data-skip>Intro überspringen</button><button type="button" data-later>Später ansehen</button><a data-enter hidden>🎄 Weihnachtsdorf betreten</a></div><p data-status role="status"></p>';
 card.append(video,fallback,footer);overlay.append(card);document.body.append(overlay);
 const play=footer.querySelector('[data-play]'),sound=footer.querySelector('[data-sound]'),skip=footer.querySelector('[data-skip]');
 const later=footer.querySelector('[data-later]');
 const enter=footer.querySelector('[data-enter]'),status=footer.querySelector('[data-status]');
 const progress=footer.querySelector('[data-progress]');
 let done=false,posting=false,fallbackTimer=null,clipIndex=0,playedClips=0;
 const remove=()=>{
  video.pause();video.removeAttribute('src');video.load();
  overlay.remove();introVisible=false;
  if(fallbackTimer)clearTimeout(fallbackTimer);
 };
 const finish=async()=>{
  if(done||posting)return;
  posting=true;video.pause();skip.disabled=true;
  status.textContent='⭐ Deine Eventfreischaltung wird gespeichert ...';
  try{
   const result=await api('/complete','POST');
   if(result.completed!==true)throw Error('INTRO_NOT_CONFIRMED');
   done=true;onDone();
   if(playedClips===clips.length)void markDogVideoSeen('intro');
   document.documentElement.classList.add('dog-christmas-portal-open');
   skip.hidden=true;play.hidden=true;sound.hidden=true;later.hidden=true;enter.hidden=false;
   enter.href=new URL('./christmas-event.html',import.meta.url).href;
   progress.textContent='🎄 Das Intro ist abgeschlossen';
   status.textContent='🎁 Lichtertal ist für dich freigeschaltet!';
   enter.addEventListener('click',remove,{once:true});
  }catch(e){
   skip.disabled=false;skip.textContent='↻ Freischaltung erneut prüfen';
   later.hidden=false;
   const reason=String(e?.message||'');
   status.textContent=reason==='DOG_CHRISTMAS_INTRO_LOCKED'?
    '⚠️ Der Server hat noch keine berechtigte abgeschlossene DOG-Onlinepartie bestätigt. Das Video kannst du später erneut ansehen.':
    '⚠️ Die Freischaltung konnte nicht bestätigt werden. Du kannst es später erneut versuchen oder zur Lobby zurückkehren.';
   console.warn('[Christmas intro] Confirmation failed:',reason);
  }finally{posting=false;}
 };
 const useFallback=()=>{
  if(done||posting||fallbackTimer)return;
  video.pause();video.hidden=true;fallback.hidden=false;play.hidden=true;sound.hidden=true;
  progress.textContent='🎄 Die Videos konnten nicht geladen werden';
  fallbackTimer=setTimeout(()=>void finish(),5500);
 };
 const syncControls=()=>{
  play.textContent=video.paused?'▶ Mit Ton abspielen':'⏸ Pause';
  sound.textContent=video.muted?'🔊 Ton einschalten':'🔇 Ton ausschalten';
 };
 const playCurrent=()=>{
  if(done||posting||fallbackTimer)return;
  const attempt=video.play();
  if(attempt&&typeof attempt.catch==='function')attempt.catch(e=>{
   if(done||posting||fallbackTimer)return;
   if(e?.name==='NotAllowedError'){
    status.textContent='▶ Bitte drücke erneut auf „Mit Ton abspielen“.';
   }else if(e?.name!=='AbortError'){
    status.textContent='⚠️ Wiedergabe nicht möglich. Bitte erneut abspielen oder Intro überspringen.';
    console.warn('[Christmas intro] Playback unavailable:',e?.message||e);
   }
   syncControls();
  });
 };
 const startClip=(autoContinue=false)=>{
  if(done||posting||fallbackTimer)return;
  if(clipIndex>=clips.length){
   if(playedClips>0)void finish();
   else useFallback();
   return;
  }
  progress.textContent='🎬 Introfilm · Szene '+(clipIndex+1)+' von '+clips.length;
  video.src=new URL(clips[clipIndex],import.meta.url).href;
  video.load();
  syncControls();
  if(autoContinue)playCurrent();
 };
 play.addEventListener('click',()=>{
  if(video.paused)playCurrent();
  else video.pause();
  syncControls();
 });
 sound.addEventListener('click',()=>{
  video.muted=!video.muted;
  syncControls();
 });
 video.addEventListener('play',syncControls);
 video.addEventListener('pause',syncControls);
 skip.addEventListener('click',()=>void finish());
 later.addEventListener('click',()=>{remove();onLater();});
 video.addEventListener('ended',()=>{
  playedClips++;
  clipIndex++;
  startClip(true);
 });
 video.addEventListener('error',()=>{
  if(done||posting||fallbackTimer)return;
  console.warn('[Christmas intro] Skipping unavailable clip',clipIndex+1);
  clipIndex++;
  startClip(true);
 });
 if(!video.canPlayType('video/mp4'))useFallback();
 else startClip(false); // No autoplay: the viewer presses Play to enable audio.
 return {remove,finish};
}
export function mountChristmasLinks(){
 let pending=false,pendingAgain=false,shownUid=null,activeUid=null;
 let lastEligibilityReadAt=0,lastEligibilityUid=null;
 // The victory status must originate from a fetch STARTED after the
 // confirmed match-finished signal. A pre-victory in-flight GET is never
 // valid evidence for showing the introductory Christmas film.
 let victoryGeneration=0,verifiedVictory=null;
 const ELIGIBILITY_FOCUS_MIN_MS=120000; // Focus/visibility reuse eligibility; actual match completion forces an immediate check.
 // The film belongs to the actual DOG game AFTER its winner ceremony.
 // This module also runs in the shared hub, which has no ceremony at all.
 // Never launch a Christmas film there just because an old profile is eligible.
 const victoryDialog=document.getElementById('winner');
 let matchFinishedOnThisPage=false,ceremonyDismissed=false,introDeferred=false;
 const ceremonyOpen=()=>!!victoryDialog?.open;
 const afterVictory=()=>Boolean(victoryDialog&&matchFinishedOnThisPage&&ceremonyDismissed&&!ceremonyOpen());
 const showVerifiedIntro=(state,uid)=>{
  if(state?.eligible&&state.introReady&&!state.completed&&
     !introVisible&&!introDeferred&&afterVictory())
   showChristmasIntro(()=>{shownUid=uid;},()=>{introDeferred=true;});
 };
 async function refresh({force=false}={}){
  const p=profile();
  if(!p){
   shownUid=null;activeUid=null;matchFinishedOnThisPage=false;ceremonyDismissed=false;introDeferred=false;
   verifiedVictory=null;
   lastEligibilityReadAt=0;lastEligibilityUid=null;
   document.documentElement.classList.remove('dog-christmas-portal-open');return;
  }
  const uid=p.user.uid;
  if(!force&&lastEligibilityUid===uid&&Date.now()-lastEligibilityReadAt<ELIGIBILITY_FOCUS_MIN_MS)return;
  if(pending){if(force||uid!==activeUid)pendingAgain=true;return;}
  pending=true;
  if(activeUid!==uid){
   activeUid=uid;matchFinishedOnThisPage=false;ceremonyDismissed=false;introDeferred=false;
   verifiedVictory=null;
  }
  const queriedVictoryGeneration=victoryGeneration;
  try{
   const state=await api();
   if(profile()?.user?.uid!==uid)return;
   lastEligibilityReadAt=Date.now();
   lastEligibilityUid=uid;
   if(matchFinishedOnThisPage&&queriedVictoryGeneration===victoryGeneration)
    verifiedVictory={uid,state,at:lastEligibilityReadAt};
   // Chris keeps early event access. The cinematic is a separate milestone:
   // show it only after a genuinely completed, verified online DOG match.
   const portalUnlocked=state.eligible&&(state.completed||state.previewGranted);
   document.documentElement.classList.toggle('dog-christmas-portal-open',Boolean(portalUnlocked));
   showVerifiedIntro(state,uid);
  }catch(e){
   document.documentElement.classList.remove('dog-christmas-portal-open');
   console.warn('[Christmas entry] Check unavailable:',e?.message||e);
  }finally{
   pending=false;
   if(pendingAgain){pendingAgain=false;queueMicrotask(()=>void refresh({force:true}));}
  }
 }
 window.addEventListener('spielonline-change',()=>void refresh());
 window.addEventListener('dog-match-finished',()=>{
  if(victoryDialog){
   matchFinishedOnThisPage=true;
   victoryGeneration++;
   verifiedVictory=null;
  }
  void refresh({force:true});
 });
 // Only the actual closing of the finished-match ceremony may reveal the film.
 victoryDialog?.addEventListener('close',()=>{
  if(matchFinishedOnThisPage)ceremonyDismissed=true;
  const uid=profile()?.user?.uid;
  // If the server already verified the just-ended match, closing the
  // ceremony only changes LOCAL presentation and needs no second
  // Firestore-backed eligibility request. Older evidence is never used.
  if(verifiedVictory?.uid===uid&&uid&&
     Date.now()-verifiedVictory.at>=0&&Date.now()-verifiedVictory.at<60000){
   showVerifiedIntro(verifiedVictory.state,uid);
   return;
  }
  // A verification already in flight will offer the film on completion.
  // In-flight pre-victory checks schedule an immediate forced follow-up.
  if(pending)return;
  void refresh({force:true});
 });
 window.addEventListener('focus',()=>void refresh());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
 const initiallyAuthenticated=Boolean(profile());
 void refresh();
 // Only retry the startup probe when no online profile was ready at first.
 if(!initiallyAuthenticated)setTimeout(()=>void refresh(),1700);
 return refresh;
}
export function guardChristmasEventPage(){
 const gate=document.createElement('div');gate.id='dog-christmas-entry-gate';
 gate.innerHTML='<div class="dog-entry-card"><h1>🔒 Lichtertal wartet auf dich</h1><p data-message>Spiele zuerst eine vollständige DOG-Onlinepartie.</p><a href="../hub-lobby.html">🐾 Zur DOG-Lobby</a><div data-dev hidden style="margin-top:15px"><p>🛠️ Chris · Entwicklerzugang</p><input type="password" maxlength="3" inputmode="numeric" placeholder="PIN" aria-label="Entwickler-PIN"><button type="button">Freischalten</button></div></div>';
 document.body.append(gate);
 const message=gate.querySelector('[data-message]'),developer=gate.querySelector('[data-dev]');
 let admitted=false,checking=false;
 const admit=async()=>{
  if(admitted)return;
  admitted=true;gate.remove();
  document.documentElement.classList.add('dog-christmas-page-ready','dog-christmas-portal-open');
  try{
   await import('./christmas-event.js?v=193');
  }catch(error){
   // An invalid module must not leave a visible but unusable village.
   console.error('[DOG] Weihnachtsevent-Module konnten nicht geladen werden:',error);
   admitted=false;
   document.documentElement.classList.remove('dog-christmas-page-ready','dog-christmas-portal-open');
   gate.hidden=false;
   document.body.append(gate);
   message.textContent='⚠️ Das Weihnachtsdorf konnte nicht vollständig geladen werden. Bitte die Seite neu laden. Dein Gebäudefortschritt bleibt auf dem Server gespeichert.';
   if(!gate.querySelector('[data-event-reload]')){
    const retry=document.createElement('button');
    retry.type='button';
    retry.dataset.eventReload='true';
    retry.textContent='🔄 Weihnachtsdorf neu laden';
    retry.addEventListener('click',()=>location.reload());
    message.after(retry);
   }
  }
 };
 const check=async()=>{
  if(admitted||checking)return;
  const p=profile();
  if(!p){message.textContent='🔒 Bitte anmelden und deine erste DOG-Onlinepartie abschließen.';return;}
  // Check the fresh server invitation first; otherwise an old developer
  // preview could silently skip the newly reset first-visit film.
  // A prior dev unlock may show the PIN panel but cannot bypass the server.
  const developerPreviewActive=devUnlocked(p);
  developer.hidden=!chris(p)&&!developerPreviewActive;
  checking=true;
  try{
   const state=await api();
   if(profile()?.user?.uid!==p.user.uid)return;
   if(!state.eligible)message.textContent='🔒 Lichtertal öffnet sich nach deiner ersten abgeschlossenen DOG-Onlinepartie.';
   else if(state.introReady&&!state.completed){
    message.textContent='✨ Deine erste Partie ist geschafft. Das Weihnachtswunder beginnt!';
    gate.hidden=true;
    showChristmasIntro(()=>void admit(),()=>{
     gate.hidden=false;
     message.textContent='✨ Dein Intro wartet auf dich. Du kannst es später erneut ansehen.';
    });
   }else if(state.completed||state.previewGranted)await admit();
   else message.textContent='🔒 Eine abgeschlossene DOG-Onlinepartie fehlt noch.';
  }catch(e){message.textContent='🔒 Die Freischaltung konnte noch nicht überprüft werden. Bitte erneut anmelden.';}
  finally{checking=false;}
 };
 developer.querySelector('button').addEventListener('click',()=>{
  const p=profile(),pin=developer.querySelector('input').value;
  if(!p||!chris(p)||pin!=='123'){message.textContent='⚠️ Falsche PIN.';return;}
  const uid=p.user.uid,key='dog-christmas-dev-preview-v1:'+uid;
  let settings={};
  try{settings=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
  localStorage.setItem(key,JSON.stringify({...settings,active:true}));
  sessionStorage.setItem('dog-christmas-dev-pin-v1:'+uid,'1');
  void admit();
 });
 window.addEventListener('spielonline-change',()=>void check());
 const initiallyAuthenticated=Boolean(profile());
 void check();
 // Startup retry only when Firebase Auth was not ready at first render.
 if(!initiallyAuthenticated)setTimeout(()=>void check(),1700);
}
