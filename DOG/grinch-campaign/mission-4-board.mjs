// Mission 4: geometry and local inspection only. No movement or reward rules.
export const SECTION_NAMES=['Der letzte Bergpfad','Die bewachte Schlucht','Die Höhle der Gefangenen'];
export const COLORS=['red','blue','green'];
export const COLOR_NAMES={red:'Rot',blue:'Blau',green:'Grün'};
export function compileBoard(raw){
 if(!raw||raw.schema!=='dog-grinch-board-v1'||raw.part!==2||raw.size!==1000||!Array.isArray(raw.track))throw Error('Ungültiger Mission-4-Entwurf.');
 const b=JSON.parse(JSON.stringify(raw));
 const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=1000;
 const doors=b.features.filter(f=>f.type==='door').map(f=>f.trackIndex).sort((a,b)=>a-b);
 if(doors.length!==2||doors[0]>=doors[1]||!b.areas.slice(0,3).every(a=>Array.isArray(a.polygon)&&a.polygon.length>=3))throw Error('Drei gezeichnete Abschnitte und zwei Türen erforderlich.');
 const ends=[doors[0],doors[1],b.track.length-1];
 const sections=ends.map((end,i)=>({id:i+1,name:SECTION_NAMES[i],from:i===0?0:ends[i-1]+1,to:end,polygon:b.areas[i].polygon}));
 const fields=b.track.map((position,index)=>({index,number:index+1,position,section:sections.find(s=>index<=s.to).id,feature:b.features.find(f=>f.trackIndex===index)||null}));
 if(fields.some(f=>f.position!==null&&!validPoint(f.position)))throw Error('Ungültige Feldposition.');
 if(!COLORS.every(c=>b.starts[c]?.length===2&&b.starts[c].every(validPoint)))throw Error('Sechs Startplätze erforderlich.');
 if(!b.prison||b.prison.cells?.length!==9||!b.prison.cells.every(c=>validPoint(c.position))||!COLORS.every(c=>b.prison.cells.filter(p=>p.color===c).length===3))throw Error('Neun Gefangene erforderlich.');
 if(!b.wall?.points?.length||!b.wall.points.every(validPoint))throw Error('Höhleneingang fehlt.');
 const missing=fields.filter(f=>!f.position).map(f=>f.number);
 return {source:b,sections,fields,missing,ready:missing.length===0&&!!b.strike,notes:[...(missing.length?['Offene Lauffelder: '+missing.join(', ')]:[]),...(!b.strike?['Gemeinsames Schlagfeld noch nicht gesetzt.']:[]),'Hebelwirkungen, Spawn-Zuordnung und Kampfregeln noch offen.']};
}
export function createInspection(board){
 return {section:1,revealAll:true,selected:null,pieces:COLORS.flatMap(color=>board.source.starts[color].map((position,i)=>({id:color+'-'+(i+1),color,position}))),captives:board.source.prison.cells.map(c=>({...c})),mode:'layout-only'};
}
export function visibleField(board,state,f){return !!f.position&&(state.revealAll||f.section<=state.section);}
