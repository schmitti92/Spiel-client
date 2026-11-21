/**
 * Lichtertal sidebar: fit full German labels in the eight pre-existing gold
 * slots. This is presentation-only; never changes tab order, click handlers,
 * selection, the decorated SVG background, or the right-hand game viewport.
 */
export function initLichtertalSidebarTextFit(){
 const sidebar=document.querySelector('.event-layout > .event-sidebar');
 const menu=sidebar?.querySelector('.event-menu');
 if(!sidebar||!menu)return;
 const buttons=[...menu.querySelectorAll('.event-tab')];
 let pending=false;
 function fit(){
  pending=false;
  const narrow=window.matchMedia('(max-width:760px)').matches;
  for(const button of buttons){
   const title=button.querySelector('strong');
   const sub=button.querySelector('small');
   if(!title||!sub)continue;
   title.style.removeProperty('font-size');
   sub.style.removeProperty('font-size');
   if(narrow)continue; // mobile uses its native horizontal tab strip.
   const height=button.clientHeight;
   if(height<12)continue;
   let a=Number.parseFloat(getComputedStyle(title).fontSize)||12;
   let b=Number.parseFloat(getComputedStyle(sub).fontSize)||9;
   // Wait for layout following each font-size change. Both labels wrap, but
   // their combined height must remain inside one image-backed slot.
   for(let count=0;count<18;count++){
    const titleHeight=title.getBoundingClientRect().height;
    const subHeight=sub.getBoundingClientRect().height;
    const fitsHeight=titleHeight+subHeight+4<=height-4;
    const fitsWidth=title.scrollWidth<=title.clientWidth+1&&sub.scrollWidth<=sub.clientWidth+1;
    if(fitsHeight&&fitsWidth)break;
    const nextA=Math.max(9,a-.4),nextB=Math.max(7,b-.25);
    if(nextA===a&&nextB===b)break;
    a=nextA;b=nextB;
    title.style.setProperty('font-size',a+'px','important');
    sub.style.setProperty('font-size',b+'px','important');
   }
  }
 }
 function queueFit(){
  if(pending)return;
  pending=true;
  requestAnimationFrame(fit);
 }
 // Observe only the menu's dimensions (not label heights) to avoid loops.
 if(typeof ResizeObserver!=='undefined'){
  const observer=new ResizeObserver(queueFit);
  observer.observe(menu);
  observer.observe(sidebar);
 }
 window.addEventListener('resize',queueFit,{passive:true});
 window.addEventListener('orientationchange',queueFit,{passive:true});
 document.fonts?.ready?.then(queueFit);
 queueFit();
}
