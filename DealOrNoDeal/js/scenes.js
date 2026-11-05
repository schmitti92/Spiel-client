function clearSceneTransition(){
 clearTimeout(sceneTimer);sceneTimer=null;
 const overlay=$('scene-transition');if(overlay){overlay.classList.remove('active');overlay.setAttribute('aria-hidden','true')}
}
function announceScene(){
 if(!g){lastSceneKey='';sceneEpoch++;clearSceneTransition();return}
 const phase=g.phase,round=g.round||0;
 const key=String(g.id)+'|'+phase+'|'+(phase==='decision'||phase==='open'?round:phase==='reveal'?g.pending?.eventId||'':'');
 if(key===lastSceneKey)return;
 const previous=lastSceneKey;lastSceneKey=key;const epoch=++sceneEpoch;
 clearSceneTransition();
 if(!previous||previous.split('|')[0]!==String(g.id))return;
 const captions={select:['DIE SHOW BEGINNT','Wählt eure persönlichen Glückskoffer'],final:['DAS GROSSE FINALE','Wer nimmt den höchsten Gewinn mit nach Hause?']};
 const info=captions[phase]||(phase==='open'&&previous.includes('|decision|')?['RUNDE '+(round+1),'Die Jagd nach dem großen Geld geht weiter']:null);
 /* During banker decisions the central phone modal is the main broadcast scene.
    Do not obscure the offer with a competing full-screen transition. */
 if(!info||document.hidden)return;
 const overlay=$('scene-transition');
 $('scene-title').textContent=info[0];$('scene-subtitle').textContent=info[1];
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');
 sceneTimer=setTimeout(()=>{if(epoch===sceneEpoch)clearSceneTransition()},phase==='final'?1600:950);
}
let directorLastGame='',directorSeenOpened=new Set(),prizeFlashTimer=null,prizeFlashDelay=null,directorLatestAmount=null,directorLatestUntil=0,cameraSequenceTimer=null,cameraSequenceCase=-1;
/* V55: reactions are derived from public server state; no secret votes are exposed. */
let avatarReactionGame='',avatarReactionUntil=0,avatarReactionType='',avatarReactionTimer=null;
let candidateCutawayTimer=null,candidateCutawayToken=0;
function closeCandidateCutaway(){
 clearTimeout(candidateCutawayTimer);candidateCutawayToken++;
 const panel=$('candidate-cutaway');if(panel){panel.hidden=true;panel.setAttribute('aria-hidden','true');panel.classList.remove('is-visible')}
}
