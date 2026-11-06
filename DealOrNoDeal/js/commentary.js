'use strict';
/* Presentation-only commentary: no game-state writes, no network calls. */
const studioCommentary={gameId:null,seen:new Set(),lastLine:new Map(),queue:[],timer:null,active:false};
function studioCommentReset(game){
 clearTimeout(studioCommentary.timer);studioCommentary.timer=null;studioCommentary.queue=[];
 studioCommentary.gameId=game?String(game.id):null;
 studioCommentary.seen=new Set((game?.openedAmounts||[]).map(x=>x.case));
 studioCommentary.lastLine.clear();studioCommentary.active=false;
 const el=document.getElementById('studio-commentary');if(el)el.hidden=true;
}
function studioCommentRender(){
 const el=document.getElementById('studio-commentary');if(!el)return;
 const entry=studioCommentary.queue.shift();
 if(!entry){studioCommentary.active=false;el.hidden=true;return}
 studioCommentary.active=true;
 const portrait=document.getElementById('studio-commentary-portrait');
 portrait.src='./assets/'+entry.image;portrait.alt='';
 document.getElementById('studio-commentary-name').textContent=entry.name;
 document.getElementById('studio-commentary-line').textContent=entry.line;
 el.hidden=false;
 clearTimeout(studioCommentary.timer);
 studioCommentary.timer=setTimeout(studioCommentRender,5500);
}
function studioCommentObserve(game){
 if(!game){if(studioCommentary.gameId!==null)studioCommentReset(null);return}
 const id=String(game.id);
 if(id!==studioCommentary.gameId){studioCommentReset(game);return}
 if(game.phase==='final')return;
 const opened=game.openedAmounts||[];
 const fresh=opened.filter(x=>!studioCommentary.seen.has(x.case));
 opened.forEach(x=>studioCommentary.seen.add(x.case));
 if(!fresh.length)return;
 const current=game.players?.find(p=>p.id===game.currentPlayerId)||game.players?.find(p=>p.id===game.turnPlayerId)||game.players?.[0];
 const avatar=Number(current?.avatar);
 const personality=studioCommentLines[avatar];
 if(!personality)return; // Other characters will be replaced later.
 // Exact amount bands for Stromberg; other characters retain their existing two-band rules.
 for(const item of fresh.slice(-2)){
  const amount=Number(item.amount);
  const category=avatar===1?(amount<=100?'tiny':amount<=1000?'small':amount<=25000?'medium':amount<=200000?'high':amount<1000000?'huge':'millionLost'):(amount<=1000?'small':amount>=50000?'large':null);
  if(!category)continue;
  const choices=avatar===1?strombergCatalogue[category]:personality[category];
  if(!Array.isArray(choices)||!choices.length)continue;
  const key=avatar+':'+category;
  const previous=studioCommentary.lastLine.get(key);
  const index=(Math.abs(Number(item.case)||0)+opened.length)%choices.length;
  const line=choices[index]===previous?choices[(index+1)%choices.length]:choices[index];
  studioCommentary.lastLine.set(key,line);
  studioCommentary.queue.push({name:personality.name,image:personality.image,line});
 }
 if(studioCommentary.queue.length>3)studioCommentary.queue.splice(0,studioCommentary.queue.length-3);
 if(!studioCommentary.active&&studioCommentary.queue.length)studioCommentRender();
}
