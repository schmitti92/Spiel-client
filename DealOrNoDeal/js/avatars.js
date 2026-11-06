'use strict';

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
