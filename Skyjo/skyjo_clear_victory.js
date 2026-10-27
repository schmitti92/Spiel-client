/* Extracted from SKYJO entry pages; execution order preserved. */
(function(){
 const seen=new Set();
 function celebrate(){
   const seq=(typeof state!=='undefined'&&state)?state.scoreSequence:null;
   if(!seq||!seq.id||seen.has(seq.id))return;
   seen.add(seq.id);
   const winners=(seq.players||[]).filter(function(p){return Array.isArray(p.gridSnapshot)&&p.gridSnapshot.length>0&&p.gridSnapshot.every(function(c){return c==null})&&(!Array.isArray(p.openingExtras)||!p.openingExtras.length||!(typeof state!=='undefined'&&state.players&&state.players[p.index]&&state.players[p.index].extras||[]).some(Boolean))});
   if(!winners.length)return;
   let index=0;
   function show(){
     if(index>=winners.length)return;
     const player=winners[index++];
     const layer=document.createElement('div');
     layer.className='skyjo-clear-victory';
     layer.setAttribute('role','status');
     const panel=document.createElement('div');
     panel.className='skyjo-clear-panel';
     const crown=document.createElement('div');crown.className='skyjo-clear-crown';crown.textContent='🏆';
     const title=document.createElement('div');title.className='skyjo-clear-title';title.textContent='PERFEKT ABGERÄUMT!';
     const name=document.createElement('div');name.className='skyjo-clear-name';name.textContent=player.name||'Spieler';
     const score=document.createElement('div');score.className='skyjo-clear-score';score.textContent='−20 PUNKTE';
     panel.append(crown,title,name,score);layer.append(panel);
     if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
       const colors=['#ffdb70','#fff1b5','#65e7d3','#ffffff','#f6a13b'];
       for(let i=0;i<75;i++){const p=document.createElement('i');p.className='skyjo-clear-particle';p.style.setProperty('--color',colors[i%colors.length]);p.style.setProperty('--x',Math.round((Math.random()-.5)*window.innerWidth*1.6)+'px');p.style.setProperty('--y',Math.round((Math.random()-.5)*window.innerHeight*1.5)+'px');p.style.setProperty('--rot',Math.round(Math.random()*960)+'deg');p.style.setProperty('--duration',(1.3+Math.random()*1.4)+'s');p.style.setProperty('--delay',(Math.random()*.45)+'s');layer.append(p)}
     }
     document.body.append(layer);
     if(navigator.vibrate)try{navigator.vibrate([70,50,120,70,170])}catch(_e){}
     setTimeout(function(){layer.remove();show()},3500);
   }
   show();
 }
 let queued=false;
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;celebrate()})}
 document.addEventListener('DOMContentLoaded',function(){
   const app=document.getElementById('app');
   if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:false});
   schedule();
 });
})();
