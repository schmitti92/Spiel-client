import {blank,normalize,resize,setField,getField,refs,key,status,template,COLORS,FEATURE_TYPES,LINKED_TYPES,defaultAreas,setAreas,areaOf,visibleArea,setFeature,setPolygon,pointInPolygon,setAreaOverride,assignAreaRange,LEVER_MODES,LEVER_EFFECTS,addSideLever,updateSideLever,LEVER_OWNERS} from './editor-part2-model.mjs?v=7';
const $=id=>document.getElementById(id),board=$('part2-board'),NS='http://www.w3.org/2000/svg',KEY='dog-grinch-board-editor-part2-v1';
let s=blank(),sel={kind:'track',index:0},tool='place',undo=[],redo=[],photo=null,scale=1,origin={x:0,y:0},gesture=null,pointers=new Map();
try{const raw=localStorage.getItem(KEY);if(raw)s=normalize(JSON.parse(raw));}catch{}
const message=(v,error=false)=>{$('feedback').textContent=v;$('feedback').classList.toggle('error',error);};
function save(){try{localStorage.setItem(KEY,JSON.stringify(s));$('save-state').textContent='● Lokal gespeichert';return true;}catch{$('save-state').textContent='Nicht gespeichert';message('Lokaler Speicher nicht verfügbar. Bitte JSON exportieren.',true);return false;}}
function commit(n){undo.push(s);if(undo.length>100)undo.shift();redo=[];s=n;save();render();}
function change(fn){try{commit(fn());message('Entwurf aktualisiert.');return true;}catch(e){message(e.message,true);return false;}}
function element(tag,attrs,parent=board){const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));parent.append(e);return e;}
function clampView(){const side=1000/scale;origin.x=Math.max(0,Math.min(1000-side,origin.x));origin.y=Math.max(0,Math.min(1000-side,origin.y));board.setAttribute('viewBox',[origin.x,origin.y,side,side].join(' '));$('zoom-level').textContent=Math.round(scale*100)+' %';}
function zoom(next,center={x:origin.x+500/scale,y:origin.y+500/scale}){const old=scale;scale=Math.min(5,Math.max(1,next));origin={x:center.x-(center.x-origin.x)*old/scale,y:center.y-(center.y-origin.y)*old/scale};clampView();}
function world(x,y){const p=board.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(board.getScreenCTM().inverse());}
const label=r=>r.kind==='side'?'Hebel H'+r.index:r.kind==='track'?'Lauffeld '+(r.index+1):r.kind==='start'?({red:'Rot',blue:'Blau',green:'Grün'}[r.color])+' · Start '+(r.index+1):r.kind==='strike'?'Gemeinsames Schlagfeld':'Bossfeld '+(r.index+1);
const areaColors=['#d5f3db','#c9e7fa','#f7e0b3','#e2d3fa'],zoneColors=['#5fc987','#5fa9ee','#eea44b','#bd83eb'];
let zone=0,outline=[],drawing=false;
const points=p=>p.map(v=>v.x+','+v.y).join(' ');
const clampPoint=p=>({x:Math.max(0,Math.min(1000,p.x)),y:Math.max(0,Math.min(1000,p.y))});
function addOutline(p){p=clampPoint(p);if(outline.length>=240)return;const last=outline.at(-1);if(!last||Math.hypot(p.x-last.x,p.y-last.y)>=2)outline.push(p);}
function drawOutline(){board.querySelector('#zone-draft')?.remove();if(!drawing||!outline.length)return;const g=element('g',{id:'zone-draft','pointer-events':'none'});element('polyline',{points:points(outline),fill:'none',stroke:zoneColors[zone],'stroke-width':4},g);outline.forEach((p,i)=>element('circle',{cx:p.x,cy:p.y,r:i===0?8:3.5,fill:zoneColors[zone],stroke:'#fff','stroke-width':1},g));}
function updateZoneControls(){
 $('zone-tools').hidden=tool!=='fog';$('zone-start').textContent=drawing?'Neu beginnen':s.areas[zone].polygon?'Umriss neu zeichnen':'Umriss zeichnen';$('zone-back').disabled=!drawing||!outline.length;$('zone-close').disabled=!drawing||outline.length<3;$('zone-clear').disabled=!s.areas[zone].polygon&&!s.areas[zone].fogRect;
 $('zone-hint').textContent=drawing?'Tippe Eckpunkte an oder zeichne mit dem Finger. Danach Fläche schließen.':'Gebiet wählen und Umriss zeichnen. Alle gespeicherten Flächen bleiben sichtbar.';
 $('zone-status').textContent=drawing?outline.length+' Punkte · Gebiet '+(zone+1):'Gebiet '+(zone+1)+(s.areas[zone].polygon?' · gespeichert':' · noch kein Umriss');
 document.querySelectorAll('[data-zone]').forEach(b=>{const i=Number(b.dataset.zone);b.classList.toggle('active',i===zone);b.setAttribute('aria-pressed',String(i===zone));b.textContent=(s.areas[i].polygon?'✓ ':'')+'Gebiet '+(i+1);});
}
function discardOutline(){if(drawing&&outline.length&&!confirm('Unfertigen Umriss verwerfen?'))return false;drawing=false;outline=[];return true;}
function openZones(){sideAnchor=null;reconnectId=null;showPanel('areas');$('fog-preview').value=4;$('area-colors').checked=true;tool='fog';render();}
function closeOutline(){if(!drawing||outline.length<3)return;try{const n=setPolygon(s,zone,outline);drawing=false;outline=[];commit(n);message('Gebiet '+(zone+1)+' gespeichert.');}catch(e){$('zone-status').textContent=e.message;message(e.message,true);}}

