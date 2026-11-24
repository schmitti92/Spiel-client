// Isolated board-only zoom and pan, preserving all geometry.
export function createTouchViewport(svg,out,inside,reset){
 let scale=1,x=0,y=0,gesture=null;const pointers=new Map();
 const render=()=>{const side=1000/scale;x=Math.max(0,Math.min(1000-side,x));y=Math.max(0,Math.min(1000-side,y));svg.setAttribute('viewBox',[x,y,side,side].join(' '));reset.textContent=Math.round(scale*100)+' %';};
 const zoom=(next)=>{const old=1000/scale;scale=Math.max(1,Math.min(4,next));const side=1000/scale;x+=(old-side)/2;y+=(old-side)/2;render();};
 out.onclick=()=>zoom(scale/1.3);inside.onclick=()=>zoom(scale*1.3);reset.onclick=()=>{scale=1;x=0;y=0;render();};
 svg.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=pointers.values();gesture={scale,x,y,d:Math.hypot(a.x-b.x,a.y-b.y),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};for(const id of pointers.keys())try{svg.setPointerCapture(id)}catch{}}});
 svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!gesture||pointers.size!==2)return;const [a,b]=pointers.values(),rect=svg.getBoundingClientRect(),px=Math.min(rect.width,rect.height);scale=Math.max(1,Math.min(4,gesture.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,gesture.d)));const old=1000/gesture.scale,side=1000/scale;x=gesture.x+(old-side)/2-((a.x+b.x)/2-gesture.cx)*side/px;y=gesture.y+(old-side)/2-((a.y+b.y)/2-gesture.cy)*side/px;render();});
 const end=e=>{pointers.delete(e.pointerId);if(pointers.size<2)gesture=null;};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
}
