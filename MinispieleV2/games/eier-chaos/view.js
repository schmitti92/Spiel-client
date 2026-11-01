/** Eier-Chaos offline view. Shared engine owns rules; this view owns animation and pointer input only. */
import {eggAt} from './game.js';
export function mount(container,host){
 const style=document.createElement('style');
 style.textContent=`#egg-stage{position:relative;overflow:hidden;touch-action:none;height:min(65dvh,560px);min-height:300px;border-radius:22px;border:3px solid #9ed4f5;background:linear-gradient(#80c9f6,#d6f4ff 72%,#8cbd69 73%,#4c8945);user-select:none}#egg-stage .egg{position:absolute;font-size:clamp(24px,4vw,39px);transform:translate(-50%,-50%);pointer-events:none}#egg-basket{position:absolute;bottom:2%;left:50%;transform:translateX(-50%);font-size:clamp(58px,9vw,88px);pointer-events:none}#egg-hud{display:flex;justify-content:space-between;gap:10px;font-weight:800;font-size:clamp(18px,3vw,26px)}#egg-controls{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}#egg-controls button{padding:12px 18px;border-radius:12px;border:0;background:#f2c46d;color:#18283c;font-weight:800}#egg-result{white-space:pre-wrap;font-size:20px;font-weight:700}`;
 const heading=document.createElement('h2');heading.textContent='🥚 Eier-Chaos';
 const info=document.createElement('p');info.textContent='60 Sekunden · Ziehe den Korb mit dem Finger und fange die fallenden Eier. Alle Spieler bekommen dieselbe Eierfolge. Verpasste Eier geben keine Minuspunkte.';
 const hud=document.createElement('div');hud.id='egg-hud';
 const stage=document.createElement('div');stage.id='egg-stage';stage.setAttribute('aria-label','Spielfeld: Korb mit Finger bewegen');
 const basket=document.createElement('div');basket.id='egg-basket';basket.textContent='🧺';stage.append(basket);
 const controls=document.createElement('div');controls.id='egg-controls';
 const start=document.createElement('button');start.textContent='▶ Spiel starten';
 const again=document.createElement('button');again.textContent='↻ Nochmal spielen';
 const back=document.createElement('button');back.textContent='← Zur Auswahl';
 controls.append(start,again,back);
 const result=document.createElement('div');result.id='egg-result';result.setAttribute('aria-live','polite');
 container.append(style,heading,info,hud,stage,controls,result);
 let running=false,raf=0,last=0,carry=0,disposed=false;
 const owner=()=>host.snapshot().players[0].id;
 const human=()=>host.snapshot().players.find(p=>p.type==='human')?.id;
 const move=e=>{
  if(!running||!human())return;
  const rect=stage.getBoundingClientRect();
  host.dispatch(human(),{type:'move',x:Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))});
 };
 stage.addEventListener('pointerdown',e=>{stage.setPointerCapture(e.pointerId);move(e)});
 stage.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')move(e)});
 function stop(){running=false;cancelAnimationFrame(raf);raf=0;}
 function frame(now){
  if(!running||disposed)return;
  carry+=Math.min(100,Math.max(0,now-last));last=now;
  while(carry>=50&&running){
   carry-=50;
   const snap=host.snapshot();
   if(snap.state.finished){stop();break}
   for(const p of snap.players.filter(p=>p.type==='bot'))host.botTurn(p.id);
   host.dispatch(owner(),{type:'tick',ms:50});
  }
  if(running)raf=requestAnimationFrame(frame);
 }
 start.onclick=()=>{if(running)return;running=true;last=performance.now();carry=0;start.disabled=true;raf=requestAnimationFrame(frame)};
 again.onclick=()=>{stop();host.restart();result.textContent='';};
 back.onclick=()=>{stop();disposed=true;host.exit()};
 return {render(snapshot){
  const s=snapshot.state,player=human()||owner();
  hud.textContent='⏱ '+Math.ceil((60000-s.elapsedMs)/1000)+' s  ·  🥚 '+(s.scores[player]||0)+' Punkte';
  basket.style.left=(s.baskets[player]*100)+'%';
  stage.querySelectorAll('.egg').forEach(el=>el.remove());
  for(let i=Math.max(0,Math.floor((s.elapsedMs-1700)/520));i<=Math.floor(s.elapsedMs/520);i++){
   const e=eggAt(i),progress=(s.elapsedMs-e.spawnMs)/(e.landMs-e.spawnMs);
   if(progress<0||progress>=1||e.spawnMs>=60000)continue;
   const node=document.createElement('div');node.className='egg';node.textContent='🥚';node.style.left=(e.x*100)+'%';node.style.top=(progress*83+4)+'%';stage.append(node);
  }
  if(snapshot.result){
   stop();result.textContent='🏆 Ergebnis\n'+snapshot.result.results.sort((a,b)=>b.score-a.score).map((p,i)=>(i+1)+'. '+(p.playerId===player?'Du':p.playerId)+' – '+p.score+' Eier').join('\n');
  }
  start.disabled=running||s.finished;again.hidden=!s.finished;
 }};
}
