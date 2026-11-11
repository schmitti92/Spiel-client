import {
 STUDIO_STORAGE_KEY,STUDIO_FORMATS,createTemplate,createScene,createItem,
 normalizeProject,studioId,itemTypeLabel,clamp,rgba,safeImage
} from './studio-model.mjs';

(()=>{
'use strict';
const $=id=>document.getElementById(id);
const stage=$('artboard'),content=$('canvas-content'),scroll=$('stage-scroll');
const byId=id=>current().items.find(i=>i.id===id);
let project,activeIndex=0,selectedId=null,zoomMultiplier=1,scale=1;
let drag=null,history=[],historyIndex=0,toastTimer=0,silentChange=false;
try{
 const raw=localStorage.getItem(STUDIO_STORAGE_KEY);
 project=raw?normalizeProject(JSON.parse(raw)):createTemplate('boss');
}catch(error){project=createTemplate('boss');}
const current=()=>project.screens[activeIndex];
const selected=()=>selectedId?byId(selectedId):null;
const sectionIds=['screen-inspector','item-inspector'];
const propKeys=['text','x','y','w','h','fill','opacity','stroke','border','radius',
 'blur','color','font','align','bold','shadow','lock','hide'];
const propMap={text:'text',x:'x',y:'y',w:'w',h:'h',fill:'fill',
 opacity:'opacity',stroke:'stroke',border:'borderWidth',radius:'radius',
 blur:'blur',color:'color',font:'fontSize',align:'align',
 bold:'bold',shadow:'shadow',lock:'locked',hide:'hidden'};
const visualIcons={text:'𝐓',panel:'▣',rect:'▭',circle:'◯',button:'⬚',image:'▧',
 bar:'▰',player:'♟',arrow:'➜',note:'✎'};
function notify(message){
 $('status-line').textContent=message;
 const toast=$('toast');toast.textContent=message;toast.hidden=false;
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,3400);
}
function writeLocal(){
 try{
  localStorage.setItem(STUDIO_STORAGE_KEY,JSON.stringify(project));
  $('save-indicator').textContent='● Lokal gespeichert';
  $('save-indicator').style.color='#8de7c0';
 }catch(error){
  $('save-indicator').textContent='⚠ Browser-Speicher voll – JSON exportieren';
  $('save-indicator').style.color='#ffc47f';
  notify('⚠ Der lokale Speicher ist voll. Bitte „💾 Projekt“ exportieren.');
 }
}
function updateUndo(){
 $('undo-btn').disabled=historyIndex<=0;
 $('redo-btn').disabled=historyIndex>=history.length-1;
}
function resetHistory(){
 history=[JSON.stringify(project)];historyIndex=0;updateUndo();writeLocal();
}
function checkpoint(message=''){
 const state=JSON.stringify(project);
 if(state!==history[historyIndex]){
  history=history.slice(0,historyIndex+1);
  history.push(state);
  if(history.length>25)history.shift();
  historyIndex=history.length-1;
  updateUndo();writeLocal();
 }
 if(message)$('status-line').textContent=message;
}
function undo(direction){
 const next=historyIndex+direction;
 if(next<0||next>=history.length)return;
 historyIndex=next;project=JSON.parse(history[historyIndex]);
 activeIndex=Math.min(activeIndex,project.screens.length-1);
 selectedId=null;renderAll();updateUndo();writeLocal();
 notify(direction<0?'↶ Rückgängig':'↷ Wiederhergestellt');
}
function makeButton(text,callback,className=''){
 const b=document.createElement('button');b.type='button';b.textContent=text;
 if(className)b.className=className;b.addEventListener('click',callback);return b;
}
function renderTabs(){
 const tabs=$('scene-tabs');tabs.replaceChildren();
 for(const [index,scene] of project.screens.entries()){
  const emoji=/boss|erscheint/i.test(scene.name)?'🐉':
   /mini/i.test(scene.name)?'🎯':/sieg|erfolg/i.test(scene.name)?'🏆':
   /niederlage/i.test(scene.name)?'💀':/schmiede/i.test(scene.name)?'⚒️':
   /lobby/i.test(scene.name)?'🏰':'▤';
  const tab=makeButton(emoji+'  '+scene.name,()=>switchScene(index),'scene-tab');
  tab.setAttribute('aria-current',index===activeIndex?'true':'false');
  tab.title='Ansicht '+(index+1)+' · '+scene.name;
  tabs.append(tab);
 }
 tabs.append(makeButton('＋  Neue Ansicht',addScene,'scene-tab add-scene'));
 $('active-scene-label').textContent='🎬 '+current().name;
}
function renderBackground(){
 const b=current().background;
 stage.style.backgroundColor=b.color;
 const backdrop=$('canvas-backdrop');
 backdrop.style.backgroundImage=b.image?'url("'+b.image+'")':
  'radial-gradient(ellipse 48% 50% at 52% 40%,rgba(110,142,176,.3),transparent 100%),'+
  'radial-gradient(ellipse 80% 35% at 50% 120%,rgba(240,172,89,.2),transparent 100%)';
 backdrop.style.backgroundSize=b.image?b.fit:'cover';
 backdrop.style.filter='blur('+b.blur+'px)';
 $('canvas-overlay').style.background=rgba(b.overlay,b.overlayOpacity);
 stage.classList.toggle('show-grid',$('grid-toggle').checked&&!document.body.classList.contains('is-preview'));
}
function makeCanvasItem(item){
 const el=document.createElement('div');
 el.className='canvas-item type-'+item.type+
  (item.id===selectedId?' is-selected':'')+(item.locked?' locked':'')+(item.hidden?' is-hidden':'');
 el.dataset.id=item.id;el.setAttribute('aria-label',itemTypeLabel(item.type)+': '+item.text.slice(0,45));
 Object.assign(el.style,{
  left:item.x+'px',top:item.y+'px',width:item.w+'px',height:item.h+'px',
  backgroundColor:rgba(item.fill,item.opacity),color:item.color,
  borderColor:item.stroke,borderWidth:item.borderWidth+'px',
  borderRadius:item.radius+'px',
  backdropFilter:item.blur?'blur('+item.blur+'px)':'none',
  boxShadow:item.shadow?'0 15px 33px rgba(0,0,0,.46)':'none',
  fontSize:item.fontSize+'px',fontWeight:item.bold?'900':'500'
 });
 if(item.type==='bar'){
  const progress=document.createElement('div');progress.className='bar-progress';
  progress.style.width=item.progress+'%';el.append(progress);
 }
 if(item.type==='image'&&item.src){
  const image=document.createElement('img');image.src=item.src;image.alt=item.text||'Designbild';
  image.draggable=false;el.append(image);
 }else{
  const label=document.createElement('div');label.className='item-label';
  label.textContent=item.text;label.style.textAlign=item.align;
  if(item.type==='button')label.style.justifyContent='center';
  if(item.type==='circle')label.style.justifyContent='center';
  el.append(label);
 }
 const handle=document.createElement('span');handle.className='resize-handle';
 handle.setAttribute('aria-hidden','true');el.append(handle);
 return el;
}
function renderItems(){
 const fragment=document.createDocumentFragment();
 for(const item of current().items)if(!item.hidden||selectedId===item.id)
  fragment.append(makeCanvasItem(item));
 content.replaceChildren(fragment);
 $('canvas-empty').hidden=current().items.length>0;
}
function renderLayers(){
 const list=$('layer-list');list.replaceChildren();
 const items=current().items;
 $('layer-count').textContent=items.length+' Elemente';
 if(!items.length){const p=document.createElement('p');p.className='layer-empty';
  p.textContent='Noch keine Elemente vorhanden.';list.append(p);return;}
 for(const item of [...items].reverse()){
  const row=document.createElement('div');row.className='layer-row'+
   (selectedId===item.id?' active':'');
  const icon=document.createElement('span');icon.className='layer-icon';
  icon.textContent=visualIcons[item.type];row.append(icon);
  row.append(makeButton(item.text.trim().split('\n')[0].slice(0,30)||
   itemTypeLabel(item.type),()=>selectItem(item.id),'layer-select'));
  const eye=makeButton(item.hidden?'◌':'◉',()=>{
   item.hidden=!item.hidden;renderItems();renderLayers();renderInspector();checkpoint('Sichtbarkeit geändert');
  },'layer-toggle');eye.title=item.hidden?'Einblenden':'Ausblenden';row.append(eye);
  const lock=makeButton(item.locked?'🔒':'♢',()=>{
   item.locked=!item.locked;renderItems();renderLayers();renderInspector();checkpoint('Ebene fixiert');
  },'layer-toggle');lock.title=item.locked?'Entsperren':'Fixieren';row.append(lock);
  list.append(row);
 }
}
function renderInspector(){
 const item=selected();
 $('item-inspector').hidden=!item;$('screen-inspector').hidden=!!item;
 if(item){
  $('selected-type').textContent=visualIcons[item.type]+' '+itemTypeLabel(item.type);
  for(const key of propKeys){
   const input=$('prop-'+key),field=propMap[key],value=item[field];
   if(input.type==='checkbox')input.checked=!!value;
   else input.value=value;
  }
  $('prop-opacity-value').textContent=item.opacity+' %';
  $('prop-blur-value').textContent=item.blur+' px';
  $('item-image-btn').disabled=item.type!=='image';
 }else{
  const b=current().background;
  $('background-color').value=b.color;$('background-fit').value=b.fit;
  $('background-overlay').value=b.overlay;$('overlay-opacity').value=b.overlayOpacity;
  $('background-blur').value=b.blur;
  $('overlay-opacity-value').textContent=b.overlayOpacity+' %';
  $('background-blur-value').textContent=b.blur+' px';
  $('background-remove-btn').disabled=!b.image;
 }
}
function selectItem(id=null){
 selectedId=byId(id)?.id||null;
 for(const el of content.querySelectorAll('.canvas-item'))
  el.classList.toggle('is-selected',el.dataset.id===selectedId);
 renderInspector();renderLayers();
}
function renderAll(){
 $('project-name').value=project.name;
 $('screen-size').value=project.width+'x'+project.height;
 $('stage-dimensions').textContent=project.width+' × '+project.height;
 renderTabs();renderBackground();renderItems();renderInspector();renderLayers();
 fitCanvas();
}
function switchScene(index){
 if(index<0||index>=project.screens.length)return;
 activeIndex=index;selectedId=null;renderAll();
 $('status-line').textContent='🎬 Ansicht: '+current().name;
}
function addScene(){
 if(project.screens.length>=40){notify('Maximal 40 Ansichten pro Projekt.');return;}
 const name=prompt('Wie soll die neue Ansicht heißen?','Neue Ansicht');
 if(name===null)return;
 const scene=createScene((name.trim()||'Neue Ansicht').slice(0,65),current().background.color);
 project.screens.push(scene);activeIndex=project.screens.length-1;
 selectedId=null;renderAll();checkpoint('Neue Ansicht angelegt');notify('✨ Ansicht erstellt: '+scene.name);
}
function renameScene(){
 const name=prompt('Ansicht umbenennen:',current().name);
 if(name===null||!name.trim())return;
 current().name=name.trim().slice(0,65);renderTabs();checkpoint('Ansicht umbenannt');
}
function duplicateScene(){
 if(project.screens.length>=40){notify('Maximal 40 Ansichten.');return;}
 const clone=structuredClone(current());clone.id=studioId();
 clone.name=(clone.name+' · Kopie').slice(0,65);
 clone.items.forEach(i=>i.id=studioId());
 project.screens.splice(activeIndex+1,0,clone);activeIndex++;
 selectedId=null;renderAll();checkpoint('Ansicht dupliziert');
}
function deleteScene(){
 if(project.screens.length<=1){notify('Die letzte Ansicht kann nicht gelöscht werden.');return;}
 if(!confirm('Ansicht „'+current().name+'“ mit allen ihren Elementen löschen?'))return;
 project.screens.splice(activeIndex,1);activeIndex=Math.max(0,activeIndex-1);
 selectedId=null;renderAll();checkpoint('Ansicht gelöscht');
}
function addItem(type){
 if(current().items.length>=160){notify('Diese Ansicht enthält schon 160 Elemente.');return;}
 const item=createItem(type);
 item.x=clamp(Math.round((project.width-item.w)/2)+Math.floor(Math.random()*80)-40,
  0,Math.max(0,project.width-item.w));
 item.y=clamp(Math.round((project.height-item.h)/2)+Math.floor(Math.random()*80)-40,
  0,Math.max(0,project.height-item.h));
 current().items.push(item);selectedId=item.id;
 renderItems();renderLayers();renderInspector();checkpoint('Neues Element: '+itemTypeLabel(type));
 notify('✨ '+itemTypeLabel(type)+' eingefügt – jetzt verschieben oder bearbeiten');
}
function deleteSelected(){
 if(!selectedId)return;
 const index=current().items.findIndex(i=>i.id===selectedId);
 if(index<0)return;
 current().items.splice(index,1);selectedId=null;
 renderItems();renderLayers();renderInspector();checkpoint('Element gelöscht');
}
function duplicateSelected(){
 const item=selected();if(!item||current().items.length>=160)return;
 const copy={...item,id:studioId(),
  x:clamp(item.x+25,0,project.width-10),y:clamp(item.y+25,0,project.height-10)};
 current().items.push(copy);selectedId=copy.id;
 renderItems();renderLayers();renderInspector();checkpoint('Element dupliziert');
}
function moveLayer(forward){
 const index=current().items.findIndex(i=>i.id===selectedId);
 if(index<0)return;const dest=index+(forward?1:-1);
 if(dest<0||dest>=current().items.length)return;
 const [item]=current().items.splice(index,1);current().items.splice(dest,0,item);
 renderItems();renderLayers();checkpoint('Ebenenposition geändert');
}
function applyProperties(){
 if(silentChange)return;
 const item=selected();if(!item)return;
 for(const key of propKeys){
  const control=$('prop-'+key),property=propMap[key];
  if(control.type==='checkbox')item[property]=control.checked;
  else if(control.type==='number'||control.type==='range'){
   const num=Number(control.value);
   if(!Number.isFinite(num))continue;
   const minimum={x:0,y:0,w:10,h:10,opacity:0,border:0,radius:0,blur:0,font:8};
   const maximum={x:project.width-10,y:project.height-10,w:project.width,
    h:project.height,opacity:100,border:16,radius:300,blur:28,font:170};
   item[property]=Math.round(clamp(num,minimum[key]??0,maximum[key]??10000));
  }else item[property]=control.value;
 }
 $('prop-opacity-value').textContent=item.opacity+' %';
 $('prop-blur-value').textContent=item.blur+' px';
 renderItems();renderLayers();
}
function applyBackground(){
 const b=current().background;
 b.color=$('background-color').value;b.fit=$('background-fit').value;
 b.overlay=$('background-overlay').value;
 b.overlayOpacity=Number($('overlay-opacity').value);
 b.blur=Number($('background-blur').value);
 $('overlay-opacity-value').textContent=b.overlayOpacity+' %';
 $('background-blur-value').textContent=b.blur+' px';
 renderBackground();
}
function fitCanvas(){
 if(!project||!scroll.clientWidth||!scroll.clientHeight)return;
 const maxW=Math.max(160,scroll.clientWidth-46),maxH=Math.max(160,scroll.clientHeight-46);
 const base=Math.min(maxW/project.width,maxH/project.height,1.15);
 scale=clamp(base*zoomMultiplier,.08,3.0);
 $('board-shell').style.width=(project.width*scale)+'px';
 $('board-shell').style.height=(project.height*scale)+'px';
 stage.style.width=project.width+'px';stage.style.height=project.height+'px';
 stage.style.transform='scale('+scale+')';
 $('zoom-value').textContent=Math.round(scale*100)+' %';
}
function stagePoint(event){
 const box=stage.getBoundingClientRect();
 return {x:(event.clientX-box.left)/scale,y:(event.clientY-box.top)/scale};
}
function snapValue(number){return $('snap-toggle').checked?Math.round(number/20)*20:Math.round(number);}
function startDrag(event){
 if(document.body.classList.contains('is-preview')||event.button!==0)return;
 const element=event.target.closest('.canvas-item');
 if(!element||!stage.contains(element)){selectItem(null);return;}
 const item=byId(element.dataset.id);if(!item)return;
 selectItem(item.id);
 if(item.locked)return;
 const pt=stagePoint(event);
 drag={id:item.id,mode:event.target.classList.contains('resize-handle')?'resize':'move',
  x:pt.x,y:pt.y,original:{x:item.x,y:item.y,w:item.w,h:item.h}};
 stage.setPointerCapture(event.pointerId);event.preventDefault();
}
function dragMove(event){
 if(!drag)return;
 const item=byId(drag.id);if(!item)return;
 const pt=stagePoint(event),dx=pt.x-drag.x,dy=pt.y-drag.y;
 if(drag.mode==='resize'){
  item.w=clamp(snapValue(drag.original.w+dx),30,project.width-item.x);
  item.h=clamp(snapValue(drag.original.h+dy),30,project.height-item.y);
 }else{
  item.x=clamp(snapValue(drag.original.x+dx),0,Math.max(0,project.width-item.w));
  item.y=clamp(snapValue(drag.original.y+dy),0,Math.max(0,project.height-item.h));
 }
 const el=[...content.children].find(n=>n.dataset.id===drag.id);
 if(el){el.style.left=item.x+'px';el.style.top=item.y+'px';
  el.style.width=item.w+'px';el.style.height=item.h+'px';}
 for(const key of ['x','y','w','h'])$('prop-'+key).value=item[key];
}
function stopDrag(){
 if(!drag)return;drag=null;renderItems();renderLayers();checkpoint('Element positioniert');
}
async function compressImage(file){
 if(!file||!/^image\/(png|jpeg|webp|gif)$/.test(file.type))
  throw Error('Bitte ein PNG-, JPG-, WebP- oder GIF-Bild auswählen.');
 if(file.size>15*1024*1024)throw Error('Bild zu groß: maximal 15 MB.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
  const max=1900,ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL('image/webp',.87);
  if(!safeImage(data))throw Error('Das Bild ist nach dem Verarbeiten zu groß.');
  return data;
 }finally{URL.revokeObjectURL(url);}
}
async function importPicture(file,kind){
 // Remember the target before asynchronous image compression so switching
 // tabs during upload cannot accidentally edit a different screen.
 const sceneId=current().id,itemId=selectedId;
 try{
  const data=await compressImage(file);
  const scene=project.screens.find(x=>x.id===sceneId);
  if(!scene)return;
  if(kind==='background')scene.background.image=data;
  else{
   const item=scene.items.find(x=>x.id===itemId);
   if(!item||item.type!=='image')return;
   item.src=data;
  }
  if(current().id===sceneId){
   renderBackground();renderItems();renderInspector();
  }
  checkpoint('Bild eingefügt');notify('🖼 Bild wurde der Ansicht „'+scene.name+'“ hinzugefügt');
 }catch(error){notify('⚠ '+error.message);}
}
function download(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function filename(value){
 return String(value).normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-')
  .replace(/^-+|-+$/g,'').slice(0,60)||'design';
}
function exportProject(){
 const data=JSON.stringify(project,null,2);
 download(new Blob([data],{type:'application/json;charset=utf-8'}),
  filename(project.name)+'.json');
 notify('💾 Alle '+project.screens.length+' Ansichten als Projekt gespeichert');
}
async function importProject(file){
 if(!file)return;
 try{
  if(file.size>18*1024*1024)throw Error('Projektdatei über 18 MB.');
  const source=JSON.parse(await file.text());
  const incoming=normalizeProject(source);
  if(!confirm('Das aktuelle Projekt durch „'+incoming.name+'“ ersetzen? Vorher bei Bedarf exportieren.'))
   return;
  project=incoming;activeIndex=0;selectedId=null;zoomMultiplier=1;
  resetHistory();renderAll();notify('📂 Projekt geladen: '+project.name);
 }catch(error){notify('⚠ Projekt konnte nicht geöffnet werden: '+error.message);}
}
function pathRounded(ctx,x,y,w,h,r){
 const rad=clamp(r,0,Math.min(w,h)/2);
 ctx.beginPath();
 if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,w,h,rad);
 else{
  ctx.moveTo(x+rad,y);ctx.lineTo(x+w-rad,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rad);
  ctx.lineTo(x+w,y+h-rad);ctx.quadraticCurveTo(x+w,y+h,x+w-rad,y+h);
  ctx.lineTo(x+rad,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rad);
  ctx.lineTo(x,y+rad);ctx.quadraticCurveTo(x,y,x+rad,y);
 }
 ctx.closePath();
}
function drawWrappedText(ctx,value,x,y,maxW,maxH,fontSize,align){
 const text=String(value||'');if(!text)return;
 const lineH=fontSize*1.22,lines=[];
 for(const paragraph of text.split('\n')){
  let line='';
  for(const word of paragraph.split(/\s+/)){
   const next=line?line+' '+word:word;
   if(ctx.measureText(next).width>maxW&&line){lines.push(line);line=word;}
   else line=next;
  }
  lines.push(line);
 }
 const maxLines=Math.max(1,Math.floor(maxH/lineH));
 const visible=lines.slice(0,maxLines);
 ctx.textAlign=align;ctx.textBaseline='middle';
 const total=visible.length*lineH;
 for(let i=0;i<visible.length;i++)
  ctx.fillText(visible[i],x,y-total/2+lineH*(i+.5),maxW);
}
async function loadCanvasImage(data){
 if(!data)return null;
 return new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=data;
 });
}
async function exportPng(){
 try{
  const canvas=document.createElement('canvas');
  canvas.width=project.width;canvas.height=project.height;
  const ctx=canvas.getContext('2d');const scene=current(),b=scene.background;
  ctx.fillStyle=b.color;ctx.fillRect(0,0,canvas.width,canvas.height);
  if(b.image){
   const img=await loadCanvasImage(b.image);
   if(img){
    const ratio=b.fit==='contain'?
     Math.min(canvas.width/img.width,canvas.height/img.height):
     Math.max(canvas.width/img.width,canvas.height/img.height);
    const w=img.width*ratio,h=img.height*ratio;
    ctx.save();ctx.filter='blur('+b.blur+'px)';
    ctx.drawImage(img,(canvas.width-w)/2,(canvas.height-h)/2,w,h);ctx.restore();
   }
  }else{
   const glow=ctx.createRadialGradient(canvas.width*.5,canvas.height*.46,20,
    canvas.width*.5,canvas.height*.46,canvas.width*.55);
   glow.addColorStop(0,'rgba(126,152,191,.4)');
   glow.addColorStop(1,'rgba(126,152,191,0)');
   ctx.fillStyle=glow;ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  ctx.fillStyle=rgba(b.overlay,b.overlayOpacity);ctx.fillRect(0,0,canvas.width,canvas.height);
  for(const it of scene.items){
   if(it.hidden)continue;
   const {x,y,w,h}=it;
   ctx.save();ctx.shadowColor='rgba(0,0,0,.47)';
   ctx.shadowBlur=it.shadow?24:0;ctx.shadowOffsetY=it.shadow?10:0;
   if(it.type==='circle'){
    ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);
   }else if(it.type==='arrow'){
    ctx.beginPath();ctx.moveTo(x,y+h*.34);ctx.lineTo(x+w*.66,y+h*.34);
    ctx.lineTo(x+w*.66,y);ctx.lineTo(x+w,y+h/2);
    ctx.lineTo(x+w*.66,y+h);ctx.lineTo(x+w*.66,y+h*.66);
    ctx.lineTo(x,y+h*.66);ctx.closePath();
   }else pathRounded(ctx,x,y,w,h,it.radius);
   ctx.fillStyle=rgba(it.fill,it.opacity);ctx.fill();
   ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
   if(it.borderWidth&&it.type!=='arrow'){
    ctx.strokeStyle=it.stroke;ctx.lineWidth=it.borderWidth;ctx.stroke();
   }
   if(it.type==='image'&&it.src){
    const img=await loadCanvasImage(it.src);
    if(img){ctx.save();pathRounded(ctx,x,y,w,h,it.radius);ctx.clip();
     const cover=Math.max(w/img.width,h/img.height);
     ctx.drawImage(img,x+(w-img.width*cover)/2,y+(h-img.height*cover)/2,
      img.width*cover,img.height*cover);ctx.restore();}
   }else{
    if(it.type==='bar'){
     ctx.save();pathRounded(ctx,x,y,w,h,it.radius);ctx.clip();
     const grad=ctx.createLinearGradient(x,y,x+w,y);
     grad.addColorStop(0,'#d94e65');grad.addColorStop(1,'#ffc77b');
     ctx.fillStyle=grad;ctx.fillRect(x,y,w*it.progress/100,h);ctx.restore();
    }
    ctx.fillStyle=it.color;
    ctx.font=(it.bold?'900 ':'500 ')+it.fontSize+'px Outfit, system-ui, sans-serif';
    const align=it.align||'center';
    const textX=align==='left'?x+15:align==='right'?x+w-15:x+w/2;
    drawWrappedText(ctx,it.text,textX,y+h/2,w-25,h-10,it.fontSize,align);
   }
   ctx.restore();
  }
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw Error('Bildexport wird vom Browser nicht unterstützt.');
  download(blob,filename(project.name)+'-'+filename(scene.name)+'.png');
  notify('📷 Bild exportiert: '+scene.name);
 }catch(error){notify('⚠ PNG-Export fehlgeschlagen: '+error.message);}
}
function wireControls(){
 document.querySelectorAll('[data-add]').forEach(btn=>
  btn.addEventListener('click',()=>addItem(btn.dataset.add)));
 $('project-name').addEventListener('change',event=>{
  project.name=(event.target.value.trim()||'Unbenanntes Projekt').slice(0,70);
  event.target.value=project.name;checkpoint('Projekt umbenannt');
 });
 $('new-project').addEventListener('click',()=>{
  if(!confirm('Ein neues Projekt starten? Speichere den bisherigen Entwurf vorher bei Bedarf als JSON.'))
   return;
  project=createTemplate($('template-picker').value);activeIndex=0;selectedId=null;
  zoomMultiplier=1;resetHistory();renderAll();notify('✨ Neues Projekt: '+project.name);
 });
 $('rename-screen').addEventListener('click',renameScene);
 $('duplicate-screen').addEventListener('click',duplicateScene);
 $('delete-screen').addEventListener('click',deleteScene);
 $('delete-item').addEventListener('click',deleteSelected);
 $('duplicate-item').addEventListener('click',duplicateSelected);
 $('item-front').addEventListener('click',()=>moveLayer(true));
 $('item-back').addEventListener('click',()=>moveLayer(false));
 for(const key of propKeys){
  const input=$('prop-'+key);
  input.addEventListener('input',applyProperties);
  input.addEventListener('change',()=>{applyProperties();checkpoint('Element verändert');});
 }
 for(const key of ['background-color','background-overlay','background-fit','overlay-opacity',
  'background-blur']){
  const input=$(key);
  input.addEventListener('input',applyBackground);
  input.addEventListener('change',()=>{applyBackground();checkpoint('Hintergrund geändert');});
 }
 $('background-upload-btn').addEventListener('click',()=>$('background-file').click());
 $('background-file').addEventListener('change',event=>{
  void importPicture(event.target.files?.[0],'background');event.target.value='';
 });
 $('background-remove-btn').addEventListener('click',()=>{
  current().background.image='';renderBackground();renderInspector();
  checkpoint('Hintergrund entfernt');
 });
 $('item-image-btn').addEventListener('click',()=>$('item-file').click());
 $('item-file').addEventListener('change',event=>{
  void importPicture(event.target.files?.[0],'item');event.target.value='';
 });
 $('import-btn').addEventListener('click',()=>$('project-file').click());
 $('project-file').addEventListener('change',event=>{
  void importProject(event.target.files?.[0]);event.target.value='';
 });
 $('export-json').addEventListener('click',exportProject);
 $('export-png').addEventListener('click',()=>void exportPng());
 $('undo-btn').addEventListener('click',()=>undo(-1));
 $('redo-btn').addEventListener('click',()=>undo(1));
 $('grid-toggle').addEventListener('change',renderBackground);
 $('fit-btn').addEventListener('click',()=>{zoomMultiplier=1;fitCanvas();});
 $('zoom-in').addEventListener('click',()=>{zoomMultiplier=clamp(zoomMultiplier*1.2,.3,5);fitCanvas();});
 $('zoom-out').addEventListener('click',()=>{zoomMultiplier=clamp(zoomMultiplier/1.2,.3,5);fitCanvas();});
 $('screen-size').addEventListener('change',event=>{
  const size=STUDIO_FORMATS[event.target.value];if(!size)return;
  [project.width,project.height]=size;
  selectedId=null;zoomMultiplier=1;renderAll();checkpoint('Bildschirmformat geändert');
 });
 $('preview-btn').addEventListener('click',()=>{
  document.body.classList.toggle('is-preview');
  const preview=document.body.classList.contains('is-preview');
  $('preview-btn').innerHTML=preview?'✎ <span class="button-label">Bearbeiten</span>':
   '◉ <span class="button-label">Vorschau</span>';
  renderItems();renderBackground();requestAnimationFrame(fitCanvas);
 });
 $('fullscreen-btn').addEventListener('click',async()=>{
  try{
   if(document.fullscreenElement)await document.exitFullscreen();
   else await document.documentElement.requestFullscreen();
  }catch{notify('Vollbild wird von diesem Browser nicht unterstützt.');}
  requestAnimationFrame(fitCanvas);
 });
 const showHelp=()=>$('help-dialog').showModal();
 $('help-btn').addEventListener('click',showHelp);
 $('sample-tip').addEventListener('click',showHelp);
 document.querySelectorAll('[data-close-dialog]').forEach(x=>
  x.addEventListener('click',()=>$('help-dialog').close()));
 stage.addEventListener('pointerdown',startDrag);
 stage.addEventListener('pointermove',dragMove);
 stage.addEventListener('pointerup',stopDrag);
 stage.addEventListener('pointercancel',stopDrag);
 stage.addEventListener('lostpointercapture',stopDrag);
 stage.addEventListener('dblclick',event=>{
  if(document.body.classList.contains('is-preview'))return;
  const target=event.target.closest('.canvas-item');
  if(!target)return;
  const item=byId(target.dataset.id);
  if(!item||item.type==='image')return;
  const text=prompt('Text für '+itemTypeLabel(item.type)+':',item.text);
  if(text===null)return;item.text=text.slice(0,1500);
  selectItem(item.id);renderItems();renderInspector();checkpoint('Beschriftung bearbeitet');
 });
 document.addEventListener('keydown',event=>{
  const typing=event.target.closest('input,textarea,select,[contenteditable=true]');
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&!typing){
   event.preventDefault();undo(event.shiftKey?1:-1);return;
  }
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'&&!typing){
   event.preventDefault();undo(1);return;
  }
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='d'&&!typing){
   event.preventDefault();duplicateSelected();return;
  }
  if(!typing&&(event.key==='Delete'||event.key==='Backspace')){
   event.preventDefault();deleteSelected();
  }
  if(event.key==='Escape'&&document.body.classList.contains('is-preview')){
   $('preview-btn').click();
  }
 });
 window.addEventListener('resize',fitCanvas);
 if(typeof ResizeObserver==='function')new ResizeObserver(fitCanvas).observe(scroll);
 document.addEventListener('fullscreenchange',fitCanvas);
}
wireControls();resetHistory();renderAll();
$('status-line').textContent='✨ Studio bereit · '+project.screens.length+' Ansichten';
})();
