/* Taktische Minispiele für sämtliche DOG-Bossarenen.
 * Alle drei Aufgaben, Startzeiten und Lösungen kommen vom Server.
 * Keine Zufallsauswahl und keine Trefferwertung im Client.
 */
(()=>{
 'use strict';
 const labels={dodge:'🛡️ Ausweichen',reaction:'⚡ Reaktionsspiel',
  math:'🧮 Blitz-Mathe',target:'🎯 Schwachpunkt treffen'};
 const createElement=(tag,cls,txt)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=txt;
  return el;
 };
 function create(root,onSubmit){
  let roundKey='',roundView=null,buttons=[],progress=null,status=null;
  const lead=createElement('div','mini-lead');
  const title=createElement('strong','mini-title');
  const hint=createElement('small','mini-hint');
  const body=createElement('div','mini-choices');
  status=createElement('div','mini-feedback','');
  lead.append(title,hint);
  root.replaceChildren(lead,body,status);
  const choose=(value)=>{
   if(!roundView)return;
   onSubmit(roundView.round,value);
  };
  function makeButton(value,label,css){
   const button=createElement('button','mini-choice '+(css||''),label);
   button.type='button';
   button.addEventListener('click',()=>choose(value));
   buttons.push(button);body.append(button);
   return button;
  }
  function build(round){
   roundView=round;buttons=[];body.replaceChildren();progress=null;
   title.textContent='RUNDE '+(round.round+1)+'/3 · '+labels[round.kind];
   hint.textContent=round.hint||'Schnell reagieren!';
   if(round.kind==='math'){
    const question=createElement('div','mini-question',round.question||'');
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
  }
  function update(view,now,canPlay){
   const active=view?.phase==='fighting'&&view?.miniGames?.rounds?.length===3;
   root.hidden=!active;
   if(!active){roundKey='';roundView=null;return;}
   const elapsed=now-(view.startedAt||0);
   const games=view.miniGames;
   const round=games.rounds.find(r=>elapsed>=r.startMs&&elapsed<r.endMs);
   if(!round){
    if(roundKey!=='inactive'){roundKey='inactive';body.replaceChildren();buttons=[];
     title.textContent=elapsed<3000?'🐉 Der Boss bereitet sich vor':'⚔️ Finaler Angriff';
     hint.textContent=elapsed<3000?'Drei zufällige Aufgaben beginnen gleich':
      'Die Ergebnisse werden vom Server berechnet';
     status.textContent='';}
    return;
   }
   const key=view.startedAt+':'+round.round;
   if(key!==roundKey){roundKey=key;build(round);}
   const mine=games.myAnswers?.[round.round];
   const remaining=Math.max(0,Math.ceil((round.endMs-elapsed)/1000));
   const bonus=Object.values(games.myAnswers||{}).filter(v=>v?.correct).length;
   status.textContent=mine?
    (mine.correct?'✅ Richtig!':'❌ Leider daneben!')+
     ' · '+(Math.round(bonus/3*1000)/10).toLocaleString('de-DE')+' % Bonus':
    '⏱️ '+remaining+' Sek. · Deine Eingabe wird serverseitig geprüft';
   buttons.forEach(button=>{button.disabled=!!mine||!canPlay;});
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
    const pos=Math.max(0,Math.floor((elapsed-round.startMs)/round.stepMs));
    const moving=(round.initialIndex+pos)%round.lanes;
    buttons.forEach((button,i)=>{
     button.classList.toggle('mini-weakpoint',i===moving);
     button.textContent=i===moving?'🎯':'◇';
    });
   }
  }
  return {update};
 }
 window.DogBossMinigames={create};
})();