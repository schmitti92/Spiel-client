/* Wald V19: stabile Gegnerkarten, unabhängig von schrumpfenden Grid-Containern. */
(()=>{'use strict';
const ROOT='.table-area.three-player-layout';
const active=()=>document.body.classList.contains('is-playing')&&document.body.dataset.skyjoLocalBoard==='wald'&&innerWidth>=900&&matchMedia('(orientation:landscape)').matches;
let queued=false,observer;
function fit(){
 queued=false;if(!active())return;
 const seats=[...document.querySelectorAll(ROOT+' .mini-seat')];
 if(!seats.length)return;
 const entries=seats.map(seat=>{
  const grid=seat.querySelector('.grid');
  const player=seat.querySelector('.player');
  const head=player?.querySelector('.player-head');
  if(!grid||!player)return null;
  const box=player.getBoundingClientRect(),hbox=head?.getBoundingClientRect();
  const s=getComputedStyle(player);
  const w=box.width-(parseFloat(s.paddingLeft)||0)-(parseFloat(s.paddingRight)||0)-8;
  const h=box.height-(hbox?.height||0)-(parseFloat(s.paddingTop)||0)-(parseFloat(s.paddingBottom)||0)-12;
  const gap=2,ratio=1.37;
  const cw=w>100&&h>100?Math.floor(Math.min((w-3*gap)/4,(h-2*gap)/(3*ratio))):0;
  return {grid,cw,player};
 }).filter(Boolean);
 const valid=entries.map(e=>e.cw).filter(n=>n>=28);
 const reference=valid.length?Math.max(...valid):null;
 entries.forEach(e=>{
  // Gleiche Gegnerblockhöhe: Referenz verwenden, falls eine Messung kollabiert.
  let cw=e.cw>=28?e.cw:reference;
  if(!cw||cw<28)return;
  if(reference&&cw<reference*.7)cw=reference;
  const ch=Math.floor(cw*1.37);
  if(e.grid.style.getPropertyValue('--wald-rival-w')!==cw+'px'){
   e.grid.style.setProperty('--wald-rival-w',cw+'px');
   e.grid.style.setProperty('--wald-rival-h',ch+'px');
  }
 });
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(fit)}}
function init(){
 observer=new ResizeObserver(schedule);
 const root=document.getElementById('app')||document.body;
 const scan=()=>{document.querySelectorAll(ROOT+' .mini-seat .player').forEach(p=>observer.observe(p));schedule()};
 new MutationObserver(scan).observe(root,{childList:true,subtree:true});
 addEventListener('resize',schedule);scan();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
