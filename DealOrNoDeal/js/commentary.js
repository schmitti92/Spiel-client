'use strict';
/* Presentation-only commentary: no game-state writes, no network calls. */
const studioCommentary={gameId:null,seen:new Set(),lastLine:new Map(),queue:[],timer:null,active:false,strombergMemory:null,seenOffers:new Set(),lastOffer:null};
function studioCommentReset(game){
 clearTimeout(studioCommentary.timer);studioCommentary.timer=null;studioCommentary.queue=[];
 studioCommentary.gameId=game?String(game.id):null;
 studioCommentary.seen=new Set((game?.openedAmounts||[]).map(x=>x.case));
 studioCommentary.lastLine.clear();studioCommentary.active=false;studioCommentary.strombergMemory=null;studioCommentary.seenOffers=new Set((game?.history||[]).map(h=>String(h.round)+':'+String(h.offer)));studioCommentary.lastOffer=null;
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
 // Banker comments use only public offer data, never private votes or hidden case values.
 const h=game.history?.at(-1);
 if(h&&game.phase==='decision'){
  const offerKey=String(h.round)+':'+String(h.offer);
  if(!studioCommentary.seenOffers.has(offerKey)){
   studioCommentary.seenOffers.add(offerKey);
   const stromberg=game.players?.find(p=>Number(p.avatar)===1);
   if(stromberg){
    const offered=Number(h.offer);
    const remaining=(Array.isArray(game.values)?game.values:[]).filter(v=>!(game.openedAmounts||[]).some(x=>Number(x.amount)===Number(v)));
    const average=remaining.length?remaining.reduce((a,b)=>a+Number(b),0)/remaining.length:offered;
    const category=offered>=average*.75?'bankerGood':'bankerBad';
    const lines=strombergCatalogue[category];
    const index=Math.abs(Number(h.round)||0)%lines.length;
    studioCommentary.queue.push({name:'Stromberg',image:'buero-portrait-01-avatar.webp',line:lines[index]});
    studioCommentary.lastOffer={key:offerKey,category};
    if(!studioCommentary.active)studioCommentRender();
   }
  }
 }
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
  // A short-lived memory gives Stromberg his characteristic self-serving reversals.
  // Never persist commentary into game state; it remains a local presentation feature.
  if(avatar===1){
   const good=amount<=1000;
   const bad=amount>=50000;
   const memory=studioCommentary.strombergMemory;
   if(memory&&memory.case!==item.case&&memory.good!==good&&(good||bad)){
    const reversal=good
     ?'Hab ich doch gesagt: Genau so muss man das machen. Meine Linie.'
     :'Also, das war jetzt nicht meine Entscheidung. Ich hab nur zugesehen.';
    studioCommentary.queue.push({name:personality.name,image:personality.image,line:reversal});
   }
   studioCommentary.strombergMemory={case:item.case,good};
  }
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
