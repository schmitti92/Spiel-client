import {applyMotionMode,loadMotionMode} from './motion-settings.js';
applyMotionMode(loadMotionMode());
import {BOARD_STYLES,isBoardUnlocked,BOARD_FRAMES,SCENE_STYLES,HUD_LAYOUTS,HUD_TONES,HUD_OPACITY_BLOCKS,normalizeHudOpacity,hudOpacityColor,loadAppearance,saveAppearance,validAssetPath} from './appearance-registry.js?v=22';
import {APPROVED_BOARD_LAYOUT as LAYOUT} from './approved-board.js';
import {isVerifiedCosmeticUnlocked} from './verified-cosmetics.js?v=2';
const $=id=>document.getElementById(id);
const S='http://www.w3.org/2000/svg',KEY='dog:design-studio:presets:v1';
const BOARDS=['studio','schiefer','holz','pergament','bergsee','goldwellen','royalMarmor','maerchental','alpenland','kuestenabenteuer','royalKarten','zauberwald','midnight','forest','winter','weihnachtsdorf','lebkuchenwerkstatt','polarlichtpalast','winterlandschaft'];
const SCENES=Object.keys(SCENE_STYLES);
const N={studio:'TV-Studio',schiefer:'Schiefer',holz:'Holz',pergament:'Pergament',bergsee:'Bergsee',goldwellen:'Goldwellen',royalMarmor:'Royal-Marmor',midnight:'Mitternacht',forest:'Waldlichtung',winter:'Winterabend',none:'Ohne Hintergrund',schloss:'Magisches Schloss am Nebelsee',maerchental:'Märchental',zauberwald:'Zauberwald',kuestenabenteuer:'Küstenabenteuer',alpenland:'Alpenland',royalKarten:'Royal-Karten',weihnachtsdorf:'Weihnachtsdorf',lebkuchenwerkstatt:'Lebkuchenwerkstatt',polarlichtpalast:'Polarlichtpalast',winterlandschaft:'Winterlandschaft'};
const C=['#e75c59','#419ef0','#48c27c','#ffc94d'],name=id=>N[id]||id;
const validBoard=id=>typeof id==='string'&&Object.hasOwn(BOARD_STYLES,id);
const validFrame=id=>typeof id==='string'&&Object.hasOwn(BOARD_FRAMES,id);
const validScene=id=>typeof id==='string'&&Object.hasOwn(SCENE_STYLES,id);
const validHudLayout=id=>typeof id==='string'&&Object.hasOwn(HUD_LAYOUTS,id);
const validHudTone=id=>typeof id==='string'&&Object.hasOwn(HUD_TONES,id);
const unlockedScene=id=>validScene(id)&&(!SCENE_STYLES[id].unlockId||isVerifiedCosmeticUnlocked(SCENE_STYLES[id].unlockId));
const unlockedTone=id=>validHudTone(id)&&(id==='classic'||isVerifiedCosmeticUnlocked('christmas2026:hud-tone:'+id));
const unlockedPreset=p=>isBoardUnlocked(p.board)&&unlockedScene(p.scene)&&unlockedTone(p.hudTone||'classic');
const safeUrl=p=>validAssetPath(p)?new URL(p,import.meta.url).href:null;
const image=t=>safeUrl(t?.image)||safeUrl(t?.fallbackImage);
const bg=t=>image(t)?'url("'+image(t)+'")':(t?.page||'linear-gradient(130deg,#28445d,#091b29)').replace(/,\s*(#[\da-f]{3,8})\s*$/i,(_,c)=>',linear-gradient('+c+','+c+')');
const status=message=>$('studio-status').textContent=message;
const applied=()=>{const v=loadAppearance();return {board:validBoard(v.board)?v.board:'studio',boardFrame:validFrame(v.boardFrame)?v.boardFrame:'classic',scene:validScene(v.scene)?v.scene:'schloss',hudLayout:validHudLayout(v.hudLayout)?v.hudLayout:'classic',hudTone:validHudTone(v.hudTone)?v.hudTone:'classic',hudOpacity:normalizeHudOpacity(v.hudOpacity)}};
const start=applied();
let draft={...start};
function loadPresets(){
 try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.slice(0,30).filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&validBoard(x.board)&&unlockedPreset(x)).map(x=>({id:x.id.slice(0,64),name:x.name.slice(0,40),scene:unlockedScene(x.scene)?x.scene:'schloss',board:x.board,boardFrame:validFrame(x.boardFrame)?x.boardFrame:'classic',hudLayout:validHudLayout(x.hudLayout)?x.hudLayout:'classic',hudTone:unlockedTone(x.hudTone)?x.hudTone:'classic',hudOpacity:normalizeHudOpacity(x.hudOpacity),favorite:x.favorite===true})):[]}
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

const HUD_OPACITY_LABELS={players:'👥 Spieleranzeige',piles:'🗂️ Kartenbereich',hand:'🃏 Handkartenbereich',extras:'✨ Magie, Emojis & Extras'};
const hudOpacityFields=new Map();
function defaultHudOpacity(key,tone){
 const color=tone?.[key==='extras'?'button':key==='players'?'panel':'inner']||'';
 const match=/,\s*(0?(?:\.\d+)?|1(?:\.0+)?)\s*\)$/.exec(color);
 return match?Math.round(Number(match[1])*100):75;
}
function updateHudOpacityPreview(tone){
 const root=$('hud-preview'),all=[];
 for(const key of HUD_OPACITY_BLOCKS){
  const chosen=draft.hudOpacity[key];
  const value=chosen===null?defaultHudOpacity(key,tone):chosen;
  all.push(value);
  const field=hudOpacityFields.get(key);
  if(field){
   field.range.value=String(value);
   field.output.textContent=value+' %'+(chosen===null?' · Standard':'');
   field.range.setAttribute('aria-valuetext',value+' Prozent'+(chosen===null?', Standard':''));
  }
  const box=root.querySelector('[data-hud-block="'+key+'"]');
  if(!box)continue;
  box.style.background=chosen===null?'':hudOpacityColor(tone,'panel',chosen);
  let innerSelector,source;
  if(key==='players'){innerSelector='.studio-hud-player';source='seat'}
  else if(key==='piles'){innerSelector='.studio-hud-piles';source='inner'}
  else if(key==='hand'){innerSelector='.studio-hud-hand';source='inner'}
  else{innerSelector='.studio-hud-extras>span';source='button'}
  box.querySelectorAll(innerSelector).forEach(child=>{
   child.style.background=chosen===null?'':hudOpacityColor(tone,source,chosen);
  });
 }
 $('hud-opacity-all').value=String(Math.round(all.reduce((n,v)=>n+v,0)/all.length));
}
function mountHudOpacityControls(){
 const host=$('hud-opacity-controls');
 for(const key of HUD_OPACITY_BLOCKS){
  const box=document.createElement('div');box.className='hud-opacity-control';
  const line=document.createElement('div');line.className='opacity-label-line';
  const label=document.createElement('label');
  const range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.step='1';
  range.id='hud-opacity-'+key;label.htmlFor=range.id;label.textContent=HUD_OPACITY_LABELS[key];
  const output=document.createElement('output');output.htmlFor=range.id;output.setAttribute('aria-live','off');
  line.append(label,output);box.append(line,range);host.append(box);
  hudOpacityFields.set(key,{range,output});
  range.addEventListener('input',()=>{
   draft.hudOpacity={...draft.hudOpacity,[key]:Number(range.value)};
   refresh();status('Transparenz für '+HUD_OPACITY_LABELS[key]+' geändert. Mit „Im Spiel verwenden“ übernehmen.');
  });
 }
 $('hud-opacity-all').addEventListener('input',event=>{
  const value=Number(event.target.value);
  draft.hudOpacity=Object.fromEntries(HUD_OPACITY_BLOCKS.map(key=>[key,value]));
  refresh();status('Transparenz für alle vier Spielblöcke auf '+value+' % gestellt.');
 });
 $('reset-hud-opacity').addEventListener('click',()=>{
  draft.hudOpacity=normalizeHudOpacity(null);
  refresh();status('Standard-Transparenz der gewählten Farben wiederhergestellt.');
 });
}
mountHudOpacityControls();

