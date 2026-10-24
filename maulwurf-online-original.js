/* Online presentation uses the original Maulwurf Arena CSS and mole artwork.
 * The original offline engine remains untouched and is not started.
 */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const mole='<div class="mole"><div class="ear left"></div><div class="ear right"></div><div class="body"></div><div class="cheek left"></div><div class="cheek right"></div><div class="eyes"><i></i><i></i></div><div class="nose"></div><div class="mouth"></div><div class="tooth"></div><div class="brow brow-left"></div><div class="brow brow-right"></div><div class="paw paw-left"></div><div class="paw paw-right"></div><div class="sparkle">✦</div></div>';
 let state=null,offset=0,lastKey='',timer=null,holes=[],sent=new Set(),currentTick=-1;
 const css=document.createElement('style');css.textContent='.arena-boards.online-boards{grid-template-columns:1fr;grid-template-rows:1fr}.online-boards .arena-board{width:100%;height:100%}.online-boards .arena-board .grid{max-width:640px;margin:auto;width:100%}.online-boards .arena-board .hole{touch-action:manipulation}';document.head.append(css);
 function init(){
  if(!state)return;
  const key=state.challengeId+':'+state.startAt;
  if(key===lastKey)return;
  lastKey=key;sent=new Set();currentTick=-1;
  const garden=document.querySelector('.garden');if(!garden)return;
  const wrap=document.createElement('div');wrap.className='arena-boards online-boards count-2';
  const board=document.createElement('section');board.className='arena-board human';
  const head=document.createElement('div');head.className='arena-board-header';
  const title=document.createElement('span');title.textContent=(state.players||[]).find(p=>p.seat===state.mySeat)?.name||'Dein Spielfeld';
  const score=document.createElement('span');score.className='score-value';score.id='online-score';score.textContent='0 Punkte';
  head.append(title,score);board.append(head);
  const grid=document.createElement('div');grid.className='grid';board.append(grid);wrap.append(board);
  holes=Array.from({length:9},(_,i)=>{
   const hole=document.createElement('button');hole.type='button';hole.className='hole';hole.innerHTML=mole;
   hole.setAttribute('aria-label','Maulwurfloch '+(i+1));
   hole.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();hit(i)});
   hole.addEventListener('click',e=>{if(e.detail===0)hit(i)});
   grid.append(hole);return hole;
  });
  garden.querySelectorAll('.arena-boards').forEach(el=>el.remove());garden.append(wrap);
  $('overlay')?.classList.add('hide');
  $('status').textContent='🔨 Online – alle spielen gleichzeitig!';
  $('settings')?.classList.add('hide');
 }
 function hit(hole){
  if(!state||state.phase!=='countdown')return;
  const elapsed=Date.now()+offset-state.startAt;
  const tick=Math.floor(elapsed/1000);
  if(tick<0||tick>=30||sent.has(tick))return;
  const event=state.events?.[tick];if(!event||event.hole!==hole)return;
  sent.add(tick);holes[hole].classList.add('hit');
  window.parent.postMessage({type:'maulwurf:hit',challengeId:state.challengeId,tick,hole},location.origin);
 }
 function draw(){
  if(!state||!holes.length)return;
  const elapsed=Date.now()+offset-state.startAt;
  const tick=Math.floor(elapsed/1000);
  const remaining=Math.max(0,Math.ceil((30000-elapsed)/1000));
  $('clock').textContent=elapsed<0?'⏳ '+Math.ceil(-elapsed/1000)+' s':'⏱️ '+remaining+' s';
  $('time-fill').style.width=Math.max(0,Math.min(100,(30000-elapsed)/300))+'%';
  if(tick!==currentTick){
   currentTick=tick;holes.forEach(h=>h.className='hole');
   if(tick>=0&&tick<30&&state.phase==='countdown'){
    const e=state.events?.[tick];if(e&&holes[e.hole]&&!sent.has(tick)&&!(state.hitTicks||[]).includes(tick))holes[e.hole].className='hole up '+(e.kind==='normal'?'':e.kind);
   }
  }
  const scoreboard=$('scores');
  if(scoreboard){
   const opponents=Array.isArray(state.opponents)?state.opponents:[];
   if(scoreboard.children.length!==opponents.length||opponents.some((p,i)=>scoreboard.children[i]?.dataset.seat!==String(p.seat))){
    scoreboard.replaceChildren();
    for(const p of opponents){const card=document.createElement('div');card.className='score';card.dataset.seat=String(p.seat);const label=document.createElement('span');label.textContent=p.name;const value=document.createElement('strong');card.append(label,value);scoreboard.append(card);}
   }
   opponents.forEach((p,i)=>{const card=scoreboard.children[i];if(!card)return;card.classList.toggle('active',p.seat===state.mySeat);card.querySelector('strong').textContent=p.score+' Punkte';});
  }
  const count=Number(state.hitCount)||0;
  const score=$('online-score');if(score)score.textContent=(Number(state.score)||0)+' Punkte · '+count+' Treffer';
  if(elapsed<0)$('status').textContent='⏳ Gleich geht es los – mach dich bereit!';
  else if(elapsed>=30000)$('status').textContent='🏁 Zeit abgelaufen – Server wertet aus';
  else $('status').textContent='🔨 Online – alle spielen gleichzeitig!';
 }
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==window.parent||e.data?.type!=='maulwurf:state')return;
  const previous=state;
  state=e.data;
  if(!previous||previous.challengeId!==state.challengeId||previous.startAt!==state.startAt)offset=(Number(state.serverNow)||Date.now())-Date.now();
  for(const tick of state.hitTicks||[])sent.add(tick);
  const liveTick=Math.floor((Date.now()+offset-state.startAt)/1000);
  if(liveTick>=0&&liveTick<30&&sent.has(liveTick)&&holes[state.events?.[liveTick]?.hole])holes[state.events[liveTick].hole].className='hole hit';
  init();draw();if(!timer)timer=setInterval(draw,60);
 });
})();
