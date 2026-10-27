/* Local-only JSON layout geometry; does not alter game state. */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('mode')!=='local')return;
fetch('skyjo_layout_local_v3.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('missing layout');return r.json()}).then(data=>{
 const ids=['stats','player1','hand','deck','player2','player3','status','reactions','pause'];
 if(data.version!==3||!Array.isArray(data.blocks)||data.blocks.length!==ids.length)throw Error('invalid schema');
 const m=new Map(data.blocks.map(b=>[b.id,b]));
 if(ids.some(id=>!m.has(id)))throw Error('missing block');
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
 root.dataset.skyjoLocalLayout='v3';
 if(new URLSearchParams(location.search).has('layoutDebug')){
   console.table(data.blocks.map(({id,x,y,w,h,z})=>({id,x,y,w,h,z})));
 }
}).catch(e=>console.warn('[SKYJO local layout] Existing layout retained:',e.message));
})();
