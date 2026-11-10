import {
 BOARD_LAYOUT_ID,CUSTOM_BOARD_KEY,COLORS_CLASSIC,START_INDICES,TRACK_POINTS,GOAL_POINTS,HOME_POINTS,
 makeDefaultLayout,currentBoardLayout,validateBoardLayout,saveBoardLayout,resetBoardLayout,rotatePoint
} from './board-layout.js';

const $=id=>document.getElementById(id);
const svg=$('editor-board');
const clone=obj=>JSON.parse(JSON.stringify(obj));
const round=n=>Math.round(n*10)/10;
const clamp=n=>Math.max(26,Math.min(734,round(n)));
let draft=currentBoardLayout();
let selected={kind:'track',index:0,owner:0};
let mode='track',previewPhoto=null,previewOpacity=45;
let dragging=null,walkTimer=null,walkIndex=-1;
let history=[clone(draft)],historyIndex=0;
const colors=COLORS_CLASSIC;
const isStart=i=>i%16===0;
const coord=p=>p.x+','+p.y;
const getPoint=(kind,index,owner)=>kind==='track'?draft.track[index]:kind==='goals'?draft.goals[owner][index]:draft.homes[owner][index];
function selectedPoint(){return getPoint(selected.kind,selected.index,selected.owner);}
function report(message,type='normal'){
 const el=$('editor-status');el.textContent=message;el.className='status '+(type==='error'?'error':type==='success'?'success':'');
}
function getIssues(){return validateBoardLayout(draft);}
function refreshStatus(){
 const errors=getIssues();
 $('save-layout').disabled=errors.length>0;
 $('save-secondary').disabled=errors.length>0;
 if(errors.length)report('⚠️ Noch nicht speicherbar: '+errors.slice(0,3).join(' · ')+(errors.length>3?' …':''),'error');
 else if(!dragging)report('✓ Alle 96 Positionen gültig. Bereit zum Übernehmen.','success');
}
function recordHistory(){
 const encoded=JSON.stringify(draft);
 if(JSON.stringify(history[historyIndex])===encoded)return false;
 history=history.slice(0,historyIndex+1);
 history.push(clone(draft));
 if(history.length>70)history.shift();
 historyIndex=history.length-1;
 return true;
}
function travel(step){
 if(step<0){stopWalk();return;}
 walkIndex=step%64;
 $('live-walk').textContent='🔎 Laufweg: '+((walkIndex+63)%64)+' → '+walkIndex+' → '+((walkIndex+1)%64);
 renderBoard();
}
function stopWalk(){if(walkTimer!==null){clearInterval(walkTimer);walkTimer=null;}$('walk-start').textContent='▶ Laufweg prüfen';walkIndex=-1;renderBoard();}
function undoRedo(direction){
 if(dragging)return;
 const next=historyIndex+direction;
 if(next<0||next>=history.length)return;
 historyIndex=next;draft=clone(history[historyIndex]);renderAll();
}
function selectField(kind,index,owner){
 selected={kind,index,owner};
 mode=kind;
 document.querySelectorAll('[data-mode]').forEach(btn=>{
  const active=btn.dataset.mode===mode;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
 });
 updateSelected();
 renderBoard();
}
function updateSelected(){
 const point=selectedPoint();if(!point)return;
 const seat=selected.kind==='track'?Math.floor(selected.index/16):selected.owner;
 const name=['Rot','Blau','Grün','Gelb'][seat];
 const kindLabel=selected.kind==='track'?(isStart(selected.index)?'STARTFELD':'LAUFFELD'):selected.kind==='goals'?'ZIELFELD':'STARTPLATZ';
 $('selected-label').textContent=kindLabel+' '+selected.index+' · '+name.toUpperCase();
 $('selected-detail').textContent=selected.kind==='track'
   ?(isStart(selected.index)?'Geschütztes Startfeld – die Markierung bleibt an dieser Position im Zugweg.':'Bewegungsfolge '+((selected.index+63)%64)+' → '+selected.index+' → '+((selected.index+1)%64))
   :'Platz '+(selected.index+1)+' von 4. Er ist kein Teil des 64-Felder-Rundwegs.';
 $('coord-x').value=String(round(point.x));
 $('coord-y').value=String(round(point.y));
}
function place(x,y){
 const p={x:clamp(x),y:clamp(y)},q=selected.kind==='track'?Math.floor(selected.index/16):selected.owner;
 const sym=$('symmetry').checked;
 if(sym){
  const base=rotatePoint(p,(4-q)%4);
  for(let seat=0;seat<4;seat++){
   const translated=rotatePoint(base,seat);
   if(selected.kind==='track')draft.track[seat*16+selected.index%16]=translated;
   else if(selected.kind==='goals')draft.goals[seat][selected.index]=translated;
   else draft.homes[seat][selected.index]=translated;
  }
 }else{
  const old=getPoint(selected.kind,selected.index,selected.owner);old.x=p.x;old.y=p.y;
 }
 renderBoard();updateSelected();refreshStatus();
}
function renderGrid(){
 if(!$('show-grid').checked)return '';
 let out='<g opacity=".28" stroke="#6f99b6" stroke-width=".8" pointer-events="none">';
 for(let p=60;p<=700;p+=40){
  out+='<line x1="'+p+'" x2="'+p+'" y1="35" y2="725"/>';
  out+='<line x1="35" x2="725" y1="'+p+'" y2="'+p+'"/>';
 }
 return out+'</g>';
}
function circleMarkup(p,color,stroke,selectedHere,text,kind,index,owner){
 const isLight=kind==='track'&&index%16!==0;
 const fill=isLight?'#f5f8fb':kind==='track'?color:'#0a2944';
 const contrast=isLight?'#102a45':'#eaf5ff';
 return '<g data-kind="'+kind+'" data-index="'+index+'" data-owner="'+owner+'" aria-label="'+kind+' '+index+'" role="button">'+
   (selectedHere?'<circle cx="'+p.x+'" cy="'+p.y+'" r="23" fill="none" stroke="#ffe69e" stroke-width="3" stroke-dasharray="4 3"/>':'')+
   '<circle cx="'+p.x+'" cy="'+(p.y+1.8)+'" r="16.3" fill="#010e1a" opacity=".8"/>'+
   '<circle class="editor-point" cx="'+p.x+'" cy="'+p.y+'" r="14.5" fill="'+fill+'" stroke="'+(selectedHere?'#ffeab6':stroke)+'" stroke-width="'+(selectedHere?3.3:2)+'"/>'+
   '<circle cx="'+(p.x-3.6)+'" cy="'+(p.y-4.5)+'" r="3.6" fill="#fff" opacity="'+(isLight?'.65':'.21')+'" pointer-events="none"/>'+
   ($('show-numbers').checked?'<text x="'+p.x+'" y="'+(p.y+4)+'" font-size="'+(kind==='track'?9:10)+'" font-weight="900" text-anchor="middle" fill="'+contrast+'" pointer-events="none">'+(kind==='track'?index:index+1)+'</text>':'')+
   '<circle cx="'+p.x+'" cy="'+p.y+'" r="21" fill="transparent"/></g>';
}
function renderBoard(){
 if(!svg)return;
 const out=[];
 out.push('<defs><radialGradient id="board-grad" cx=".46" cy=".38" r=".8"><stop stop-color="#174773"/><stop offset=".72" stop-color="#103357"/><stop offset="1" stop-color="#061b34"/></radialGradient><linearGradient id="wood-grad" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#bb955b"/><stop offset=".45" stop-color="#745037"/><stop offset="1" stop-color="#d4ad70"/></linearGradient><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#ffce7a"/></marker></defs>');
 out.push('<rect x="9" y="9" width="742" height="742" rx="40" fill="url(#wood-grad)" stroke="#5a3524" stroke-width="6"/>');
 out.push('<rect x="30" y="30" width="700" height="700" rx="23" fill="url(#board-grad)" stroke="#c7a36b" stroke-width="2"/>');
 out.push('<image id="photo-overlay" x="30" y="30" width="700" height="700" preserveAspectRatio="xMidYMid meet" opacity="'+previewOpacity/100+'"/>');
 out.push(renderGrid());
 const outline=draft.track.map((p,i)=>(i===0?'M ':'L ')+coord(p)).join(' ')+' Z';
 out.push('<path d="'+outline+'" fill="none" stroke="#021525" stroke-width="34" opacity=".6" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>');
 out.push('<path d="'+outline+'" fill="none" stroke="#7bb0d5" stroke-width="2.7" opacity=".9" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>');
 for(let seat=0;seat<4;seat++){
  const c=colors[seat],goal=draft.goals[seat],home=draft.homes[seat];
  const gpath=goal.map(coord).join(' '),hpath=home.map(coord).join(' ');
  out.push('<polyline points="'+gpath+'" fill="none" stroke="'+c+'" stroke-opacity=".25" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>');
  out.push('<polyline points="'+hpath+'" fill="none" stroke="'+c+'" stroke-opacity=".20" stroke-width="33" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>');
  out.push('<polyline points="'+gpath+'" fill="none" stroke="'+c+'" stroke-opacity=".8" stroke-width="2.5" stroke-linecap="round" pointer-events="none"/>');
  out.push('<polyline points="'+hpath+'" fill="none" stroke="'+c+'" stroke-opacity=".7" stroke-width="2" stroke-linecap="round" pointer-events="none"/>');
  const start=draft.track[seat*16];
  out.push('<path d="M'+coord(start)+' L'+coord(goal[0])+'" fill="none" stroke="'+c+'" stroke-width="2" stroke-dasharray="5 5" pointer-events="none"/>');
 }
 out.push('<rect x="312" y="318" width="136" height="122" rx="22" fill="#051c35" fill-opacity=".85" stroke="#cfb17d" stroke-width="2" pointer-events="none"/>');
 out.push('<text x="380" y="369" text-anchor="middle" fill="#ffe1ad" font-size="39" font-weight="1000" letter-spacing="2" pointer-events="none">DOG</text>');
 out.push('<text x="380" y="394" text-anchor="middle" fill="#add0e9" font-size="11" font-weight="800" letter-spacing="2" pointer-events="none">BRETTSTUDIO</text>');
 for(let i=0;i<64;i++){
  const p=draft.track[i],seat=Math.floor(i/16),start=isStart(i),on=selected.kind==='track'&&selected.index===i;
  out.push(circleMarkup(p,colors[seat],start?colors[seat]:'#2b4d67',on,'','track',i,seat));
  if(start&&$('show-numbers').checked)out.push('<text x="'+(p.x+23)+'" y="'+(p.y-20)+'" font-size="11" fill="'+colors[seat]+'" font-weight="950" pointer-events="none">S'+seat+'</text>');
 }
 for(let seat=0;seat<4;seat++)for(let i=0;i<4;i++){
  const isGoal=selected.kind==='goals'&&selected.owner===seat&&selected.index===i;
  const isHome=selected.kind==='homes'&&selected.owner===seat&&selected.index===i;
  out.push(circleMarkup(draft.goals[seat][i],colors[seat],colors[seat],isGoal,'','goals',i,seat));
  out.push(circleMarkup(draft.homes[seat][i],colors[seat],colors[seat],isHome,'','homes',i,seat));
 }
 if($('show-numbers').checked){
  for(let i=0;i<64;i+=8){
   const a=draft.track[i],b=draft.track[(i+1)%64],cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;
   out.push('<path d="M '+(cx-4)+' '+(cy-4)+' L '+(cx+4)+' '+(cy+4)+'" stroke="#ffd890" stroke-width="3" marker-end="url(#arrow)" pointer-events="none" opacity=".6"/>');
  }
 }
 if(walkIndex>=0){
  const p=draft.track[walkIndex];
  out.push('<circle cx="'+p.x+'" cy="'+p.y+'" r="25" fill="#ffe1a5" opacity=".28" pointer-events="none"/>');
  out.push('<circle cx="'+p.x+'" cy="'+p.y+'" r="18" fill="none" stroke="#fff1bc" stroke-width="4" pointer-events="none"/>');
  out.push('<text x="'+p.x+'" y="'+(p.y-32)+'" text-anchor="middle" fill="#fff3cf" font-size="16" font-weight="1000" stroke="#061d30" stroke-width="3" paint-order="stroke" pointer-events="none">'+walkIndex+'</text>');
 }
 svg.innerHTML=out.join('');
 if(previewPhoto)svg.querySelector('#photo-overlay').setAttribute('href',previewPhoto);
 $('undo').disabled=historyIndex===0;
 $('redo').disabled=historyIndex===history.length-1;
}
function renderAll(){renderBoard();updateSelected();refreshStatus();}
function boardCoordinates(event){
 const matrix=svg.getScreenCTM();if(!matrix)return null;
 const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
 const logical=point.matrixTransform(matrix.inverse());
 return {x:logical.x,y:logical.y};
}
svg.addEventListener('pointerdown',event=>{
 if(event.button!==0)return;
 const target=event.target.closest('[data-kind]');if(!target)return;
 event.preventDefault();
 const kind=target.dataset.kind,index=Number(target.dataset.index),owner=Number(target.dataset.owner);
 selectField(kind,index,owner);
 dragging={id:event.pointerId,before:JSON.stringify(draft),moved:false};
 svg.setPointerCapture(event.pointerId);
});
svg.addEventListener('pointermove',event=>{
 if(!dragging||dragging.id!==event.pointerId)return;
 event.preventDefault();
 const point=boardCoordinates(event);if(!point)return;
 const old=selectedPoint();
 if(Math.abs(old.x-point.x)<1&&Math.abs(old.y-point.y)<1)return;
 dragging.moved=true;
 place(point.x,point.y);
});
function finishDrag(event){
 if(!dragging||dragging.id!==event.pointerId)return;
 const changed=JSON.stringify(draft)!==dragging.before;
 dragging=null;
 if(changed)recordHistory();
 renderAll();
}
svg.addEventListener('pointerup',finishDrag);
svg.addEventListener('pointercancel',finishDrag);
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
 const next=button.dataset.mode;
 if(!['track','goals','homes'].includes(next))return;
 const owner=selected.owner??0;
 selectField(next,next==='track'?owner*16:0,owner);
}));
function commitPosition(x,y){place(x,y);recordHistory();renderAll();}
$('coord-x').addEventListener('change',()=>{const n=Number($('coord-x').value);if(Number.isFinite(n))commitPosition(n,selectedPoint().y);});
$('coord-y').addEventListener('change',()=>{const n=Number($('coord-y').value);if(Number.isFinite(n))commitPosition(selectedPoint().x,n);});
document.querySelectorAll('[data-nudge]').forEach(button=>button.addEventListener('click',event=>{
 const [dx,dy]=button.dataset.nudge.split(',').map(Number);if(!dx&&!dy)return;
 const m=event.shiftKey?12:3,p=selectedPoint();commitPosition(p.x+dx*m,p.y+dy*m);
}));
window.addEventListener('keydown',event=>{
 if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName))return;
 let dx=0,dy=0;
 if(event.key==='ArrowUp')dy=-1;
 else if(event.key==='ArrowDown')dy=1;
 else if(event.key==='ArrowLeft')dx=-1;
 else if(event.key==='ArrowRight')dx=1;
 else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();undoRedo(event.shiftKey?1:-1);return;}
 else return;
 event.preventDefault();const p=selectedPoint(),m=event.shiftKey?12:3;commitPosition(p.x+dx*m,p.y+dy*m);
});
$('undo').addEventListener('click',()=>undoRedo(-1));
$('redo').addEventListener('click',()=>undoRedo(1));
$('show-numbers').addEventListener('change',renderBoard);
$('show-grid').addEventListener('change',renderBoard);
$('symmetry').addEventListener('change',()=>{
 report($('symmetry').checked?'Vierfach-Symmetrie aktiv.':'Einzelbearbeitung aktiv. Du kannst jetzt jedes Feld einzeln bewegen.');
});
$('walk-start').addEventListener('click',()=>{
 if(walkTimer!==null){stopWalk();return;}
 walkIndex=-1;travel(0);
 $('walk-start').textContent='⏸ Pausieren';
 walkTimer=setInterval(()=>travel(walkIndex+1),330);
});
$('walk-stop').addEventListener('click',stopWalk);
$('reference-upload').addEventListener('change',event=>{
 const file=event.target.files?.[0];if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){report('Bitte JPG, PNG oder WebP bis 12 MB auswählen.','error');return;}
 const reader=new FileReader();
 reader.onload=()=>{previewPhoto=String(reader.result);renderBoard();report('Brettfoto eingeblendet. Ziehe die nummerierten Felder über die passenden Positionen.');};
 reader.onerror=()=>report('Das Foto konnte nicht geladen werden.','error');
 reader.readAsDataURL(file);
});
$('remove-photo').addEventListener('click',()=>{previewPhoto=null;$('reference-upload').value='';renderBoard();report('Foto ausgeblendet.');});
$('photo-opacity').addEventListener('input',event=>{previewOpacity=Number(event.target.value);$('opacity-label').textContent=previewOpacity+' %';renderBoard();});
$('use-default').addEventListener('click',()=>{
 if(!confirm('Kreuz-Vorlage laden? Deine aktuellen, noch nicht gespeicherten Feldverschiebungen werden durch die Vorlage ersetzt.'))return;
 stopWalk();draft=makeDefaultLayout();recordHistory();selectField('track',0,0);renderAll();report('Kreuz-Vorlage geladen. Noch nicht gespeichert.');
});
function returnLocation(){
 const raw=new URL(location.href).searchParams.get('return');
 if(raw&&/^index\.html(?:\?[a-zA-Z0-9_&%=\-.:]+)?$/.test(raw))return raw;
 try{
  const ref=new URL(document.referrer);if(ref.origin===location.origin&&ref.pathname.endsWith('/DOG/index.html'))return ref.pathname.split('/').slice(-1)[0]+ref.search;
 }catch(_){}
 return 'index.html';
}
$('back-game').href=returnLocation();
function saveAndOpen(){
 const errors=getIssues();
 if(errors.length){report('Bitte zuerst die fehlerhaften Felder korrigieren: '+errors.slice(0,4).join(' / '),'error');return;}
 try{
  draft.schemaVersion=1;draft.title='Mein DOG-Brett';draft.preset=BOARD_LAYOUT_ID;
  saveBoardLayout(draft);
  report('✓ Dein DOG-Brett wurde gespeichert. Das Spiel öffnet sich mit deinem Layout.','success');
  location.assign(returnLocation());
 }catch(err){report('Speichern fehlgeschlagen: '+err.message,'error');}
}
$('save-layout').addEventListener('click',saveAndOpen);
$('save-secondary').addEventListener('click',saveAndOpen);
function download(text,name,type){
 const blob=new Blob([text],{type}),url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
$('download-json').addEventListener('click',()=>{
 const errors=getIssues();if(errors.length){report('Export nicht möglich: '+errors[0],'error');return;}
 download(JSON.stringify({...draft,title:'Mein DOG-Brett'},null,2),'dog-spielfeld-layout.json','application/json;charset=utf-8');
 report('Layout als JSON exportiert. Die Datei kann später wieder importiert werden.','success');
});
$('download-svg').addEventListener('click',()=>{
 const copy=svg.cloneNode(true);copy.querySelector('#photo-overlay')?.remove();
 copy.removeAttribute('class');copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
 const output='<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(copy);
 download(output,'dog-spielfeld-entwurf.svg','image/svg+xml;charset=utf-8');
 report('SVG exportiert. Das hochgeladene Foto wird bewusst nicht mit exportiert.','success');
});
$('import-layout').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 if(file.size>500*1024){report('JSON-Datei zu groß. Bitte Layout-Datei bis 500 KB verwenden.','error');return;}
 try{
  const next=JSON.parse(await file.text());const issues=validateBoardLayout(next,{strict:false});
  if(issues.length)throw Error(issues[0]);
  draft=clone(next);recordHistory();selectField('track',0,0);renderAll();
  report('JSON geladen. Überprüfe den Weg und klicke anschließend auf „Brett übernehmen“.');
 }catch(err){report('Import fehlgeschlagen: '+err.message,'error');}
 event.target.value='';
});
$('clear-saved').addEventListener('click',()=>{
 if(!confirm('Gespeicherten DOG-Spielplan auf diesem Gerät löschen?'))return;
 try{
  resetBoardLayout();draft=makeDefaultLayout();recordHistory();selectField('track',0,0);renderAll();
  report('Gespeichertes Brett gelöscht. Der ursprüngliche Kreuz-Spielplan ist wieder aktiv.','success');
 }catch(err){report('Löschen fehlgeschlagen: '+err.message,'error');}
});
renderAll();
