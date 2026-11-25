// Temporary procedural winter scenery. No coordinates or rules are changed.
// All decoration is below the real interactive board and clipped to the revealed region.
const pts=a=>a.map(p=>p.x+','+p.y).join(' ');
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
export function sceneryPlan(board){
 let seed=482917;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const raw=board.source,avoid=[...board.fields.map(f=>f.position),...Object.values(raw.starts).flat(),...raw.sideFields.map(f=>f.position),...(raw.enemies||[]),...(raw.spawnPoints||[]),...raw.bosses.map(p=>p?.trackIndex!==undefined?raw.track[p.trackIndex]:p),raw.strike,...raw.wall.points].filter(Boolean);
 const prison=raw.prison;
 return board.sections.map(z=>{const items=[];for(let i=0;i<1300&&items.length<[100,75,50][z.id-1];i++){const p={x:12+rnd()*976,y:12+rnd()*976},size=10+rnd()*15;if(!inside(p,z.polygon)||avoid.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<size+24)||Math.abs(p.x-prison.position.x)<prison.size/2+size+12&&Math.abs(p.y-prison.position.y)<prison.size/2+size+12||items.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<size+q.size+5))continue;items.push({...p,size,kind:z.id===1?'tree':z.id===2?'ice':rnd()<.67?'house':'tree',variant:rnd()});}return {id:z.id,polygon:z.polygon,items};});
}
export function winterBackdrop(el,svg,defs,board,state,plan){
 const gradient=(id,stops)=>{const g=el('linearGradient',{id,x1:'0%',y1:'0%',x2:'75%',y2:'100%'},defs);for(const [offset,color] of stops)el('stop',{offset,'stop-color':color},g);};
 gradient('m4-ocean',[['0%','#101d32'],['50%','#244854'],['100%','#10283b']]);
 gradient('m4-land1',[['0%','#294e41'],['55%','#183e34'],['100%','#0d2828']]);
 gradient('m4-land2',[['0%','#9ad4e5'],['55%','#467f9f'],['100%','#204a70']]);
 gradient('m4-land3',[['0%','#695462'],['55%','#493944'],['100%','#292b3a']]);
 gradient('m4-stone',[['0%','#fff8e7'],['100%','#b8bfc0']]);
 gradient('m4-shield',[['0%','#519ec6'],['100%','#214972']]);
 gradient('m4-fogland',[['0%','#435464'],['100%','#202b3a']]);
 const backdrop=el('g',{'pointer-events':'none','aria-hidden':'true','data-winter-scenery':'true'},svg);
 el('rect',{width:1000,height:1000,fill:'url(#m4-ocean)'},backdrop);
 for(let i=0;i<110;i++){const x=(i*173.17)%1000,y=(i*263.39)%1000;el('path',{d:'M'+x+' '+y+' l'+(7+i%17)+' -2',stroke:'#91c4d0','stroke-opacity':.12,'stroke-width':1.3},backdrop);}
 for(const z of plan){const visible=state.revealAll||z.id<=state.section;const clip=el('clipPath',{id:'m4-terrain-'+z.id},defs);el('polygon',{points:pts(z.polygon)},clip);
 el('polygon',{points:pts(z.polygon),fill:visible?'url(#m4-land'+z.id+')':'url(#m4-fogland)',stroke:visible?['#90b5a3','#b7e2f5','#b5a09e'][z.id-1]:'#667786','stroke-width':6,'stroke-linejoin':'round'},backdrop);
 const layer=el('g',{'clip-path':'url(#m4-terrain-'+z.id+')'},backdrop);
 for(let i=0;i<420;i++){const x=(i*137.53+z.id*51)%1000,y=(i*219.71+z.id*97)%1000;if(visible){el('circle',{cx:x,cy:y,r:0.65+(i%4)*.28,fill:'#e4f4fa','fill-opacity':z.id===2?.46:.28},layer);if(z.id===2&&i%11===0)el('path',{d:'M'+x+' '+y+' l14 -8 12 5 17 -13',fill:'none',stroke:'#d0f3ff','stroke-opacity':.26,'stroke-width':1.4},layer);}else if(i%18===0)el('ellipse',{cx:x,cy:y,rx:65,ry:21,fill:'#a8b6c6','fill-opacity':.10},layer);}
 if(!visible)continue;
 for(const a of z.items){const g=el('g',{transform:'translate('+a.x+' '+a.y+') scale('+(a.size/18)+')'},layer);el('ellipse',{cx:3,cy:12,rx:16,ry:6,fill:'#0b2030','fill-opacity':.38},g);
 if(a.kind==='tree'){el('rect',{x:-2,y:5,width:4,height:12,rx:1,fill:'#655045'},g);for(const [y,w] of [[-23,9],[-13,13],[-3,17]]){el('path',{d:'M0 '+y+' L'+(-w)+' '+(y+20)+' L'+w+' '+(y+20)+' Z',fill:'#133f38',stroke:'#092d2c','stroke-width':.7},g);el('path',{d:'M0 '+y+' L'+(-w*.7)+' '+(y+13)+' L-3 '+(y+10)+' L3 '+(y+15)+' L'+(w*.7)+' '+(y+13)+' Z',fill:'#d7e9ea','fill-opacity':.9},g);}if(a.variant>.76)for(const [x,y] of [[-6,1],[5,-7],[9,9]])el('circle',{cx:x,cy:y,r:1.8,fill:'#ffda85'},g);}
 else if(a.kind==='ice'){for(const [x,y,w] of [[-8,4,6],[1,-6,8],[10,7,5]]){el('path',{d:'M'+x+' '+(y-16)+' l'+(-w)+' 12 2 15 '+(w*2-2)+' -2 '+w/3+' -14 Z',fill:'#a8eaff',stroke:'#d9f7ff','stroke-width':.9},g);el('path',{d:'M'+x+' '+(y-16)+' l-1 27 '+w+' -2 '+w/3+' -14 Z',fill:'#4d9cbf'},g);}}
 else {el('rect',{x:-11,y:-3,width:22,height:19,rx:1,fill:'#79534c',stroke:'#382d32'},g);el('path',{d:'M-16 -2 L0 -18 16 -2 Z',fill:'#784451',stroke:'#362935'},g);el('path',{d:'M-16 -2 L0 -18 16 -2 8 -4 0 -12 -8 -3 Z',fill:'#e5e9e8'},g);el('rect',{x:-7,y:3,width:5,height:6,fill:'#ffce7e'},g);el('rect',{x:3,y:3,width:5,height:6,fill:'#f3ad56'},g);el('rect',{x:-2,y:9,width:5,height:7,fill:'#342b32'},g);}
 }
 }
}
