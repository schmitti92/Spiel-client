'use strict';
/* Match-long commentary with one deterministic written plot per match.
   Chapters are chosen ONLY from public, confirmed game snapshots.
   No Firebase, hidden case values, server writes or guessing are involved. */
(function(root){
 const stages=['intro','banker','turn','climax','final'];
 const chapterNumbers=Object.freeze({intro:1,banker:2,turn:3,climax:4,final:5});
 const prefix='deal-moderator-story-v1:';
 let currentGame=null,currentId=null,played=new Set(),retryTimer=null,lastAcceptedAt=0;
 function key(id){return prefix+String(id)}
 function restore(id){
  let saved=null;
  try{saved=JSON.parse(sessionStorage.getItem(key(id))||'null')}catch{}
  played=new Set(Array.isArray(saved?.played)?saved.played.filter(v=>stages.includes(v)):[]);
  lastAcceptedAt=Math.max(0,Number(saved?.lastAcceptedAt)||0);
 }
 function persist(){
  if(!currentId)return;
  try{sessionStorage.setItem(key(currentId),JSON.stringify({
   played:[...played],lastAcceptedAt
  }))}catch{}
 }
 function clearRetry(){if(retryTimer!==null){clearTimeout(retryTimer);retryTimer=null}}
 function retryIn(ms){
  if(retryTimer!==null||!root.DealModeratorAudio?.isEnabled?.()||document.hidden)return;
  retryTimer=setTimeout(()=>{retryTimer=null;if(currentGame)observe(currentGame)},Math.max(250,ms));
 }
 function stageReady(stage,game){
  const opened=Array.isArray(game.openedAmounts)?game.openedAmounts:[];
  const history=Array.isArray(game.history)?game.history:[];
  const players=Array.isArray(game.players)?game.players:[];
  const ctx=root.DealModeratorStories?.revealContext(game);
  if(!ctx)return false;
  const available=Math.max(0,ctx.count-players.length-opened.length);
  if(stage==='final'){
   // The full personal-case finale and reward reels have their own soundtrack.
   // Tell the ending only AFTER its shared ceremony has finished.
   if(game.phase!=='final'&&game.phase!=='done')return false;
   try{return sessionStorage.getItem('finale-watched:'+game.id+':finale')==='yes'}catch{return false}
  }
  if(game.phase!=='open')return false;
  if(stage==='intro')return opened.length===0&&history.length===0;
  if(stage==='banker')return history.length>=1;
  if(stage==='turn'){
   const target=Math.min(11,Math.max(6,Math.floor((ctx.count-players.length)*.4)));
   return opened.length>=target||(opened.length>=5&&(ctx.topLost||ctx.centLost||ctx.good||ctx.bad));
  }
  if(stage==='climax')return opened.length>=8&&available<=3;
  return false;
 }
 function sceneBusy(){
  for(const id of ['banker-call','vote-reveal','finale-cinema','cent-reward','banker-bonus-reveal']){
   const el=document.getElementById(id);
   if(el&&el.hidden===false)return true;
  }
  return false;
 }
 function observe(game){
  if(!game||typeof game.id!=='string'){
   currentGame=null;clearRetry();return;
  }
  if(game.id!==currentId){
   currentId=game.id;clearRetry();restore(game.id);
  }
  currentGame=game;
  if(document.hidden||!root.DealModeratorAudio?.isEnabled?.()||!root.DealModeratorStories)return;
  if(game.phase==='final'||game.phase==='done'){
   if(played.has('final')||!stageReady('final',game))return;
  }else if(game.phase!=='open')return;
  if(sceneBusy()){retryIn(1600);return}
  if(Date.now()-lastAcceptedAt<16500){retryIn(16500-(Date.now()-lastAcceptedAt));return}
  // Do not suddenly narrate an outdated introduction in the middle of a game.
  // Likewise skip intermediate chapters if the finale is already underway.
  const candidates=game.phase==='final'||game.phase==='done'?['final']:
   stages.filter(stage=>stage!=='final'&&stageReady(stage,game));
  for(const stage of candidates){
   if(played.has(stage))continue;
   const part=root.DealModeratorStories.chapter(game.id,stage,game);
   if(!part)continue;
   const accepted=root.DealModeratorAudio.speakStory(part.text,{
    title:part.title,chapter:chapterNumbers[stage],gameId:game.id
   });
   if(accepted){
    played.add(stage);lastAcceptedAt=Date.now();persist();
    return;
   }
   // The current audio channel is busy; retry at the next idle notification.
   retryIn(1800);return;
  }
 }
 function onEnabled(){if(currentGame)observe(currentGame)}
 for(const name of ['deal-moderator-idle','deal-banker-reveal-finished','deal-finale-finished']){
  root.addEventListener?.(name,()=>{if(currentGame)observe(currentGame)});
 }
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)clearRetry();
  else if(currentGame)observe(currentGame);
 });
 root.DealModeratorStory=Object.freeze({observe,onEnabled,stageReady,chapterNumbers});
})(window);
