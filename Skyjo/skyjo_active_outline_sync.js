/* Extracted from SKYJO entry pages; execution order preserved. */
/* Applies the same outer gold outline in 4x3 and 5x3, including after rerenders. */
(function(){
 const gold='4px solid #ffd12e';
 function sync(){
   document.querySelectorAll('section.player').forEach(function(el){
     if(el.classList.contains('active')){
       el.style.setProperty('border',gold,'important');
       el.style.setProperty('outline','none','important');
       el.style.setProperty('box-shadow','0 0 0 2px #fff1a2, 0 0 17px 5px #ffbd30b0','important');
       el.style.setProperty('border-radius','19px','important');
     }else{
       ['border','outline','box-shadow','border-radius'].forEach(function(prop){
         if(el.style.getPropertyPriority(prop)==='important')el.style.removeProperty(prop);
       });
     }
   });
 }
 let pending=false;
 const schedule=function(){if(!pending){pending=true;requestAnimationFrame(function(){pending=false;sync()})}};
 document.addEventListener('DOMContentLoaded',function(){
   const root=document.getElementById('app');
   if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
   sync();
 });
})();