function renderFramePreview(){
 const frame=BOARD_FRAMES[draft.boardFrame]||BOARD_FRAMES.classic;
 const box=$('preview-screen');
 box.dataset.boardFrame=draft.boardFrame;
 const props={'--frame-fill':frame.fill,'--frame-line':frame.stroke,'--frame-inner':frame.inner,'--frame-glow':frame.glow,'--frame-glow-size':frame.glowSize,'--frame-radius':frame.radius};
 for(const [key,value] of Object.entries(props))box.style.setProperty(key,value);
 document.querySelectorAll('[data-frame-id]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.frameId===draft.boardFrame)));
}
function refresh(){
 renderFramePreview();
 const tone=HUD_TONES[draft.hudTone]||HUD_TONES.classic;
 const panel=$('hud-preview');
 for(const [from,to] of [['panel','--hud-panel'],['seat','--hud-seat'],['inner','--hud-inner'],['button','--hud-button'],['border','--hud-border'],['accent','--hud-accent'],['text','--hud-text'],['muted','--hud-muted']]){
  panel.style.setProperty(to,tone[from]);
 }
 $('hud-preview').dataset.layout=draft.hudLayout;
 updateHudOpacityPreview(tone);
 document.querySelectorAll('[data-hud-tone]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.hudTone===draft.hudTone)));
 $('preview-stage').style.setProperty('--scene-wallpaper',bg(SCENE_STYLES[draft.scene]));
 $('preview-heading').textContent=name(draft.board)+' · '+(BOARD_FRAMES[draft.boardFrame]||BOARD_FRAMES.classic).label+' · '+tone.label;
 document.querySelectorAll('[data-scene]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.scene===draft.scene)));
 document.querySelectorAll('[data-board]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.board===draft.board)));
 drawBoard();
}
function makeOption(list,id,t,kind){
 const b=document.createElement('button');b.type='button';b.className='choice';b.dataset[kind]=id;b.setAttribute('aria-pressed','false');
 const a=document.createElement('span');a.className='choice-art';a.style.backgroundImage=bg(t);
 const c=document.createElement('span');c.className='choice-copy';
 const title=document.createElement('strong');title.textContent=name(id);
 const sub=document.createElement('small');sub.textContent=kind==='board'&&!isBoardUnlocked(id)?'🔒 Im Weihnachtsevent freischaltbar':(t.description||t.label||'DOG-Design');
  if(kind==='board'&&!isBoardUnlocked(id)){b.disabled=true;b.classList.add('is-locked');b.title='Wird im Weihnachtsevent freigeschaltet';}
 c.append(title,sub);
 const dot=document.createElement('span');dot.className='choice-check';dot.setAttribute('aria-hidden','true');
 b.append(a,c,dot);b.addEventListener('click',()=>{draft[kind]=id;refresh();status('Vorschau geändert. Mit „Im Spiel verwenden“ übernimmst du diese Kombination.')});
 list.append(b);
}
function renderOwnedOptions(){
 // Unearned scratch prizes are secret, not grey preview cards.
 const scenes=$('scene-choices'),boards=$('board-choices');
 scenes.replaceChildren();boards.replaceChildren();
 SCENES.filter(unlockedScene).forEach(k=>makeOption(scenes,k,SCENE_STYLES[k],'scene'));
 BOARDS.filter(k=>validBoard(k)&&isBoardUnlocked(k)).forEach(k=>makeOption(boards,k,BOARD_STYLES[k],'board'));
}
renderOwnedOptions();
// Frame options are styled swatches, not new SVG boards. The actual game
// uses precisely these whitelisted styles on its outer .board-card.
const frameList=$('frame-choices');
for(const [id,frame] of Object.entries(BOARD_FRAMES)){
 const button=document.createElement('button');button.type='button';button.className='frame-choice';
 button.dataset.frameId=id;button.setAttribute('aria-pressed','false');
 const preview=document.createElement('span');preview.className='frame-choice-sample';preview.setAttribute('aria-hidden','true');
 for(const [prop,value] of Object.entries({'--sample-line':frame.stroke,'--sample-inner':frame.inner,'--sample-glow':frame.glow,'--sample-fill':frame.fill,'--sample-radius':frame.radius}))preview.style.setProperty(prop,value);
 const text=document.createElement('span');text.className='frame-choice-info';
 const title=document.createElement('strong');title.textContent=frame.label;
 const desc=document.createElement('small');desc.textContent=frame.description;
 text.append(title,desc);
 const tick=document.createElement('span');tick.className='frame-choice-check';tick.textContent='✓';tick.setAttribute('aria-hidden','true');
 button.append(preview,text,tick);
 button.addEventListener('click',()=>{draft.boardFrame=id;refresh();status('Brettrahmen „'+frame.label+'“ ausgewählt. Zum Übernehmen „Im Spiel verwenden“ drücken.');});
 frameList.append(button);
}
// Keep gameplay actions outside the editor: these are purely visual previews.
const layoutTarget=$('hud-layout-choices');
for(const [id,entry] of Object.entries(HUD_LAYOUTS)){
 const box=document.createElement('div');box.className='hud-layout-choice';box.dataset.hudLayout=id;
 const icon=document.createElement('span');icon.className='hud-layout-icon';icon.textContent='▦';
 const copy=document.createElement('span');const heading=document.createElement('strong');heading.textContent=entry.label;
 const sub=document.createElement('small');sub.textContent=entry.description;copy.append(heading,sub);
 const checked=document.createElement('span');checked.className='hud-layout-check';checked.textContent='✓ Aktiv';
 box.append(icon,copy,checked);layoutTarget.append(box);
}
const toneList=$('hud-tone-choices');
function renderOwnedTones(){
 toneList.replaceChildren();
 for(const [id,tone] of Object.entries(HUD_TONES)){
  if(!unlockedTone(id))continue;
  const button=document.createElement('button');button.type='button';button.className='hud-tone-choice';button.dataset.hudTone=id;button.setAttribute('aria-pressed','false');
  const swatch=document.createElement('span');swatch.className='hud-tone-swatch';swatch.style.background=tone.swatch;
  const label=document.createElement('span');label.textContent=tone.label;
  const mark=document.createElement('span');mark.className='hud-tone-check';mark.textContent='✓';
  button.append(swatch,label,mark);
  button.addEventListener('click',()=>{draft.hudTone=id;refresh();status('Spielblock: '+tone.label+' · Layout: Klassisch. Speichern oder im Spiel verwenden.');});
  toneList.append(button);
 }
}
renderOwnedTones();
// Keep all long design galleries in one compact left-side workspace.
const studioPanels=['scene','board','frame','hud'];
function showPanel(section){
 if(!studioPanels.includes(section))return;
 for(const key of studioPanels){
  const active=key===section;
  const tab=$(key+'-tab'),panel=$(key+'-design-panel');
  tab.setAttribute('aria-selected',String(active));
  tab.tabIndex=active?0:-1;
  panel.hidden=!active;
 }
 const scroll=$('studio-tools-scroll');
 if(scroll)scroll.scrollTop=0;
}
for(const key of studioPanels){
 const tab=$(key+'-tab');
 tab.addEventListener('click',()=>showPanel(key));
 tab.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
  event.preventDefault();
  const index=studioPanels.indexOf(key);
  const next=event.key==='Home'?0:event.key==='End'?studioPanels.length-1:
    (index+(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1)+studioPanels.length)%studioPanels.length;
  showPanel(studioPanels[next]);
  $(studioPanels[next]+'-tab').focus();
 });
}
showPanel('board');
function apply(){
 if(!isBoardUnlocked(draft.board)||!unlockedScene(draft.scene)||!unlockedTone(draft.hudTone)){status('🔒 Dieses Design enthält einen noch nicht gesammelten Rubbellos-Gewinn.');return false}
 try{saveAppearance({...loadAppearance(),board:draft.board,boardFrame:draft.boardFrame,scene:draft.scene,sidebar:draft.scene==='schloss'?'schloss':'none',hudLayout:draft.hudLayout,hudTone:draft.hudTone,hudOpacity:normalizeHudOpacity(draft.hudOpacity)});renderPresets();status('✓ '+name(draft.scene)+' + '+name(draft.board)+' · Rahmen '+BOARD_FRAMES[draft.boardFrame].label+' · Spielblock '+HUD_TONES[draft.hudTone].label+' für DOG aktiviert.');return true}
 catch{status('⚠️ Das Design konnte nicht im Browser gespeichert werden.');return false}
}
const ideas=[{name:'Zauberwald',scene:'schloss',board:'zauberwald'},{name:'Küstenabenteuer',scene:'schloss',board:'kuestenabenteuer'},{name:'Royal-Karten',scene:'schloss',board:'royalKarten'}];
function makePreset(p,idea){
 const box=document.createElement('article');box.className='preset';
 const a=applied();if(a.scene===p.scene&&a.board===p.board&&a.boardFrame===(p.boardFrame||'classic')&&a.hudTone===p.hudTone&&a.hudLayout===p.hudLayout&&JSON.stringify(a.hudOpacity)===JSON.stringify(normalizeHudOpacity(p.hudOpacity)))box.classList.add('active');
 const art=document.createElement('span');art.className='preset-art';art.style.backgroundImage=bg(SCENE_STYLES[p.scene]);
 const body=document.createElement('div');body.className='preset-body';
 const title=document.createElement('strong');title.textContent=(p.favorite?'★ ':'')+p.name;
 const sub=document.createElement('small');sub.textContent=name(p.scene)+' + '+name(p.board)+' · Rahmen '+(BOARD_FRAMES[p.boardFrame||'classic']||BOARD_FRAMES.classic).label+' · '+(HUD_TONES[p.hudTone||'classic']||HUD_TONES.classic).label+(Object.values(normalizeHudOpacity(p.hudOpacity)).some(v=>v!==null)?' · Eigene Transparenz':'')+(idea?' · Vorlage':'');
 const acts=document.createElement('div');acts.className='preset-actions';
 const use=document.createElement('button');use.type='button';use.textContent=idea?'Vorschau':'Anwenden';use.addEventListener('click',()=>{
  draft={scene:p.scene,board:p.board,boardFrame:p.boardFrame||'classic',hudLayout:p.hudLayout||'classic',hudTone:p.hudTone||'classic',hudOpacity:normalizeHudOpacity(p.hudOpacity)};refresh();
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
$('new-design').addEventListener('click',()=>{draft={scene:'schloss',board:'goldwellen',boardFrame:'classic',hudLayout:'classic',hudTone:'classic',hudOpacity:normalizeHudOpacity(null)};refresh();status('Neuer Entwurf gestartet – gespeicherte Designs bleiben erhalten.')});
$('save-top').addEventListener('click',()=>{
 if(presets.length>=30){status('Maximal 30 Designs. Lösche zuerst ein altes.');return}
 $('design-name').value='Mein DOG-Design '+(presets.length+1);$('save-dialog').showModal();$('design-name').select();
});
$('cancel-save').addEventListener('click',()=>$('save-dialog').close());
$('save-form').addEventListener('submit',e=>{
 e.preventDefault();const n=$('design-name').value.trim();if(!n)return;
  if(!isBoardUnlocked(draft.board)||!unlockedScene(draft.scene)||!unlockedTone(draft.hudTone)){status('🔒 Dieses Design wurde noch nicht vollständig freigeschaltet.');return;}
 const p={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),name:n.slice(0,40),scene:draft.scene,board:draft.board,boardFrame:draft.boardFrame,hudLayout:draft.hudLayout,hudTone:draft.hudTone,hudOpacity:normalizeHudOpacity(draft.hudOpacity),favorite:false};
 presets.unshift(p);if(!persist()){presets.shift();return}
 $('save-dialog').close();refresh();if(apply())status('💾 „'+p.name+'“ gespeichert und für DOG aktiviert.');
});
try{
 const target=new URLSearchParams(location.search).get('return'),u=target?new URL(target,location.href):null;
 if(u&&u.origin===location.origin&&['hub-lobby.html','spielauswahl-lokal.html','index.html'].includes(u.pathname.split('/').pop()))$('back-link').href=u.href;
}catch{}
refresh();renderPresets();
// Refresh on verified ownership changes or account switches, not on game ticks.
window.addEventListener('dog-cosmetics-verified',()=>{
 draft=applied();presets=loadPresets();
 renderOwnedOptions();renderOwnedTones();renderPresets();refresh();
});
status('Gestalte mit deinen bereits gesammelten Brettern, Hintergründen und Blockfarben – lokal ohne zusätzliche Firebase-Schreibvorgänge.');
