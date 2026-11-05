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
function directorReveal(){
 if(!g){resetCaseCamera();clearTimeout(prizeFlashTimer);clearTimeout(prizeFlashDelay);$('prize-flash').classList.remove('active');$('prize-flash').setAttribute('aria-hidden','true');directorLastGame='';directorSeenOpened.clear();directorLatestAmount=null;directorLatestUntil=0;document.body.classList.remove('reveal-spotlight');return}
 document.body.classList.toggle('reveal-spotlight',g.phase==='reveal');
 if(g.phase==='reveal'&&Number.isInteger(g.pending?.case)){
  const stage=document.querySelector('.case-stage'),grid=$('cases'),target=grid?.children[g.pending.case];
  if(stage&&target){const a=stage.getBoundingClientRect(),b=target.getBoundingClientRect();if(a.width&&a.height){stage.style.setProperty('--camera-x',((b.left+b.width/2-a.left)/a.width*100).toFixed(2)+'%');stage.style.setProperty('--camera-y',((b.top+b.height/2-a.top)/a.height*100).toFixed(2)+'%')}}
 }
 const gameKey=String(g.id);const amounts=g.openedAmounts||[];
 if(directorLastGame!==gameKey){closeCandidateCutaway();resetAvatarReaction();avatarReactionGame=gameKey;resetCaseCamera();clearTimeout(prizeFlashTimer);clearTimeout(prizeFlashDelay);$('prize-flash').classList.remove('active');$('prize-flash').setAttribute('aria-hidden','true');directorLastGame=gameKey;directorSeenOpened=new Set(amounts.map(x=>x.case));return}
 const newlyOpened=amounts.filter(x=>!directorSeenOpened.has(x.case));
 for(const item of amounts)directorSeenOpened.add(item.case);
 if(!newlyOpened.length||g.phase==='final')return;
 const item=newlyOpened.at(-1);directorLatestAmount=item.amount;directorLatestUntil=Date.now()+1800;
 const prizeScale=Array.isArray(values)&&values.length?values:[];
 const sortedScale=[...prizeScale].sort((a,b)=>a-b);
 const highThreshold=sortedScale[Math.floor(sortedScale.length*.8)]??Infinity;
 const lowThreshold=sortedScale[Math.floor(sortedScale.length*.25)]??-Infinity;
 const huge=item.amount>=highThreshold,small=item.amount<=lowThreshold;
 const mood=huge?'loss':small?'relief':'neutral';
 setAvatarReaction(huge?'shock':small?'cheer':'curious',2300);showCandidateCutaway(huge?'shock':small?'cheer':'curious',huge?'Ein großer Gewinn ist verloren!':small?'Die hohen Gewinne bleiben im Spiel!':'Ein weiterer Koffer ist geöffnet.',2550);
 const label=huge?'SCHOCK IM GOLDSTUDIO!':small?'GLÜCK GEHABT!':'KOFFER '+(item.case+1)+' GEÖFFNET';
 const flash=$('prize-flash');
 clearTimeout(prizeFlashTimer);clearTimeout(prizeFlashDelay);
 flash.classList.remove('active');flash.setAttribute('aria-hidden','true');
 const showReveal=()=>{
  if(!g||String(g.id)!==gameKey||g.phase==='final')return;
  flash.classList.toggle('prize-huge',huge);flash.classList.toggle('prize-relief',small);
  $('prize-flash-kicker').textContent=label;
  $('prize-flash-value').textContent=eur(item.amount);
  $('prize-flash-note').textContent=huge?'Ein Spitzenbetrag ist ausgeschieden!':small?'Ein kleiner Betrag ist weg – die großen Chancen bleiben!':'Das Rennen um den Hauptgewinn geht weiter.';
  flash.classList.add('active');flash.setAttribute('aria-hidden','false');
  prizeFlashTimer=setTimeout(()=>{flash.classList.remove('active');flash.setAttribute('aria-hidden','true')},matchMedia('(prefers-reduced-motion: reduce)').matches?650:1350);
 };
 /* Reveal follows the physical lid instead of racing it. The authoritative
    game state and all controls update immediately, without any artificial wait. */
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const target=$('cases')?.children[item.case];
 showCaseCamera(item.case);
 document.body.dataset.revealMood=mood;
 if(target&&!reduced){target.classList.add('case-newly-opened');target.addEventListener('animationend',()=>target.classList.remove('case-newly-opened'),{once:true})}
 prizeFlashDelay=setTimeout(showReveal,reduced?0:700);
}
