/** Touch-only gestures for the player's hand cards.
 * Zoom is presentation-only, scoped to #hand, never saved to game state.
 * Board gestures remain independent and card clicks stay usable.
 */
export const HAND_ZOOM_MIN=1;
export const HAND_ZOOM_MAX=2.8;

export function handGesturePosition(start,point,distance){
 const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
 const zoom=clamp(start.zoom*(distance>0&&start.distance>0?distance/start.distance:1),HAND_ZOOM_MIN,HAND_ZOOM_MAX);
 const anchorX=(start.scrollLeft+start.midX-start.left)/start.zoom;
 const anchorY=(start.scrollTop+start.midY-start.top)/start.zoom;
 return {
  zoom,
  scrollLeft:anchorX*zoom-(point.x-start.left),
  scrollTop:anchorY*zoom-(point.y-start.top)
 };
}

export function enableHandTouchGestures(hand,{status=null}={}){
 if(!hand)return()=>{};
 const pointers=new Map();
 let zoom=1,gesture=null,ignoreClickUntil=0,dragged=false;
 const now=()=>performance.now();
 const center=()=>{
  const list=[...pointers.values()];
  return {
   x:list.reduce((sum,p)=>sum+p.x,0)/list.length,
   y:list.reduce((sum,p)=>sum+p.y,0)/list.length,
   distance:list.length>1?Math.hypot(list[0].x-list[1].x,list[0].y-list[1].y):0
  };
 };
 // Use real pixel widths so SVG/PNG card art scales on Android browsers too.
 // The initial widths come from responsive CSS; freshly rendered cards are
 // measured once, then resized without touching card IDs or game state.
 const syncCardWidths=()=>{
  for(const card of hand.querySelectorAll('.playing-card.dog-designed')){
   let width=Number(card.dataset.dogGestureBaseWidth);
   if(!(width>0)){
    card.style.removeProperty('width');
    width=card.getBoundingClientRect().width;
    if(!(width>0))continue;
    card.dataset.dogGestureBaseWidth=String(width);
   }
   card.style.setProperty('width',(width*zoom).toFixed(2)+'px','important');
  }
 };
 const watchCards=new MutationObserver(syncCardWidths);
 watchCards.observe(hand,{childList:true});
 const onWindowResize=()=>{
  for(const card of hand.querySelectorAll('.playing-card.dog-designed')){
   card.style.removeProperty('width');
   delete card.dataset.dogGestureBaseWidth;
  }
  syncCardWidths();
 };
 window.addEventListener('resize',onWindowResize);
 const showZoom=value=>{
  zoom=Math.min(HAND_ZOOM_MAX,Math.max(HAND_ZOOM_MIN,value));
  hand.style.setProperty('--dog-hand-zoom',String(Number(zoom.toFixed(3))));
  hand.classList.toggle('dog-hand-magnified',zoom>1.01);
  if(status)status.textContent='Karten '+Math.round(zoom*100)+' %';
  syncCardWidths();
 };
 const newSnapshot=()=>{
  if(pointers.size<2){gesture=null;return;}
  const mid=center(),rect=hand.getBoundingClientRect();
  gesture={zoom,scrollLeft:hand.scrollLeft,scrollTop:hand.scrollTop,
   midX:mid.x,midY:mid.y,distance:mid.distance,left:rect.left,top:rect.top};
 };
 const suppress=()=>{
  dragged=true;ignoreClickUntil=now()+450;
 };
 const down=event=>{
  if(event.pointerType!=='touch')return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY});
  if(pointers.size===2){
   suppress();
   newSnapshot();
   // Two fingers should never accidentally select a card.
   for(const id of pointers.keys()){
    try{hand.setPointerCapture(id);}catch(_){}
   }
   if(event.cancelable)event.preventDefault();
  }
 };
 const move=event=>{
  const old=pointers.get(event.pointerId);
  if(!old)return;
  pointers.set(event.pointerId,{...old,x:event.clientX,y:event.clientY});
  if(pointers.size>=2){
   if(!gesture)newSnapshot();
   if(!gesture)return;
   const mid=center();
   const target=handGesturePosition(gesture,mid,mid.distance);
   showZoom(target.zoom);
   hand.scrollLeft=target.scrollLeft;
   hand.scrollTop=target.scrollTop;
   suppress();
   if(event.cancelable)event.preventDefault();
  }else if(pointers.size===1){
   // Single-finger browsing still works after zooming or when cards overflow.
   const dx=event.clientX-old.x,dy=event.clientY-old.y;
   if((zoom>1.01||hand.scrollWidth>hand.clientWidth+3)&&Math.hypot(event.clientX-old.startX,event.clientY-old.startY)>7){
    hand.scrollLeft-=dx;
    hand.scrollTop-=dy;
    suppress();
    if(event.cancelable)event.preventDefault();
    if(!hand.hasPointerCapture?.(event.pointerId)){
     try{hand.setPointerCapture(event.pointerId);}catch(_){}
    }
   }
  }
 };
 const end=event=>{
  if(!pointers.has(event.pointerId))return;
  pointers.delete(event.pointerId);
  if(dragged)ignoreClickUntil=now()+450;
  if(pointers.size>=2)newSnapshot();
  else gesture=null;
  if(!pointers.size)dragged=false;
 };
 const suppressClick=event=>{
  if(now()<ignoreClickUntil){
   event.preventDefault();
   event.stopImmediatePropagation();
  }
 };
 const stopNativeDrag=event=>event.preventDefault();
 hand.addEventListener('pointerdown',down);
 hand.addEventListener('pointermove',move);
 hand.addEventListener('pointerup',end);
 hand.addEventListener('pointercancel',end);
 hand.addEventListener('lostpointercapture',end);
 hand.addEventListener('click',suppressClick,true);
 hand.addEventListener('dragstart',stopNativeDrag);
 showZoom(1);
 return()=>{
  hand.removeEventListener('pointerdown',down);
  hand.removeEventListener('pointermove',move);
  hand.removeEventListener('pointerup',end);
  hand.removeEventListener('pointercancel',end);
  hand.removeEventListener('lostpointercapture',end);
  hand.removeEventListener('click',suppressClick,true);
  hand.removeEventListener('dragstart',stopNativeDrag);
  watchCards.disconnect();
  window.removeEventListener('resize',onWindowResize);
  for(const card of hand.querySelectorAll('.playing-card.dog-designed')){
   card.style.removeProperty('width');
   delete card.dataset.dogGestureBaseWidth;
  }
 };
}
