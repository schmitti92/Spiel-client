function showCandidateCutaway(kind,caption,duration=2650){
 if(!g||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 if(g.phase==='final'||!g.players?.length)return;
 const current=g.players.find(p=>p.id===g.currentPlayerId)||g.players.find(p=>p.id===g.turnPlayerId)||g.players[0];
 if(!current)return;
 const avatarNumber=Number.isInteger(current.avatar)&&current.avatar>=1&&current.avatar<=10?current.avatar:g.players.indexOf(current)%4+1;
 const panel=$('candidate-cutaway');if(!panel)return;
 clearTimeout(candidateCutawayTimer);const token=++candidateCutawayToken;
 panel.dataset.mood=kind;
 $('candidate-cutaway-portrait').style.backgroundImage="url('assets/avatar-"+avatarNumber+".svg?v=57')";
 $('candidate-cutaway-name').textContent=current.name;
 $('candidate-cutaway-caption').textContent=caption;
 $('candidate-cutaway-kicker').textContent=kind==='shock'?'● LIVE · SCHOCKREAKTION':kind==='cheer'?'● LIVE · ERLEICHTERUNG':'● LIVE · KANDIDATENREAKTION';
 panel.hidden=false;panel.setAttribute('aria-hidden','true');panel.classList.remove('is-visible');
 requestAnimationFrame(()=>{if(token===candidateCutawayToken)panel.classList.add('is-visible')});
 candidateCutawayTimer=setTimeout(()=>{if(token===candidateCutawayToken)closeCandidateCutaway()},duration);
}

function setAvatarReaction(type,duration=2100){
 if(!g||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 avatarReactionType=type;avatarReactionUntil=Date.now()+duration;
 clearTimeout(avatarReactionTimer);
 avatarReactionTimer=setTimeout(()=>{avatarReactionType='';avatarReactionUntil=0;document.querySelectorAll('.player').forEach(el=>el.removeAttribute('data-reaction'))},duration);
}
function resetAvatarReaction(){
 clearTimeout(avatarReactionTimer);avatarReactionType='';avatarReactionUntil=0;
 document.querySelectorAll('.player').forEach(el=>el.removeAttribute('data-reaction'));
}
function resetCaseCamera(){
 clearTimeout(cameraSequenceTimer);cameraSequenceTimer=null;cameraSequenceCase=-1;
 document.body.classList.remove('case-camera-reveal','case-camera-afterglow');delete document.body.dataset.revealMood;
 const grid=$('cases');if(grid)for(const el of grid.children)el.classList.remove('camera-hero');
}
function showCaseCamera(caseIndex){
 resetCaseCamera();
 if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const grid=$('cases'),target=grid?.children[caseIndex];
 if(!target)return;
 cameraSequenceCase=caseIndex;target.classList.add('camera-hero');
 document.body.classList.add('case-camera-reveal');
 cameraSequenceTimer=setTimeout(()=>{
  document.body.classList.remove('case-camera-reveal');
  document.body.classList.add('case-camera-afterglow');
  cameraSequenceTimer=setTimeout(()=>resetCaseCamera(),850);
 },1050);
}
