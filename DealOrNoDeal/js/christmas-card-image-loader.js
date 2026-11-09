/* Christmas card artwork loader · presentation only.
 * Warm up the next images before the card zoom begins. Some uploaded cards
 * are multi-megabyte PNGs, which can take longer than a 1.8s reveal.
 * No API, no Firestore, no account mutations, no generated asset URLs.
 */
(()=>{
 'use strict';
 const FALLBACK='./assets/weihnachts_event/card-back-winter.svg';
 const MAX_LOAD_MS=15000;
 const pending=new Map();
 function load(source){
  const url=String(source||'');
  if(!url||url===FALLBACK)return Promise.resolve({src:FALLBACK,ok:false});
  if(pending.has(url))return pending.get(url);
  const promise=new Promise(resolve=>{
   const img=new Image();
   let settled=false;
   const finish=ok=>{
    if(settled)return;
    settled=true;
    clearTimeout(timeout);
    img.onload=null;
    img.onerror=null;
    if(!ok)pending.delete(url); // A later pack may retry a temporary network error.
    resolve({src:ok?url:FALLBACK,ok});
   };
   const timeout=setTimeout(()=>finish(false),MAX_LOAD_MS);
   img.onerror=()=>finish(false);
   img.onload=()=>{
    if(!(img.naturalWidth>0)){finish(false);return}
    // Ensure decoding has completed before the dramatic card zoom appears.
    if(typeof img.decode==='function'){
     Promise.resolve().then(()=>img.decode()).then(()=>finish(true),()=>finish(img.naturalWidth>0));
    }else finish(true);
   };
   img.src=url;
   if(img.complete&&img.naturalWidth>0)img.onload();
  });
  pending.set(url,promise);
  return promise;
 }
 function prefetch(cards,from,imageFor,count=2){
  if(!Array.isArray(cards)||typeof imageFor!=='function')return;
  for(let i=Math.max(0,from);i<Math.min(cards.length,from+count);i++){
   void load(imageFor(cards[i]));
  }
 }
 // Never leave an empty/broken thumbnail, even after a transient decode error.
 function guard(img){
  if(!img)return;
  img.onerror=()=>{
   if(img.getAttribute('src')===FALLBACK)return;
   img.onerror=null;
   img.src=FALLBACK;
   img.title='Das Kartenmotiv konnte nicht geladen werden.';
   img.classList.add('card-art-unavailable');
  };
 }
 window.ChristmasCardImages=Object.freeze({load,prefetch,guard,FALLBACK});
})();