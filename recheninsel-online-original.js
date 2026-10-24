/* Server-controlled original Recheninsel presentation. No local scoring in online mode. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 let state=null,offset=0,timer=null,submitted=false,lastRound='',lastAnswer='';
 const label=['Leicht','Mittel','Schwer'];
 function render(){
  if(!state)return;
  const {round,a,b,operator,options,answered,mySeat,startAt,serverNow,players,phase}=state;
  const key=state.challengeId+':'+round;
  if(key!==lastRound){lastRound=key;submitted=false;lastAnswer='';}
  if(Number.isFinite(serverNow))offset=serverNow-Date.now();
  const mine=answered.includes(mySeat);
  $('setup').classList.add('hidden');$('game').classList.remove('hidden');
  $('round').textContent='RUNDE '+round+' / 3';
  $('difficulty').textContent=label[round-1]||'Schwer';
  $('expression').textContent=a+' '+operator+' '+b+' = ?';
  const board=$('board');board.replaceChildren();
  const open=phase==='countdown'&&Date.now()+offset>=startAt&&!mine&&!submitted;
  options.forEach(value=>{
   const button=document.createElement('button');button.type='button';button.className='answer';
   button.textContent=String(value);button.disabled=!open;
   if(submitted&&value===lastAnswer)button.classList.add('active');
   button.addEventListener('click',()=>{
    if(!state||submitted||answered.includes(mySeat)||Date.now()+offset<startAt)return;
    submitted=true;lastAnswer=value;render();
    window.parent.postMessage({type:'recheninsel:answer',challengeId:state.challengeId,round:state.round,answer:value},location.origin);
   });
   board.append(button);
  });
  $('players').replaceChildren();
  (players||[]).forEach(p=>{
   const div=document.createElement('div');div.className='player'+(p.seat===mySeat?' active':'')+(answered.includes(p.seat)?' done':'');
   const name=document.createElement('div');name.className='name';name.textContent=(p.seat===mySeat?'👤 ':'🎮 ')+p.name;
   const detail=document.createElement('div');detail.className='detail';detail.textContent=answered.includes(p.seat)?'🔒 Antwort abgegeben':'⏳ Wartet auf Antwort';
   div.append(name,detail);$('players').append(div);
  });
  $('next').disabled=true;
  $('next').style.display='none';
  $('message').textContent=mine||submitted?'🔒 Deine Antwort ist gespeichert.':open?'🏴‍☠️ Wähle ein Antwortfass!':'⏳ Die nächste Runde startet gleich.';
  $('instruction').textContent='Drei Runden · Schwierigkeit steigt · Antworten bleiben geheim';
 }
 function tick(){
  if(!state)return;
  const remaining=Math.max(0,Math.ceil((state.startAt-(Date.now()+offset))/1000));
  $('timer').textContent=remaining?'Start in '+remaining+' s':'⏱️ Jetzt antworten';
  if(remaining===0&&state.phase==='countdown'&&!submitted&&!state.answered.includes(state.mySeat)){
   const first=$('board').querySelector('.answer');
   if(first?.disabled)render();
  }
 }
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='recheninsel:state')return;
  state=event.data;render();tick();
  if(!timer)timer=setInterval(tick,250);
 });
})();
