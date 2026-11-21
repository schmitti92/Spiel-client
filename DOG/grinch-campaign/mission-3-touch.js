/**
 * DOG Grinch Mission 3 – board-only zoom / pan controls.
 * Does not modify or read any game rules. Outside the board, normal scrolling
 * remains intact. Pinch and drag work on phones, tablets and desktop pointers.
 */
export const MISSION3_MIN_ZOOM=1;
export const MISSION3_MAX_ZOOM=3.4;
const limit=(value,min,max)=>Math.min(max,Math.max(min,value));
const finite=n=>Number.isFinite(n)?n:0;
export function clampMission3View(view,width,height){
 const scale=limit(finite(view?.scale)||1,MISSION3_MIN_ZOOM,MISSION3_MAX_ZOOM);
 const maxX=Math.max(0,(scale-1)*Math.max(0,finite(width))/2);
 const maxY=Math.max(0,(scale-1)*Math.max(0,finite(height))/2);
 return {scale,x:limit(finite(view?.x),-maxX,maxX),y:limit(finite(view?.y),-maxY,maxY)};
}
/** Zoom around a focus point (local viewport pixels, origin top-left). */
export function zoomMission3At(view,targetScale,anchor,width,height){
 const current=clampMission3View(view,width,height);
 const scale=limit(targetScale,MISSION3_MIN_ZOOM,MISSION3_MAX_ZOOM);
 const ratio=scale/current.scale;
 const px=(finite(anchor?.x)-width/2)-current.x;
 const py=(finite(anchor?.y)-height/2)-current.y;
 return clampMission3View({
  scale,
  x:current.x+px*(1-ratio),
  y:current.y+py*(1-ratio)
 },width,height);
}
export function createMission3BoardTouch({viewport,board,zoomIn,zoomOut,reset,level}){
 if(!viewport||!board||!zoomIn||!zoomOut||!reset||!level)throw Error('Mission 3: Zoom-Steuerung ist unvollständig.');
 let view={scale:1,x:0,y:0},isGesture=false,suppressClick=false,gestureTimer=null;
 const touches=new Map();
 const size=()=>({width:viewport.clientWidth,height:viewport.clientHeight});
 const setView=next=>{
  const {width,height}=size();
  view=clampMission3View(next,width,height);
  board.style.transform='translate3d('+view.x.toFixed(2)+'px,'+view.y.toFixed(2)+'px,0) scale('+view.scale.toFixed(3)+')';
  level.textContent=Math.round(view.scale*100)+' %';
  viewport.classList.toggle('m3-is-zoomed',view.scale>1.001);
  zoomOut.disabled=view.scale<=1.001;
  zoomIn.disabled=view.scale>=MISSION3_MAX_ZOOM-.001;
  reset.disabled=view.scale<=1.001&&Math.abs(view.x)<.5&&Math.abs(view.y)<.5;
 };
 const zoomBy=factor=>{
  const {width,height}=size();
  setView(zoomMission3At(view,view.scale*factor,{x:width/2,y:height/2},width,height));
 };
 const onDown=ev=>{
  if(ev.target.closest?.('button'))return;
  if(ev.pointerType==='mouse'&&view.scale===1)return;
  const rect=viewport.getBoundingClientRect();
  touches.set(ev.pointerId,{x:ev.clientX-rect.left,y:ev.clientY-rect.top});
  if(touches.size>1)isGesture=true;
 };
 const onMove=ev=>{
  const old=touches.get(ev.pointerId);
  if(!old)return;
  const rect=viewport.getBoundingClientRect();
  const next={x:ev.clientX-rect.left,y:ev.clientY-rect.top};
  const before=[...touches.values()];
  touches.set(ev.pointerId,next);
  const after=[...touches.values()];
  if(touches.size===2){
   const center=v=>({x:(v[0].x+v[1].x)/2,y:(v[0].y+v[1].y)/2});
   const length=v=>Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y);
   const a=center(before),b=center(after),ratio=length(before)>2?length(after)/length(before):1;
   const {width,height}=size();
   const shifted={scale:view.scale,x:view.x+b.x-a.x,y:view.y+b.y-a.y};
   setView(zoomMission3At(shifted,view.scale*ratio,b,width,height));
   isGesture=true;suppressClick=true;
   if(ev.cancelable)ev.preventDefault();
  }else if(touches.size===1&&view.scale>1.001){
   const dx=next.x-old.x,dy=next.y-old.y;
   if(Math.hypot(dx,dy)>1){
    setView({...view,x:view.x+dx,y:view.y+dy});
    if(Math.hypot(dx,dy)>3)isGesture=true;
    if(isGesture)suppressClick=true;
    if(ev.cancelable)ev.preventDefault();
   }
  }
 };
 const onUp=ev=>{
  touches.delete(ev.pointerId);
  if(touches.size===0){
   isGesture=false;
   if(suppressClick){
    clearTimeout(gestureTimer);
    gestureTimer=setTimeout(()=>{suppressClick=false;},110);
   }
  }
 };
 const onClickCapture=ev=>{
  if(suppressClick&&ev.target.closest?.('[data-piece]')){
   ev.preventDefault();ev.stopImmediatePropagation();
  }
 };
 const onWheel=ev=>{
  if(!(ev.ctrlKey||ev.metaKey))return;
  if(ev.cancelable)ev.preventDefault();
  const rect=viewport.getBoundingClientRect(),{width,height}=size();
  setView(zoomMission3At(view,view.scale*(ev.deltaY<0?1.12:.89),{
   x:ev.clientX-rect.left,y:ev.clientY-rect.top
  },width,height));
 };
 viewport.addEventListener('pointerdown',onDown,{passive:true});
 viewport.addEventListener('pointermove',onMove,{passive:false});
 viewport.addEventListener('pointerup',onUp);
 viewport.addEventListener('pointercancel',onUp);
 viewport.addEventListener('click',onClickCapture,true);
 viewport.addEventListener('wheel',onWheel,{passive:false});
 const plus=()=>zoomBy(1.32),minus=()=>zoomBy(1/1.32),home=()=>setView({scale:1,x:0,y:0});
 zoomIn.addEventListener('click',plus);zoomOut.addEventListener('click',minus);reset.addEventListener('click',home);
 const onResize=()=>setView(view);
 window.addEventListener('resize',onResize,{passive:true});
 setView(view);
 return {
  getView:()=>({...view}),setView,reset:home,
  destroy(){
   clearTimeout(gestureTimer);
   viewport.removeEventListener('pointerdown',onDown);
   viewport.removeEventListener('pointermove',onMove);
   viewport.removeEventListener('pointerup',onUp);
   viewport.removeEventListener('pointercancel',onUp);
   viewport.removeEventListener('click',onClickCapture,true);
   viewport.removeEventListener('wheel',onWheel);
   zoomIn.removeEventListener('click',plus);zoomOut.removeEventListener('click',minus);
   reset.removeEventListener('click',home);
   window.removeEventListener('resize',onResize);
  }
 };
}
