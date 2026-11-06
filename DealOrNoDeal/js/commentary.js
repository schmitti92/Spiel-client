'use strict';
/* Local, presentation-only character reactions. No hidden information or game writes. */
const studioCommentary={
 gameId:null,seen:new Set(),seenOffers:new Set(),lastLine:new Map(),queue:[],
 timer:null,active:false,lastShownAt:0,lastEvent:0,
 strombergMemory:null,story:{good:0,bad:0,lastAdvice:null,lastOutcome:null,rounds:0}
};
function studioCommentReset(game){
 clearTimeout(studioCommentary.timer);
 Object.assign(studioCommentary,{timer:null,queue:[],active:false,lastShownAt:0,lastEvent:0,
  gameId:game?String(game.id):null,strombergMemory:null,
  story:{good:0,bad:0,lastAdvice:null,lastOutcome:null,rounds:0}});
 studioCommentary.seen=new Set((game?.openedAmounts||[]).map(x=>x.case));
 studioCommentary.seenOffers=new Set((game?.history||[]).map(h=>String(h.round)+':'+String(h.offer)));
 studioCommentary.lastLine.clear();
 const el=document.getElementById('studio-commentary');if(el)el.hidden=true;
}
function studioCommentRender(){
 const el=document.getElementById('studio-commentary');if(!el)return;
 const entry=studioCommentary.queue.shift();
 if(!entry){studioCommentary.active=false;el.hidden=true;return}
 studioCommentary.active=true;
 studioCommentary.lastShownAt=Date.now();
 const portrait=document.getElementById('studio-commentary-portrait');
 const mood=entry.mood||'nachdenklich';
 if(entry.name==='Stromberg'){
  portrait.onerror=()=>{portrait.onerror=null;portrait.src='./assets/'+entry.image};
  portrait.src='./assets/stromberg-'+mood+'.webp';
 }else{portrait.onerror=null;portrait.src='./assets/'+entry.image}
 portrait.alt='';
 document.getElementById('studio-commentary-name').textContent=entry.name;
 document.getElementById('studio-commentary-line').textContent=entry.line;
 el.hidden=false;
 clearTimeout(studioCommentary.timer);
 studioCommentary.timer=setTimeout(studioCommentRender,5700);
}
function studioStrombergMood(category,line){
 if(/millionLost|huge/.test(category))return 'ueberrascht';
 if(/bankerBad|streakBad|lose/.test(category))return 'genervt';
 if(/bankerGood|streakGood|win|tiny|small/.test(category))return 'selbstzufrieden';
 if(/high/.test(category))return 'wuetend';
 if(/medium/.test(category))return 'nachdenklich';
 return /nicht meine|Ausführungsfehler|Zuständigkeiten/.test(line||'')?'scheinheilig':'nachdenklich';
}
function studioCommentQueue(entry,priority=1){
 if(!entry?.line)return;
 const state=studioCommentary;
 // One memorable remark is better than a backlog of stale commentary.
 if(state.active&&priority<3)return;
 if(state.queue.length){
  if(priority<=state.queue[0].priority)return;
  state.queue.length=0;
 }
 state.queue.push({...entry,mood:entry.name==='Stromberg'?(entry.mood||studioStrombergMood(entry.category,entry.line)):null,priority});
 if(!state.active)studioCommentRender();
}
function studioCommentPick(avatar,category,seed){
 const choices=avatar===1?strombergCatalogue[category]:studioCommentLines[avatar]?.[category];
 if(!Array.isArray(choices)||!choices.length)return null;
 const key=avatar+':'+category;
 const previous=studioCommentary.lastLine.get(key);
 let index=Math.abs(Number(seed)||0)%choices.length;
 if(choices[index]===previous)index=(index+1)%choices.length;
 const line=choices[index];studioCommentary.lastLine.set(key,line);
 return line;
}
function studioCommentObserve(game){
 if(!game){if(studioCommentary.gameId!==null)studioCommentReset(null);return}
 if(String(game.id)!==studioCommentary.gameId){studioCommentReset(game);return}
 const state=studioCommentary,story=state.story;
 const stromberg=game.players?.find(p=>Number(p.avatar)===1);
 const h=game.history?.at(-1);
 if(stromberg&&h&&game.phase==='decision'){
  const offerKey=String(h.round)+':'+String(h.offer);
  if(!state.seenOffers.has(offerKey)){
   state.seenOffers.add(offerKey);
   const offered=Number(h.offer);
   // Compare with the public amounts that remain on the money board.
   const revealed=new Set((game.openedAmounts||[]).map(x=>Number(x.amount)));
   const amounts=Array.isArray(game.values)?game.values:[];
   const remaining=amounts.filter(v=>!revealed.has(Number(v)));
   const average=remaining.length?remaining.reduce((a,b)=>a+Number(b),0)/remaining.length:offered;
   const category=offered>=average*.75?'bankerGood':'bankerBad';
   story.rounds++;story.lastAdvice=category;
   const line=story.rounds>1&&story.rounds%3===0
    ?(category==='bankerGood'?'Ich sag ja seit Runden: Man muss wissen, wann man die Hand aufhält.':'Wieder so ein Angebot. Da hat offenbar jemand den Etat falsch verstanden.')
    :studioCommentPick(1,category,h.round);
   studioCommentQueue({name:'Stromberg',image:'buero-portrait-01-avatar.webp',line,category},3);
  }
 }
 if(game.phase==='final')return;
 const opened=game.openedAmounts||[];
 const fresh=opened.filter(x=>!state.seen.has(x.case));
 opened.forEach(x=>state.seen.add(x.case));
 if(!fresh.length)return;
 const current=game.players?.find(p=>p.id===game.currentPlayerId)||game.players?.find(p=>p.id===game.turnPlayerId)||game.players?.[0];
 const avatar=Number(current?.avatar);
 const personality=studioCommentLines[avatar];
 if(!personality)return;
 for(const item of fresh.slice(-2)){
  const amount=Number(item.amount);
  const category=avatar===1?(amount<=100?'tiny':amount<=1000?'small':amount<=25000?'medium':amount<=200000?'high':amount<1000000?'huge':'millionLost'):(amount<=1000?'small':amount>=50000?'large':null);
  if(!category)continue;
  state.lastEvent++;
  let priority=1,line=null;
  if(avatar===1){
   const good=amount<=1000,bad=amount>=50000;
   if(good){story.good++;story.bad=0}else if(bad){story.bad++;story.good=0}else{story.good=0;story.bad=0}
   const previous=state.strombergMemory;
   if(story.good===3){priority=3;line='Drei gute Entscheidungen hintereinander. Das nenne ich Führung. Meine, wohlgemerkt.'}
   else if(story.bad===3){priority=3;line='Drei Fehlgriffe. Wir müssen dringend über Zuständigkeiten sprechen.'}
   else if(story.lastAdvice&&previous&&previous.good!==good&&(good||bad)){
    priority=3;line=good?'Hab ich doch gesagt. Genau so war meine Strategie.':'Das war ein Ausführungsfehler. Mit meinem Rat hat das nichts zu tun.';
    story.lastAdvice=null;
   }else if(previous&&previous.good!==good&&(good||bad)){
    priority=2;line=good?'Na also. Wenn man auf mich hört, läuft das.':'Das war nicht meine Entscheidung. Nur damit das klar ist.';
   }
   state.strombergMemory={case:item.case,good};
   if(!line)line=studioCommentPick(1,category,Number(item.case)+opened.length);
   // Ordinary openings get occasional commentary; dramatic losses and story beats take precedence.
   if(priority===1){
    if(amount>=1000000)priority=3;
    else if(amount>=200000)priority=2;
    else if(state.lastEvent%3!==0)continue;
   }
  }else{
   if(state.lastEvent%2!==0)continue;
   line=studioCommentPick(avatar,category,Number(item.case)+opened.length);
  }
  studioCommentQueue({name:personality.name,image:personality.image,line,category},priority);
 }
}
