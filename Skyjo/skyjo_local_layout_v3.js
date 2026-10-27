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
