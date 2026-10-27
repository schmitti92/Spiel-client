/* Extracted from SKYJO entry pages; execution order preserved. */
/* Complete-clear bonus: only an entirely empty board (including extras) qualifies.
   Applied in the authoritative scoring functions, not merely in the display. */
(function(){
 let tries=0;
 const install=setInterval(function(){
   tries++;
   if(typeof rawRoundScore==='function' && typeof scoreItemsForPlayer==='function'){
     clearInterval(install);
     const originalScore=rawRoundScore;
     const originalItems=scoreItemsForPlayer;
     const cleared=function(p){
       return !!p && Array.isArray(p.grid) && p.grid.length>0 &&
         p.grid.every(function(c){return c==null}) &&
         (!Array.isArray(p.extras)||p.extras.every(function(c){return c==null}));
     };
     rawRoundScore=function(p){return originalScore(p)-(cleared(p)?20:0)};
     scoreItemsForPlayer=function(p){
       const items=originalItems(p);
       if(cleared(p))items.push({kind:'bonus',value:-20,label:'Alle Karten abgebaut'});
       return items;
     };
   }else if(tries>=120)clearInterval(install);
 },100);
})();
