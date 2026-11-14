import {BOARD_STYLES,SCENE_STYLES,loadAppearance,saveAppearance,validAssetPath} from './appearance-registry.js?v=16';
import {APPROVED_BOARD_LAYOUT as LAYOUT} from './approved-board.js';
const $=id=>document.getElementById(id);
const S='http://www.w3.org/2000/svg',KEY='dog:design-studio:presets:v1';
const BOARDS=['studio','schiefer','holz','pergament','bergsee','goldwellen','royalMarmor','midnight','forest','winter'];
const SCENES=['none','maerchental','zauberwald','kuestenabenteuer','alpenland','royalKarten'];
const N={studio:'TV-Studio',schiefer:'Schiefer',holz:'Holz',pergament:'Pergament',bergsee:'Bergsee',goldwellen:'Goldwellen',royalMarmor:'Royal-Marmor',midnight:'Mitternacht',forest:'Waldlichtung',winter:'Winterabend',none:'Ohne Hintergrund',maerchental:'Märchental',zauberwald:'Zauberwald',kuestenabenteuer:'Küstenabenteuer',alpenland:'Alpenland',royalKarten:'Royal-Karten'};
const C=['#e75c59','#419ef0','#48c27c','#ffc94d'],name=id=>N[id]||id;
const validBoard=id=>typeof id==='string'&&Object.hasOwn(BOARD_STYLES,id);
const validScene=id=>typeof id==='string'&&Object.hasOwn(SCENE_STYLES,id);
const safeUrl=p=>validAssetPath(p)?new URL(p,import.meta.url).href:null;
const image=t=>safeUrl(t?.image)||safeUrl(t?.fallbackImage);
const bg=t=>image(t)?'url("'+image(t)+'")':(t?.page||'linear-gradient(130deg,#28445d,#091b29)').replace(/,\s*(#[\da-f]{3,8})\s*$/i,(_,c)=>',linear-gradient('+c+','+c+')');
const status=message=>$('studio-status').textContent=message;
const applied=()=>{const v=loadAppearance();return {board:validBoard(v.board)?v.board:'studio',scene:validScene(v.scene)?v.scene:'none'}};
const start=applied();
let draft=(start.board==='studio'&&start.scene==='none')?{board:'goldwellen',scene:'zauberwald'}:{...start};
function loadPresets(){
 try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.slice(0,30).filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&validScene(x.scene)&&validBoard(x.board)).map(x=>({id:x.id.slice(0,64),name:x.name.slice(0,40),scene:x.scene,board:x.board,favorite:x.favorite===true})):[]}
 catch{return []}
}
let presets=loadPresets();
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(presets));return true}
 catch{status('⚠️ Speichern nicht möglich. Bitte lokalen Browserspeicher aktivieren.');return false}
}
function element(tag,attrs,parent){
 const el=document.createElementNS(S,tag);
 for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);
 if(parent)parent.append(el);return el;
}
function circle(p,r,fill,stroke,sw,svg){element('circle',{cx:p.x,cy:p.y,r,fill,stroke,'stroke-width':sw},svg)}
function drawBoard(){
 const svg=$('board-preview');svg.replaceChildren();
 const t=BOARD_STYLES[draft.board],defs=element('defs',{},svg);
 const wood=element('linearGradient',{id:'wood',x1:'0',y1:'0',x2:'1',y2:'1'},defs);
 t.wood.forEach((c,i)=>element('stop',{offset:i/(t.wood.length-1),'stop-color':c},wood));
 const surface=element('linearGradient',{id:'surface',x1:'0',y1:'0',x2:'.7',y2:'1'},defs);
 t.surface.forEach((c,i)=>element('stop',{offset:i/(t.surface.length-1),'stop-color':c},surface));
 element('rect',{x:8,y:8,width:744,height:744,rx:35,fill:'url(#wood)',stroke:t.edge,'stroke-width':6},svg);
 element('rect',{x:30,y:30,width:700,height:700,rx:26,fill:'url(#surface)',stroke:t.edge,'stroke-width':3},svg);
 for(const p of [t.fallbackImage,t.image]){const u=safeUrl(p);if(u)element('image',{href:u,x:23,y:23,width:714,height:714,preserveAspectRatio:'xMidYMid meet','pointer-events':'none'},svg)}
 element('rect',{x:30,y:30,width:700,height:700,rx:26,fill:'none',stroke:t.edge,'stroke-width':2},svg);
 const path='M '+LAYOUT.track.map((p,i)=>(i?'L ':'')+p.x+' '+p.y).join(' ')+' Z';
 element('path',{d:path,stroke:'#071726','stroke-width':29,'stroke-opacity':'.54',fill:'none','stroke-linejoin':'round'},svg);
 element('path',{d:path,stroke:t.route,'stroke-width':3,'stroke-opacity':'.8',fill:'none'},svg);
 LAYOUT.track.forEach((p,i)=>{const owner=i%16===0?i/16:-1;circle(p,13,owner<0?'#eee9df':C[owner],owner<0?t.edge:C[owner],3,svg);circle(p,8,'#ffffff','#d1dfeb',1,svg)});
 LAYOUT.goals.forEach((arr,owner)=>arr.forEach(p=>{circle(p,13.5,'#fff',C[owner],4,svg);circle(p,8.5,'#f5fbfd','#dde5eb',1,svg)}));
 LAYOUT.homes.forEach((arr,owner)=>arr.forEach(p=>{circle(p,15,'#0c1622',C[owner],2,svg);circle(p,12,C[owner],'#f9fffb',2.2,svg);circle({x:p.x-4,y:p.y-4},3,'#ffffffbd','none',0,svg)}));
 element('circle',{cx:380,cy:380,r:91,fill:t.center[1],stroke:t.edge,'stroke-width':5},svg);
 element('circle',{cx:380,cy:380,r:80,fill:t.center[0],stroke:t.edge,'stroke-width':2},svg);
 element('text',{x:380,y:397,'text-anchor':'middle','font-size':65,'font-weight':900,'font-family':'Georgia,serif',fill:'#ffe5ab'},svg).textContent='DOG';
 element('text',{x:380,y:422,'text-anchor':'middle','font-size':13,'letter-spacing':3,fill:'#f4daac'},svg).textContent='DESIGN STUDIO';
}
function refresh(){
 $('preview-stage').style.setProperty('--scene-wallpaper',bg(SCENE_STYLES[draft.scene]));
 $('preview-heading').textContent=name(draft.scene)+' + '+name(draft.board);
 document.querySelectorAll('[data-scene]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.scene===draft.scene)));
 document.querySelectorAll('[data-board]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.board===draft.board)));
 drawBoard();
}
function makeOption(list,id,t,kind){
 const b=document.createElement('button');b.type='button';b.className='choice';b.dataset[kind]=id;b.setAttribute('aria-pressed','false');
 const a=document.createElement('span');a.className='choice-art';a.style.backgroundImage=bg(t);
 const c=document.createElement('span');c.className='choice-copy';
 const title=document.createElement('strong');title.textContent=name(id);
 const sub=document.createElement('small');sub.textContent=t.description||t.label||'DOG-Design';
 c.append(title,sub);
 const dot=document.createElement('span');dot.className='choice-check';dot.setAttribute('aria-hidden','true');
 b.append(a,c,dot);b.addEventListener('click',()=>{draft[kind]=id;refresh();status('Vorschau geändert. Mit „Im Spiel verwenden“ übernimmst du diese Kombination.')});
 list.append(b);
}
SCENES.filter(validScene).forEach(k=>makeOption($('scene-choices'),k,SCENE_STYLES[k],'scene'));
BOARDS.filter(validBoard).forEach(k=>makeOption($('board-choices'),k,BOARD_STYLES[k],'board'));
function apply(){
 try{saveAppearance({...loadAppearance(),board:draft.board,scene:draft.scene});renderPresets();status('✓ '+name(draft.scene)+' + '+name(draft.board)+' für DOG aktiviert.');return true}
 catch{status('⚠️ Das Design konnte nicht im Browser gespeichert werden.');return false}
}
const ideas=[{name:'Zauber-Mix',scene:'zauberwald',board:'goldwellen'},{name:'Küstenurlaub',scene:'kuestenabenteuer',board:'bergsee'},{name:'Royal Gold',scene:'royalKarten',board:'pergament'}];
function makePreset(p,idea){
 const box=document.createElement('article');box.className='preset';
 const a=applied();if(a.scene===p.scene&&a.board===p.board)box.classList.add('active');
 const art=document.createElement('span');art.className='preset-art';art.style.backgroundImage=bg(SCENE_STYLES[p.scene]);
 const body=document.createElement('div');body.className='preset-body';
 const title=document.createElement('strong');title.textContent=(p.favorite?'★ ':'')+p.name;
 const sub=document.createElement('small');sub.textContent=name(p.scene)+' + '+name(p.board)+(idea?' · Vorlage':'');
 const acts=document.createElement('div');acts.className='preset-actions';
 const use=document.createElement('button');use.type='button';use.textContent=idea?'Vorschau':'Anwenden';use.addEventListener('click',()=>{
  draft={scene:p.scene,board:p.board};refresh();
  if(idea)status('Vorlage geladen – jetzt speichern oder im Spiel verwenden.');else apply();
 });
 acts.append(use);
 if(!idea){
  const star=document.createElement('button');star.type='button';star.className='fav';star.textContent=p.favorite?'★':'☆';star.setAttribute('aria-label','Favorit umschalten');
  star.addEventListener('click',()=>{p.favorite=!p.favorite;if(!persist())p.favorite=!p.favorite;renderPresets()});
  const del=document.createElement('button');del.type='button';del.className='remove';del.textContent='✕';del.setAttribute('aria-label','Design '+p.name+' löschen');
  del.addEventListener('click',()=>{if(!confirm('Design „'+p.name+'“ löschen?'))return;const old=presets;presets=presets.filter(x=>x.id!==p.id);if(!persist())presets=old;renderPresets()});
  acts.append(star,del);
 }
 body.append(title,sub,acts);box.append(art,body);return box;
}
function renderPresets(){
 const list=$('preset-list');list.replaceChildren();
 if(presets.length){[...presets].sort((a,b)=>Number(b.favorite)-Number(a.favorite)).forEach(p=>list.append(makePreset(p,false)))}
 else{
  const empty=document.createElement('p');empty.className='presets-empty';empty.textContent='Noch keine eigenen Designs – starte mit einer Vorlage:';
  list.append(empty);ideas.forEach(p=>list.append(makePreset(p,true)));
 }
}
$('apply-design').addEventListener('click',apply);
$('new-design').addEventListener('click',()=>{draft={scene:'zauberwald',board:'goldwellen'};refresh();status('Neuer Entwurf gestartet – gespeicherte Designs bleiben erhalten.')});
$('save-top').addEventListener('click',()=>{
 if(presets.length>=30){status('Maximal 30 Designs. Lösche zuerst ein altes.');return}
 $('design-name').value='Mein DOG-Design '+(presets.length+1);$('save-dialog').showModal();$('design-name').select();
});
$('cancel-save').addEventListener('click',()=>$('save-dialog').close());
$('save-form').addEventListener('submit',e=>{
 e.preventDefault();const n=$('design-name').value.trim();if(!n)return;
 const p={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),name:n.slice(0,40),scene:draft.scene,board:draft.board,favorite:false};
 presets.unshift(p);if(!persist()){presets.shift();return}
 $('save-dialog').close();refresh();apply();status('💾 „'+p.name+'“ gespeichert und für DOG aktiviert.');
});
try{
 const target=new URLSearchParams(location.search).get('return'),u=target?new URL(target,location.href):null;
 if(u&&u.origin===location.origin&&['hub-lobby.html','spielauswahl-lokal.html','index.html'].includes(u.pathname.split('/').pop()))$('back-link').href=u.href;
}catch{}
refresh();renderPresets();
status('Links Hintergrund, rechts Spielbrett wählen. Beim Bearbeiten entstehen keine Firebase-Schreibvorgänge.');
