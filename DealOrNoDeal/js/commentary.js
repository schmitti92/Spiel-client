'use strict';
/* Local, presentation-only character reactions. No hidden information or game writes. */
const studioCommentary={
 gameId:null,seen:new Set(),seenOffers:new Set(),lastLine:new Map(),queue:[],
 timer:null,active:false,current:null,lastShownAt:0,lastEvent:0,decisionKeys:new Set(),caseTimers:[],
 strombergMemory:null,replyCount:0,story:{good:0,bad:0,lastAdvice:null,lastOutcome:null,rounds:0}
};
function studioCommentReset(game){
 clearTimeout(studioCommentary.timer);
 for(const timer of studioCommentary.caseTimers)clearTimeout(timer);
 studioCommentary.caseTimers=[];
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
 studioCommentary.timer=setTimeout(studioCommentRender,entry.dialogue?3300:4400);
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
  // Preserve case reactions; drop stale optional conversations if the player acts quickly.
  if(!item.dialogue){
   state.queue=state.queue.filter(queued=>!queued.dialogue);
  }else if(state.queue.length>=3){
   return;
  }
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


// Only real participants may speak. Never substitute an absent studio character.
function studioParticipant(game,id){
 const players=Array.isArray(game?.players)?game.players:[];
 return players.find(p=>String(p.id)===String(id))||null;
}
function studioActor(game,event){
 const ids=[event?.playerId,event?.openedBy,event?.userId,event?.actorId,event?.by];
 // Event attribution must not silently fall back to the next player's turn.
 if(!ids.some(id=>id!==undefined&&id!==null))return null;
 for(const id of ids){if(id!==undefined&&id!==null){const p=studioParticipant(game,id);if(p)return p;}}
 return null;
}
function studioPersona(player){
 const avatar=Number(player?.avatar);
 return Number.isFinite(avatar)&&studioCommentLines[avatar]?{avatar,...studioCommentLines[avatar]}:null;
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
function studioCommentTone(line){
 const value=String(line||'').toLowerCase();
 if(/juhu|hurra|perfekt|hervorragend|optimal|wunderbar|fantastisch|feiern|gewonnen|sieg|glückstreffer|besser geht/.test(value))return 'celebration';
 if(/schuld|fehler|versagt|verantwort|falsch|katastroph|unfähig|ausführungsfehler/.test(value))return 'blame';
 if(/panik|furchtbar|schlimm|schrecklich|oh nein|auweia|bitter|schwerer verlust|weg!/.test(value))return 'alarm';
 if(/sicher|unbedingt|muss man|auf jeden fall|sofort|keine frage/.test(value))return 'certainty';
 return 'measured';
}

// Dialogue follows the actual previous remark, not merely the amount category.
function studioHolidayContextReply(responder,sourceLine,topic,turn){
 if(responder!==11&&responder!==12&&responder!==13)return null;
 const said=String(sourceLine||'').toLowerCase();
 const snow=responder===13;
 const rudolf=responder===11;
 const options=[];
 if(rudolf){
  if(/rudolf|rentier|schlitten|huf|geweih/.test(said))return 'Meine Hufe sind bereit. Aber die Kofferwahl müsst ihr selbst treffen!';
  if(/million/.test(said))return 'Bei einer Million blinkt meine Nase Alarm. Das war wirklich bitter!';
  if(/cent/.test(said))return 'Ein Cent weniger – meine Nase leuchtet vor Freude!';
  if(/banker|angebot/.test(said))return 'Der Banker soll ein vernünftiges Angebot machen, sonst fliege ich weiter!';
  if(/schmelz|schneemann|karottennase/.test(said))return 'Schneemann, bleib cool! Ich bringe dich notfalls zum Nordpol zurück!';
  return null;
 }
 if(/rudolf|rentier|schlitten/.test(said))options.push(snow?'Lasst Rudolf da raus. Der kann schließlich nichts für diesen Koffer!':'Rudolf hat genug zu tun. Die Kofferwahl müssen wir selbst verantworten!');
 if(/wichtel|geschenk|bescherung|weihnacht/.test(said))options.push(snow?'Bei so vielen Geschenken hoffe ich nur auf einen Kühlschrank für mich.':'Ein Geschenk ist erst dann gut, wenn wir wissen, was wirklich drinsteckt!');
 if(/karottennase|schal|schneebauch|schmelz|schneemann/.test(said))options.push(snow?'Meine Karottennase ist in Ordnung. Um die Gewinnchancen mache ich mir mehr Sorgen!':'Mein lieber Schneemann, bitte nicht schmelzen. Wir brauchen dich noch fürs Finale!');
 if(/banker|angebot|offerte/.test(said))options.push(snow?'Bevor ich auftaue, sollte der Banker erst einmal ein besseres Angebot machen.':'Ho ho, der Banker sollte wissen: Wir verschenken unsere Chancen nicht!');
 if(/million/.test(said))options.push(snow?'Eine Million lässt sich leider nicht wieder zusammenrollen wie ein Schneeball.':'Eine Million ist kein kleines Päckchen. Das tut uns allen weh.');
 if(/cent|kleinste betrag/.test(said))options.push(snow?'Genau! Der Cent ist weg, und die wertvollen Koffer bleiben schön auf Eis.':'Ho ho, da sind wir uns einig: Den kleinsten Betrag wollten wir loswerden!');
 if(/schuld|fehler|versagt|falsch/.test(said))options.push(snow?'Schuldzuweisungen machen die Tafel nicht besser. Bleiben wir cool.':'Wir brauchen jetzt einen klaren Kopf statt einer Liste mit Schuldigen.');
 if(/panik|schreck|katastroph|furchtbar/.test(said))options.push(snow?'Panik bringt selbst meinen Schneebauch ins Rutschen. Ruhig bleiben!':'Ho ho, noch ist die Partie nicht vorbei. Keine voreilige Bescherung!');
 if(!options.length)return null;
 return options[turn%options.length];
}
// Dialogue between players is intentionally disabled: only the acting player's character speaks.
function studioCommentMaybeReply(){return;}

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
 const h=game.history?.at(-1);
 const offerActor=h?studioActor(game,h):null;
 if(h&&game.phase==='decision'){
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
   const offerPersona=studioPersona(offerActor);
   if(offerPersona){
    const line=studioCommentPick(offerPersona.avatar,category,h.round);
    if(line)studioCommentQueue({name:offerPersona.name,image:offerPersona.image,line,category},3);
   }
  }
 }
 const opened=game.openedAmounts||[];
 const fresh=opened.filter(x=>!state.seen.has(x.case));
 opened.forEach(x=>state.seen.add(x.case));
 if(!fresh.length)return;
 for(const item of fresh){
  const itemPersona=studioPersona(studioActor(game,item));
  if(!itemPersona)continue;
  const speakerAvatar=itemPersona.avatar;
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
    ||null;
  }
  if(millionCase){
   // Million cases must NEVER fall through to generic streak, loss or neutral lines.
   priority=3;
   line=studioCommentPick(speakerAvatar,'millionLost',Number(item.case)+opened.length)
    ||null;
  }
  if(!line)continue; // Never attribute generic or another character's words to this player.
  // Show the number first. Character reactions start one second after the
  // confirmed case amount becomes visible, not during the lid animation.
  const observedGame=state.gameId;
  const timer=setTimeout(()=>{
   state.caseTimers=state.caseTimers.filter(t=>t!==timer);
   if(state.gameId!==observedGame)return;
   studioCommentQueue({name:itemPersona.name,image:itemPersona.image,line,category},priority);
  },1000);
  state.caseTimers.push(timer);
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
 const decisionActor=studioParticipant(game,typeof myId==='function'?myId():null);
 const decisionPersona=studioPersona(decisionActor);
 if(!decisionPersona)return;
 const line=studioCommentPick(decisionPersona.avatar,category,round+(deal?0:7));
 if(line)studioCommentQueue({name:decisionPersona.name,image:decisionPersona.image,line,category},3,true);
}
