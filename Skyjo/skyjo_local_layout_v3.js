/* Local-only JSON layout geometry; does not alter game state. */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('mode')!=='local')return;
fetch('skyjo_layout_local_v3.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('missing layout');return r.json()}).then(data=>{
 const ids=['stats','player1','hand','deck','player2','player3','status','reactions','pause'];
 if(data.version!==3||!Array.isArray(data.blocks)||data.blocks.length!==ids.length)throw Error('invalid schema');
 const m=new Map(data.blocks.map(b=>[b.id,b]));
 if(m.size!==ids.length||ids.some(id=>!m.has(id)))throw Error('missing or duplicate block');
 for(const b of m.values())if(!ids.includes(b.id)||!['x','y','w','h','z'].every(k=>Number.isFinite(b[k]))||b.w<=0||b.h<=0)throw Error('invalid geometry');
 const a=m.get('player1'),h=m.get('hand'),d=m.get('deck'),b=m.get('player2'),c=m.get('player3');
 const root=document.documentElement;
 root.style.setProperty('--skyjo-v3-columns',[a.w,Math.max(h.w,d.w),Math.max(b.w,c.w)].map(x=>x+'fr').join(' '));
 root.style.setProperty('--skyjo-v3-center-rows',h.h+'fr '+d.h+'fr');
 root.style.setProperty('--skyjo-v3-rival-rows',b.h+'fr '+c.h+'fr');
 // Horizontal spacing follows the gaps in the supplied canvas (37.1 -> 40.2 -> 65.8).
 const firstGap=Math.max(0,Math.min(h.x,d.x)-(a.x+a.w));
 const secondGap=Math.max(0,Math.min(b.x,c.x)-Math.max(h.x+h.w,d.x+d.w));
 const gap=Math.max(0,Math.min(5,(firstGap+secondGap)/2));
 root.style.setProperty('--skyjo-v3-column-gap','clamp(8px,'+gap+'vw,48px)');
 const centerGap=Math.max(0,d.y-(h.y+h.h));
 const rivalGap=Math.max(0,c.y-(b.y+b.h));
 root.style.setProperty('--skyjo-v3-center-gap','clamp(5px,'+Math.min(4,centerGap)+'vh,28px)');
 root.style.setProperty('--skyjo-v3-rival-gap','clamp(5px,'+Math.min(4,rivalGap)+'vh,28px)');
 // Expose the original geometry for diagnostics and later exact-position mapping.
 // Percentages are relative to the user's original design canvas, not the viewport.
 for(const block of m.values()){
   const prefix='--skyjo-v3-'+block.id+'-';
   for(const key of ['x','y','w','h'])root.style.setProperty(prefix+key,block[key]+'%');
   root.style.setProperty(prefix+'z',String(block.z));
 }
 // Read-only mapping for the HUD blocks. Never reparent controls or replace
 // their contents: that would risk breaking click handlers and game state.
 const hudSelectors={
   stats:'.status.premium-status .stat',
   status:'.status.premium-status',
   reactions:'.bottom-actions .emoji-reaction-bar',
   pause:'[data-action="pause"], #pauseBtn, .pause-btn'
 };
 if(new URLSearchParams(location.search).has('layoutDebug')){
   const report=()=>console.table(Object.entries(hudSelectors).map(([id,selector])=>{
     const el=document.querySelector(selector);
     const b=m.get(id);
     // The two status-related JSON blocks still share one real container.
     // Flag this instead of treating the measurement as an exact mapping.
     const mapping=id==='stats'?'first-status-tile-provisional':id==='status'?'full-status-bar':'candidate';
     const rect=el&&el.getBoundingClientRect();
     const px=v=>Math.round(v*10)/10;
     const actualX=rect?px(rect.left/window.innerWidth*100):null;
     const actualY=rect?px(rect.top/window.innerHeight*100):null;
     const actualW=rect?px(rect.width/window.innerWidth*100):null;
     const actualH=rect?px(rect.height/window.innerHeight*100):null;
     return {id,selector,mapping,found:!!el,targetX:b.x,targetY:b.y,targetW:b.w,targetH:b.h,
       actualX,actualY,actualW,actualH,
       deltaX:rect?px(actualX-b.x):null,deltaY:rect?px(actualY-b.y):null,
       deltaW:rect?px(actualW-b.w):null,deltaH:rect?px(actualH-b.h):null};
   }));
   const startReport=()=>{
     let pending=false;
     const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;report()})};
     schedule();
     const app=document.getElementById('app');
     if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
     window.addEventListener('resize',schedule,{passive:true});
   };
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startReport,{once:true});
   else startReport();
 }
 // Optional design overlay: ?layoutPreview=1. No game DOM is repositioned.
 if(new URLSearchParams(location.search).get('layoutPreview')==='1'){
   const renderPreview=()=>{
     const board=document.querySelector('.table-area.three-player-layout');
     if(!board||!document.body.classList.contains('skyjo-local-layout-ready'))return;
     let overlay=document.getElementById('skyjo-v3-preview');
     if(!overlay){
       overlay=document.createElement('div');overlay.id='skyjo-v3-preview';
       overlay.style.cssText='position:fixed;pointer-events:none;z-index:2147483000;overflow:visible;font:600 11px system-ui';
       document.body.append(overlay);
     }
     // The imported x/y coordinates describe the whole layout canvas,
     // including the footer. Use the visible viewport, not only the board.
     overlay.style.left='0px';overlay.style.top='0px';
     overlay.style.width=window.innerWidth+'px';
     overlay.style.height=window.innerHeight+'px';
     // Preview remains noninteractive; no game controls are moved.
     overlay.replaceChildren();
     for(const b of data.blocks){
       if(!b.visible)continue;
       const el=document.createElement('div');
       el.style.cssText='position:absolute;box-sizing:border-box;border:2px dashed #79e5ff;background:#27c8ed18;color:white;text-shadow:0 1px 3px black;padding:3px;overflow:hidden';
       el.style.left=b.x+'%';el.style.top=b.y+'%';
       el.style.width=b.w+'%';el.style.height=b.h+'%';
       el.textContent=b.name||b.id;
       overlay.append(el);
     }
   };
   (document.readyState==='loading'?document.addEventListener.bind(document,'DOMContentLoaded'):fn=>fn())(()=>{
     let scheduled=false;
     const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;renderPreview()})};
     schedule();
     window.addEventListener('resize',schedule,{passive:true});
     window.addEventListener('scroll',schedule,{passive:true});
     const app=document.getElementById('app');
     if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
   },{once:true});
 }
 root.dataset.skyjoLocalLayout='v3';
 if(new URLSearchParams(location.search).has('layoutDebug')){
   console.table(data.blocks.map(({id,x,y,w,h,z})=>({id,x,y,w,h,z})));
 }
}).catch(e=>console.warn('[SKYJO local layout] Existing layout retained:',e.message));
})();
