/* Extracted from SKYJO entry pages; execution order preserved. */
/* Faster card transitions in online rooms, without additional server reads.
   Loaded logic is assembled asynchronously; install once it becomes available. */
(function(){
 let attempts=0;
 const timer=setInterval(function(){
   attempts++;
   if(typeof motionSpec==='function' && typeof cloud!=='undefined'){
     clearInterval(timer);
     const original=motionSpec;
     motionSpec=function(){
       const spec=original();
       if(!cloud || !cloud.enabled)return spec;
       return {...spec,
         flight:Math.min(spec.flight,125),
         settle:Math.min(spec.settle,14),
         swapGap:Math.min(spec.swapGap,12),
         pause:Math.min(spec.pause,6),
         flip:Math.min(spec.flip,95),
         revealPause:Math.min(spec.revealPause,12)};
     };
   }else if(attempts>=100)clearInterval(timer);
 },150);
})();
