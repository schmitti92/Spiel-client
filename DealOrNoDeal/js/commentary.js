'use strict';
/* Local, presentation-only character reactions. No hidden information or game writes. */
const studioCommentary={
 gameId:null,seen:new Set(),seenOffers:new Set(),lastLine:new Map(),queue:[],
 timer:null,active:false,current:null,lastShownAt:0,lastEvent:0,decisionKeys:new Set(),
 strombergMemory:null,replyCount:0,story:{good:0,bad:0,lastAdvice:null,lastOutcome:null,rounds:0}
};
function studioCommentReset(game){
 clearTimeout(studioCommentary.timer);
 Object.assign(studioCommentary,{timer:null,queue:[],active:false,current:null,lastShownAt:0,lastEvent:0,
  gameId:game?String(game.id):null,strombergMemory:null,replyCount:0,decisionKeys:new Set(),
  story:{good:0,bad:0,lastAdvice:null,lastOutcome:null,rounds:0}});
 studioCommentary.seen=new Set((game?.openedAmounts||[]).map(x=>x.case));
 studioCommentary.seenOffers=new Set((game?.history||[]).map(h=>String(h.round)+':'+String(h.offer)));
 studioCommentary.lastLine.clear();
 const el=document.getElementById('studio-commentary');if(el)el.hidden=true;
}
function studioCommentRender(){
 const el=document.getElementById('studio-commentary');if(!el)return;
 const entry=studioCommentary.queue.shift();
 if(!entry){studioCommentary.active=false;studioCommentary.current=null;el.hidden=true;return}
 studioCommentary.active=true;
 studioCommentary.current=entry;
 studioCommentary.lastShownAt=Date.now();
 const portrait=document.getElementById('studio-commentary-portrait');
 const mood=entry.mood||'nachdenklich';
 if(entry.name==='Stromberg'){
  portrait.onerror=()=>{portrait.onerror=null;portrait.src='./assets/'+entry.image};
  portrait.src='./assets/stromberg-'+mood+'.png';
 }else{portrait.onerror=null;portrait.src='./assets/'+entry.image}
 portrait.alt='';
 document.getElementById('studio-commentary-name').textContent=entry.name;
 document.getElementById('studio-commentary-line').textContent=entry.line;
 el.hidden=false;
 clearTimeout(studioCommentary.timer);
 studioCommentary.timer=setTimeout(studioCommentRender,5500);
}
function studioStrombergMood(category,line){
 if(/millionLost|huge|bigLossStreak/.test(category))return 'wuetend';
 if(/bankerBad|bankerVeryBad|streakBad|lose/.test(category))return 'genervt';
 if(/bankerGood|bankerVeryGood|streakGood|win|tiny|small|oneCent/.test(category))return 'selbstzufrieden';
 if(/high/.test(category))return 'genervt';
 if(/medium/.test(category))return 'nachdenklich';
 return /nicht meine|Ausführungsfehler|Zuständigkeiten/.test(line||'')?'scheinheilig':'nachdenklich';
}
function studioCommentExpression(category,priority){
 if(category==='bankerGood')return 'thinking';
 if(category==='bankerBad')return 'annoyed';
 if(category==='millionLost'||category==='huge')return 'angry';
 if(category==='high')return 'angry';
 if(category==='tiny'||category==='small')return 'proud';
 return priority>=3?'smug':'thinking';
}
function studioCommentQueue(entry,priority=1,immediate=false){
 if(!entry?.line)return;
 const state=studioCommentary;
 // Every opened case gets its own reaction, even when earlier reactions are playing.
 // Banker remarks may queue too, but must never displace case reactions.
 const item={...entry,mood:entry.name==='Stromberg'?(entry.mood||studioStrombergMood(entry.category,entry.line)):null,priority};
 if(immediate&&state.active){
  // Show the player's confirmed decision now, without discarding pending case remarks.
  clearTimeout(state.timer);
  state.active=false;
  if(state.current)state.queue.unshift(state.current);
  state.current=null;
  state.queue.unshift(item);
  studioCommentRender();
 }else{
  state.queue.push(item);
  if(!state.active)studioCommentRender();
 }
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

/* Short, context-grounded conversations; never infer unrevealed case contents. */
function studioReplyTopic(category,amount){
 if(category==='oneCent')return 'oneCent';
 if(category==='millionLost')return 'millionLost';
 if(category==='finalCases')return 'finalCases';
 if(category==='bankerGood'||category==='bankerVeryGood')return 'bankerGood';
 if(category==='bankerBad'||category==='bankerVeryBad')return 'bankerBad';
 return studioCaseReaction(amount)==='good'?'good':studioCaseReaction(amount)==='bad'?'bad':'neutral';
}
function studioCommentMaybeReply(speakerAvatar,category,amount){
 const state=studioCommentary;
 if(!Number.isFinite(amount)||state.lastEvent%6!==0)return;
 const ids=[1,2,3,4,5,7].filter(id=>id!==speakerAvatar);
 const responder=ids[state.replyCount%ids.length];
 const topic=studioReplyTopic(category,amount);
 const replies=typeof studioReplyLines==='object'?studioReplyLines[topic]?.[responder]:null;
 const persona=studioCommentLines[responder];
 if(!persona||!Array.isArray(replies)||!replies.length)return;
 const turn=state.replyCount++;
 // At most one exchange per 12 case openings; two additional speakers maximum.
 if(state.lastEvent%12===0&&typeof studioContextDisputes==='object'){
  const scene=studioContextDisputes[topic];
  if(scene?.objections?.length&&scene?.closers?.length){
   const opening={1:'Also bitte. ',2:'Moment. ',3:'Och, wartet mal! ',4:'Ei, moment emol! ',5:'Ich würde einwenden: ',7:'Nein, genauer betrachtet: '}[responder]||'';
   const objection=opening+scene.objections[turn%scene.objections.length];
   studioCommentQueue({name:persona.name,image:persona.image,line:objection,category:topic},0);
   const others=ids.filter(id=>id!==responder);
   const closerId=others[turn%others.length];
   const closer=studioCommentLines[closerId];
   const closing={1:'Na gut. ',2:'Einverstanden. ',3:'Hihi, okay! ',4:'Jo, gut. ',5:'Halten wir fest: ',7:'Fest steht: '}[closerId]||'';
   studioCommentQueue({name:closer.name,image:closer.image,
    line:closing+scene.closers[turn%scene.closers.length],category:topic},0);
   return;
  }
 }
 studioCommentQueue({name:persona.name,image:persona.image,
  line:replies[turn%replies.length],category:topic},0);
}

// Amounts are stored as euro cents. Exactly 100 € and 20,000 € are neutral.
function studioCaseReaction(amount){
 if(!Number.isFinite(amount))return 'neutral';
 if(amount<10000)return 'good';
 if(amount>2000000)return 'bad';
 return 'neutral';
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
   const ratio=average>0?offered/average:1;
   const category=ratio>=1.1?'bankerVeryGood':ratio<=.35?'bankerVeryBad':offered>=average*.75?'bankerGood':'bankerBad';
   story.rounds++;story.lastAdvice=category;
   const line=(category==='bankerGood'||category==='bankerBad')&&story.rounds>1&&story.rounds%3===0
    ?(category==='bankerGood'?'Ich sag ja seit Runden: Man muss wissen, wann man die Hand aufhält.':'Wieder so ein Angebot. Da hat offenbar jemand den Etat falsch verstanden.')
    :studioCommentPick(1,category,h.round);
   studioCommentQueue({name:'Stromberg',image:'buero-portrait-01-avatar.webp',line,category},3);
  }
 }
 const opened=game.openedAmounts||[];
 const fresh=opened.filter(x=>!state.seen.has(x.case));
 opened.forEach(x=>state.seen.add(x.case));
 if(!fresh.length)return;
 const current=game.players?.find(p=>p.id===game.currentPlayerId)||game.players?.find(p=>p.id===game.turnPlayerId)||game.players?.[0];
 const avatar=Number(current?.avatar);
 const personality=studioCommentLines[avatar]||studioCommentLines[1];
 const speakerAvatar=studioCommentLines[avatar]?avatar:1;
 for(const item of fresh){
  const amount=Number(item.amount);
  const reaction=studioCaseReaction(amount);
  const millionCase=amount>=100000000;
  const oneCentCase=amount===1;
  const category=oneCentCase?'oneCent':millionCase?'millionLost':speakerAvatar===1?(reaction==='good'?(amount<=100?'tiny':'small'):reaction==='neutral'?'medium':'high'):(reaction==='good'?'small':reaction==='bad'?'large':'neutral');
  if(!category)continue;
  state.lastEvent++;
  let priority=1,line=null;
  if(speakerAvatar===1){
   const good=reaction==='good',bad=reaction==='bad';
   if(good){story.good++;story.bad=0}else if(bad){story.bad++;story.good=0}else{story.good=0;story.bad=0}
   const previous=state.strombergMemory;
   const totalCases=Array.isArray(game.values)?game.values.length:0;
   const casesLeft=totalCases?totalCases-opened.length:Infinity;
   if(category==='oneCent'){priority=3;line=studioCommentPick(1,'oneCent',Number(item.case)+opened.length)}
   else if(category==='millionLost'){priority=3;line=studioCommentPick(1,'millionLost',Number(item.case)+opened.length)}
   else if(bad&&story.bad>=2){priority=2;line=studioCommentPick(1,'bigLossStreak',Number(item.case)+opened.length)}
   else if(casesLeft<=3&&casesLeft>=1){priority=2;line=studioCommentPick(1,'finalCases',Number(item.case)+opened.length)}
   else if(story.good===3){priority=3;line='Drei gute Entscheidungen hintereinander. Das nenne ich Führung. Meine, wohlgemerkt.'}
   else if(story.bad===3){priority=3;line='Drei Fehlgriffe. Wir müssen dringend über Zuständigkeiten sprechen.'}
   else if(story.lastAdvice&&previous&&previous.reaction!==reaction&&(good||bad)){
    priority=3;line=good?'Hab ich doch gesagt. Genau so war meine Strategie.':'Das war ein Ausführungsfehler. Mit meinem Rat hat das nichts zu tun.';
    story.lastAdvice=null;
   }else if(previous&&previous.reaction!==reaction&&(good||bad)){
    priority=2;line=good?'Na also. Wenn man auf mich hört, läuft das.':'Das war nicht meine Entscheidung. Nur damit das klar ist.';
   }
   state.strombergMemory={case:item.case,reaction};
   if(!line)line=studioCommentPick(1,category,Number(item.case)+opened.length);

  }else{
   line=studioCommentPick(speakerAvatar,category,Number(item.case)+opened.length);
  }
  if(oneCentCase){
   // The one-cent case always gets a celebratory one-cent line, never a generic streak remark.
   priority=3;
   line=studioCommentPick(speakerAvatar,'oneCent',Number(item.case)+opened.length)
    ||studioCommentPick(1,'oneCent',Number(item.case)+opened.length)
    ||'Nur ein Cent ist raus! Die großen Gewinne bleiben im Spiel.';
  }
  if(millionCase){
   // Million cases must NEVER fall through to generic streak, loss or neutral lines.
   priority=3;
   line=studioCommentPick(speakerAvatar,'millionLost',Number(item.case)+opened.length)
    ||studioCommentPick(1,'millionLost',Number(item.case)+opened.length)
    ||'Eine Million Euro ist aus dem Spiel. Das ist ein schwerer Verlust.';
  }
  if(!line)line='Koffer '+item.case+' ist geöffnet. '+(Number.isFinite(amount)?'Enthalten waren '+(amount/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'})+'.':'Die Spannung steigt.');
  studioCommentQueue({name:personality.name,image:personality.image,line,category},priority);
  studioCommentMaybeReply(speakerAvatar,category,amount);
 }
}

// Called after the server confirms the player's vote. Never reveals other players' votes.
function studioCommentDecision(deal,game){
 if(!game)return;
 if(String(game.id)!==studioCommentary.gameId)studioCommentReset(game);
 const decisionKey=String(game.id)+':'+String(game.history?.at(-1)?.round)+':'+String(game.history?.at(-1)?.offer)+':'+String(typeof myId==='function'?myId():'local');
 if(studioCommentary.decisionKeys.has(decisionKey))return;
 studioCommentary.decisionKeys.add(decisionKey);
 const category=deal?'deal':'noDeal';
 const round=Number(game.history?.at(-1)?.round)||0;
 const line=studioCommentPick(1,category,round+(deal?0:7))||
  (deal?'Da hat jemand wenigstens mal eine Entscheidung getroffen.':'Na gut, dann spielen wir eben weiter.');
 studioCommentQueue({name:'Stromberg',image:'buero-portrait-01-avatar.webp',line,category,
  mood:deal?'selbstzufrieden':'nachdenklich'},3,true);
}
