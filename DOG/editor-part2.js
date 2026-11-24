import {blank,normalize,resize,setField,getField,refs,key,status,template,COLORS} from './editor-part2-model.mjs?v=1';
const $=id=>document.getElementById(id),board=$('part2-board'),NS='http://www.w3.org/2000/svg',KEY='dog-grinch-board-editor-part2-v1';
let s=blank(),sel={kind:'track',index:0},tool='place',undo=[],redo=[],photo=null,scale=1,origin={x:0,y:0},gesture=null,pointers=new Map();
try{const raw=localStorage.getItem(KEY);if(raw)s=normalize(JSON.parse(raw));}catch{}
const message=(v,error=false)=>{$('feedback').textContent=v;$('feedback').classList.toggle('error',error);};
function save(){try{localStorage.setItem(KEY,JSON.stringify(s));return true;}catch{message('Lokaler Speicher nicht verfügbar. Bitte JSON exportieren.',true);return false;}}
function commit(n){undo.push(s);if(undo.length>100)undo.shift();redo=[];s=n;save();render();}
function change(fn){try{commit(fn());message('Entwurf aktualisiert.');return true;}catch(e){message(e.message,true);return false;}}
function element(tag,attrs,parent=board){const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));parent.append(e);return e;}
function clampView(){const side=1000/scale;origin.x=Math.max(0,Math.min(1000-side,origin.x));origin.y=Math.max(0,Math.min(1000-side,origin.y));board.setAttribute('viewBox',[origin.x,origin.y,side,side].join(' '));$('zoom-level').textContent=Math.round(scale*100)+' %';}
function zoom(next,center={x:origin.x+500/scale,y:origin.y+500/scale}){const old=scale;scale=Math.min(5,Math.max(1,next));origin={x:center.x-(center.x-origin.x)*old/scale,y:center.y-(center.y-origin.y)*old/scale};clampView();}
function world(x,y){const p=board.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(board.getScreenCTM().inverse());}
const label=r=>r.kind==='track'?'Lauffeld '+(r.index+1):r.kind==='start'?({red:'Rot',blue:'Blau',green:'Grün'}[r.color])+' · Start '+(r.index+1):r.kind==='strike'?'Gemeinsames Schlagfeld':'Bossfeld '+(r.index+1);
function draw(){
 board.replaceChildren();element('rect',{width:1000,height:1000,fill:'#102f45'});
 if(photo)element('image',{href:photo,width:1000,height:1000,preserveAspectRatio:'xMidYMid meet',opacity:Number($('opacity').value)/100});
 const gap=Number($('spacing').value);
 if($('show-grid').checked)for(let i=0;i<=1000;i+=gap){element('path',{d:'M'+i+' 0V1000 M0 '+i+'H1000',stroke:'#a1bcc8','stroke-opacity':.13,'pointer-events':'none'});}
 if($('show-path').checked)for(let i=1;i<s.track.length;i++){const a=s.track[i-1],b=s.track[i];if(a&&b)element('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#9bbac9','stroke-width':3,'pointer-events':'none'});}
 const list=refs(s);
 for(const r of list){const p=getField(s,r);if(!p)continue;
  const attached=r.kind==='boss'&&s.bosses[r.index]?.trackIndex!==undefined;
  const g=element('g',{'data-field':key(r)});const title=element('title',{},g);title.textContent=label(r);
  const fill=r.kind==='start'?{red:'#dd514d',blue:'#438ce9',green:'#3ba367'}[r.color]:r.kind==='strike'?'#e49a3c':r.kind==='boss'?'#7e43a9':r.index===s.track.length-1?'#b5e5ac':'#eaf1f5';
  if(attached){element('circle',{cx:p.x,cy:p.y,r:18,fill:'none',stroke:key(r)===key(sel)?'#ffe1a0':'#df9aff','stroke-width':4,'pointer-events':'stroke'},g);}
  else element('circle',{cx:p.x,cy:p.y,r:13,fill,stroke:key(r)===key(sel)?'#ffe1a0':'#45647c','stroke-width':key(r)===key(sel)?4:1.5},g);
  const t=element('text',{x:p.x,y:p.y+(attached?-19:4),'text-anchor':'middle','font-size':attached?12:10,'font-weight':800,fill:attached?'#ffdbff':r.kind==='track'?'#173244':'#fff','pointer-events':'none'},g);
  t.textContent=r.kind==='boss'?'B'+(r.index+1):r.kind==='strike'?'S':r.kind==='start'?r.index+1:$('show-numbers').checked?r.index+1:r.index===s.track.length-1?'Z':'';
 }
 clampView();
}
function render(){
 const count=sel.kind==='track'?s.track.length:sel.kind==='start'?2:sel.kind==='boss'?s.bosses.length:1;
 sel.index=Math.min(sel.index||0,count-1);if(sel.kind==='start'&&!sel.color)sel.color='red';
 $('track-count').value=s.track.length;$('boss-count').value=s.bosses.length;
 $('field-index').replaceChildren(...Array.from({length:count},(_,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+(getField(s,{...sel,index:i})?' ✓':'');return o;}));$('field-index').value=sel.index;
 $('field-index').disabled=sel.kind==='strike';$('color-wrap').hidden=sel.kind!=='start';$('field-color').value=sel.color||'red';
 document.querySelectorAll('[data-kind]').forEach(b=>b.classList.toggle('active',b.dataset.kind===sel.kind));
 document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));
 const p=getField(s,sel);$('selected').textContent=label(sel)+(p?' · gesetzt':' · noch frei');$('coord-x').value=p?.x??'';$('coord-y').value=p?.y??'';
 const st=status(s);$('stats').textContent='Laufweg '+st.track+'/'+s.track.length+' · Start '+st.starts+'/6 · Schlag '+st.strike+'/1 · Boss '+st.bosses+'/'+s.bosses.length;
 $('export-ready').disabled=!st.complete;$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;draw();
}
function select(r){sel={...r};render();}
function next(){if(!$('auto-next').checked)return;
 if(sel.kind==='start'&&sel.index===1){const i=COLORS.indexOf(sel.color);if(i<2)sel={kind:'start',color:COLORS[i+1],index:0};}
 else{const count=sel.kind==='track'?s.track.length:sel.kind==='boss'?s.bosses.length:sel.kind==='start'?2:1;if(sel.index+1<count)sel.index++;}
 render();
}
function adjusted(p,ref,equal=true){let x=p.x,y=p.y;const gap=Number($('spacing').value),prev=ref.kind==='track'&&ref.index>0?s.track[ref.index-1]:null;
 if(equal&&prev&&$('equal').checked){const d=Math.hypot(x-prev.x,y-prev.y);if(d<1)throw Error('Bitte eine Richtung wählen');x=prev.x+(x-prev.x)*gap/d;y=prev.y+(y-prev.y)*gap/d;}
 else if($('snap').checked){x=Math.round(x/gap)*gap;y=Math.round(y/gap)*gap;}
 return {x,y};
}
function put(p,exact=false){if(change(()=>setField(s,sel,exact?p:adjusted(p,sel))))next();}
function refFrom(node){const k=node?.closest('[data-field]')?.dataset.field;return k?refs(s).find(r=>key(r)===k):null;}
board.addEventListener('pointerdown',e=>{
 e.preventDefault();board.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={pinch:true,d:Math.hypot(a.x-b.x,a.y-b.y),scale,center:world((a.x+b.x)/2,(a.y+b.y)/2),origin:{...origin}};return;}
 if(pointers.size>2)return;
 const p=world(e.clientX,e.clientY);gesture={id:e.pointerId,x:e.clientX,y:e.clientY,p,ref:refFrom(e.target),origin:{...origin},scale};
});
board.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(gesture.pinch&&pointers.size===2){const [a,b]=[...pointers.values()];scale=Math.min(5,Math.max(1,gesture.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,gesture.d)));const rect=board.getBoundingClientRect();origin={x:gesture.center.x-((a.x+b.x)/2-rect.left)*1000/(rect.width*scale),y:gesture.center.y-((a.y+b.y)/2-rect.top)*1000/(rect.height*scale)};clampView();return;}
 if(tool==='pan'&&!gesture.pinch){const rect=board.getBoundingClientRect();origin={x:gesture.origin.x-(e.clientX-gesture.x)*1000/(rect.width*scale),y:gesture.origin.y-(e.clientY-gesture.y)*1000/(rect.height*scale)};clampView();}
});
board.addEventListener('pointerup',e=>{
 pointers.delete(e.pointerId);const g=gesture;if(!g||g.pinch){if(!pointers.size)gesture=null;return;}gesture=null;
 const p=world(e.clientX,e.clientY),drag=Math.hypot(e.clientX-g.x,e.clientY-g.y)>5,hit=g.ref;
 if(tool==='pan')return;
 if(tool==='erase'){if(hit){select(hit);change(()=>setField(s,sel,null));}return;}
 if(tool==='move'){if(hit){select(hit);if(drag)change(()=>setField(s,sel,adjusted(p,sel,false)));}return;}
 if(drag)return;
 if(sel.kind==='boss'&&hit?.kind==='track'){if(change(()=>setField(s,sel,{trackIndex:hit.index})))next();return;}
 if(hit){select(hit);return;}put(p);
});
board.addEventListener('pointercancel',()=>{pointers.clear();gesture=null;});
board.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoom(scale*(e.deltaY<0?1.2:1/1.2),world(e.clientX,e.clientY));},{passive:false});
document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{const kind=b.dataset.kind;const list=refs(s).filter(r=>r.kind===kind);select(list.find(r=>!getField(s,r))||list[0]);});
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;render();});
$('field-index').onchange=()=>select({...sel,index:Number($('field-index').value)});$('field-color').onchange=()=>select({...sel,color:$('field-color').value,index:0});
$('apply-counts').onclick=()=>{const t=Number($('track-count').value),b=Number($('boss-count').value);if((t<s.track.length||b<s.bosses.length)&&!confirm('Überzählige Felder entfernen?'))return;change(()=>resize(s,t,b));};
$('add-boss').onclick=()=>{if(change(()=>resize(s,s.track.length,s.bosses.length+1)))select({kind:'boss',index:s.bosses.length-1});};
document.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>{const [x,y]=b.dataset.dir.split(',').map(Number),prev=sel.kind==='track'&&sel.index>0?s.track[sel.index-1]:null,p=prev||getField(s,sel);if(!p){message('Zuerst ein Ausgangsfeld setzen.',true);return;}const gap=Number($('spacing').value),d=Math.hypot(x,y);put({x:p.x+x*gap/d,y:p.y+y*gap/d},true);});
$('coords').onclick=()=>{if($('coord-x').value===''||$('coord-y').value===''){message('Bitte X und Y eingeben.',true);return;}put({x:Number($('coord-x').value),y:Number($('coord-y').value)},true);};
for(const id of ['spacing','show-grid','show-path','show-numbers','opacity'])$(id).addEventListener('input',draw);
$('zoom-in').onclick=()=>zoom(scale*1.25);$('zoom-out').onclick=()=>zoom(scale/1.25);$('zoom-reset').onclick=()=>{scale=1;origin={x:0,y:0};clampView();};
$('undo').onclick=()=>{if(undo.length){redo.push(s);s=undo.pop();save();render();}};$('redo').onclick=()=>{if(redo.length){undo.push(s);s=redo.pop();save();render();}};
$('blank').onclick=()=>{if(confirm('Teil-2-Entwurf leeren?')){if(change(()=>blank(s.track.length,s.bosses.length)))select({kind:'track',index:0});}};
$('template').onclick=()=>{if(confirm('Aktuellen Teil-2-Entwurf durch Schlangenweg ersetzen?'))change(()=>template(s.track.length,s.bosses.length));};
$('save').onclick=()=>{if(save())message('Teil-2-Entwurf lokal gesichert.');};
$('photo').onchange=()=>{const f=$('photo').files[0];if(!f)return;if(photo)URL.revokeObjectURL(photo);photo=URL.createObjectURL(f);draw();};
$('remove-photo').onclick=()=>{if(photo)URL.revokeObjectURL(photo);photo=null;$('photo').value='';draw();};
function download(ready){if(ready&&!status(s).complete)return;const u=URL.createObjectURL(new Blob([JSON.stringify(s,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=ready?'dog-grinch-teil2-brett.json':'dog-grinch-teil2-entwurf.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('export-draft').onclick=()=>download(false);$('export-ready').onclick=()=>download(true);
$('import').onchange=async()=>{try{const f=$('import').files[0];if(f){const n=normalize(JSON.parse(await f.text()));if(confirm('Teil-2-Entwurf durch Import ersetzen?')){commit(n);select({kind:'track',index:0});message('Teil-2-Layout importiert.');}}}catch(e){message(e.message,true);}finally{$('import').value='';}};
render();
