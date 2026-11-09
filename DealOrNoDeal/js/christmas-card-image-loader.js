/* Christmas card artwork loader · presentation only.
 * Warm up the next images before the card zoom begins. Some uploaded cards
 * are multi-megabyte PNGs, which can take longer than a 1.8s reveal.
 * No API, no Firestore, no account mutations, no generated asset URLs.
 */
(()=>{
 'use strict';
 const FALLBACK='./assets/weihnachts_event/card-back-winter.svg';
 // Some Hammer-Bingo artwork exceeds 3 MB: allow slower mobile connections time to decode.
 const MAX_LOAD_MS=45000;
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
 // Retry once when a visible <img> fails, instead of replacing a valid
 // already-awarded card with its winter back at the first transient network error.
 // The retry is local image traffic only; no game-state read or prize request.
 function guard(img){
  if(!img)return;
  img.onerror=()=>{
   const src=String(img.getAttribute('src')||'');
   if(!src||src===FALLBACK)return;
   const original=String(img.dataset?.cardArtwork||src.split('?')[0]);
   if(!img.dataset?.cardRetry){
    if(img.dataset)img.dataset.cardRetry='once';
    const separator=original.includes('?')?'&':'?';
    // A different URL bypasses a transient browser/CDN error for this image only.
    img.src=original+separator+'art_retry=1';
    return;
   }
   img.onerror=null;
   img.src=FALLBACK;
   img.title='Das Kartenmotiv konnte nicht geladen werden. Erneut laden möglich.';
   img.classList.add('card-art-unavailable');
  };
  img.onload=()=>{
   if(img.naturalWidth>0&&img.getAttribute('src')!==FALLBACK){
    img.classList.remove('card-art-unavailable');
   }
  };
 }
 function show(img,src){
  if(!img)return;
  const url=String(src||'');
  if(img.dataset){img.dataset.cardArtwork=url;delete img.dataset.cardRetry;}
  img.src=url;
 }
 // Reattempt a slow card without ever exposing another player's unrevealed cards.
 async function retry(img,source){
  const url=String(source||'');
  if(!img||!url||url===FALLBACK)return {src:FALLBACK,ok:false};
  const result=await load(url);
  if(String(img.dataset?.cardArtwork||'')!==url)return result;
  if(result.ok){
   img.classList.remove('card-art-unavailable');
   show(img,url);
  }
  return result;
 }
 window.ChristmasCardImages=Object.freeze({load,prefetch,guard,show,retry,FALLBACK});
})();