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
 const targetIndex=(round,elapsed)=>
  (round.initialIndex+Math.max(0,Math.floor((elapsed-round.startMs)/round.stepMs)))%round.lanes;
 function create(root,onSubmit,onDodgeChoice=null){
  let roundKey='',roundView=null,buttons=[],progress=null,status=null;
  let question=null,counter=null,attackStatus=null,localSubmitting=false,stepCurrent=0;
  let dodgeMarks=[],dodgeTimeFill=null;
  let mathMarks=[],mathRank=null,mathClock=null,mathTimeFill=null;
  const mathLevels=['LEICHT','AUFWÄRMEN','GENAUIGKEIT','MALNEHMEN',
   'TEILEN','KOMBINATION','KLAMMERN','FINALE'];
  const paintMathStage=step=>{
   if(activeVersion<5||!mathRank)return;
   const i=Math.min(7,Math.max(0,step));
   mathRank.textContent=step>=8?'8 / 8 · ABGESCHICKT':
    'STUFE '+(i+1)+' / 8 · '+mathLevels[i];
   mathMarks.forEach((mark,index)=>{
    mark.classList.toggle('is-complete',index<step);
    mark.classList.toggle('is-current',index===step&&step<8);
   });
   root.style?.setProperty?.('--math-intensity',String(i+1));
  };
  let lastChoice=null,anchor=null,raf=0,activeVersion=1,allowed=false;
  let mathChoices=[],mathSent=false,mathQueue=null,mathSending=false,fightStart=0;
  const lead=createElement('div','mini-lead');
  const title=createElement('strong','mini-title');
  const hint=createElement('small','mini-hint');
  const body=createElement('div','mini-choices');
  status=createElement('div','mini-feedback','');
  lead.append(title,hint);
  root.replaceChildren(lead,body,status);
  const pumpMath=()=>{
   if(!mathQueue||mathSending)return;
   const batch=mathQueue;
   mathSending=true;
   Promise.resolve().then(()=>onSubmit(batch.round,batch.answers,0))
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
   mathQueue={round:roundView.round,answers:[...mathChoices],fightStart};
   // One server transaction for the entire sprint; no delay between taps.
   pumpMath();
  };
  const choose=(value)=>{
   if(!roundView||localSubmitting||!allowed)return;
   if(activeVersion>=2&&roundView.kind==='math'){
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
   const step=activeVersion>=2?stepCurrent:0;
   localSubmitting=true;lastChoice={round:roundView.round,step,value};
   if(roundView.kind==='dodge'&&typeof onDodgeChoice==='function')
    onDodgeChoice(roundView.round,step,value);
   buttons.forEach(button=>button.disabled=true);
   Promise.resolve().then(()=>onSubmit(roundView.round,value,step))
    .catch(()=>{}).finally(()=>{localSubmitting=false;});
  };
  function makeButton(value,label,css){
   const button=createElement('button','mini-choice '+(css||''),label);
   button.type='button';button.addEventListener('click',()=>choose(value));
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
   const elapsed=anchor.elapsed+(stamp-anchor.stamp);
   const fraction=pos(anchor.round,elapsed);
   const cursor=progress.firstElementChild;
   if(cursor)cursor.style.left=(fraction*100).toFixed(2)+'%';
   if(typeof requestAnimationFrame==='function'&&
      !document.hidden&&elapsed<anchor.round.endMs)
    raf=requestAnimationFrame(paintReaction);
   else raf=0;
  }
  function build(round,version){
   stopAnimation();roundView=round;activeVersion=version;
   mathChoices=[];mathSent=false;
   buttons=[];body.replaceChildren();progress=null;question=null;counter=null;attackStatus=null;
   dodgeMarks=[];dodgeTimeFill=null;mathMarks=[];mathRank=null;mathClock=null;mathTimeFill=null;
   lead.replaceChildren(title,hint);
   root.classList?.toggle('is-math-battle',round.kind==='math'&&version>=5);
   root.classList?.toggle('is-slow-dodge',round.kind==='dodge'&&version>=8);
   lastChoice=null;
   title.textContent=round.kind==='math'&&version>=5?
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
    const shock=createElement('div','mini-dodge-impact','⚡ EINSCHLAG');
    body.append(shock);
   }else if(round.kind==='reaction'){
    const speed=createElement('div','mini-speed-indicator','');
    attackStatus=speed;body.append(speed);
    progress=createElement('div','mini-meter is-accelerating');
    const cursor=createElement('span','mini-meter-fill');
    progress.append(cursor);body.append(progress);
    makeButton(1,'⚡ KONTER!','mini-reaction');
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
   pumpMath();
   const active=view?.phase==='fighting'&&view?.miniGames?.rounds?.length>=3;
   root.hidden=!active;allowed=!!canPlay;
   if(!active){
    if(roundView?.kind==='math'&&mathChoices.length&&!mathSent)flushMath();
    root.classList?.remove('is-math-battle');
    roundKey='';roundView=null;stopAnimation();return;
   }
   const elapsed=now-(view.startedAt||0),games=view.miniGames;
   const round=games.rounds.find(r=>elapsed>=r.startMs&&elapsed<r.endMs);
   if(!round){
    // Interludes use synchronized battle choreography, not a stale input panel.
    root.hidden=games.version>=3;
    if(roundView?.kind==='math'&&mathChoices.length&&!mathSent)flushMath();
    stopAnimation();root.classList?.remove('is-math-battle');
    if(roundKey!=='inactive'){
     roundKey='inactive';body.replaceChildren();buttons=[];
     title.textContent=elapsed<games.rounds[0].startMs?
      '🐉 Der Boss bereitet sich vor':'⚔️ Finaler Angriff';
     hint.textContent=elapsed<games.rounds[0].startMs?
      'Drei zufällige Aufgaben beginnen gleich':
      'Die Ergebnisse werden vom Server berechnet';
     status.textContent='';
    }
    return;
   }
   const key=view.startedAt+':'+round.round+':'+(games.version||1);
   if(key!==roundKey){
    if(roundView?.kind==='math'&&mathChoices.length&&!mathSent)flushMath();
    roundKey=key;build(round,games.version||1);
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
   const max=round.maxSteps||3;
   const completed=attempts.length>=max||
    (round.kind==='math'&&mathChoices.length>=max);
   let step=round.kind==='math'?Math.max(attempts.length,mathChoices.length):
    attempts.length,windowOpen=true;
   if(round.kind==='math'){
    if(attempts.length)mathSent=true;
    // Allow all eight seconds; flush remaining answers just before expiry
    // or upon switching to the next challenge (server allows transit grace).
    if(elapsed>=round.endMs-120&&mathChoices.length&&!mathSent)flushMath();
   }
   if(round.kind==='dodge'){
    dodgeMarks.forEach((mark,i)=>{
     const hit=round.attacks[i],action=attempts[i];
     const reached=elapsed>=hit.impactMs;
     const code=!reached?'·':action?(action.correct?'✓':'✕'):'–';
     mark.textContent=(i+1)+' '+code;
     mark.classList.toggle('is-correct',reached&&action?.correct===true);
     mark.classList.toggle('is-wrong',reached&&action?.correct===false);
    });
    // Each strike has its own exact telegraph/impact window.
    step=Math.min(2,Math.floor((elapsed-round.startMs)*3/(round.endMs-round.startMs)));
    const strike=round.attacks[step];
    windowOpen=elapsed>=strike.startMs&&elapsed<strike.impactMs;
    if(dodgeTimeFill){
     const availableMs=Math.max(1,strike.impactMs-strike.startMs);
     dodgeTimeFill.style.width=(100*Math.max(0,Math.min(1,
      (strike.impactMs-elapsed)/availableMs))).toFixed(1)+'%';
     dodgeTimeFill.classList.toggle('is-urgent',
      strike.impactMs-elapsed<1100);
    }
    if(attackStatus){
     const remainingToImpact=Math.max(0,(strike.impactMs-elapsed)/1000);
     const places=['LINKS','MITTE','RECHTS'];
     const ownAttempt=attempts[step];
     attackStatus.textContent=elapsed>=strike.impactMs?
      (ownAttempt?.correct===true?'✅ AUSGEWICHEN':
       ownAttempt?.correct===false||elapsed>=strike.impactMs+160?
        '💥 GETROFFEN':'⚡ EINSCHLAG'):
      '⚠️ SCHLAG '+(step+1)+'/3 · '+remainingToImpact.toFixed(1)+' s';
     attackStatus.classList.toggle('is-success',
      elapsed>=strike.impactMs&&ownAttempt?.correct===true);
     attackStatus.classList.toggle('is-impact',!windowOpen);
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
     button.disabled=!canPlay||localSubmitting||!windowOpen||hasRecord;
    });
   }else{
    buttons.forEach(b=>b.disabled=!canPlay||localSubmitting||completed);
   }
   stepCurrent=step;
   if(counter){
    counter.textContent=round.kind==='math'&&!attempts.length?
     mathChoices.length+' / '+max+' beantwortet':correct+' / '+max+' richtig';
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
    progress.style.setProperty('--timing-width',(round.zoneRadius*200)+'%');
    anchor={round,elapsed,stamp:typeof performance!=='undefined'?performance.now():Date.now()};
    if(!raf)paintReaction();
    if(completed)stopAnimation();
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
     (myAction?.correct===true?'✅ AUSGEWICHEN!':
      myAction?.correct===false||elapsed>strike.impactMs+160?
       '💥 GETROFFEN!':'⚡ EINSCHLAG'):
     lastChoice?.step===step?
      '↔️ BEWEGUNG · '+(localSubmitting?'PRÜFUNG LÄUFT':'SCHLAG ABWARTEN'):
      '🛡️ WÄHLE DEINE AUSWEICHRICHTUNG';
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
