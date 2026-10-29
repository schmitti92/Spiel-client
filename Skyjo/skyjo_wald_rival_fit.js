/* Wald V18: Maximal große Gegnerkarten im Originalformat 1:1.37. */
(()=>{'use strict';
const selector='.table-area.three-player-layout .mini-seat';
const active=()=>document.body.classList.contains('is-playing')&&document.body.dataset.skyjoLocalBoard==='wald'&&innerWidth>=900&&matchMedia('(orientation:landscape)').matches;
let scheduled=false,observed=new WeakSet(),ro;
function fit(){
 scheduled=false;if(!active())return;
 const seats=[...document.querySelectorAll(selector)];
 let reference=null;
 seats.forEach((seat,index)=>{
  const grid=seat.querySelector('.grid'),host=grid?.closest('.gridwrap');
  if(!grid||!host)return;
  if(!observed.has(host)){ro.observe(host);observed.add(host)}
  const rect=host.getBoundingClientRect(),s=getComputedStyle(host);
  const width=rect.width-(parseFloat(s.paddingLeft)||0)-(parseFloat(s.paddingRight)||0);
  const height=rect.height-(parseFloat(s.paddingTop)||0)-(parseFloat(s.paddingBottom)||0);
  const gap=2,ratio=1.37;
  let cw=width>=80&&height>=100?Math.floor(Math.min((width-3*gap-2)/4,(height-2*gap-2)/(3*ratio))):0;
  if(index===0&&cw>=28)reference=cw;
  if(index>0&&reference!==null&&(cw<28||cw<reference*.55))cw=reference;
  if(cw<28)return;
  const ch=Math.floor(cw*ratio);
  if(grid.style.getPropertyValue('--wald-rival-w')!==cw+'px'){
   grid.style.setProperty('--wald-rival-w',cw+'px');
   grid.style.setProperty('--wald-rival-h',ch+'px');
  }
 });
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(fit)}}
function init(){
 ro=new ResizeObserver(schedule);ro.observe(document.body);
 const root=document.getElementById('app')||document.body;
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
 addEventListener('resize',schedule);schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
