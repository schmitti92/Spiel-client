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
