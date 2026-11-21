/**
 * Per-player Lichtertal story films for verified shared Christmas tree stages.
 * Never use developer preview, village picture or locally selected tree level.
 * Viewing state is local per authenticated profile, not a reward entitlement.
 */
export const CHRISTMAS_TREE_FILMS=Object.freeze({
  2:Object.freeze({
    title:'Der erste Stern',
    subtitle:'Herr Albrecht und das erste Licht der Hoffnung',
    clips:Object.freeze([
      './assets/553349132_1795277408558110.mp4',
      './assets/681598781_1795277411540396.mp4'
    ])
  }),
  3:Object.freeze({
    title:'Der Duft der Hoffnung',
    subtitle:'Die Bäckerei erwacht und ein Geheimnis taucht auf',
    clips:Object.freeze([
      './assets/901719079_1795277415902807.mp4',
      './assets/433654807_1795277420139339.mp4'
    ])
  })
});
export function eligibleChristmasTreeFilms(level,completed=[]){
 if(!Number.isInteger(level))return [];
 return [2,3].filter(n=>n<=level&&!completed.includes(n));
}
export function initChristmasTreeFilms({getUserId,isPreview}){
 const style=document.createElement('style');
 style.textContent=[
  '.dog-tree-film-dialog{position:fixed;inset:0;margin:auto;width:min(960px,calc(100vw - 22px));max-height:94dvh;overflow:auto;padding:0;border:1px solid #dbb977;border-radius:18px;background:#0b2430;color:#fff0d1;box-shadow:0 25px 85px #000a;z-index:2147483600}',
  '.dog-tree-film-dialog::backdrop{background:#020d18ea;backdrop-filter:blur(6px)}',
  '.dog-tree-film-dialog [hidden]{display:none!important}',
  '.dog-tree-film-dialog header{padding:16px 20px;background:linear-gradient(120deg,#244652,#102533);display:flex;align-items:start;justify-content:space-between;gap:12px}',
  '.dog-tree-film-dialog header span{font-size:12px;font-weight:750;letter-spacing:.05em;color:#ffdd9a}',
  '.dog-tree-film-dialog header h2{margin:4px 0;font-size:clamp(20px,4vw,30px);color:#ffe4aa}',
  '.dog-tree-film-dialog header p{margin:0;font-size:13px;color:#d9d6c8}',
  '.dog-tree-film-dialog video{width:100%;aspect-ratio:16/9;display:block;object-fit:contain;background:#06131e}',
  '.dog-tree-film-footer{padding:15px 20px 20px;display:grid;gap:12px}',
  '.dog-tree-film-footer p{margin:0;line-height:1.5;font-size:14px}',
  '.dog-tree-film-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}',
  '.dog-tree-film-actions button,.tree-step-film-replay{font:inherit;border:1px solid #cbab77;border-radius:10px;padding:11px 14px;background:#284a58;color:#fff0d4;min-height:42px;cursor:pointer}',
  '.dog-tree-film-actions button[data-play]{background:#c7a060;color:#122633;font-weight:800}',
  '.tree-step-film-replay{display:block;margin:6px;width:calc(100% - 12px);font-size:12px;padding:7px;min-height:35px}',
  '.tree-step-film-replay:disabled{opacity:.45;cursor:default}',
  '@media(max-width:560px){.dog-tree-film-dialog header,.dog-tree-film-footer{padding:12px}.dog-tree-film-actions button{flex:1 1 43%}}'
 ].join('\n');
 document.head.append(style);
 const dialog=document.createElement('dialog');
 dialog.className='dog-tree-film-dialog';
 dialog.setAttribute('aria-label','Weihnachtsbaum – neuer Geschichtsfilm');
 dialog.innerHTML=[
  '<header><div><span data-stage>🎄 BAUMSTUFE</span><h2 data-title></h2><p data-subtitle></p></div>',
  '<button type="button" data-close aria-label="Schließen" style="background:#284855;color:#fff0d2;border:1px solid #bfa46f;border-radius:10px;padding:9px 12px">✕</button></header>',
  '<video playsinline controls preload="metadata" aria-label="Geschichtsfilm zu dieser Baumstufe"></video>',
  '<div class="dog-tree-film-footer">',
  '<p data-status role="status">▶ Drücke auf Play, um den Film mit Ton zu starten.</p>',
  '<div class="dog-tree-film-actions">',
  '<button type="button" data-play>▶ Mit Ton abspielen</button>',
  '<button type="button" data-mute>🔇 Ton ausschalten</button>',
  '<button type="button" data-restart>↺ Von vorne</button>',
  '<button type="button" data-skip>Film überspringen</button>',
  '</div><p style="font-size:12px;color:#b7cbd1">Zwei Szenen à 15 Sekunden. Deine Baumstufe und Belohnungen bleiben unverändert.</p></div>'
 ].join('');
 document.body.append(dialog);
 const video=dialog.querySelector('video'),status=dialog.querySelector('[data-status]');
 const play=dialog.querySelector('[data-play]'),mute=dialog.querySelector('[data-mute]');
 const skip=dialog.querySelector('[data-skip]'),closeButton=dialog.querySelector('[data-close]');
 const restart=dialog.querySelector('[data-restart]');
 let userId=null,verifiedLevel=0,active=null,clipIndex=0,finished=false,failed=false;
 const pending=[],replayButtons=[],memory=new Set();
 const storageKey=(uid,level)=>'dog-christmas-tree-film-v1:'+uid+':'+level;
 const isSeen=(uid,level)=>{
  const key=storageKey(uid,level);
  try{return localStorage.getItem(key)==='done'||memory.has(key);}
  catch{return memory.has(key);}
 };
 const markSeen=(uid,level)=>{
  const key=storageKey(uid,level);memory.add(key);
  try{localStorage.setItem(key,'done');}catch{}
 };
 const canShow=()=>Boolean(userId&&!isPreview());
 const syncControls=()=>{
  play.textContent=finished?'✅ Abgeschlossen':video.paused?'▶ Mit Ton abspielen':'⏸ Pause';
  play.disabled=finished;
  mute.textContent=video.muted?'🔊 Ton einschalten':'🔇 Ton ausschalten';
  skip.textContent=finished?'Zurück zum Weihnachtsdorf':'Film überspringen';
 };
 function beginPlayback(){
  if(!active||finished)return;
  const attempt=video.play();
  if(attempt?.catch)attempt.catch(error=>{
   if(!dialog.open||error?.name==='AbortError')return;
   status.textContent='▶ Bitte erneut auf Play drücken, damit dein Browser den Ton freigibt.';
   console.warn('[Lichtertal Film] Playback unavailable:',error?.message||error);
   syncControls();
  });
 }
 function loadClip(autoContinue=false){
  if(!active)return;
  const chapter=CHRISTMAS_TREE_FILMS[active.level];
  if(clipIndex>=chapter.clips.length){
   finished=true;video.pause();
   if(!failed&&!active.replay)markSeen(active.uid,active.level);
   status.textContent=failed?'⚠️ Nicht alle Videos konnten geladen werden. Du kannst sie später erneut ansehen.':'✨ Geschichte abgeschlossen! Zurück zum Weihnachtsdorf.';
   syncControls();return;
  }
  video.src=new URL(chapter.clips[clipIndex],import.meta.url).href;
  video.load();
  status.textContent='🎬 Baumstufe '+active.level+' · Szene '+(clipIndex+1)+' von 2'+(autoContinue?'':' · Play drücken, Ton ist eingeschaltet.');
  syncControls();
  if(autoContinue)beginPlayback();
 }
 function closeFilm(markCompleted=false){
  if(!active)return;
  const leaving=active;
  video.pause();video.removeAttribute('src');video.load();
  if(markCompleted&&!leaving.replay)markSeen(leaving.uid,leaving.level);
  active=null;clipIndex=0;finished=false;failed=false;
  if(dialog.open)dialog.close();
  if(canShow())queueMicrotask(showNext);
 }
 function openFilm(level,replay=false){
  if(!canShow()||level>verifiedLevel||!CHRISTMAS_TREE_FILMS[level]||active||dialog.open)return;
  const data=CHRISTMAS_TREE_FILMS[level];
  active={level,uid:userId,replay};clipIndex=0;finished=false;failed=false;
  dialog.querySelector('[data-stage]').textContent='🎄 BAUMSTUFE '+level+' / 10';
  dialog.querySelector('[data-title]').textContent=data.title;
  dialog.querySelector('[data-subtitle]').textContent=data.subtitle+' · 30 Sekunden';
  video.autoplay=false;video.muted=false;
  video.poster=new URL('./weihnachtsevent-bilder/weihnachtsbaum_stufe_'+level+'.png',import.meta.url).href;
  dialog.showModal();
  loadClip(false);
 }
 function showNext(){
  if(!canShow()||active||dialog.open)return;
  while(pending.length){
   const level=pending.shift();
   if(level>verifiedLevel||isSeen(userId,level))continue;
   openFilm(level);return;
  }
 }
 const timeline=document.getElementById('tree-steps');
 for(const level of [2,3]){
  const item=timeline?.querySelector('[data-tree-step="'+level+'"]');
  if(!item)continue;
  const button=document.createElement('button');
  button.type='button';button.className='tree-step-film-replay';
  button.textContent='🎬 Geschichte ansehen';
  button.setAttribute('aria-label','Film für Baumstufe '+level+' erneut ansehen');
  button.hidden=true;button.disabled=true;
  button.addEventListener('click',()=>openFilm(level,true));
  item.append(button);replayButtons.push({level,button});
 }
 const refreshButtons=()=>{
  for(const {level,button} of replayButtons){
   const allow=canShow()&&verifiedLevel>=level;
   button.hidden=!allow;button.disabled=!allow;
  }
 };
 function sync(level){
  const uid=getUserId();
  if(!uid||isPreview()){
   userId=uid||null;verifiedLevel=0;pending.length=0;
   if(active)closeFilm(false);
   refreshButtons();return;
  }
  if(uid!==userId){
   if(active){video.pause();video.removeAttribute('src');video.load();active=null;if(dialog.open)dialog.close();}
   pending.length=0;userId=uid;
  }
  verifiedLevel=Number.isInteger(level)?Math.max(0,Math.min(level,10)):0;
  const completed=[2,3].filter(n=>isSeen(uid,n));
  for(const candidate of eligibleChristmasTreeFilms(verifiedLevel,completed)){
   if(!pending.includes(candidate)&&active?.level!==candidate)pending.push(candidate);
  }
  refreshButtons();showNext();
 }
 play.addEventListener('click',()=>{if(!active||finished)return;if(video.paused)beginPlayback();else video.pause();syncControls();});
 mute.addEventListener('click',()=>{video.muted=!video.muted;syncControls();});
 restart.addEventListener('click',()=>{if(!active)return;clipIndex=0;finished=false;failed=false;video.pause();loadClip(false);});
 skip.addEventListener('click',()=>closeFilm(!finished));
 closeButton.addEventListener('click',()=>closeFilm(!finished));
 dialog.addEventListener('cancel',event=>{event.preventDefault();closeFilm(!finished);});
 video.addEventListener('play',syncControls);
 video.addEventListener('pause',syncControls);
 video.addEventListener('ended',()=>{if(!active||finished)return;clipIndex++;loadClip(true);});
 video.addEventListener('error',()=>{
  if(!active||finished)return;
  failed=true;
  console.warn('[Lichtertal Film] Missing stage clip',active.level,clipIndex+1);
  if(clipIndex===0){clipIndex=1;loadClip(false);status.textContent='⚠️ Szene 1 konnte nicht geladen werden. Szene 2 kann mit Play gestartet werden.';}
  else{finished=true;status.textContent='⚠️ Szene 2 konnte nicht geladen werden. Bitte später erneut versuchen.';syncControls();}
 });
 return {sync,isOpen:()=>dialog.open,show:level=>openFilm(level,true)};
}