const preview=()=>Number($('fog-preview').value);
// Fog is a visual cover only. It never assigns a track field to a region.
function coveredByFog(p){return p&&s.areas.slice(preview()).some(a=>{const q=a.fogRect;return a.polygon?pointInPolygon(p,a.polygon)>0:q&&p.x>=q.x&&p.x<=q.x+q.w&&p.y>=q.y&&p.y<=q.y+q.h;});}
function trackVisible(index){return preview()===4||visibleArea(s,index,preview())&&!coveredByFog(s.track[index]);}
function visible(r){if(r.kind==='side')return !coveredByFog(getField(s,r));if(r.kind==='track')return trackVisible(r.index);if(r.kind==='boss'){const b=s.bosses[r.index];return b?.trackIndex!==undefined?trackVisible(b.trackIndex):preview()===4||!s.areas.slice(preview()).some(a=>{const q=a.fogRect,p=getField(s,r);return p&&(a.polygon?pointInPolygon(p,a.polygon)>0:q&&p.x>=q.x&&p.x<=q.x+q.w&&p.y>=q.y&&p.y<=q.y+q.h);});}return true;}
function fog(){
 const defs=element('defs'),grad=element('radialGradient',{id:'fog-cloud'},defs);element('stop',{offset:'0%','stop-color':'#b0c3cf','stop-opacity':1},grad);element('stop',{offset:'65%','stop-color':'#8298ab','stop-opacity':1},grad);element('stop',{offset:'100%','stop-color':'#4b6478','stop-opacity':.95},grad);
 for(let a=preview();a<4;a++){const region=s.areas[a],start=a?s.areas[a-1].end:0,pts=s.track.map((p,i)=>areaOf(s,i)===a?p:null),q=region.fogRect;
  if(region.polygon){element('polygon',{points:points(region.polygon),fill:'#71889a',stroke:'#9db3c0','stroke-width':2,'pointer-events':'none'});const clip=element('clipPath',{id:'zone-fog-'+a},defs);element('polygon',{points:points(region.polygon)},clip);const g=element('g',{'clip-path':'url(#zone-fog-'+a+')','pointer-events':'none'});for(let y=0;y<=1000;y+=76)for(let x=0;x<=1000;x+=84)element('circle',{cx:x+(y%152?42:0),cy:y,r:55,fill:'url(#fog-cloud)'},g);continue;}
  if(q)element('rect',{x:q.x,y:q.y,width:q.w,height:q.h,rx:12,fill:'#62798b','pointer-events':'none'});
  for(let i=0;i<pts.length;i++){const p=pts[i];if(!p)continue;if(i&&pts[i-1])element('line',{x1:pts[i-1].x,y1:pts[i-1].y,x2:p.x,y2:p.y,stroke:'#839bad','stroke-width':66,'stroke-linecap':'round','pointer-events':'none'});element('circle',{cx:p.x,cy:p.y,r:39,fill:'url(#fog-cloud)','pointer-events':'none'});}
  const present=pts.filter(Boolean),p=q?{x:q.x+q.w/2,y:q.y+q.h/2}:present[Math.floor(present.length/2)];if(p){const t=element('text',{x:p.x,y:p.y,'text-anchor':'middle','font-size':17,'font-weight':800,fill:'#f0f7ff','pointer-events':'none'});t.textContent='🔒 Gebiet '+(a+1);}
 }
}
const leverColors={all:'#d7b67b',red:'#dd514d',blue:'#438ce9',green:'#3ba367'};
function draw(){
 board.replaceChildren();element('rect',{width:1000,height:1000,fill:'#102f45'});
 if(photo)element('image',{href:photo,width:1000,height:1000,preserveAspectRatio:'xMidYMid meet',opacity:Number($('opacity').value)/100});
 const gap=Number($('spacing').value);
 if($('show-grid').checked)for(let i=0;i<=1000;i+=gap){element('path',{d:'M'+i+' 0V1000 M0 '+i+'H1000',stroke:'#a1bcc8','stroke-opacity':.13,'pointer-events':'none'});}
 if(preview()<4)fog();
 if($('area-colors').checked)for(const [i,a] of s.areas.entries()){if(i>=preview())continue;const q=a.fogRect;if(a.polygon){element('polygon',{points:points(a.polygon),fill:zoneColors[i],'fill-opacity':.17,stroke:zoneColors[i],'stroke-width':tool==='fog'&&zone===i?4:2,'pointer-events':'none'});const c=a.polygon.reduce((v,p)=>({x:v.x+p.x/a.polygon.length,y:v.y+p.y/a.polygon.length}),{x:0,y:0});const t=element('text',{x:c.x,y:c.y,'text-anchor':'middle',fill:zoneColors[i],'font-size':18,'font-weight':900,'pointer-events':'none'});t.textContent='Gebiet '+(i+1);}else if(q)element('rect',{x:q.x,y:q.y,width:q.w,height:q.h,rx:8,fill:'none',stroke:areaColors[i],'stroke-width':3,'stroke-dasharray':'9 7','pointer-events':'none'});}
 if($('show-path').checked)for(let i=1;i<s.track.length;i++){const a=s.track[i-1],b=s.track[i];if(a&&b&&(preview()===4||trackVisible(i-1)&&trackVisible(i)))element('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#9bbac9','stroke-width':3,'pointer-events':'none'});}
 if($('show-path').checked)for(const f of s.sideFields){const a=s.track[f.anchor],b=f.position;if(a&&(preview()===4||trackVisible(f.anchor)&&!coveredByFog(b)))element('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#eac482','stroke-width':3,'stroke-dasharray':'6 3','pointer-events':'none'});}
 if(tool==='feature'&&sideAnchor!==null&&s.track[sideAnchor]){const a=s.track[sideAnchor];element('circle',{cx:a.x,cy:a.y,r:19,fill:'none',stroke:'#ffd480','stroke-width':3,'pointer-events':'none'});}
 const list=refs(s);
 for(const r of list){const p=getField(s,r);if(!p||(preview()<4&&!visible(r)))continue;
  if(r.kind==='side'){const f=s.sideFields.find(f=>f.id===r.index);const g=element('g',{'data-field':key(r)});const title=element('title',{},g);title.textContent='Hebel H'+r.index+' · '+LEVER_OWNERS[f.owner];element('circle',{cx:p.x,cy:p.y,r:13,fill:leverColors[f.owner],stroke:key(r)===key(sel)?'#fff2bb':'#89673e','stroke-width':key(r)===key(sel)?4:2},g);const t=element('text',{x:p.x,y:p.y+4,'text-anchor':'middle','font-size':13,'pointer-events':'none'},g);t.textContent='🎚️';const name=element('text',{x:p.x,y:p.y+24,'text-anchor':'middle','font-size':11,'font-weight':800,fill:'#ffe0a4','pointer-events':'none'},g);name.textContent='H'+r.index;continue;}
  const attached=r.kind==='boss'&&s.bosses[r.index]?.trackIndex!==undefined;
  const g=element('g',{'data-field':key(r)});const title=element('title',{},g);title.textContent=label(r);
  const fill=r.kind==='start'?{red:'#dd514d',blue:'#438ce9',green:'#3ba367'}[r.color]:r.kind==='strike'?'#e49a3c':r.kind==='boss'?'#7e43a9':$('area-colors').checked?(areaColors[areaOf(s,r.index)]||'#eaf1f5'):'#eaf1f5';
  if(attached){element('circle',{cx:p.x,cy:p.y,r:18,fill:'none',stroke:key(r)===key(sel)?'#ffe1a0':'#df9aff','stroke-width':4,'pointer-events':'stroke'},g);}
  else element('circle',{cx:p.x,cy:p.y,r:13,fill,stroke:key(r)===key(sel)?'#ffe1a0':'#45647c','stroke-width':key(r)===key(sel)?4:1.5},g);
  const t=element('text',{x:p.x,y:p.y+(attached?-19:4),'text-anchor':'middle','font-size':attached?12:10,'font-weight':800,fill:attached?'#ffdbff':r.kind==='track'?'#173244':'#fff','pointer-events':'none'},g);
  t.textContent=r.kind==='boss'?'B'+(r.index+1):r.kind==='strike'?'S':r.kind==='start'?r.index+1:$('show-numbers').checked?r.index+1:r.index===s.track.length-1?'Z':'';
 }
 for(const f of s.features){if(!trackVisible(f.trackIndex))continue;const p=s.track[f.trackIndex];if(!p)continue;
  const g=element('g',{'data-field':key({kind:'track',index:f.trackIndex})});element('circle',{cx:p.x,cy:p.y-17,r:11,fill:f.type==='lever'?leverColors[f.owner]:'#10283b',stroke:'#eac482','stroke-width':1.5},g);
  const t=element('text',{x:p.x,y:p.y-13,'text-anchor':'middle','font-size':13,'pointer-events':'none'},g);t.textContent=FEATURE_TYPES[f.type].split(' ')[0];const title=element('title',{},g);title.textContent=FEATURE_TYPES[f.type]+(f.group?' '+f.group:'')+(f.type==='lever'?' · '+LEVER_EFFECTS[f.effect]+' · '+LEVER_MODES[f.mode]+' · '+LEVER_OWNERS[f.owner]:'');
 }
 drawOutline();clampView();
}
function adventureRender(){
 const root=$('area-rows');root.replaceChildren();s.areas.forEach((a,i)=>{const row=document.createElement('div');row.className='zone-summary';const dot=document.createElement('i');dot.style.background=zoneColors[i];row.append(dot);const t=document.createElement('span');t.textContent=(i+1)+' · '+a.name;row.append(t);const c=document.createElement('small');c.textContent=s.track.filter((p,j)=>p&&areaOf(s,j)===i).length+' Felder'+(a.polygon?' ✓':'');row.append(c);root.append(row);});
 const issuesZones=status(s).zoneIssues;$('area-check').textContent=issuesZones.length?issuesZones.join(' • '):s.areas.every(a=>a.polygon)?'✓ Vier Gebietsflächen gezeichnet · keine automatische Feldzuordnung':'Gebietsflächen unabhängig vom Laufweg zeichnen.';$('area-check').classList.toggle('invalid',Boolean(issuesZones.length));
 $('zone-name').value=s.areas[zone].name;$('manual-area').value=sel.kind==='track'&&s.areaOverrides[sel.index]!==undefined?String(s.areaOverrides[sel.index]):'auto';updateZoneControls();
 const list=$('feature-list');list.replaceChildren();
 for(const f of [...s.features].sort((a,b)=>a.trackIndex-b.trackIndex)){const row=document.createElement('div');row.className='feature-row';const b=document.createElement('button');b.textContent='Feld '+(f.trackIndex+1)+' · '+FEATURE_TYPES[f.type]+(f.group?' · '+f.group:'')+(f.type==='lever'?' · '+LEVER_EFFECTS[f.effect]+' · '+LEVER_MODES[f.mode]+' · '+LEVER_OWNERS[f.owner]:'');b.onclick=()=>{ $('fog-preview').value=4;$('feature-type').value=f.type;$('feature-group').value=f.group||'1';if(f.type==='lever'){$('lever-placement').value='track';$('lever-mode').value=f.mode;$('lever-effect').value=f.effect;$('lever-owner').value=f.owner;$('lever-rounds').value=f.rounds??2;}featureGroup();select({kind:'track',index:f.trackIndex});};row.append(b);const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label','Spezialfeld löschen');del.onclick=()=>change(()=>setFeature(s,f.trackIndex,null));row.append(del);list.append(row);}
 for(const f of s.sideFields){const row=document.createElement('div');row.className='feature-row';const b=document.createElement('button');b.textContent='H'+f.id+' · Hebel · '+LEVER_OWNERS[f.owner]+' · '+(f.anchor===null?'ohne Anschluss':'Feld '+(f.anchor+1));b.onclick=()=>selectSide(f.id);row.append(b);const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label','Hebel H'+f.id+' löschen');del.onclick=()=>{if(sel.kind==='side'&&sel.index===f.id)sel={kind:'track',index:0};change(()=>setField(s,{kind:'side',index:f.id},null));};row.append(del);list.append(row);}
 $('side-edit').hidden=sel.kind!=='side';
 const issues=status(s).adventureIssues;$('feature-check').textContent=issues.length?issues.join(' • '):'✓ Verknüpfungen vollständig';
 $('feature-check').classList.toggle('invalid',Boolean(issues.length));
}
function render(){
 const count=sel.kind==='track'?s.track.length:sel.kind==='start'?2:sel.kind==='boss'?s.bosses.length:1;
 if(sel.kind==='side'&&!s.sideFields.some(f=>f.id===sel.index))sel={kind:'track',index:0};if(sel.kind!=='side')sel.index=Math.min(sel.index||0,count-1);if(sel.kind==='start'&&!sel.color)sel.color='red';
 $('track-count').value=s.track.length;$('boss-count').value=s.bosses.length;
 $('field-index').replaceChildren(...Array.from({length:count},(_,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+(getField(s,{...sel,index:i})?' ✓':'');return o;}));$('field-index').value=sel.index;
 if(sel.kind==='side'){const o=document.createElement('option');o.value=sel.index;o.textContent='H'+sel.index;$('field-index').replaceChildren(o);$('field-index').value=sel.index;}$('field-index').disabled=sel.kind==='strike'||sel.kind==='side';$('color-wrap').hidden=sel.kind!=='start';$('field-color').value=sel.color||'red';
 document.querySelectorAll('[data-kind]').forEach(b=>b.classList.toggle('active',b.dataset.kind===sel.kind));
 document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));
 const p=getField(s,sel);$('selected').textContent=label(sel)+(p?' · gesetzt':' · noch frei');$('coord-x').value=p?.x??'';$('coord-y').value=p?.y??'';
 const st=status(s);$('stats').textContent='Laufweg '+st.track+'/'+s.track.length+' · Start '+st.starts+'/6 · Schlag '+st.strike+'/1 · Boss '+st.bosses+'/'+s.bosses.length;
 adventureRender();$('feature-count').textContent='('+(s.features.length+s.sideFields.length)+')';$('mode-label').textContent=tool==='feature'?isSideMode()?reconnectId!==null?'Neuen Anschluss wählen':sideAnchor===null?'Hebel · Anschluss wählen':'Hebel · freie Position wählen':FEATURE_TYPES[$('feature-type').value]+' · Feld antippen':tool==='fog'?'Gebiet '+(zone+1)+' zeichnen':tool==='move'?'Feld verschieben':tool==='erase'?'Feld löschen':tool==='pan'?'Ansicht bewegen':label(sel)+' · setzen';$('export-ready').disabled=!st.complete;$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;draw();
}
function select(r){sel={...r};render();}
function next(){if(sel.kind==='side'||!$('auto-next').checked)return;
 if(sel.kind==='start'&&sel.index===1){const i=COLORS.indexOf(sel.color);if(i<2)sel={kind:'start',color:COLORS[i+1],index:0};}
 else{const count=sel.kind==='track'?s.track.length:sel.kind==='boss'?s.bosses.length:sel.kind==='start'?2:1;if(sel.index+1<count)sel.index++;}
 render();
}
function adjusted(p,ref,equal=true){let x=p.x,y=p.y;const gap=Number($('spacing').value),prev=ref.kind==='track'&&ref.index>0?s.track[ref.index-1]:null;
 if(equal&&prev&&$('equal').checked){const d=Math.hypot(x-prev.x,y-prev.y);if(d<1)throw Error('Bitte eine Richtung wählen');x=prev.x+(x-prev.x)*gap/d;y=prev.y+(y-prev.y)*gap/d;}
 else if($('snap').checked){x=Math.round(x/gap)*gap;y=Math.round(y/gap)*gap;}
 return {x,y};
}
function put(p,exact=false){if(sel.kind==='side'&&!exact){message('Zum Verschieben des Hebels das Werkzeug Schieben verwenden.');return;}if(change(()=>setField(s,sel,exact?p:adjusted(p,sel))))next();}
function refFrom(node){const k=node?.closest('[data-field]')?.dataset.field;return k?refs(s).find(r=>key(r)===k):null;}
board.addEventListener('pointerdown',e=>{
 e.preventDefault();board.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2){const [a,b]=[...pointers.values()];board.querySelector('#zone-trace')?.remove();gesture={pinch:true,d:Math.hypot(a.x-b.x,a.y-b.y),scale,center:world((a.x+b.x)/2,(a.y+b.y)/2),origin:{...origin}};return;}
 if(pointers.size>2)return;
 const p=world(e.clientX,e.clientY);gesture={id:e.pointerId,x:e.clientX,y:e.clientY,p,ref:refFrom(e.target),origin:{...origin},scale};
});
board.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(gesture.pinch&&pointers.size===2){const [a,b]=[...pointers.values()];scale=Math.min(5,Math.max(1,gesture.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,gesture.d)));const rect=board.getBoundingClientRect();origin={x:gesture.center.x-((a.x+b.x)/2-rect.left)*1000/(rect.width*scale),y:gesture.center.y-((a.y+b.y)/2-rect.top)*1000/(rect.height*scale)};clampView();return;}
 if(tool==='fog'&&!gesture.pinch&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>5){if(!gesture.trace)gesture.trace=[clampPoint(gesture.p)];const p=clampPoint(world(e.clientX,e.clientY)),last=gesture.trace.at(-1);if(gesture.trace.length<230&&Math.hypot(p.x-last.x,p.y-last.y)>=Math.max(7,14/scale))gesture.trace.push(p);board.querySelector('#zone-trace')?.remove();element('polyline',{id:'zone-trace',points:points([...outline,...gesture.trace]),fill:'none',stroke:zoneColors[zone],'stroke-width':4,'pointer-events':'none'});}
 if(tool==='pan'&&!gesture.pinch){const rect=board.getBoundingClientRect();origin={x:gesture.origin.x-(e.clientX-gesture.x)*1000/(rect.width*scale),y:gesture.origin.y-(e.clientY-gesture.y)*1000/(rect.height*scale)};clampView();}
});
board.addEventListener('pointerup',e=>{
 pointers.delete(e.pointerId);const g=gesture;if(!g||g.pinch){if(!pointers.size)gesture=null;return;}gesture=null;board.querySelector('#fog-drag')?.remove();
 const p=world(e.clientX,e.clientY),drag=Math.hypot(e.clientX-g.x,e.clientY-g.y)>5,hit=g.ref;
 if(tool==='pan')return;
 if(preview()<4){message('Zum Bearbeiten bitte alle Gebiete sichtbar machen.',true);return;}
 if(tool==='fog'){board.querySelector('#zone-trace')?.remove();if(!drawing){drawing=true;outline=[];}if(g.trace?.length){for(const v of g.trace)addOutline(v);const last=outline.at(-1);if(!last||Math.hypot(p.x-last.x,p.y-last.y)>=3)addOutline(p);}else if(!drag){if(outline.length>=3&&Math.hypot(p.x-outline[0].x,p.y-outline[0].y)<12/scale){closeOutline();return;}addOutline(p);}updateZoneControls();drawOutline();return;}
 if(tool==='feature'){
  if(drag)return;
  if(isSideMode()){
   if(hit?.kind==='side'){selectSide(hit.index);return;}
   if(reconnectId!==null){if(hit?.kind!=='track'){message('Neues Anschlussfeld am Hauptweg antippen.',true);return;}const id=reconnectId;reconnectId=null;if(change(()=>updateSideLever(s,id,{anchor:hit.index})))selectSide(id);return;}
   if(hit?.kind==='track'){sideAnchor=hit.index;render();message('Anschluss: Feld '+(sideAnchor+1)+'. Jetzt freie Position für den Hebel antippen.');return;}
   if(hit){message('Bitte eine freie Position wählen.',true);return;}
   if(sideAnchor===null){message('Zuerst ein Lauffeld als Anschluss antippen.',true);return;}
   const anchor=sideAnchor;if(change(()=>addSideLever(s,p,anchor,leverSettings()))){sideAnchor=null;render();message('Hebel-Seitenfeld verbunden. Die Hauptwegnummern bleiben gleich.');}return;
  }
  if(!drag&&hit?.kind==='track'){select(hit);change(()=>setFeature(s,hit.index,$('feature-type').value,$('feature-group').value,leverSettings()));}else message('Bitte ein vorhandenes Lauffeld antippen.',true);return;
 }
 if(tool==='erase'){if(hit){select(hit);change(()=>setField(s,hit,null));}return;}
 if(tool==='move'){if(hit){select(hit);if(drag)change(()=>setField(s,sel,adjusted(p,sel,false)));}return;}
 if(drag)return;
 if(sel.kind==='boss'&&hit?.kind==='track'){if(change(()=>setField(s,sel,{trackIndex:hit.index})))next();return;}
 if(hit){select(hit);return;}put(p);
});
board.addEventListener('pointercancel',()=>{pointers.clear();gesture=null;board.querySelector('#zone-trace')?.remove();});
board.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoom(scale*(e.deltaY<0?1.2:1/1.2),world(e.clientX,e.clientY));},{passive:false});
document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{if(!discardOutline())return;sideAnchor=null;reconnectId=null;tool='place';$('fog-preview').value=4;const kind=b.dataset.kind;const list=refs(s).filter(r=>r.kind===kind);select(list.find(r=>!getField(s,r))||list[0]);});
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{if(b.dataset.tool==='fog'){openZones();return;}if(!discardOutline())return;sideAnchor=null;reconnectId=null;tool=b.dataset.tool;if(tool==='place')showPanel('fields');$('fog-preview').value=4;render();});
$('field-index').onchange=()=>select({...sel,index:Number($('field-index').value)});$('field-color').onchange=()=>select({...sel,color:$('field-color').value,index:0});
$('apply-counts').onclick=()=>{const t=Number($('track-count').value),b=Number($('boss-count').value);if((t<s.track.length||b<s.bosses.length)&&!confirm('Überzählige Felder entfernen?'))return;if(t!==s.track.length&&!confirm('Bei neuer Laufweg-Länge werden alte Feldgrenzen neu verteilt. Gezeichnete Gebiete bleiben erhalten. Fortfahren?'))return;change(()=>resize(s,t,b));};
$('add-boss').onclick=()=>{if(change(()=>resize(s,s.track.length,s.bosses.length+1)))select({kind:'boss',index:s.bosses.length-1});};
document.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>{const [x,y]=b.dataset.dir.split(',').map(Number),prev=sel.kind==='track'&&sel.index>0?s.track[sel.index-1]:null,p=prev||getField(s,sel);if(!p){message('Zuerst ein Ausgangsfeld setzen.',true);return;}const gap=Number($('spacing').value),d=Math.hypot(x,y);put({x:p.x+x*gap/d,y:p.y+y*gap/d},true);});
$('coords').onclick=()=>{if($('coord-x').value===''||$('coord-y').value===''){message('Bitte X und Y eingeben.',true);return;}put({x:Number($('coord-x').value),y:Number($('coord-y').value)},true);};
for(const id of ['spacing','show-grid','show-path','show-numbers','opacity'])$(id).addEventListener('input',draw);
$('zoom-in').onclick=()=>zoom(scale*1.25);$('zoom-out').onclick=()=>zoom(scale/1.25);$('zoom-reset').onclick=()=>{scale=1;origin={x:0,y:0};clampView();};
$('undo').onclick=()=>{sideAnchor=null;reconnectId=null;if(undo.length){redo.push(s);s=undo.pop();save();render();}};$('redo').onclick=()=>{sideAnchor=null;reconnectId=null;if(redo.length){undo.push(s);s=redo.pop();save();render();}};
function clearBoard(){
 if(!confirm('Ganzes Teil-2-Brett löschen? Alle Lauffelder, Startplätze, Bossfelder, Gebiete und Spezialfelder werden entfernt. Du kannst dies über Rückgängig wiederherstellen.'))return;
 drawing=false;outline=[];sideAnchor=null;reconnectId=null;zone=0;tool='place';sel={kind:'track',index:0};$('fog-preview').value=4;scale=1;origin={x:0,y:0};
 if(change(()=>blank(s.track.length,s.bosses.length))){showPanel('fields');render();message('Brett vollständig geleert. Rückgängig stellt deinen Entwurf wieder her.');}
}
$('blank').onclick=clearBoard;$('clear-board').onclick=clearBoard;
$('template').onclick=()=>{if(confirm('Aktuellen Teil-2-Entwurf durch Schlangenweg ersetzen?'))change(()=>template(s.track.length,s.bosses.length));};
$('save').onclick=()=>{if(save())message('Teil-2-Entwurf lokal gesichert.');};
$('photo').onchange=()=>{const f=$('photo').files[0];if(!f)return;if(photo)URL.revokeObjectURL(photo);photo=URL.createObjectURL(f);draw();};
$('remove-photo').onclick=()=>{if(photo)URL.revokeObjectURL(photo);photo=null;$('photo').value='';draw();};
function download(ready){if(ready&&!status(s).complete)return;const u=URL.createObjectURL(new Blob([JSON.stringify(s,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=ready?'dog-grinch-teil2-brett.json':'dog-grinch-teil2-entwurf.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('export-draft').onclick=()=>download(false);$('export-ready').onclick=()=>download(true);
$('import').onchange=async()=>{try{const f=$('import').files[0];if(f){const n=normalize(JSON.parse(await f.text()));if(confirm('Teil-2-Entwurf durch Import ersetzen?')){commit(n);select({kind:'track',index:0});message('Teil-2-Layout importiert.');}}}catch(e){message(e.message,true);}finally{$('import').value='';}};
for(const [type,name] of Object.entries(FEATURE_TYPES)){const o=document.createElement('option');o.value=type;o.textContent=name;$('feature-type').append(o);const b=document.createElement('button');b.type='button';b.dataset.featureChoice=type;const icon=document.createElement('span');icon.textContent=name.split(' ')[0];b.append(icon,document.createTextNode(name.slice(name.indexOf(' ')+1)));b.onclick=()=>{if(!discardOutline())return;$('feature-type').value=type;featureGroup();$('place-feature').click();};$('feature-picker').append(b);}
for(const [id,values] of [['lever-mode',LEVER_MODES],['lever-effect',LEVER_EFFECTS],['lever-owner',LEVER_OWNERS]])for(const [value,name] of Object.entries(values)){const opt=document.createElement('option');opt.value=value;opt.textContent=name;$(id).append(opt);}
let sideAnchor=null,reconnectId=null;
function isSideMode(){return $('feature-type').value==='lever'&&$('lever-placement').value==='side';}
function leverSettings(){return {group:$('feature-group').value,mode:$('lever-mode').value,effect:$('lever-effect').value,rounds:Number($('lever-rounds').value),owner:$('lever-owner').value};}
function selectSide(id){const f=s.sideFields.find(x=>x.id===id);if(!f)return;sideAnchor=null;reconnectId=null;$('feature-type').value='lever';$('lever-placement').value='side';$('feature-group').value=f.group;$('lever-mode').value=f.mode;$('lever-effect').value=f.effect;$('lever-owner').value=f.owner;$('lever-rounds').value=f.rounds??2;featureGroup();showPanel('special');select({kind:'side',index:id});}
function featureGroup(){const lever=$('feature-type').value==='lever',effect=$('lever-effect').value,mode=$('lever-mode').value;
 $('lever-place-hint').textContent=isSideMode()?'Erst Anschlussfeld antippen, dann freie Position für den Hebel wählen.':'Hebel direkt auf ein vorhandenes Lauffeld setzen.';$('place-feature').textContent=isSideMode()?'Seitenhebel setzen':'Auf Lauffeld setzen';
 $('lever-settings').hidden=!lever;$('lever-rounds-wrap').hidden=mode!=='timed';$('group-wrap').hidden=lever?!['door','teleport'].includes(effect):!LINKED_TYPES.includes($('feature-type').value);
 $('lever-hint').textContent={held:'Effekt bleibt aktiv, solange mindestens eine menschliche Figur auf dem Hebel steht.',toggle:'Jedes neue Betreten schaltet den Effekt an oder aus.',permanent:'Einmal betreten, dauerhaft aktiv.',timed:'Beim Betreten startet die gewählte Anzahl vollständiger Zugrunden.'}[mode];
document.querySelectorAll('[data-feature-choice]').forEach(b=>{const active=b.dataset.featureChoice===$('feature-type').value;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
$('lever-placement').onchange=()=>{sideAnchor=null;reconnectId=null;featureGroup();$('place-feature').click();};$('feature-type').onchange=featureGroup;$('lever-mode').onchange=featureGroup;$('lever-effect').onchange=featureGroup;featureGroup();
$('fog-preview').onchange=()=>{if(drawing&&outline.length){$('fog-preview').value=4;message('Bitte zuerst die Fläche schließen.');}draw();};$('area-colors').onchange=draw;
for(let i=0;i<4;i++){const b=document.createElement('button');b.type='button';b.dataset.zone=i;b.style.setProperty('--zone',zoneColors[i]);b.onclick=()=>{if(discardOutline()){zone=i;render();}};$('zone-tabs').append(b);}
$('open-zones').onclick=openZones;$('zone-start').onclick=()=>{if(discardOutline()){drawing=true;updateZoneControls();drawOutline();}};$('zone-back').onclick=()=>{outline.pop();updateZoneControls();drawOutline();};$('zone-close').onclick=closeOutline;
$('zone-clear').onclick=()=>{if(confirm('Gebietsfläche '+(zone+1)+' löschen?')){drawing=false;outline=[];change(()=>setPolygon(s,zone,null));}};
$('zone-exit').onclick=()=>{if(discardOutline()){tool='place';render();}};
$('save-zone-name').onclick=()=>change(()=>setAreas(s,s.areas.map((a,i)=>i===zone?{...a,name:$('zone-name').value}:a)));
$('save-manual-area').onclick=()=>{if(sel.kind!=='track'){message('Zuerst ein Lauffeld auswählen.',true);return;}change(()=>setAreaOverride(s,sel.index,$('manual-area').value==='auto'?null:Number($('manual-area').value)));};
$('assign-area-range').onclick=()=>{const first=Number($('area-from').value)-1,last=Number($('area-to').value)-1,area=$('manual-area').value==='auto'?null:Number($('manual-area').value);if(change(()=>assignAreaRange(s,first,last,area)))message('Feldbereich '+(first+1)+'–'+(last+1)+(area===null?' von der Gebietszuordnung gelöst.':' Gebiet '+(area+1)+' zugeordnet.'));};
$('place-feature').onclick=()=>{if(!discardOutline())return;sideAnchor=null;reconnectId=null;$('fog-preview').value=4;tool='feature';render();message(isSideMode()?'Zuerst Anschlussfeld am Hauptweg antippen.':'Jetzt ein Lauffeld für den Spezialmarker antippen.');};
$('side-update').onclick=()=>{if(sel.kind==='side')change(()=>updateSideLever(s,sel.index,leverSettings()));};$('side-reconnect').onclick=()=>{if(sel.kind!=='side')return;sideAnchor=null;reconnectId=sel.index;tool='feature';$('fog-preview').value=4;render();message('Neues Anschlussfeld am Hauptweg antippen.');};
$('remove-feature').onclick=()=>{if(sel.kind==='side'){const id=sel.index;sel={kind:'track',index:0};change(()=>setField(s,{kind:'side',index:id},null));return;}if(sel.kind!=='track'){message('Zuerst das Lauffeld auswählen.',true);return;}change(()=>setFeature(s,sel.index,null));};
const panelTitles={fields:'Felder setzen',special:'Spezialfelder',areas:'Vier Gebiete',settings:'Einstellungen',project:'Datei & Export'};
let currentPanel='fields';
function showPanel(name){if(!Object.hasOwn(panelTitles,name))return;currentPanel=name;$('inspector').hidden=false;document.querySelector('.layout').classList.remove('inspector-closed');$('toggle-inspector').setAttribute('aria-expanded','true');$('panel-title').textContent=panelTitles[name];document.querySelectorAll('[data-page]').forEach(p=>p.hidden=p.dataset.page!==name);document.querySelectorAll('[data-panel]').forEach(b=>{b.classList.toggle('active',b.dataset.panel===name);b.setAttribute('aria-pressed',String(b.dataset.panel===name));});}
function hidePanel(){$('inspector').hidden=true;document.querySelector('.layout').classList.add('inspector-closed');$('toggle-inspector').setAttribute('aria-expanded','false');document.querySelectorAll('[data-panel]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});}
document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>{const name=b.dataset.panel;if(name==='areas'){if(!discardOutline())return;openZones();}else{if(name==='fields'||name==='special'){if(!discardOutline())return;tool=name==='fields'?'place':'feature';$('fog-preview').value=4;}showPanel(name);render();}});
$('toggle-inspector').onclick=()=> $('inspector').hidden?showPanel(currentPanel):hidePanel();$('close-inspector').onclick=hidePanel;
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else message('Vollbild wird von diesem Browser nicht unterstützt.');}catch{message('Vollbild konnte nicht geöffnet werden.');}};
function fitBoard(){
 const wrap=board.parentElement,stage=wrap.parentElement,zoneTools=$('zone-tools');
 const availableHeight=stage.clientHeight-(zoneTools.hidden?0:zoneTools.offsetHeight);
 // Only move controls into a side gutter when the complete square still fits.
 stage.classList.toggle('gutter-dock',stage.clientWidth>=availableHeight+114&&availableHeight>180);
 const side=Math.max(1,Math.floor(Math.min(wrap.clientWidth,wrap.clientHeight)));
 if(board.style.width!==side+'px'){board.style.width=side+'px';board.style.height=side+'px';}
}
if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(fitBoard);observer.observe(board.parentElement);observer.observe(board.parentElement.parentElement);observer.observe($('zone-tools'));}else window.addEventListener('resize',fitBoard);
showPanel('fields');render();fitBoard();
