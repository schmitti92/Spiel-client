// Portal soldiers are distinct from boss and ranged units. Coordinates are unchanged.
export function soldier(el,txt,p,id,parent,detail=''){
 const g=el('g',{'data-detail':detail||'Portalgegner G'+id,role:'button',tabindex:0,'aria-label':detail||'Portalgegner G'+id,class:'m4-enemy-token'},parent);
 el('circle',{cx:p.x,cy:p.y,r:20,fill:'#461e2a','fill-opacity':.65,stroke:'#ff765d','stroke-width':1.5,class:'m4-enemy-aura'},g);
 el('path',{d:'M'+p.x+' '+(p.y-17)+' l15 7 v17 l-15 9 -15 -9 v-17 Z',fill:'#431b26',stroke:'#ffae70','stroke-width':2.3},g);
 const face=el('g',{transform:'translate('+p.x+' '+p.y+')','pointer-events':'none'},g);
 el('path',{d:'M-9 -3 L-7 -11 7 -11 9 -3 Z',fill:'#b84939',stroke:'#ffbb7e','stroke-width':1},face);
 el('rect',{x:-9,y:-4,width:18,height:3,rx:1,fill:'#efb86d'},face);
 el('rect',{x:-7,y:-1,width:14,height:9,rx:2,fill:'#f4d2aa'},face);
 el('path',{d:'M-5 1 L-1 3 M5 1 L1 3',stroke:'#642d35','stroke-width':2,'stroke-linecap':'round'},face);
 el('path',{d:'M-4 6 H4',stroke:'#642d35','stroke-width':1.7},face);
 el('rect',{x:p.x-11,y:p.y+13,width:22,height:12,rx:4,fill:'#311925',stroke:'#f4a86c','stroke-width':1},g);
 txt({x:p.x,y:p.y+19},'G'+id,9,'#fff2cf',g);return g;
}
export function portalMarker(el,txt,p,closed,parent){
 const g=el('g',{'data-detail':closed?'Portal 1 · geschlossen':'Portal 1 · Spielzeugsoldaten',role:'button',tabindex:0,'aria-label':closed?'Portal 1 geschlossen':'Portal 1 aktiv'},parent);
 el('circle',{cx:p.x,cy:p.y,r:22,fill:closed?'#263b47':'#682c46','fill-opacity':.55,stroke:closed?'#84969d':'#fc9270','stroke-width':2,class:closed?'':'m4-portal-aura'},g);
 el('circle',{cx:p.x,cy:p.y,r:14,fill:closed?'#2d3f49':'#34172c',stroke:closed?'#81939c':'#ffb578','stroke-width':2.5},g);
 if(closed)txt(p,'🔒',15,'#ddd',g);else{const spin=el('g',{transform:'translate('+p.x+' '+p.y+')'},g);el('path',{d:'M0 -10 C12 -10 14 9 0 10 C-12 10 -12 -5 0 -5 C6 -5 7 4 0 4 C-3 4 -3 0 0 0',fill:'none',stroke:'#ff9b76','stroke-width':2.4,'stroke-linecap':'round'},spin);const rot=el('animateTransform',{attributeName:'transform',type:'rotate',from:'0 0 0',to:'360 0 0',dur:'3s',repeatCount:'indefinite',additive:'sum'},spin);if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)rot.remove();}
 txt({x:p.x,y:p.y+30},'P1',11,'#ffe3bc',g);return g;
}
export function portalSummary(state,turn,cap=8){
 const enemies=state.pieces.filter(p=>p.color==='enemy');
 return {count:enemies.length,remaining:state.portal1.closed?null:3-(turn%3),closed:state.portal1.closed,full:enemies.length>=cap,enemies:enemies.map(p=>({id:p.id,field:p.field}))};
}

// Motion plans are explicit and independent of rendering. No game mutations.
export function combatVisuals(board,before,after,visual=null){
 const motions=[],bursts=[];const spawnPoint=board.source.spawnPoints[0],move=visual?.action;
 const previous=new Map(before.map(p=>[p.id,p]));const next=new Map(after.map(p=>[p.id,p]));
 for(const p of before)if(p.color==='enemy'&&!next.has(p.id))bursts.push({kind:'defeat',position:p.position,id:p.id});
 for(const p of after){const old=previous.get(p.id);
  if(p.color==='enemy'){
   const fresh=!old;if(fresh)bursts.push({kind:'spawn',position:spawnPoint,id:p.id});
   if(move?.id===p.id){const start=board.fields[move.from-1].position;const route=move.path.length?move.path.map(f=>board.fields[f-1].position):[p.position];motions.push({id:p.id,points:[...(fresh?[spawnPoint]:[]),start,...route],kind:'enemy'});}
   else if(fresh)motions.push({id:p.id,points:[spawnPoint,p.position],kind:'enemy'});
   else if(old.field!==p.field)motions.push({id:p.id,points:[old.position,p.position],kind:'enemy'});
  }else if(old&&move&&(move.hits.includes(p.id)||move.targetId===p.id)){
   if(move.hits.includes(p.id))bursts.push({kind:'hit',position:old.position,id:p.id});
   if(old.field!==p.field)motions.push({id:p.id,points:[old.position,p.position],kind:'return'});
  }
 }
 return {motions,bursts};
}
export const motionSeconds=motion=>Math.max(.38,Math.min(3.2,(motion.points.length-1)*.24));
export function drawCombatBurst(el,txt,svg,burst,delay=0){
 const p=burst.position,g=el('g',{'pointer-events':'none','aria-hidden':'true',opacity:0},svg),color=burst.kind==='spawn'?'#ffc183':burst.kind==='hit'?'#ff695e':'#ffdb9e';
 const ring=el('circle',{cx:p.x,cy:p.y,r:12,fill:'none',stroke:color,'stroke-width':4},g);
 el('animate',{attributeName:'r',values:'9;32;46',dur:'.65s',begin:delay+'s',fill:'freeze'},ring);
 el('animate',{attributeName:'opacity',values:'0;1;1;0',keyTimes:'0;.12;.45;1',dur:'.75s',begin:delay+'s',fill:'freeze'},g);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;el('line',{x1:p.x+Math.cos(a)*18,y1:p.y+Math.sin(a)*18,x2:p.x+Math.cos(a)*33,y2:p.y+Math.sin(a)*33,stroke:color,'stroke-width':3,'stroke-linecap':'round'},g);}
 txt({x:p.x,y:p.y-35},burst.kind==='spawn'?'NEU':burst.kind==='hit'?'TREFFER':'BESIEGT',12,color,g);
}
export function animateCombatMotion(el,g,p,motion,delay=0){
 const points=motion.points,seconds=motionSeconds(motion),path='M'+points.map(q=>(q.x-p.x)+','+(q.y-p.y)).join(' L');
 // Explicit key points equalize time per field despite unequal field spacing.
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
 const total=lengths.at(-1);if(!total)return;
 el('animateMotion',{path,dur:seconds+'s',begin:delay+'s',fill:'freeze',calcMode:'linear',keyPoints:lengths.map(n=>n/total).join(';'),keyTimes:lengths.map((_,i)=>i/(lengths.length-1)).join(';')},g);
 // Hold at previous location until the scheduled motion begins.
 if(delay>0)el('animateTransform',{attributeName:'transform',type:'translate',from:(points[0].x-p.x)+' '+(points[0].y-p.y),to:(points[0].x-p.x)+' '+(points[0].y-p.y),begin:'0s',dur:delay+'s',fill:'remove'},g);
}
