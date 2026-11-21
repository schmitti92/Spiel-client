/**
 * DOG Lichtertal · independent panel zoom.
 * Only the active right-side event panel changes size; the original ornate
 * eight-tab navigation is never transformed or re-parented.
 */
export function initChristmasContentZoom(){
 const main=document.getElementById('event-main');
 const sidebar=document.querySelector('.event-layout > .event-sidebar');
 if(!main||!sidebar)return {reset:()=>{}};
 const MIN=1,MAX=3.5;
 let scale=1,pinch=null,baseWidth=0,active=null;
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const panel=()=>main.querySelector('.event-panel:not([hidden])');
 const controls=document.createElement('div');
 controls.className='event-content-zoom-controls';
 controls.setAttribute('role','group');
 controls.setAttribute('aria-label','Nur den Eventinhalt vergrößern');
 const make=(symbol,label,handler)=>{
  const button=document.createElement('button');
  button.type='button';button.textContent=symbol;button.setAttribute('aria-label',label);
  button.addEventListener('click',handler);controls.append(button);return button;
 };
 const out=make('−','Rechten Eventinhalt verkleinern',()=>step(-.25));
 const amount=document.createElement('output');
 amount.className='event-content-zoom-level';
 amount.textContent='100 %';amount.setAttribute('aria-live','off');
 const resetButton=make('↺','Zoom des rechten Inhalts auf 100 Prozent zurücksetzen',()=>reset(false));
 const plus=make('+','Rechten Eventinhalt vergrößern',()=>step(.25));
 controls.insertBefore(amount,resetButton);
 main.insertBefore(controls,main.firstChild);
 function updateControls(){
  amount.textContent=Math.round(scale*100)+' %';
  out.disabled=scale<=MIN;plus.disabled=scale>=MAX;
  resetButton.disabled=scale===1;
 }
 function clearZoom(target){
  if(target){
   target.style.removeProperty('zoom');
   target.style.removeProperty('width');
   target.style.removeProperty('max-width');
   target.classList.remove('event-content-is-zoomed');
  }
 }
 function setZoom(next,focusX=main.clientWidth/2,focusY=main.clientHeight/2,anchor=null){
  const target=panel();
  if(!target)return;
  if(active!==target){clearZoom(active);active=target;scale=1;baseWidth=0;}
  const before=scale,after=clamp(Math.round(next*1000)/1000,MIN,MAX);
  if(after===before)return;
  // Pinch anchor is a point in the *unzoomed* panel. Track it across scale
  // changes and finger movement, so the area under the fingers stays visible.
  const x=anchor?.x??((main.scrollLeft+focusX)/before);
  const y=anchor?.y??((main.scrollTop+focusY)/before);
  if(after>1){
   if(!baseWidth)baseWidth=Math.max(main.clientWidth,target.getBoundingClientRect().width/before);
   target.style.width=baseWidth+'px';
   target.style.maxWidth='none';
   target.style.zoom=String(after);
   target.classList.add('event-content-is-zoomed');
  }else{
   clearZoom(target);
   baseWidth=0;
  }
  scale=after;
  main.scrollLeft=Math.max(0,x*after-focusX);
  main.scrollTop=Math.max(0,y*after-focusY);
  updateControls();
 }
 function step(change){setZoom(scale+change);}
 function reset(scrollTop=false){
  clearZoom(active);active=panel();clearZoom(active);
  scale=1;pinch=null;baseWidth=0;
  main.scrollLeft=0;
  if(scrollTop)main.scrollTop=0;
  updateControls();
 }
 function centerOf(touches){
  const rect=main.getBoundingClientRect();
  return {x:(touches[0].clientX+touches[1].clientX)/2-rect.left,
          y:(touches[0].clientY+touches[1].clientY)/2-rect.top};
 }
 function distance(touches){
  return Math.hypot(touches[0].clientX-touches[1].clientX,
                    touches[0].clientY-touches[1].clientY);
 }
 function canPinch(event){
  // Do not hijack a scratch-card rub gesture or a native form control/dialog.
  return !document.body.classList.contains('scratch-ticket-open')
   &&!event.target.closest('dialog,[role="dialog"],canvas,input,textarea,select');
 }
 main.addEventListener('touchstart',event=>{
  if(event.touches.length!==2||!canPinch(event)){pinch=null;return;}
  const target=panel();if(!target)return;
  const c=centerOf(event.touches);
  pinch={distance:Math.max(1,distance(event.touches)),scale,
         x:(main.scrollLeft+c.x)/scale,y:(main.scrollTop+c.y)/scale};
 },{passive:true});
 main.addEventListener('touchmove',event=>{
  if(!pinch||event.touches.length!==2)return;
  if(event.cancelable)event.preventDefault();
  const c=centerOf(event.touches);
  const targetZoom=clamp(pinch.scale*distance(event.touches)/pinch.distance,MIN,MAX);
  setZoom(targetZoom,c.x,c.y,{x:pinch.x,y:pinch.y});
  // At the zoom boundary, two-finger movement must still pan the right pane.
  main.scrollLeft=Math.max(0,pinch.x*scale-c.x);
  main.scrollTop=Math.max(0,pinch.y*scale-c.y);
 },{passive:false});
 const endPinch=event=>{if(event.touches.length<2)pinch=null;};
 main.addEventListener('touchend',endPinch,{passive:true});
 main.addEventListener('touchcancel',endPinch,{passive:true});
 // Trackpad pinch / Ctrl + mouse wheel should also target only the right side.
 main.addEventListener('wheel',event=>{
  if(!event.ctrlKey||document.body.classList.contains('scratch-ticket-open'))return;
  if(event.target.closest('dialog,[role="dialog"]'))return;
  event.preventDefault();
  const rect=main.getBoundingClientRect();
  setZoom(scale*Math.exp(-event.deltaY*.008),event.clientX-rect.left,event.clientY-rect.top);
 },{passive:false});
 // Each tab starts at normal size. A new tab must never inherit the old zoom.
 const tabButtons=[...sidebar.querySelectorAll('[data-tab]')];
 const observer=new MutationObserver(()=>{
  const current=panel();
  if(current!==active)reset(true);
 });
 tabButtons.forEach(button=>observer.observe(button,{attributes:true,attributeFilter:['aria-selected']}));
 window.addEventListener('resize',()=>{
  if(scale>1){const current=scale;reset(false);setZoom(current);}
 });
 updateControls();
 active=panel();
 return {reset:()=>reset(false),getScale:()=>scale};
}
