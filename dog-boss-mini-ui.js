/* 100 TORE • Server-verified tactical minigames.
 * v2: eight rapid math tasks, three visual dodges, continuously accelerating
 * reaction meter, and three moving targets. All action timings and solutions
 * are checked by the server. v1 in-progress battles remain supported.
 */
(()=>{
 'use strict';
 const labels={dodge:'🛡️ Ausweichen',reaction:'⚡ Konter-Reaktion',
  math:'🧮 Blitz-Mathe',target:'🎯 Zieltreffer'};
 const createElement=(tag,cls,txt)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=txt;
  return el;
 };
 const pos=(round,elapsed)=>{
  const t=Math.max(0,Math.min(8,(elapsed-round.startMs)/1000));
  const cycles=.68*t+(.075+.004*(round.difficulty||1))*t*t;
  return 1-Math.abs(1-(cycles%2));
 };
 const targetColors={red:'Rot',blue:'Blau',green:'Grün',yellow:'Gelb',
  purple:'Lila',orange:'Orange',cyan:'Türkis',pink:'Pink'};
 const targetSymbols={star:'⭐',shield:'🛡️',flame:'🔥',diamond:'💎',
  snowflake:'❄️',moon:'🌙',crown:'👑',bolt:'⚡'};
 const targetNames={star:'Stern',shield:'Schild',flame:'Flamme',
  diamond:'Diamant',snowflake:'Schneeflocke',moon:'Mond',crown:'Krone',bolt:'Blitz'};
 const targetIndex=(round,elapsed)=>
  (round.initialIndex+Math.max(0,Math.floor((elapsed-round.startMs)/round.stepMs)))%round.lanes;
 function create(root,onSubmit,onDodgeChoice=null,clockNow=null){
  let roundKey='',roundView=null,buttons=[],progress=null,status=null;
  let question=null,counter=null,attackStatus=null,localSubmitting=false,stepCurrent=0;
  let dodgeMarks=[],dodgeTimeFill=null,dodgeImpact=null;
  let mathMarks=[],mathRank=null,mathClock=null,mathTimeFill=null;
  const mathLevels=['LEICHT','AUFWÄRMEN','GENAUIGKEIT','MALNEHMEN',
   'TEILEN','KOMBINATION','KLAMMERN','FINALE'];
  const paintMathStage=step=>{
   if(activeVersion<5||!mathRank)return;
   const i=Math.min(7,Math.max(0,step));
   mathRank.textContent=step>=8?'8 / 8 · SERVER PRÜFT':
    'STUFE '+(i+1)+' / 8 · '+mathLevels[i];
   mathMarks.forEach((mark,index)=>{
    mark.classList.toggle('is-complete',index<step);
    mark.classList.toggle('is-current',index===step&&step<8);
   });
   root.style?.setProperty?.('--math-intensity',String(i+1));
  };
  let lastChoice=null,anchor=null,raf=0,activeVersion=1,allowed=false;
  let mathChoices=[],mathSent=false,mathQueue=null,mathSending=false,fightStart=0;
  let targetChoices=[],targetSent=false,targetLocalCorrect=0,targetLastHit=null;
  let targetHits=[],targetServerLocked=false,targetLevel=null,targetRule=null;
  let targetGuide=null,targetFeedback=null,targetMarks=[];
  let chainMarks=[],chainHits=[],chainVerdict=null,chainFxHost=null,chainFx=[];
  let targetClock=null,targetClockFill=null;
  let reactionPreview=null,reactionTaps=[],reactionHits=[],reactionSent=false;
  let reactionMarks=[],reactionHint=null;
  const clockStamp=()=>typeof clockNow==='function'?Math.round(clockNow()):
   (anchor?Math.round(fightStart+anchor.elapsed+
    (typeof performance!=='undefined'?performance.now():Date.now())-anchor.stamp):Date.now());
  const lead=createElement('div','mini-lead');
  const title=createElement('strong','mini-title');
  const hint=createElement('small','mini-hint');
  const body=createElement('div','mini-choices');
  status=createElement('div','mini-feedback','');
  lead.append(title,hint);
  root.replaceChildren(lead,body,status);
  const pumpMath=()=>{
   if(!mathQueue||mathSending)return;
   // Avoid repeated submissions after the server's +2000ms transit grace.
   // The controller retains the original requestId for uncertain POSTs.
   if(typeof clockNow==='function'&&clockStamp()>=mathQueue.deadline){
    mathQueue=null;return;
   }
   const batch=mathQueue;
   mathSending=true;
   Promise.resolve().then(()=>onSubmit(batch.round,batch.answers,0,
    batch.kind==='reaction'?batch.tapTimes:null))
    .then(accepted=>{
     // A controller returns false when an earlier request is still pending.
     // Keep this math batch intact and retry on a later rendering tick.
     if(accepted!==false&&mathQueue===batch)mathQueue=null;
    }).catch(()=>{
     // Keep unsent batch for the next tick. The controller's receipt handles
     // ambiguous network failures without double-scoring.
    }).finally(()=>{mathSending=false;});
  };
  const flushMath=()=>{
   if(!roundView||roundView.kind!=='math'||activeVersion<2||
      mathSent||!mathChoices.length)return;
   mathSent=true;
   mathQueue={kind:'math',round:roundView.round,
    answers:[...mathChoices],fightStart,
    deadline:fightStart+roundView.endMs+1900};
   // One server transaction for the entire sprint; no delay between taps.
   pumpMath();
  };
  const flushTarget=()=>{
   if(!roundView||!['target','chain'].includes(roundView.kind)||activeVersion<10||
      targetSent||!targetChoices.length)return;
   targetSent=true;
   mathQueue={round:roundView.round,answers:[...targetChoices],fightStart,
    kind:roundView.kind,deadline:fightStart+roundView.endMs+1900};
   if(roundView.kind==='target'&&targetFeedback){
    // After the final local tap immediately show the pending batch state.
    targetFeedback.textContent='⏳ '+targetChoices.length+
     ' ANTWORTEN ERFASST · WARTE AUF SERVER';
    targetFeedback.dataset.state='pending';
   }
   if(roundView.kind==='chain'&&chainVerdict){
    chainVerdict.textContent='⏳ '+targetChoices.length+
     ' KETTENSCHNITTE · SERVER PRÜFT';
    chainVerdict.dataset.state='pending';
   }
   pumpMath();
  };
  const paintReactionMarks=(official=[])=>{
   reactionMarks.forEach((mark,i)=>{
    const record=official[i],verified=typeof record?.correct==='boolean';
    const local=i<reactionTaps.length;
    mark.textContent=verified?(record.correct?'✓':'✕'):local?'●':String(i+1);
    mark.classList.toggle('is-confirmed',verified);
    mark.classList.toggle('is-safe',verified&&record.correct===true);
    mark.classList.toggle('is-miss',verified&&record.correct===false);
    mark.classList.toggle('is-local',!verified&&local);
    mark.classList.toggle('is-next',!verified&&!local&&i===reactionTaps.length);
    mark.setAttribute?.('aria-label','Konter '+(i+1)+': '+
     (verified?(record.correct?'Treffer bestätigt':'Fehlschlag bestätigt'):
      local?'erfasst, noch nicht bestätigt':'noch offen'));
   });
  };
  const flushReaction=()=>{
   if(roundView?.kind!=='reaction'||activeVersion<14||
      reactionSent||!reactionTaps.length)return;
   reactionSent=true;
   mathQueue={kind:'reaction',round:roundView.round,
    answers:reactionTaps.map(()=>1),tapTimes:[...reactionTaps],
    fightStart,deadline:fightStart+roundView.endMs+1900};
   if(reactionHint)reactionHint.textContent='⏳ '+
    reactionTaps.length+' KONTER · SERVER PRÜFT';
   pumpMath();
  };
  const paintTargetMarks=(confirmed=[])=>{
   targetMarks.forEach((mark,i)=>{
    const official=confirmed[i];
    const local=i<targetHits.length?targetHits[i]:null;
    const recorded=official?.correct===true||official?.correct===false;
    mark.textContent=recorded?(official.correct?'✓':'✕'):
     local===null?String(i+1):local?'✓':'✕';
    mark.classList.toggle('is-confirmed',recorded);
    mark.classList.toggle('is-correct',recorded&&official.correct===true);
    mark.classList.toggle('is-wrong',recorded&&official.correct===false);
    mark.classList.toggle('is-provisional',!recorded&&local!==null);
    mark.classList.toggle('is-current',i===targetChoices.length&&i<10&&!recorded);
    mark.setAttribute?.('aria-label','Aufgabe '+(i+1)+': '+
     (recorded?(official.correct?'richtig, serverbestätigt':'falsch, serverbestätigt'):
      local===null?'noch offen':(local?'richtig':'falsch')+', vorläufig'));
   });
  };
  const paintTargetStep=()=>{
   if(!roundView||roundView.kind!=='target'||activeVersion<10)return;
   const step=targetChoices.length,puzzle=roundView.puzzles?.[step];
   const color=puzzle?targetColors[puzzle.targetColor]||puzzle.targetColor:'';
   const symbol=puzzle?targetNames[puzzle.targetSymbol]||puzzle.targetSymbol:'';
   const icon=puzzle?targetSymbols[puzzle.targetSymbol]||'◆':'';
   if(targetLevel)targetLevel.textContent=puzzle?
    'AUFGABE '+(step+1)+'/10 · '+puzzle.options.length+' FELDER':
    '10/10 BEANTWORTET';
   if(targetRule){
    targetRule.dataset.mode=puzzle?.mode||'done';
    targetRule.textContent=!puzzle?'⏳ SERVER PRÜFT':
     puzzle.mode==='color'?'🎨 NUR FARBE':
     puzzle.mode==='symbol'?'✦ NUR SYMBOL':'🎨 + ✦ FARBE UND SYMBOL';
   }
   if(question){
    question.dataset.mode=puzzle?.mode||'done';
    question.textContent=puzzle?.prompt||'🏆 ALLE 10 AUFGABEN BEANTWORTET!';
   }
   if(targetGuide)targetGuide.textContent=!puzzle?
    'Alle Eingaben erfasst. Die offizielle Trefferzahl kommt vom Server.':
    puzzle.mode==='color'?'Gesucht: '+color.toUpperCase()+' · das Symbol ist egal.':
    puzzle.mode==='symbol'?'Gesucht: '+icon+' '+symbol.toUpperCase()+
     ' · die Farbe ist egal.':
     'Gesucht: '+color.toUpperCase()+' UND '+icon+' '+symbol.toUpperCase()+
     ' · beide Merkmale müssen stimmen.';
   buttons.forEach((button,i)=>{
    const option=puzzle?.options?.[i];
    button.className='mini-choice mini-color-target'+(option?' mini-color-'+option.color:'');
    button.textContent=option?(targetSymbols[option.symbol]||'◆')+' '+
     (targetColors[option.color]||option.color):'✓';
    button.disabled=!option||targetServerLocked;
    if(option)button.setAttribute?.('aria-label',
     (targetColors[option.color]||option.color)+' · '+
     (targetNames[option.symbol]||option.symbol));
   });
   if(counter)counter.textContent=step+' / 10 beantwortet · '+
    targetLocalCorrect+' Treffer (vorläufig)';
   paintTargetMarks();
  };
  const paintChainStep=(confirmed=[])=>{
   if(roundView?.kind!=='chain'||activeVersion<13)return;
   const official=confirmed.length>0;
   const step=Math.max(targetChoices.length,confirmed.length);
   const puzzle=!targetSent&&!official?roundView.puzzles?.[step]:null;
   if(question)question.textContent=official?
    '✅ SERVER BESTÄTIGT · '+confirmed.filter(x=>x.correct).length+
     ' / '+confirmed.length+' KETTEN GEBROCHEN':
    targetSent?'⏳ SERVER PRÜFT DEINE KETTENSCHNITTE':
    puzzle?'✨ TIPPE DIE GOLDENE KETTE AN – ODER WISCHE DARÜBER!':
     '⏳ ZEHN VERSUCHE ERFASST · SERVER PRÜFT';
   buttons.forEach((button,i)=>{
    button.classList?.remove('is-severed','is-missed');
    button.classList?.toggle('is-glowing',!!puzzle&&i===puzzle.target);
    button.disabled=!puzzle||targetServerLocked||!allowed;
    button.textContent=(puzzle&&i===puzzle.target?
     '✨ GOLDENE KETTE ':'⛓️ KETTE ')+(i+1);
    button.setAttribute?.('aria-label',(puzzle&&i===puzzle.target?
     'RICHTIGE GOLDENE KETTE. ':'')+'Kette '+(i+1)+
     '. Tippen, klicken oder darüberwischen.');
   });
   chainMarks.forEach((mark,i)=>{
    const result=confirmed[i],verified=typeof result?.correct==='boolean';
    const local=i<chainHits.length,hit=verified?result.correct:
     local?chainHits[i]:null;
    mark.classList?.toggle('is-correct',verified&&hit===true);
    mark.classList?.toggle('is-wrong',verified&&hit===false);
    mark.classList?.toggle('is-provisional',!verified&&local);
    mark.classList?.toggle('is-local-hit',!verified&&hit===true);
    mark.classList?.toggle('is-current',!verified&&!local&&i===step&&!targetSent);
    mark.textContent=hit===null?String(i+1):hit?'✓':'✕';
    mark.setAttribute?.('aria-label','Versuch '+(i+1)+': '+
     (verified?(hit?'Treffer bestätigt':'Fehlschlag bestätigt'):
      local?(hit?'Treffer vorläufig':'Fehlschlag vorläufig'):'noch offen'));
   });
   const correct=confirmed.filter(x=>x.correct).length;
   if(counter)counter.textContent=official?
    '⛓️ '+confirmed.length+' / 10 bestätigt · '+correct+' gebrochen':
    '⛓️ '+targetChoices.length+' / 10 Versuche · '+
     targetLocalCorrect+' gebrochen (vorläufig)';
   if(chainVerdict){
    chainVerdict.textContent=official?
     '✅ SERVER BESTÄTIGT · '+correct+' / '+confirmed.length+' KETTEN':
     targetSent?'⏳ '+targetChoices.length+' VERSUCHE · SERVER PRÜFT':
     targetLastHit===null?'⚔️ TIPPE ODER WISCHE DIE GOLDENE KETTE':
     (targetLastHit?'💥 KETTE GEBROCHEN':'❌ DANEBEN')+
      ' · '+targetLocalCorrect+' / '+targetChoices.length+' VORLÄUFIG';
    chainVerdict.dataset.state=official?'confirmed':targetSent?'pending':
     targetLastHit===null?'ready':targetLastHit?'hit':'miss';
   }
  };
  const paintChainEffect=(lane,hit)=>{
   if(!chainFxHost)return;
   // Persist the break FX separately from puzzle buttons. Repainting the
   // next challenge no longer cuts off the two flying chain halves.
   const effect=createElement('span','mini-chain-fx '+(hit?'is-hit':'is-miss'));
   effect.style?.setProperty?.('--chain-row',String(lane+1));
   effect.setAttribute?.('aria-hidden','true');
   if(hit)effect.append(
    createElement('span','mini-chain-fragment is-left'),
    createElement('span','mini-chain-fragment is-right'),
    createElement('span','mini-chain-sparks','✦'));
   else effect.append(createElement('span','mini-chain-failed','✕'));
   chainFx.push(effect);
   if(chainFx.length>3)chainFx.shift();
   chainFxHost.replaceChildren(...chainFx);
  };
  const choose=(value)=>{
   if(!roundView||localSubmitting||!allowed)return;
   if(activeVersion>=14&&roundView.kind==='reaction'){
    // One local press per actual pointer contact, no network wait.
    const stamp=clockStamp();
    if(stamp<fightStart+roundView.startMs||
       stamp>=fightStart+roundView.endMs||reactionSent||
       reactionTaps.length>=3||
       (reactionTaps.length&&stamp-reactionTaps.at(-1)<420))return;
    const at=pos(roundView,stamp-fightStart);
    const provisional=Math.abs(at-.5)<=roundView.zoneRadius+.004;
    reactionTaps.push(stamp);reactionHits.push(provisional);
    reactionPreview={round:roundView.round,step:reactionTaps.length-1,
     at:stamp,visualHit:provisional};
    if(progress){
     progress.classList?.remove('is-tap');
     void progress.offsetWidth;
     progress.classList?.add('is-tap');
     const cursor=progress.firstElementChild;
     if(cursor)cursor.style.left=(at*100).toFixed(2)+'%';
    }
    paintReactionMarks();
    if(reactionHint)reactionHint.textContent=(provisional?
     '⚡ GRÜNE ZONE':'⚡ KONTER ERFASST')+' · '+reactionTaps.length+
     '/3 · VORLÄUFIG';
    if(counter)counter.textContent=reactionTaps.length+
     '/3 erfasst · '+reactionHits.filter(Boolean).length+
     ' im Zielbereich (vorläufig)';
    status.textContent='⚡ '+reactionTaps.length+
     '/3 KONTER ERFASST · SERVERBESTÄTIGUNG OFFEN';
    if(reactionTaps.length===3){
     buttons.forEach(b=>{b.disabled=true});
     flushReaction();
    }
    return;
   }
   if(activeVersion>=2&&roundView.kind==='math'){
    // A tap after the deadline cannot alter an unpainted old question.
    if(typeof clockNow==='function'){
     const stamp=clockStamp();
     if(stamp<fightStart+roundView.startMs||
        stamp>=fightStart+roundView.endMs)return;
    }
    // Immediate local advancement prevents network lag between questions.
    if(mathSent||mathChoices.length>=8)return;
    mathChoices.push(value);
    const step=mathChoices.length;
    if(activeVersion>=5){
     paintMathStage(step);
     question?.classList?.remove('mini-math-advance');
     void question?.offsetWidth;
     question?.classList?.add('mini-math-advance');
    }
    const next=roundView.puzzles?.[step];
    if(question)question.textContent=next?.question||'✅ Acht Aufgaben beantwortet!';
    buttons.forEach((button,i)=>{
     button.textContent=next?String(next.options[i]):'✓';
     button.disabled=!next;
    });
    if(counter)counter.textContent=step+' / 8 beantwortet';
    if(status)status.textContent=activeVersion>=5?
     (step>=8?'⏳ SERVER PRÜFT 8 ANTWORTEN':'⚡ '+step+' / 8 EINGEGEBEN'):
     '⚡ '+step+' von 8 – deine Antworten werden gesammelt geprüft';
    if(step>=8)flushMath();
    return;
   }
   if(activeVersion>=13&&roundView.kind==='chain'){
    if(targetSent||targetChoices.length>=10)return;
    const stamp=clockStamp()-fightStart;
    if(stamp<roundView.startMs||stamp>=roundView.endMs)return;
    const puzzle=roundView.puzzles?.[targetChoices.length];
    if(!puzzle||!Number.isSafeInteger(value)||value<0||value>=roundView.lanes)return;
    const hit=value===puzzle.target;
    targetChoices.push(value);
    chainHits.push(hit);
    targetLocalCorrect+=Number(hit);
    targetLastHit=hit;
    paintChainStep();
    paintChainEffect(value,hit);
    status.textContent=(hit?'💥 KETTE GEBROCHEN!':'❌ NICHT DIE GOLDENE KETTE!')+
     ' · '+targetLocalCorrect+' / '+targetChoices.length+' (VORLÄUFIG)';
    if(targetChoices.length>=10){flushTarget();paintChainStep();}
    return;
   }
   if(activeVersion>=10&&roundView.kind==='target'){
    if(targetSent||targetServerLocked||targetChoices.length>=10)return;
    const stamp=clockStamp()-fightStart;
    if(stamp<roundView.startMs||stamp>=roundView.endMs)return;
    const puzzle=roundView.puzzles?.[targetChoices.length];
    if(!puzzle||!puzzle.options?.[value])return;
    const answer=puzzle.options[value];
    const hit=puzzle.mode==='color'?answer.color===puzzle.targetColor:
     puzzle.mode==='symbol'?answer.symbol===puzzle.targetSymbol:
      answer.color===puzzle.targetColor&&answer.symbol===puzzle.targetSymbol;
    targetChoices.push(value);
    targetHits.push(hit);
    targetLocalCorrect+=Number(hit);
    targetLastHit=hit;
    paintTargetStep();
    if(targetFeedback){
     targetFeedback.textContent=(hit?'✅ RICHTIG':'❌ DANEBEN')+
      ' · '+targetLocalCorrect+' / '+targetChoices.length+
      ' getroffen · VORLÄUFIG';
     targetFeedback.dataset.state=hit?'correct':'wrong';
    }
    status.textContent=(hit?'✅ Treffer!':'❌ Daneben!')+
     ' · '+targetChoices.length+' / 10 · '+targetLocalCorrect+' richtig (vorläufig)';
    if(targetChoices.length>=10)flushTarget();
    return;
   }
   const step=activeVersion>=2?stepCurrent:0;
   if(activeVersion>=8&&roundView.kind==='dodge'){
    // The next visual frame may be late after a CPU pause. Never submit
    // a previous strike after the server-owned impact timestamp.
    if(typeof clockNow==='function'){
     const attack=roundView.attacks?.[step];
     const at=clockStamp()-fightStart;
     if(!attack||at<attack.startMs||at>=attack.impactMs)return;
    }
    // One captured choice per strike. A pending POST cannot turn a
    // repeated tap into another local movement or another API request.
    if(lastChoice?.round===roundView.round&&lastChoice.step===step)return;
   }
   const precise=activeVersion>=9&&roundView.kind==='reaction';
   const tappedAt=precise?clockStamp():null;
   if(precise){
    const actualPos=pos(roundView,tappedAt-fightStart);
    const visualHit=Math.abs(actualPos-.5)<=roundView.zoneRadius;
    reactionPreview={round:roundView.round,step,at:tappedAt,visualHit};
    if(progress){
     progress.classList?.remove('is-tap');
     void progress.offsetWidth;
     progress.classList?.add('is-tap');
     const cursor=progress.firstElementChild;
     if(cursor)cursor.style.left=(100*actualPos).toFixed(2)+'%';
    }
    status.textContent=visualHit?
     '⚡ GRÜNE ZONE! Treffer wird überprüft …':
     '⚡ KONTER AUSGELÖST · Server prüft den Zeitpunkt …';
   }
   localSubmitting=true;lastChoice={round:roundView.round,step,value};
   if(activeVersion>=8&&roundView.kind==='dodge'&&dodgeImpact){
    // A selected direction is acknowledged on the very same tap, without
    // waiting for the next animation frame or claiming a successful dodge.
    dodgeImpact.textContent='↔️ RICHTUNG ERFASST · EINSCHLAG ABWARTEN';
    dodgeImpact.classList.toggle('is-pending',false);
    dodgeImpact.classList.toggle('is-success',false);
    dodgeImpact.classList.toggle('is-hit',false);
   }
   if(roundView.kind==='dodge'&&typeof onDodgeChoice==='function')
    onDodgeChoice(roundView.round,step,value);
   buttons.forEach(button=>button.disabled=true);
   Promise.resolve().then(()=>onSubmit(roundView.round,value,step,tappedAt))
    .catch(()=>{}).finally(()=>{localSubmitting=false;});
  };
  function makeButton(value,label,css){
   const button=createElement('button','mini-choice '+(css||''),label);
   button.type='button';
   let pointerAt=0;
   if(css==='mini-reaction')button.addEventListener('pointerdown',event=>{
    if(activeVersion>=9&&roundView?.kind==='reaction'&&event?.isPrimary!==false){
     pointerAt=Date.now();
     choose(value);
    }
   });
   button.addEventListener('click',()=>{
    if(css==='mini-reaction'&&activeVersion>=9&&Date.now()-pointerAt<700)return;
    choose(value);
   });
   buttons.push(button);body.append(button);return button;
  }
  function stopAnimation(){
   anchor=null;
   if(raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(raf);
   raf=0;
  }
  function paintReaction(){
   if(!anchor||!progress)return;
   const stamp=typeof performance!=='undefined'?performance.now():Date.now();
   const elapsed=activeVersion>=9&&typeof clockNow==='function'?
    clockStamp()-fightStart:anchor.elapsed+(stamp-anchor.stamp);
   const fraction=pos(anchor.round,elapsed);
   const cursor=progress.firstElementChild;
   if(cursor)cursor.style.left=(fraction*100).toFixed(2)+'%';
   if(typeof requestAnimationFrame==='function'&&
      !document.hidden&&elapsed<anchor.round.endMs)
    raf=requestAnimationFrame(paintReaction);
   else raf=0;
  }
  function build(round,version){
   stopAnimation();roundView=round;activeVersion=version;reactionPreview=null;
   mathChoices=[];mathSent=false;
   reactionTaps=[];reactionHits=[];reactionSent=false;
   reactionMarks=[];reactionHint=null;
   targetChoices=[];targetSent=false;targetLocalCorrect=0;targetLastHit=null;
   targetHits=[];targetServerLocked=false;targetLevel=null;targetRule=null;
   targetGuide=null;targetFeedback=null;targetMarks=[];
   chainMarks=[];chainHits=[];chainVerdict=null;chainFxHost=null;chainFx=[];
   buttons=[];body.replaceChildren();progress=null;question=null;counter=null;attackStatus=null;
   dodgeMarks=[];dodgeTimeFill=null;dodgeImpact=null;mathMarks=[];mathRank=null;mathClock=null;mathTimeFill=null;
   targetClock=null;targetClockFill=null;
   lead.replaceChildren(title,hint);
   root.classList?.toggle('is-math-battle',round.kind==='math'&&version>=5);
   root.classList?.toggle('is-slow-dodge',round.kind==='dodge'&&version>=8);
   root.classList?.toggle('is-precise-reaction',round.kind==='reaction'&&version>=9);
   root.classList?.toggle('is-color-target',round.kind==='target'&&version>=10);
   root.classList?.toggle('is-final-attack',version>=12&&round.round===4);
   root.classList?.toggle('is-chain-breaker',version>=13&&round.kind==='chain');
   lastChoice=null;
   title.textContent=version>=13&&round.kind==='chain'?
    '⛓️ KETTENBRECHER · RUNDE 5/5':version>=12&&round.round===4?
    '🔥 FINALER SCHLAG · RUNDE 5/5':round.kind==='target'&&version>=10?
    '🎨 FARBEN- & SYMBOL-TREFFER':round.kind==='math'&&version>=5?
    '✦ RUNENPRÜFUNG':'RUNDE '+(round.round+1)+'/'+(version>=3?4:3)+' · '+labels[round.kind];
   hint.textContent=round.kind==='math'&&version>=5?
    '8 AUFGABEN · STEIGENDER SCHWIERIGKEITSGRAD':
    round.hint||'Schnell reagieren!';
   if(round.kind==='math'&&version>=5){
    const hud=createElement('div','mini-math-hud');
    mathRank=createElement('span','mini-math-rank','STUFE 1 / 8');
    mathClock=createElement('span','mini-math-clock','8 s');
    const heading=createElement('div','mini-math-topline');
    heading.append(mathRank,mathClock);
    const track=createElement('div','mini-math-runes');
    track.setAttribute?.('aria-label','Acht Aufgaben · ausgefüllte Felder sind beantwortet');
    mathMarks=Array.from({length:8},(_,index)=>{
     const mark=createElement('span','mini-math-rune',String(index+1));
     track.append(mark);return mark;
    });
    const timeTrack=createElement('div','mini-math-time');
    mathTimeFill=createElement('span','mini-math-time-fill');
    timeTrack.append(mathTimeFill);
    hud.append(heading,track,timeTrack);
    lead.append(hud);
    paintMathStage(0);
   }
   if(version===1){
    if(round.kind==='math'){
     question=createElement('div','mini-question',round.question||'');
     body.append(question);
     for(const [i,value] of (round.options||[]).entries())
      makeButton(i,String(value),'mini-math');
    }else if(round.kind==='dodge'){
     for(let i=0;i<round.lanes;i++){
      const dangerous=i===round.dangerIndex||i===round.secondDangerIndex;
      makeButton(i,(round.lanes===2?['⬅️','➡️']:['⬅️','⬆️','➡️'])[i]+
       (dangerous?' 🔥':' 🛡️'),dangerous?'mini-danger':'mini-safe');
     }
    }else if(round.kind==='reaction'){
     progress=createElement('div','mini-meter');
     const fill=createElement('span','mini-meter-fill');
     progress.append(fill);body.append(progress);
     makeButton(1,'⚡ JETZT DRÜCKEN','mini-reaction');
    }else if(round.kind==='target'){
     for(let i=0;i<round.lanes;i++)makeButton(i,'◇','mini-target');
    }
    return;
   }
   counter=createElement('div','mini-step-counter','0 / '+round.maxSteps+' geschafft');
   body.append(counter);
   if(round.kind==='math'){
    question=createElement('div','mini-question','');
    body.append(question);
    for(let i=0;i<3;i++)makeButton(i,'…','mini-math');
   }else if(round.kind==='dodge'){
    const warning=createElement('div','mini-dodge-warning','⚠️ BOSS GREIFT AN');
    attackStatus=warning;body.append(warning);
    if(version>=8){
     const decisionTrack=createElement('div','mini-dodge-decision-track');
     decisionTrack.setAttribute?.('aria-label','Verbleibende Zeit bis zum Boss-Einschlag');
     dodgeTimeFill=createElement('span','mini-dodge-decision-fill');
     decisionTrack.append(dodgeTimeFill);body.append(decisionTrack);
    }
    const lanes=createElement('div','mini-dodge-lanes');
    body.append(lanes);
    for(let i=0;i<round.lanes;i++){
     const button=createElement('button','mini-choice mini-dodge-lane','');
     button.type='button';button.addEventListener('click',()=>choose(i));
     buttons.push(button);lanes.append(button);
    }
    const history=createElement('div','mini-dodge-history');
    history.setAttribute('aria-label','Ausweich-Ergebnisse 1 bis 3');
    dodgeMarks=Array.from({length:3},(_,i)=>{
     const badge=createElement('span','mini-dodge-mark',String(i+1)+' ·');
     history.append(badge);return badge;
    });
    body.append(history);
    dodgeImpact=createElement('div','mini-dodge-impact','🛡️ WÄHLE EINE RICHTUNG');
    dodgeImpact.setAttribute?.('aria-live','polite');
    body.append(dodgeImpact);
   }else if(round.kind==='reaction'){
    const speed=createElement('div','mini-speed-indicator','');
    attackStatus=speed;body.append(speed);
    progress=createElement('div','mini-meter is-accelerating'+(version>=9?' is-precision':''));
    const cursor=createElement('span','mini-meter-fill');
    progress.append(cursor);body.append(progress);
    if(version>=14){
     const instructions=createElement('div','mini-reaction-guide',
      'DRÜCKE 3 × IM GRÜNEN BEREICH · OHNE WARTEPAUSEN');
     body.append(instructions);
     const track=createElement('div','mini-reaction-steps');
     track.setAttribute?.('aria-label','Drei Konter, jeweils serverbestätigt');
     reactionMarks=Array.from({length:3},(_,i)=>{
      const mark=createElement('span','mini-reaction-step',String(i+1));
      track.append(mark);return mark;
     });
     body.append(track);
    }
    makeButton(1,version>=14?'⚡ KONTER 1/3':'⚡ KONTER!','mini-reaction');
    if(version>=14){
     reactionHint=createElement('div','mini-reaction-verdict',
      '🎯 DREI TASTENDRÜCKE · EIN SERVERERGEBNIS');
     reactionHint.setAttribute?.('aria-live','polite');
     body.append(reactionHint);
    }
   }else if(round.kind==='chain'&&version>=13){
    const hud=createElement('div','mini-chain-hud');
    targetClock=createElement('strong','mini-chain-clock',
     version>=14?'20 s':'10 s');
    const timeTrack=createElement('div','mini-chain-time');
    targetClockFill=createElement('span','mini-chain-time-fill');
    timeTrack.append(targetClockFill);hud.append(targetClock,timeTrack);
    body.append(hud);
    question=createElement('div','mini-chain-instruction',
     '✨ TIPPE DIE GOLDENE KETTE AN – ODER WISCHE DARÜBER!');
    body.append(question);
    const stage=createElement('div','mini-chain-stage');
    const arena=createElement('div','mini-chain-arena');
    arena.setAttribute?.('aria-label','Kettenbrecher: glühende Kette durchtrennen');
    chainFxHost=createElement('div','mini-chain-fx-host');
    chainFxHost.style?.setProperty?.('--chain-lanes',String(round.lanes));
    chainFxHost.setAttribute?.('aria-hidden','true');
    stage.append(arena,chainFxHost);body.append(stage);
    const progressTrack=createElement('div','mini-chain-progress');
    progressTrack.setAttribute?.('aria-label','Fortschritt der zehn Kettenschnitte');
    chainMarks=Array.from({length:10},(_,i)=>{
     const mark=createElement('span','mini-chain-mark',String(i+1));
     progressTrack.append(mark);return mark;
    });
    body.append(progressTrack);
    for(let i=0;i<round.lanes;i++){
     const button=createElement('button','mini-choice mini-chain-lane','KETTE '+(i+1));
     button.type='button';
     let pointerStart=null,lastPointerAction=0;
     button.addEventListener('pointerdown',event=>{
      if(event?.isPrimary===false||!allowed||roundView?.kind!=='chain')return;
      pointerStart=event.pointerId;
      if(event.pointerId!==undefined)
       button.setPointerCapture?.(event.pointerId);
      event.preventDefault?.();
     });
     button.addEventListener('pointerup',event=>{
      if(pointerStart===null||event.pointerId!==pointerStart)return;
      pointerStart=null;lastPointerAction=Date.now();
      if(event.pointerId!==undefined)
       button.releasePointerCapture?.(event.pointerId);
      event.preventDefault?.();
      choose(i); // short tap OR swipe: reliable on Android and desktop
     });
     button.addEventListener('pointercancel',()=>{pointerStart=null});
     button.addEventListener('click',()=>{
      // Prevent the synthetic click that follows pointerup from double scoring.
      if(Date.now()-lastPointerAction<600)return;
      choose(i); // mouse click, keyboard and older touch browsers
     });
     buttons.push(button);arena.append(button);
    }
    chainVerdict=createElement('div','mini-chain-verdict',
     '⚔️ TIPPE ODER WISCHE · ZEHN VERSUCHE');
    chainVerdict.setAttribute?.('aria-live','polite');body.append(chainVerdict);
    paintChainStep();
   }else if(round.kind==='target'&&version>=10){
    const hud=createElement('div','mini-color-hud');
    targetClock=createElement('strong','mini-color-clock','10 s');
    const timeTrack=createElement('div','mini-color-time');
    targetClockFill=createElement('span','mini-color-time-fill');
    timeTrack.append(targetClockFill);
    hud.append(targetClock,timeTrack);body.append(hud);
    const goal=createElement('div','mini-color-goal');
    targetLevel=createElement('span','mini-color-level','AUFGABE 1/10');
    targetRule=createElement('strong','mini-color-rule','');
    goal.append(targetLevel,targetRule);body.append(goal);
    question=createElement('div','mini-color-question','');body.append(question);
    targetGuide=createElement('div','mini-color-guide','');body.append(targetGuide);
    const progressSteps=createElement('div','mini-color-progress');
    progressSteps.setAttribute?.('aria-label','Fortschritt der zehn Farb- und Symbolaufgaben');
    targetMarks=Array.from({length:10},(_,index)=>{
     const mark=createElement('span','mini-color-mark',String(index+1));
     progressSteps.append(mark);return mark;
    });
    body.append(progressSteps);
    const cells=createElement('div','mini-color-grid');
    cells.dataset.count=String(round.puzzles?.[0]?.options?.length||4);
    body.append(cells);
    for(let i=0;i<(round.puzzles?.[0]?.options?.length||4);i++){
     const button=createElement('button','mini-choice mini-color-target','');
     button.type='button';button.addEventListener('click',()=>choose(i));
     buttons.push(button);cells.append(button);
    }
    targetFeedback=createElement('div','mini-color-verdict',
     '🎯 WÄHLE DAS PASSENDE FELD · 10 AUFGABEN');
    targetFeedback.setAttribute?.('aria-live','polite');
    body.append(targetFeedback);
    paintTargetStep();
   }else if(round.kind==='target'){
    question=createElement('div','mini-target-hint','Treffe den leuchtenden Schwachpunkt!');
    body.append(question);
    for(let i=0;i<round.lanes;i++)makeButton(i,'◇','mini-target');
   }
  }
  function update(view,now,canPlay){
   fightStart=Number(view?.startedAt)||0;
   // A queued response from a previous battle must never leak into the next.
   if(mathQueue&&mathQueue.fightStart!==fightStart)mathQueue=null;
   // An authenticated GET can prove the batch survived a lost response.
   // Retire before the pump, so there is no redundant transaction.
   const saved=mathQueue&&view?.miniGames?.myAnswers?.[mathQueue.round]?.attempts;
   if(mathQueue&&Array.isArray(saved)&&
      saved.length>=mathQueue.answers.length)mathQueue=null;
   pumpMath();
   const active=view?.phase==='fighting'&&view?.miniGames?.rounds?.length>=3;
   root.hidden=!active;allowed=!!canPlay;
   if(!active){
    if(roundView?.kind==='math'&&mathChoices.length&&!mathSent)flushMath();
    if(roundView?.kind==='reaction'&&reactionTaps.length&&!reactionSent)flushReaction();
    if(['target','chain'].includes(roundView?.kind)&&targetChoices.length&&!targetSent)flushTarget();
    root.classList?.remove('is-math-battle');
     root.classList?.remove('is-slow-dodge');
     root.classList?.remove('is-precise-reaction');
    root.classList?.remove('is-color-target');
    root.classList?.remove('is-final-attack');
    root.classList?.remove('is-chain-breaker');
    roundKey='';roundView=null;stopAnimation();return;
   }
   const elapsed=now-(view.startedAt||0),games=view.miniGames;
   const round=games.rounds.find(r=>elapsed>=r.startMs&&elapsed<r.endMs);
   if(!round){
    // Interludes use synchronized battle choreography, not a stale input panel.
    root.hidden=games.version>=3;
    if(roundView?.kind==='math'&&mathChoices.length&&!mathSent)flushMath();
    if(roundView?.kind==='reaction'&&reactionTaps.length&&!reactionSent)flushReaction();
    if(['target','chain'].includes(roundView?.kind)&&targetChoices.length&&!targetSent)flushTarget();
    stopAnimation();root.classList?.remove('is-math-battle');
     root.classList?.remove('is-slow-dodge');
    if(roundKey!=='inactive'){
     roundKey='inactive';body.replaceChildren();buttons=[];
     title.textContent=elapsed<games.rounds[0].startMs?
      '🐉 Der Boss bereitet sich vor':'⚔️ Finaler Angriff';
     hint.textContent=elapsed<games.rounds[0].startMs?
      'Fünf Herausforderungen beginnen gleich':
      games.version>=12&&games.rounds[4]&&elapsed<games.rounds[4].startMs?
       'Bereite dich auf den fünften und letzten Angriff vor!':
      'Die Ergebnisse werden vom Server berechnet';
     status.textContent='';
    }
    return;
   }
   const key=view.startedAt+':'+round.round+':'+(games.version||1);
   if(key!==roundKey){
    if(roundView?.kind==='math'&&mathChoices.length&&!mathSent)flushMath();
    if(roundView?.kind==='reaction'&&reactionTaps.length&&!reactionSent)flushReaction();
    if(['target','chain'].includes(roundView?.kind)&&targetChoices.length&&!targetSent)flushTarget();
    roundKey=key;build(round,games.version||1);
   }
   const myUid=view?.members?.find(m=>m.isMe)?.uid;
   const fallen=games.version>=15&&myUid&&
    view?.teamHealth?.heroes?.some(hero=>
     hero.uid===myUid&&Number(hero.hp)<=0);
   if(fallen){
    allowed=false;
    buttons.forEach(button=>{button.disabled=true});
    title.textContent='💀 DEIN HELD IST GEFALLEN';
    hint.textContent='Die anderen kämpfen für euer Team weiter.';
    status.textContent='0 LP · Keine weiteren Angriffe oder Minispiele';
    stopAnimation();
    return;
   }
   const mine=games.myAnswers?.[round.round],remaining=
    Math.max(0,Math.ceil((round.endMs-elapsed)/1000));
   if(activeVersion===1){
    const bonus=Object.values(games.myAnswers||{}).filter(v=>v?.correct).length;
    status.textContent=mine?
     (mine.correct?'✅ Richtig!':'❌ Leider daneben!')+
      ' · '+(Math.round(bonus/3*1000)/10).toLocaleString('de-DE')+' % Bonus':
     '⏱️ '+remaining+' Sek. · Deine Eingabe wird serverseitig geprüft';
    buttons.forEach(button=>button.disabled=!!mine||!canPlay||localSubmitting);
    if(round.kind==='reaction'&&progress){
     const bar=progress.firstElementChild;
     if(bar){
      const fraction=Math.max(0,Math.min(1,
       (elapsed-round.startMs)/(round.endMs-round.startMs)));
      bar.style.width=(fraction*100).toFixed(1)+'%';
      const center=(round.targetMs-round.startMs)/(round.endMs-round.startMs);
      const tolerance=round.toleranceMs/(round.endMs-round.startMs);
      progress.style.setProperty('--timing-left',Math.max(0,(center-tolerance)*100)+'%');
      progress.style.setProperty('--timing-width',(2*tolerance*100)+'%');
     }
    }
    if(round.kind==='target'){
     const moving=targetIndex(round,elapsed);
     buttons.forEach((button,i)=>{
      button.classList.toggle('mini-weakpoint',i===moving);
      button.textContent=i===moving?'🎯':'◇';
     });
    }
    return;
   }
   const attempts=mine?.attempts||[],correct=attempts.filter(a=>a.correct).length;
   if(round.kind==='reaction'&&activeVersion>=14&&attempts.length)reactionSent=true;
   if(['target','chain'].includes(round.kind)&&activeVersion>=10&&attempts.length){
    // Server-confirmed partial batches close further input after reconnect.
    targetServerLocked=true;targetSent=true;
   }
   const max=round.maxSteps||3;
   const sprint=activeVersion>=10&&['target','chain'].includes(round.kind);
   const completed=attempts.length>=max||
    (round.kind==='math'&&mathChoices.length>=max)||
    (sprint&&targetChoices.length>=max)||
    (round.kind==='reaction'&&activeVersion>=14&&reactionTaps.length>=max);
   let step=round.kind==='math'?Math.max(attempts.length,mathChoices.length):
    sprint?Math.max(attempts.length,targetChoices.length):
     activeVersion>=14&&round.kind==='reaction'?
      Math.max(attempts.length,reactionTaps.length):attempts.length,windowOpen=true;
   if(round.kind==='math'){
    if(attempts.length)mathSent=true;
    // After reconnect draw the actual server-confirmed progress, not
    // the first puzzle. Runes indicate answered, never guessed successes.
    if(attempts.length&&activeVersion>=5){
     paintMathStage(attempts.length);
     if(mathRank)mathRank.textContent=
      attempts.length+' / 8 · SERVER BESTÄTIGT';
     if(question)question.textContent='✅ Deine Mathe-Antworten wurden geprüft';
     if(counter)counter.textContent=attempts.length+' / 8 bestätigt';
     buttons.forEach(button=>{button.textContent='✓';button.disabled=true});
     status.textContent='✅ SERVER BESTÄTIGT · '+
      correct+' / '+attempts.length+' richtig';
     return;
    }
    // No network pause between clicks; one batch just before expiry
    // or at the change to the next synchronized challenge.
    if(elapsed>=round.endMs-120&&mathChoices.length&&!mathSent)flushMath();
   }
   if(sprint){
    if(attempts.length)targetSent=true;
    if(elapsed>=round.endMs-20&&targetChoices.length&&!targetSent)flushTarget();
   }
   if(round.kind==='dodge'){
    dodgeMarks.forEach((mark,i)=>{
     const hit=round.attacks[i],action=attempts[i];
     const reached=elapsed>=hit.impactMs;
     const code=!reached?'·':action?(action.correct?'✓':'✕'):'…';
     mark.textContent=(i+1)+' '+code;
     mark.classList.toggle('is-correct',reached&&action?.correct===true);
     mark.classList.toggle('is-wrong',reached&&action?.correct===false);
     mark.classList.toggle('is-pending',reached&&!action);
    });
    // Each strike has its own exact telegraph/impact window.
    // The exact attack schedule is authoritative. Do not estimate the
    // current step from an approximate one-third of the round duration.
    step=round.attacks.reduce((current,hit,i)=>
     elapsed>=hit.startMs?i:current,0);
    const strike=round.attacks[step];
    windowOpen=elapsed>=strike.startMs&&elapsed<strike.impactMs;
    if(dodgeTimeFill){
     const availableMs=Math.max(1,strike.impactMs-strike.startMs);
     dodgeTimeFill.style.width=(100*Math.max(0,Math.min(1,
      (strike.impactMs-elapsed)/availableMs))).toFixed(1)+'%';
     dodgeTimeFill.classList.toggle('is-urgent',
      strike.impactMs-elapsed<1100);
    }
    const ownAttempt=attempts[step];
    const verdict=elapsed<strike.impactMs?'warning':
     ownAttempt?.correct===true?'safe':
     ownAttempt?.correct===false?'hit':'pending';
    if(attackStatus){
     const remainingToImpact=Math.max(0,(strike.impactMs-elapsed)/1000);
     attackStatus.textContent=verdict==='warning'?
      '⚠️ SCHLAG '+(step+1)+'/3 · '+remainingToImpact.toFixed(1)+' s':
      verdict==='safe'?'✅ AUSGEWICHEN':
      verdict==='hit'?'💥 GETROFFEN':
       '⚡ EINSCHLAG · ERGEBNIS OFFEN';
     attackStatus.classList.toggle('is-success',verdict==='safe');
     attackStatus.classList.toggle('is-impact',!windowOpen);
    }
    if(dodgeImpact){
     const picked=lastChoice?.round===round.round&&lastChoice.step===step;
     dodgeImpact.textContent=verdict==='safe'?'🛡️ AUSGEWICHEN · SERVER BESTÄTIGT':
      verdict==='hit'?'💥 GETROFFEN · SERVER BESTÄTIGT':
      verdict==='pending'?'⏳ EINSCHLAG · SERVERERGEBNIS OFFEN':
      picked?'↔️ RICHTUNG ERFASST · EINSCHLAG ABWARTEN':
       '🛡️ WÄHLE LINKS / RECHTS'+(round.lanes===3?' / MITTE':'');
     dodgeImpact.classList.toggle('is-success',verdict==='safe');
     dodgeImpact.classList.toggle('is-hit',verdict==='hit');
     dodgeImpact.classList.toggle('is-pending',verdict==='pending');
    }
    buttons.forEach((button,i)=>{
     const danger=i===strike.dangerIndex||i===strike.secondDangerIndex;
     const label=round.lanes===2?['⬅️ LINKS','RECHTS ➡️'][i]:
      ['⬅️ LINKS','⬆️ MITTE','RECHTS ➡️'][i];
     button.textContent=label+(danger?' 🔥':' 🛡️');
     button.classList.toggle('mini-danger',danger);
     button.classList.toggle('mini-safe',!danger);
     button.classList.toggle('is-selected',lastChoice?.step===step&&lastChoice.value===i);
     const hasRecord=!!attempts[step];
     button.disabled=!canPlay||localSubmitting||!windowOpen||hasRecord||
      (activeVersion>=8&&lastChoice?.round===round.round&&
       lastChoice.step===step);
    });
   }else{
    buttons.forEach(b=>b.disabled=!canPlay||localSubmitting||completed||
      (sprint&&targetSent));
   }
   stepCurrent=step;
   if(counter){
    counter.textContent=round.kind==='math'&&!attempts.length?
     mathChoices.length+' / '+max+' beantwortet':
     sprint?
      (attempts.length?correct+' / 10 richtig · bestätigt':
       targetChoices.length+' / 10 '+(round.kind==='chain'?'geschlagen':'beantwortet')+
       ' · '+targetLocalCorrect+' Treffer (vorläufig)'):
      correct+' / '+max+' richtig';
    counter.classList.toggle('is-perfect',correct===max);
   }
   if(round.kind==='math'){
    paintMathStage(step);
    if(activeVersion>=5){
     if(mathClock)mathClock.textContent=remaining+' s';
     if(mathTimeFill)mathTimeFill.style.width=(Math.max(0,
      Math.min(100,100*(round.endMs-elapsed)/(round.endMs-round.startMs))))
      .toFixed(1)+'%';
    }
    const puzzle=round.puzzles[Math.min(step,7)];
    if(question)question.textContent=completed?'✅ Acht Aufgaben abgeschlossen':puzzle.question;
    buttons.forEach((button,i)=>{
     button.textContent=completed?'✓':String(puzzle.options[i]);
    });
   }else if(round.kind==='reaction'&&progress){
    const elapsedGame=(elapsed-round.startMs)/1000;
    if(attackStatus)attackStatus.textContent=
     '⚡ TEMPO '+(1+elapsedGame*.3).toFixed(1)+'× · wird immer schneller';
    progress.style.setProperty('--timing-left',((.5-round.zoneRadius)*100)+'%');
    progress.style.setProperty('--timing-width',(round.zoneRadius*200).toFixed(1)+'%');
    anchor={round,elapsed,stamp:typeof performance!=='undefined'?performance.now():Date.now()};
    if(!raf)paintReaction();
    if(activeVersion>=14){
     paintReactionMarks(attempts);
     if(counter)counter.textContent=attempts.length?
      correct+' / '+attempts.length+' serverbestätigt':
      reactionTaps.length+' / 3 erfasst · '+
      reactionHits.filter(Boolean).length+' im Zielbereich (vorläufig)';
     if(reactionHint){
      reactionHint.textContent=attempts.length?
       '✅ SERVER BESTÄTIGT · '+correct+' / '+attempts.length+' RICHTIG':
       reactionSent?'⏳ '+reactionTaps.length+' KONTER · SERVER PRÜFT':
       reactionTaps.length?'⚡ '+reactionTaps.length+' / 3 ERFASST · VORLÄUFIG':
       '🎯 DREIMAL IM GRÜNEN ZIELBEREICH DRÜCKEN';
      reactionHint.dataset.state=attempts.length?'confirmed':
       reactionSent?'pending':'open';
     }
     if(buttons[0]){
      buttons[0].textContent=completed?'⚡ 3/3 ERFASST':
       '⚡ KONTER '+(reactionTaps.length+1)+'/3';
      buttons[0].disabled=!canPlay||reactionSent||completed||
       attempts.length>0||elapsed<round.startMs||elapsed>=round.endMs;
     }
    }else if(completed)stopAnimation();
   }else if(sprint){
    if(targetClock)targetClock.textContent=remaining+' s';
    if(targetClockFill)targetClockFill.style.width=
     Math.max(0,Math.min(100,100*(round.endMs-elapsed)/(round.endMs-round.startMs)))
      .toFixed(1)+'%';
    if(round.kind==='chain'&&activeVersion>=13){
     paintChainStep(attempts);
     if(targetServerLocked)buttons.forEach(button=>{button.disabled=true});
    }
    if(round.kind==='target'&&activeVersion>=10){
     paintTargetMarks(attempts);
     if(attempts.length&&targetFeedback){
      targetFeedback.textContent='✅ SERVER BESTÄTIGT · '+correct+
       ' / '+attempts.length+' RICHTIG';
      targetFeedback.dataset.state='confirmed';
     }else if(targetSent&&targetFeedback){
      targetFeedback.textContent='⏳ '+targetChoices.length+
       ' ANTWORTEN ERFASST · WARTE AUF SERVER';
      targetFeedback.dataset.state='pending';
     }
     if(targetServerLocked)buttons.forEach(button=>{button.disabled=true});
    }
    if(attempts.length||completed&&targetSent){
     if(question)question.textContent=attempts.length?
      '🏆 '+correct+' VON '+attempts.length+' TREFFERN BESTÄTIGT':
      '⏳ SERVER PRÜFT DIE ANTWORTEN';
    }
   }else if(round.kind==='target'){
    const moving=targetIndex(round,elapsed);
    buttons.forEach((button,i)=>{
     button.classList.toggle('mini-weakpoint',i===moving);
     button.textContent=i===moving?'🎯':'◇';
    });
   }
   if(round.kind==='dodge'){
    const strike=round.attacks[step],myAction=attempts[step];
    status.textContent=elapsed>=strike.impactMs?
     (myAction?.correct===true?'✅ AUSGEWICHEN · SERVER BESTÄTIGT':
      myAction?.correct===false?'💥 GETROFFEN · SERVER BESTÄTIGT':
       '⏳ EINSCHLAG · WARTE AUF SERVERBESTÄTIGUNG'):
     lastChoice?.round===round.round&&lastChoice.step===step?
      '↔️ RICHTUNG ERFASST · '+(localSubmitting?'SERVER PRÜFT':'EINSCHLAG ABWARTEN'):
      windowOpen?'🛡️ WÄHLE DEINE AUSWEICHRICHTUNG':
       '⏱️ NÄCHSTER SCHLAG WIRD VORBEREITET';
    return;
   }
   if(round.kind==='reaction'&&activeVersion>=14){
    status.textContent=attempts.length?
     '✅ SERVER BESTÄTIGT · '+correct+' / '+attempts.length+' TREFFER':
     reactionSent?'⏳ '+reactionTaps.length+' KONTER WERDEN GEPRÜFT':
     reactionTaps.length?
      '⚡ '+reactionTaps.length+' / 3 KONTER ERFASST · VORLÄUFIG':
      '⚡ TRIFF BIS ZU DREIMAL DEN GRÜNEN BEREICH';
    return;
   }
   if(round.kind==='reaction'&&activeVersion>=9){
    if(reactionPreview&&reactionPreview.round===round.round&&
       reactionPreview.step>=attempts.length){
     status.textContent=reactionPreview.visualHit?
      '⚡ IM ZIELBEREICH · Server bestätigt den Treffer …':
      '⚡ KONTER ERFASST · Server prüft …';
    }else{
     status.textContent=completed?
      '✅ KONTER ABGESCHLOSSEN · '+correct+' / '+max+' bestätigt':
      '⚡ '+correct+' / '+max+' Treffer bestätigt · Drücke im grünen Feld';
    }
    return;
   }
   if(round.kind==='chain'&&activeVersion>=13){
    status.textContent=attempts.length?
     '✅ SERVER BESTÄTIGT · '+correct+' / '+attempts.length+' Ketten · '+
      (Math.round(5*correct/max*10)/10).toLocaleString('de-DE')+' % Extraangriff':
     targetSent?'⏳ '+targetChoices.length+' Kettenschnitte werden geprüft …':
     (targetLastHit===null?'✨ Tippe die GOLDENE Kette an oder wische darüber!':
      (targetLastHit?'💥 Kette gebrochen!':'⚡ Daneben!')+
      ' · '+targetChoices.length+' / 10 · '+targetLocalCorrect+' gebrochen (vorläufig)');
    return;
   }
   if(round.kind==='target'&&activeVersion>=10){
    status.textContent=attempts.length?
     '✅ SERVER BESTÄTIGT · '+correct+' / '+max+' Treffer · '+
      (Math.round((activeVersion>=12&&roundView.round===4?5:3)*correct/max*10)/10).toLocaleString('de-DE')+' % Zusatzschaden':
     targetSent?'⏳ '+targetChoices.length+' Antworten werden gesammelt geprüft …':
     (targetLastHit===null?'🎯 Triff die vorgegebene Farbe und/oder das Symbol!':
      (targetLastHit?'✅ Treffer!':'❌ Daneben!')+
       ' · '+targetChoices.length+' / 10 · '+targetLocalCorrect+' richtig (vorläufig)');
    return;
   }
   status.textContent=round.kind==='math'&&!attempts.length?
    (activeVersion>=5?
     (mathSent?'⏳ SERVER PRÜFT':'⚡ '+mathChoices.length+' / 8 EINGEGEBEN'):
     mathSent?'⏳ Acht-Sekunden-Sprint wird serverseitig geprüft …':
     '⚡ '+mathChoices.length+' von 8 beantwortet · '+remaining+' Sek.'):
    completed?
    '✅ Runde abgeschlossen · '+correct+' von '+max+' richtig':
    '⏱️ '+remaining+' Sek. · '+correct+' Treffer · '+max+' Versuche möglich'+
     (localSubmitting?' · Server prüft …':'');
  }
  return {update};
 }
 window.DogBossMinigames={create};
})();
