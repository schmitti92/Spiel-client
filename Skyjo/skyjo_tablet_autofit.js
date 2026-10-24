/* Tablet fullscreen auto-fit for SKYJO: visual scaling only. */
(()=>{'use strict';
let busy=false,last=1;
const tablet=()=>matchMedia('(pointer:coarse) and (orientation:landscape) and (max-width:1400px)').matches;
function fit(){
 if(busy)return;busy=true;
 requestAnimationFrame(()=>{
  try{
   const root=document.querySelector('#app');
   if(!root)return;
   if(!tablet()||!document.body.classList.contains('is-playing')){
    root.style.zoom='';document.documentElement.style.overflow='';document.body.style.overflow='';last=1;return;
   }
   root.style.zoom='1';
   const viewport=window.visualViewport?.height||window.innerHeight;
   const width=window.visualViewport?.width||window.innerWidth;
   const naturalH=Math.max(root.scrollHeight,root.getBoundingClientRect().height);
   const naturalW=Math.max(root.scrollWidth,root.getBoundingClientRect().width);
   const reserve=3;
   let scale=Math.min(1,(viewport-reserve)/Math.max(1,naturalH),(width-reserve)/Math.max(1,naturalW));
   scale=Math.min(1,Math.max(.35,Math.floor(scale*1000)/1000));
   root.style.zoom=String(scale);
   // A zoom change may reflow grids. Re-evaluate the actual rendered height.
   for(let i=0;i<3;i++){
    const actual=root.getBoundingClientRect();
    const overflow=Math.max(actual.bottom,document.documentElement.scrollHeight)-viewport;
    if(overflow<=2)break;
    scale=Math.max(.35,scale*Math.max(.85,(viewport-reserve)/(actual.height+Math.max(0,overflow))));
    root.style.zoom=String(scale);
   }
   // Use remaining vertical space when the first pass was overly conservative.
   const finalBox=root.getBoundingClientRect();
   const free=Math.max(0,viewport-3-finalBox.bottom);
   if(free>14&&scale<1&&finalBox.height>0){
     const boost=Math.min(1/scale,1+free/Math.max(1,finalBox.height)*.65);
     scale=Math.min(1,scale*boost);
     root.style.zoom=String(scale);
     if(root.getBoundingClientRect().bottom>viewport-2){scale*=Math.max(.9,(viewport-3)/root.getBoundingClientRect().bottom);root.style.zoom=String(scale);}
   }
   last=scale;
   document.documentElement.style.overflow='hidden';
   document.body.style.overflow='hidden';
   if(window.scrollY)window.scrollTo(0,0);
  }finally{busy=false;}
 });
}
let timer;
function schedule(){clearTimeout(timer);timer=setTimeout(fit,90);}
const observer=new MutationObserver(schedule);
const start=()=>{const root=document.querySelector('#app');if(root)observer.observe(root,{childList:true,subtree:false});schedule();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.addEventListener('resize',schedule);
window.addEventListener('orientationchange',()=>setTimeout(fit,350));
document.addEventListener('fullscreenchange',()=>setTimeout(fit,180));
window.visualViewport?.addEventListener('resize',schedule);
setInterval(()=>{if(tablet()&&document.body.classList.contains('is-playing'))schedule();},4000);
})();
