import {compileBoard,createInspection,visibleField,COLOR_NAMES} from './mission-4-board.mjs?v=1';
import {createTouchViewport} from './mission-4-touch.mjs?v=1';
const $=id=>document.getElementById(id),svg=$('board'),NS='http://www.w3.org/2000/svg';
const palette={red:'#e95252',blue:'#429be8',green:'#43b66b'},zones=['#3f9673','#4b9bc8','#ad855e'];
const symbols={safe:'🛡',checkpoint:'🚩',door:'🚪',spawn:'🌀',key:'🔑',gift:'🎁',trap:'⚠',teleportIn:'🌀',teleportOut:'🌀',lever:'🎚'};
const el=(tag,attrs,parent=svg)=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;};
const txt=(p,t,size=12,fill='#ebf6fa',parent=svg)=>{const e=el('text',{x:p.x,y:p.y,'text-anchor':'middle','dominant-baseline':'central','font-size':size,'font-weight':700,fill,'pointer-events':'none'},parent);e.textContent=t;return e;};
const pts=a=>a.map(p=>p.x+','+p.y).join(' ');
function circle(p,r,fill,stroke,label,detail){const g=el('g',{'data-detail':detail||label,role:'button',tabindex:0,'aria-label':detail||label});el('circle',{cx:p.x,cy:p.y,r,fill,stroke,'stroke-width':2},g);txt(p,label,14,'#fff',g);return g;}
async function init(){
 const response=await fetch('./mission-4-layout.json');if(!response.ok)throw Error('Brett konnte nicht geladen werden.');
 const b=compileBoard(await response.json()),s=createInspection(b),raw=b.source;
 $('track-count').textContent=b.fields.length-b.missing.length+'/'+b.fields.length;
 $('free').textContent=s.pieces.length;$('captives').textContent=s.captives.length;
 for(const note of b.notes){const p=document.createElement('p');p.textContent=note;$('notes').append(p);}
 const zoneButtons=b.sections.map(z=>{const btn=document.createElement('button');btn.textContent=z.id+' · '+z.name+' ('+(z.from+1)+'–'+(z.to+1)+')';btn.onclick=()=>{s.section=z.id;s.revealAll=false;$('all').checked=false;draw();};$('sections').append(btn);return btn;});
 $('all').onchange=()=>{s.revealAll=$('all').checked;draw();};
 function draw(){
  svg.replaceChildren();el('rect',{x:0,y:0,width:1000,height:1000,fill:'#142b38'});
  for(const z of b.sections){el('polygon',{points:pts(z.polygon),fill:zones[z.id-1],'fill-opacity':(s.revealAll||z.id<=s.section)?0.19:0.04,stroke:zones[z.id-1],'stroke-width':2,'stroke-opacity':.65});}
  for(let i=1;i<b.fields.length;i++){const a=b.fields[i-1],f=b.fields[i];if(visibleField(b,s,a)&&visibleField(b,s,f))el('line',{x1:a.position.x,y1:a.position.y,x2:f.position.x,y2:f.position.y,stroke:'#b4c7cf','stroke-width':3});}
  for(const f of b.fields){if(!visibleField(b,s,f))continue;const p=f.position,mark=f.feature;const g=circle(p,13,mark?.type==='safe'?'#255987':'#eaf0ef',zones[f.section-1],mark?symbols[mark.type]||'•':'','Feld '+f.number+' · '+b.sections[f.section-1].name+(mark?' · '+mark.type:''));if(!mark)txt(p,String(f.number),10,'#18303d',g);else txt({x:p.x,y:p.y+22},String(f.number),10,'#e5f0f5',g);}
  for(const f of raw.sideFields){const anchor=b.fields[f.anchor];if(!anchor||!visibleField(b,s,anchor))continue;const p=f.position,a=anchor.position;el('line',{x1:a.x,y1:a.y,x2:p.x,y2:p.y,stroke:'#d5aa65','stroke-dasharray':'5 4','stroke-width':2});circle(p,13,palette[f.owner]||'#8f7040','#efc577','🎚','Hebel H'+f.id+' · '+(COLOR_NAMES[f.owner]||'Alle')+' · Anschluss '+(f.anchor+1));txt({x:p.x,y:p.y+22},'H'+f.id,10);}
  if(s.revealAll||s.section>=2){el('polyline',{points:pts(raw.wall.points),fill:'none',stroke:'#8893a2','stroke-width':12,'stroke-linecap':'round','stroke-linejoin':'round','data-detail':'Höhleneingang · Verteidigungsursprung'});(raw.enemies||[]).forEach((p,i)=>{if(p)circle(p,13,'#753c45','#f6b1a1','👾','Fernkämpfer F'+(i+1));});}
  (raw.spawnPoints||[]).forEach((p,i)=>{if(p&&(s.revealAll||(i===0?s.section>=1:s.section>=3)))circle(p,13,'#264259','#7ee2e0','🌀','Gegnerportal P'+(i+1));});
  if(s.revealAll||s.section>=3){raw.bosses.forEach((p,i)=>{if(p){const q=p.trackIndex===undefined?p:raw.track[p.trackIndex];if(q)circle(q,14,'#7446a0','#e2b6f3','👑','Boss B'+(i+1));}});const q=raw.prison,z=q.size;el('rect',{x:q.position.x-z/2,y:q.position.y-z/2,width:z,height:z,rx:7,fill:'#18252e',stroke:'#9eacb5','stroke-width':3,'data-detail':'Gefängnis · neun Gefangene'});for(const c of s.captives)circle(c.position,z*.075,palette[c.color],'#e9f0f5','',COLOR_NAMES[c.color]+' · gefangen');for(let i=1;i<8;i++){const x=q.position.x-z/2+i*z/8;el('line',{x1:x,x2:x,y1:q.position.y-z/2+12,y2:q.position.y+z/2-5,stroke:'#a1adb5','stroke-width':2,'pointer-events':'none'});}}
  for(const p of s.pieces)circle(p.position,14,palette[p.color],'#eaf4fa','●',COLOR_NAMES[p.color]+' · freie Figur '+p.id.split('-')[1]);
  if(raw.strike)circle(raw.strike,14,'#e49a3c','#ffe1a0','S','Gemeinsames Schlagfeld');
  zoneButtons.forEach((btn,i)=>btn.setAttribute('aria-pressed',String(!s.revealAll&&s.section===i+1)));
 }
 const select=e=>{const d=e.target.closest('[data-detail]')?.getAttribute('data-detail');if(d)$('selection').textContent=d;};svg.addEventListener('click',select);svg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(e);}});draw();
 createTouchViewport(svg,$('zoom-out'),$('zoom-in'),$('zoom-reset'));
}
init().catch(e=>{$('notes').textContent='Fehler: '+e.message;console.error(e);});
