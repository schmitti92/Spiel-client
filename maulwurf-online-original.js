/* Online presentation uses the original Maulwurf Arena CSS and mole artwork.
 * The original offline engine remains untouched and is not started.
 */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const mole='<div class="mole"><div class="ear left"></div><div class="ear right"></div><div class="body"></div><div class="cheek left"></div><div class="cheek right"></div><div class="eyes"><i></i><i></i></div><div class="nose"></div><div class="mouth"></div><div class="tooth"></div><div class="brow brow-left"></div><div class="brow brow-right"></div><div class="paw paw-left"></div><div class="paw paw-right"></div><div class="sparkle">✦</div></div>';
 let state=null,offset=0,lastKey='',timer=null,holes=[],sent=new Set(),currentTick=-1;
 const css=document.createElement('style');css.textContent='.arena-boards.online-boards{grid-template-columns:1fr;grid-template-rows:1fr}.online-boards .arena-board{width:100%;height:100%}.online-boards .arena-board .grid{max-width:640px;margin:auto;width:100%}.online-boards .arena-board .hole{touch-action:manipulation}';css.textContent+=' .score .mini-field[hidden]{display:none!important}.score .mini-field{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;max-width:90px;margin:5px auto 0}.score .mini-field i{display:block;aspect-ratio:1;border-radius:50%;background:#18352a;border:1px solid #ffffff26;box-shadow:inset 0 2px 3px #071c13}.score .mini-field i.up{background:#c58c4e;border-color:#ffdf8e;box-shadow:0 0 7px #ffcb70}.score .mini-field i.gold{background:#ffd34c}.score .mini-field i.bad{background:#da5961}@media(orientation:landscape) and (max-height:450px){.score .mini-field{display:none}}';document.head.append(css);
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
  if(tick!==currentTick||state.phase!=='countdown'){currentTick=tick;holes.forEach(h=>h.className='hole');}
  if(tick>=0&&tick<30&&state.phase==='countdown'){
   const e=state.events?.[tick];
   if(e&&holes[e.hole])holes[e.hole].className=(sent.has(tick)||(state.hitTicks||[]).includes(tick))?'hole hit':'hole up '+(e.kind==='normal'?'':e.kind);
  }
  const scoreboard=$('scores');
  if(scoreboard){
   const opponents=Array.isArray(state.opponents)?state.opponents:[];
   if(scoreboard.children.length!==opponents.length||opponents.some((p,i)=>scoreboard.children[i]?.dataset.seat!==String(p.seat))){
    scoreboard.replaceChildren();
    for(const p of opponents){const card=document.createElement('div');card.className='score';card.dataset.seat=String(p.seat);const label=document.createElement('span');label.textContent=p.name;const value=document.createElement('strong');const mini=document.createElement('div');mini.className='mini-field';mini.setAttribute('aria-hidden','true');for(let j=0;j<9;j++)mini.append(document.createElement('i'));card.append(label,value,mini);scoreboard.append(card);}
   }
   opponents.forEach((p,i)=>{const card=scoreboard.children[i];if(!card)return;card.classList.toggle('active',p.seat===state.mySeat);const mini=card.querySelector('.mini-field');if(mini)mini.hidden=p.seat===state.mySeat;card.querySelector('span').textContent=p.name;card.querySelector('strong').textContent=p.score+' Punkte';const liveTick=Math.floor((Date.now()+offset-state.startAt)/1000);const ev=liveTick>=0&&liveTick<30&&state.phase==='countdown'?state.events?.[liveTick]:null;card.querySelectorAll('.mini-field i').forEach((cell,hole)=>{cell.className=ev?.hole===hole?'up '+(ev.kind||'normal'):'';});});
  }
  const myTitle=document.querySelector('.online-boards .arena-board-header span');
  if(myTitle)myTitle.textContent=(state.players||[]).find(p=>p.seat===state.mySeat)?.name||'Dein Spielfeld';
  const count=Number(state.hitCount)||0;
  const score=$('online-score');if(score)score.textContent=(Number(state.score)||0)+' Punkte · '+count+' Treffer';
  if(elapsed<0)$('status').textContent='⏳ Gleich geht es los – mach dich bereit!';
  else if(elapsed>=30000)$('status').textContent='🏁 Zeit abgelaufen – Server wertet aus';
  else $('status').textContent='🔨 Online – alle spielen gleichzeitig!';
 }
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==window.parent)return;
  if(e.data?.type==='maulwurf:hit-rejected'){if(state?.challengeId===e.data.challengeId&&!(state.hitTicks||[]).includes(e.data.tick)){sent.delete(e.data.tick);const liveTick=Math.floor((Date.now()+offset-state.startAt)/1000);if(liveTick===e.data.tick){const h=holes[e.data.hole];if(h)h.className='hole up '+(state.events?.[liveTick]?.kind||'normal');}}return;}
  if(e.data?.type!=='maulwurf:state')return;
  const previous=state;
  state=e.data;
  const measuredOffset=(Number(state.serverNow)||Date.now())-Date.now();
  if(!previous||previous.challengeId!==state.challengeId||previous.startAt!==state.startAt)offset=measuredOffset;
  else if(Math.abs(measuredOffset-offset)>250)offset=measuredOffset;
  init();
  for(const tick of state.hitTicks||[])sent.add(tick);
  const liveTick=Math.floor((Date.now()+offset-state.startAt)/1000);
  if(liveTick>=0&&liveTick<30&&sent.has(liveTick)&&holes[state.events?.[liveTick]?.hole])holes[state.events[liveTick].hole].className='hole hit';
  draw();if(!timer)timer=setInterval(draw,60);
 });
})();
