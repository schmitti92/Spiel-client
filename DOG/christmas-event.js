/**
 * DOG Weihnachtsevent – Kapitel 1, visual design shell.
 *
 * Local building previews cannot grant Christmas prizes. Only real
 * Render-verified village stages allow durable per-user reward claims.
 */
import {CHRISTMAS_BUILDING_MAX_LEVEL,christmasUpgradeCost,christmasBuildingTotalCost,christmasVillageTotalCost} from './christmas-building-costs.js?v=2';
import {initChristmasTreeRewards,TREE_PRIZE_PREVIEW} from './christmas-tree-rewards-ui.js?v=5';
import {initChristmasStory} from './christmas-story.js?v=3';
import {initChristmasScratch} from './christmas-scratch-ui.js?v=80';
import {initDogPlayerLevels} from './christmas-player-levels-ui.js?v=7';
import {sceneLayouts,grinchSkyLayout,verifyVillageSpriteLayout} from './christmas-village-layout.mjs?v=3';
import {initGrinchEvent} from './christmas-grinch-event.js?v=7';
const $=id=>document.getElementById(id);
// Older browser caches may pair outdated chapter markup with the new module.
// Remove those obsolete nodes before setting up event navigation.
$('tab-chapters')?.remove();
$('panel-chapters')?.remove();
const tabs=['village','buildings','tree','story','grinch','scratch','level'];
const TREE_THRESHOLDS=[4,5,7,9,11,13,15,17,19,20];
const TREE_BUILDING_IDS=['tower','workshop','bakery','inn'];
const originalTreePoints=levels=>TREE_BUILDING_IDS.reduce((sum,id)=>sum+(Number.isInteger(levels?.[id])?levels[id]:1),0);
const FIELDS=[10,12,15,18,20];
const definitions=[
  {id:'tower',icon:'⭐',title:'Weihnachtslichter-Turm',summary:'Mehr leuchtende Geschenkfelder auf dem DOG-Brett.',
    visuals:['Eine kleine Laternenhütte ohne Schmuck.','Fensterlicht, erster Kranz und etwas Schnee.','Goldene Girlanden machen das Haus weihnachtlich.','Ein hoher Turmaufsatz mit Glocken und Laternen.','Ein prachtvoller Turm trägt einen großen Weihnachtsstern.'],
    effects:['10 Lichtfelder','12 Lichtfelder','15 Lichtfelder','18 Lichtfelder','20 Lichtfelder']},
  {id:'workshop',icon:'🎁',title:'Wichtelwerkstatt',summary:'Bessere Chancen auf zusätzliche Sammelobjekte.',
    visuals:['Eine einfache Holzwerkstatt mit wenigen Paketen.','Erste Geschenke und ein Tannenkranz.','Paketstapel, Girlanden und geschmückte Fenster.','Ein Schornstein, mehr Werkbänke und Wichteltrubel.','Eine große, funkelnde Werkstatt mit festlicher Beleuchtung.'],
    effects:['5 % Zusatzchance','10 % Zusatzchance','15 % Zusatzchance','20 % Zusatzchance','25 % Zusatzchance']},
  {id:'bakery',icon:'🍪',title:'Weihnachtsbäckerei',summary:'Mehr gemeinsame Weihnachtslichter aus gesammelten Geschenken.',
    visuals:['Ein schlichtes kleines Backhaus.','Die Fenster leuchten und ein erster Kranz erscheint.','Lebkuchenstand und warme Lichter im Schaufenster.','Größere Backstube, Schornstein und Lichtergirlanden.','Eine prächtige Zuckerbäckerei voller festlichem Glanz.'],
    effects:['Grundwert','+10 % Lichter','+20 % Lichter','+30 % Lichter','+40 % Lichter']},
  {id:'inn',icon:'🕯️',title:'Friedensherberge',summary:'Mehr versteckte Rubbellose auf dem DOG-Brett und Lichterbonus nach Partien.',
    visuals:['Eine kleine, einfache Herberge.','Kranz an der Tür und Kerzen in den Fenstern.','Laternen am Weg und mehr Zimmer für die Dorfbewohner.','Festlicher Dachaufbau und immer hellere Fenster.','Ein großes, warm leuchtendes Haus der Freundschaft.'],
    effects:['8 Rubbellos-Felder · Kein Rundenbonus','10 Rubbellos-Felder · +1 Licht / Partie','12 Rubbellos-Felder · +2 Lichter / Partie','14 Rubbellos-Felder · +3 Lichter / Partie','16 Rubbellos-Felder · +4 Lichter / Partie']},
  {id:'luckhouse',icon:'🎟️',title:'Weihnachts-Glückshaus',summary:'Günstigere Rubbellose für alle angemeldeten Spieler.',
    visuals:['Kleines Lotteriehäuschen','Erste festliche Verkaufstheke','Geschmücktes Glückshaus','Großes Lotteriehaus','Prächtiges goldenes Glückshaus'],
    effects:['Normale Lospreise','5 % Rubbellos-Rabatt','10 % Rubbellos-Rabatt','15 % Rubbellos-Rabatt','20 % Rubbellos-Rabatt']},
  {id:'academy',icon:'📚',title:'XP-Wichtel-Akademie',summary:'Mehr Erfahrungspunkte beim Abschluss von DOG-Partien.',
    visuals:['Kleine Lernhütte','Akademie mit neuen Flügeln','Große Akademie','Wundervolles Hochschloss','Goldener XP-Winterpalast'],
    effects:['Normale XP','+10 % DOG-XP','+20 % DOG-XP','+30 % DOG-XP','+40 % DOG-XP']}
];
const treeNames=[
  'Junger Baum','Erste Funken','Adventszauber','Erste Girlanden','Baum der Hoffnung',
  'Sternenzauber','Weihnachtswunder','Glanz der Weihnacht','Der strahlende Stern','Das große Weihnachtslicht'
];
const treeDetails=[
 'Als der erste Schnee fiel, stellte Wichtel Pip einen kleinen Tannenbaum auf den Dorfplatz. Noch ahnte niemand, welches Wunder in ihm schlummerte.',
 'Am nächsten Abend entdeckte Pip einen winzigen Lichtfunken. Chris, Vanessa und David versprachen, gemeinsam auf den Baum aufzupassen.',
 'Die Freunde schmückten seine Zweige mit bunten Kugeln. Bei jedem fröhlichen Lachen leuchtete der kleine Funke etwas heller.',
 'Bald half das ganze Dorf und hängte goldene Girlanden auf. Der stille Platz wurde zu einem Ort, an dem sich jeder willkommen fühlte.',
 'Ein Schneesturm verdunkelte Lichtertal. Doch der Baum blieb hell und erinnerte die Freunde daran, die Hoffnung nicht zu verlieren.',
 'In einer sternklaren Nacht landete eine glitzernde Flocke auf seiner Spitze. Pip wusste: Der Weihnachtszauber begann zu erwachen.',
 'Aus einem Funken wurden Hunderte Lichter. Weil alle zusammenhalfen, leuchtete sogar das kleinste Haus am Dorfrand.',
 'Der Glanz wanderte vom Baum durch alle Gassen. Kinder brachten ihre Weihnachtswünsche, und jeder durfte einen Stern aufhängen.',
 'Über dem Baum erschien ein strahlender Stern. Alle spürten: Ein letztes gemeinsames Wunder wartete noch auf das Dorf.',
 'Als die vier Häuser im Lichterglanz erstrahlten, leuchtete der Baum bis zu den Bergen. Lichtertal hatte gelernt: Das größte Wunder ist Zusammenhalt.'
];
// All image filenames are checked against GitHub's actual event image folder.
// Preload only the requested image, not the full 30-image collection.
const eventImageRoot='weihnachtsevent-bilder/';
const assetPath=(id,level)=>{
 if(id==='grinch'&&Number.isInteger(level)&&level>=1&&level<=5)
  return eventImageRoot+'grinchhoehle_stufe_'+level+'.png';
 if(id==='academy'&&Number.isInteger(level)&&level>=1&&level<=5)return '../xp_akademie_stufe_'+level+'.png';
 if(id==='luckhouse'&&Number.isInteger(level)&&level>=1&&level<=5)return 'weihnachtsevent-bilder/glueckshaus_stufe_'+level+'.png';
 const stem={
  tower:'weihnachtslichter_turm_stufe_',
  workshop:'Wichtelwerkstatt_Stufe_',
  bakery:'weihnachtsbaeckerei_stufe_',
  inn:'Herberge_Stufe_',
  tree:'weihnachtsbaum_stufe_'
 }[id];
 if(!stem||!Number.isInteger(level)||level<1||level>(id==='tree'?10:5))return '';
 return eventImageRoot+stem+level+'.png';
};
// The uploaded sprites have intentionally different transparent margins.
 // Scale their *visible* artwork at each fixed village footprint, so small
 // stage-one assets do not look tiny next to larger-stage buildings.
 // Pivot points are ground contact points measured in the SVG scene.
/* Village geometry is a shared, stage-independent contract.
 * CI checks every possible mixed-level pair of the 6 houses, tree and cave.
 * Fail visibly in development if a future edit breaks the scene reservation.
 */
if(verifyVillageSpriteLayout().length)console.error('[DOG] Village sprite reservations overlap:',verifyVillageSpriteLayout());
/** Add a subdued contact shadow directly beneath the alpha-cropped building.
 * Its width follows the visible image as it grows; no extra saved state. */
function positionVillageGroundShadow(id,level,renderedWidth){
 const shadow=$(id+'-ground-shadow'),slot=sceneLayouts[id];
 if(!shadow||!slot)return;
 const growth=slot.growth[level-1]??1;
 const footprint=Math.min(slot.w,Math.max(1,renderedWidth||slot.w*growth));
 shadow.setAttribute('cx',String(slot.cx));
 shadow.setAttribute('cy',String(slot.ground-2));
 shadow.setAttribute('rx',(footprint*.45).toFixed(2));
 shadow.setAttribute('ry',(Math.max(8,footprint*.063)).toFixed(2));
}
function measureVisiblePixels(image){
 const naturalWidth=image.naturalWidth||1,naturalHeight=image.naturalHeight||1;
 const fallback={x0:0,y0:0,x1:naturalWidth,y1:naturalHeight};
 try{
  // Only a 320px thumbnail is examined, to stay responsive on tablets.
  const factor=Math.min(1,320/Math.max(naturalWidth,naturalHeight));
  const w=Math.max(1,Math.round(naturalWidth*factor));
  const h=Math.max(1,Math.round(naturalHeight*factor));
  const canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)return fallback;
  context.clearRect(0,0,w,h);
  context.drawImage(image,0,0,w,h);
  const rgba=context.getImageData(0,0,w,h).data;
  let minX=w,minY=h,maxX=-1,maxY=-1;
  // Ignore nearly invisible glow or compression fringing around the cutout.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   if(rgba[(y*w+x)*4+3]<20)continue;
   if(x<minX)minX=x;
   if(x>maxX)maxX=x;
   if(y<minY)minY=y;
   if(y>maxY)maxY=y;
  }
  if(maxX<minX)return fallback;
  return {x0:minX/factor,y0:minY/factor,x1:(maxX+1)/factor,y1:(maxY+1)/factor};
 }catch{
  // If pixel reading is unavailable, retain a usable image.
  return fallback;
 }
}
function positionVillageSprite(layer,id,level,loaded){
 const slot=sceneLayouts[id];
 if(!slot||!loaded?.ok)return;
 const b=loaded.bounds;
 const growth=slot.growth[level-1]??1;
 const actualWidth=Math.max(1,b.x1-b.x0),actualHeight=Math.max(1,b.y1-b.y0);
 const scale=Math.min(slot.w*growth/actualWidth,slot.h*growth/actualHeight);
 // Image <svg:image> uses full bitmap dimensions; compensate transparent margins.
 // Align visible centre horizontally and visible bottom edge to the permanent feet.
 const left=slot.cx-(b.x0+b.x1)*.5*scale;
 const top=slot.ground-b.y1*scale;
 layer.removeAttribute('transform');
 layer.setAttribute('x',left.toFixed(2));
 layer.setAttribute('y',top.toFixed(2));
 layer.setAttribute('width',(loaded.width*scale).toFixed(2));
 layer.setAttribute('height',(loaded.height*scale).toFixed(2));
 positionVillageGroundShadow(id,level,actualWidth*scale);
}
const imageRequests=new Map();
function waitForImage(path){
 if(!path)return Promise.resolve({ok:false});
 if(!imageRequests.has(path)){
  imageRequests.set(path,new Promise(resolve=>{
   const image=new Image();
   image.onload=()=>resolve({
    ok:true,width:image.naturalWidth,height:image.naturalHeight,
    bounds:measureVisiblePixels(image)
   });
   image.onerror=()=>resolve({ok:false});
   image.src=path;
  }));
 }
 return imageRequests.get(path);
}
function showStageImage(id,level){
 const layer=$(id+'-stage-image'),fallback=$(id==='tree'?'art-tree':'art-'+id);
 if(!layer||!fallback)return;
 const path=assetPath(id,level);
 if(id!=='tree')positionVillageGroundShadow(id,level);
 if(layer.dataset.requested===path&&(fallback.classList.contains('photo-ready')||layer.dataset.loading==='true'))return;
 layer.dataset.requested=path;
 layer.dataset.loading='true';
 fallback.classList.remove('photo-ready');
 waitForImage(path).then(loaded=>{
  // Ignore an older stage's load after the user has already chosen a newer one.
  if(layer.dataset.requested!==path)return;
  layer.dataset.loading='false';
  if(!loaded.ok){layer.removeAttribute('href');return;}
  positionVillageSprite(layer,id,level,loaded);
  layer.setAttribute('href',path);
  fallback.classList.add('photo-ready');
 });
}
/* Fit the visible alpha of the real image, not its transparent PNG padding. */
const buildingImageLayouts=new Map();
function positionBuildingCardPhoto(img,loaded){
 if(!img||!img.isConnected||!loaded?.ok)return;
 const frame=img.closest('.building-card-art');
 if(!frame)return;
 const frameW=frame.clientWidth,frameH=frame.clientHeight;
 if(frameW<30||frameH<30)return;
 const b=loaded.bounds||{x0:0,y0:0,x1:loaded.width,y1:loaded.height};
 const visibleW=Math.max(1,b.x1-b.x0),visibleH=Math.max(1,b.y1-b.y0);
 const scale=Math.min(frameW*.88/visibleW,frameH*.83/visibleH);
 const x=(frameW-(b.x0+b.x1)*scale)/2;
 const y=frameH-18-b.y1*scale;
 img.style.width=(loaded.width*scale).toFixed(1)+'px';
 img.style.height=(loaded.height*scale).toFixed(1)+'px';
 img.style.left=x.toFixed(1)+'px';
 img.style.top=y.toFixed(1)+'px';
 frame.dataset.photoState='ready';
}
function refreshBuildingPhotoLayouts(){
 for(const [id,loaded] of buildingImageLayouts){
  const img=$('building-card-photo-'+id);
  if(img?.dataset.requested===assetPath(id,preview[id]))positionBuildingCardPhoto(img,loaded);
 }
}
function updateCardImage(id,level){
 const img=$(id==='tree'?'tree-card-photo':'building-card-photo-'+id);
 if(!img)return;
 const path=assetPath(id,level);
 if(img.getAttribute('src')!==path){
  img.hidden=false;
  img.src=path;
 }
 img.alt=(id==='tree'?'Weihnachtsbaum':definitions.find(def=>def.id===id)?.title||id)+' – Stufe '+level;
 if(id==='tree')return;
 if(img.dataset.requested===path){
  const loaded=buildingImageLayouts.get(id);
  if(loaded)positionBuildingCardPhoto(img,loaded);
  return;
 }
 img.dataset.requested=path;
 const frame=img.closest('.building-card-art');
 if(frame)frame.dataset.photoState='loading';
 waitForImage(path).then(loaded=>{
  if(img.dataset.requested!==path)return;
  if(!loaded.ok){
   if(frame)frame.dataset.photoState='error';
   buildingImageLayouts.delete(id);
   return;
  }
  buildingImageLayouts.set(id,loaded);
  positionBuildingCardPhoto(img,loaded);
 });
}
const preview={tower:1,workshop:1,bakery:1,inn:1,luckhouse:1,academy:1};
// Purely visual, page-local inspection mode. Never written to villageLive or the server.
let villageMaxPreview=false;
let villageLive=null,villageHost=false,villageEventActive=false,villageCanUpgrade=true,villageBusy=false;
let treePrizeScreen=null;
let grinchView=null;
const storyScreen=initChristmasStory({openTab:id=>showPanel(id)});
let scratchScreen=null;
let levelScreen=null;
let lastPresentationKey=null;
// Grinch stages are temporary visual previews until real Part 2 missions exist.
let grinchVisualStage=1;
// Local scenic view, not mission progress or a server-side upgrade.
// Show the cave immediately when opening the Christmas village.
 // ?grinch=0 is an explicit opt-out for people who want the original scene.
let villageMode=new URLSearchParams(location.search).get('grinch')==='0'?'normal':'grinch';
const grinchDialog=$('grinch-cave-dialog');
const grinchStageDescriptions=[
 'Ankunft: Der Grinch ist auf dem Höhepunkt seiner Macht. Die Höhle ist vollständig intakt.',
 'Erster Widerstand: Die Freunde setzen dem Grinch zu. Erste Schäden sind sichtbar.',
 'Die Macht schwindet: Die Höhle verliert einen Teil ihres bedrohlichen Zaubers.',
 'Kurz vor der Niederlage: Die Höhle ist deutlich beschädigt und geschwächt.',
 'Letzte Stufe: Die Höhle ist stark angeschlagen – der Grinch wurde zurückgedrängt.'
];
function renderGrinchCave(){
 const stage=grinchVisualStage;
 const source=assetPath('grinch',stage);
 const art=$('grinch-cave-preview-image');
 if(art&&art.getAttribute('src')!==source)art.src=source;
 if(art)art.alt='Grinchhöhle – Zustand '+stage+' von 5';
 const slider=$('grinch-cave-stage-range');
 if(slider)slider.value=String(stage);
 const output=$('grinch-cave-stage-output');
 if(output)output.textContent='Stufe '+stage+' / 5';
 const description=$('grinch-cave-stage-description');
 if(description)description.textContent=grinchStageDescriptions[stage-1];
 const status=$('grinch-cave-lock-message');
 if(status){
  const verifiedTree=villageLive?treeLevel():0;
  status.textContent=verifiedTree>=10
   ?'✨ Baumstufe 10 erreicht · Grinch-Missionen werden vorbereitet.'
   :'🔒 Teil 2 startet nach der echten gemeinsamen Weihnachtsbaum-Stufe 10.'
 }
 if(villageMode==='grinch')showGrinchSkyImage(stage);
}
/** Alpha-aware image placement in the upper backdrop behind every house.
 * Grinch stages never enter the foreground buildings' collision grid. */
function showGrinchSkyImage(stage){
 const layer=$('grinch-sky-image'),fallback=$('grinch-sky-fallback');
 if(!layer||!fallback)return;
 const path=assetPath('grinch',stage);
 if(layer.dataset.requested===path&&(fallback.classList.contains('photo-ready')||layer.dataset.loading==='true'))return;
 layer.dataset.requested=path;
 layer.dataset.loading='true';
 fallback.classList.remove('photo-ready');
 waitForImage(path).then(loaded=>{
  if(layer.dataset.requested!==path)return;
  layer.dataset.loading='false';
  if(!loaded.ok){layer.removeAttribute('href');return;}
  const b=loaded.bounds,slot=grinchSkyLayout,growth=slot.growth[stage-1]??1;
  const aw=Math.max(1,b.x1-b.x0),ah=Math.max(1,b.y1-b.y0);
  const scale=Math.min(slot.w*growth/aw,slot.h*growth/ah);
  const x=slot.cx-(b.x0+b.x1)*.5*scale,y=slot.ground-b.y1*scale;
  layer.setAttribute('x',x.toFixed(2));
  layer.setAttribute('y',y.toFixed(2));
  layer.setAttribute('width',(loaded.width*scale).toFixed(2));
  layer.setAttribute('height',(loaded.height*scale).toFixed(2));
  layer.setAttribute('href',path);
  fallback.classList.add('photo-ready');
 });
}
function setVillageMode(mode){
 villageMode=mode==='grinch'?'grinch':'normal';
 grinchVisualStage=1;
 const url=new URL(location.href);
 if(villageMode==='grinch')url.searchParams.delete('grinch');
 else url.searchParams.set('grinch','0');
 history.replaceState(null,'',url.href);
 refreshPreview();
}
function treeLevel(){
  const points=originalTreePoints(preview);
  return TREE_THRESHOLDS.filter(t=>points>=t).length;
}
function buildingCard(entry){
 const root=document.createElement('article');root.className='building-card';
 root.innerHTML='<div class="building-card-head"><span class="building-card-icon" aria-hidden="true">'+entry.icon+'</span><div><h3>'+entry.title+'</h3><p>'+entry.summary+'</p></div></div>'
   +'<div class="building-card-art" data-photo-state="loading" aria-label="Gebäudeansicht der gewählten Stufe"><span class="building-art-glow" aria-hidden="true"></span><img id="building-card-photo-'+entry.id+'" src="'+assetPath(entry.id,1)+'" alt="'+entry.title+' – Stufe 1" loading="lazy" decoding="async"><span class="building-art-plaque" data-building-art-level>STUFE 1 / 5</span><span class="building-art-loading">✨ Gebäude wird geladen …</span><span class="building-art-error">Bild nicht verfügbar</span></div>'
   +'<div class="building-card-info"><strong data-building-effect></strong><span data-building-visual></span></div>'
   +'<div class="building-stage-controls"><div class="level-row"><label for="preview-'+entry.id+'">Entwicklungsstufe</label><output for="preview-'+entry.id+'" data-building-value></output></div>'
   +'<input id="preview-'+entry.id+'" type="range" min="1" max="5" step="1" value="1" aria-label="Vorschau der Entwicklungsstufe für '+entry.title+'">'
   +'<div class="building-level-markers" aria-hidden="true">'+Array.from({length:5},()=>'<span></span>').join('')+'</div></div>'
   +'<div class="building-upgrade-row"><div class="building-upgrade-price" data-building-upgrade-price aria-live="polite"></div>'
   +'<button type="button" class="button gold building-purchase" data-upgrade-building="'+entry.id+'" disabled>🔒 Nur im Online-Dorf</button></div>';
 const range=root.querySelector('input');
 range.addEventListener('input',()=>{if(villageLive)return;preview[entry.id]=Number(range.value);refreshPreview()});
 root.querySelector('[data-upgrade-building]').addEventListener('click',()=>void purchaseBuilding(entry.id));
 return root;
}
const grid=$('building-grid');
for(const item of definitions)grid.append(buildingCard(item));
if(typeof ResizeObserver==='function'){
 new ResizeObserver(()=>refreshBuildingPhotoLayouts()).observe(grid);
}
window.addEventListener('resize',refreshBuildingPhotoLayouts,{passive:true});
// Display the same cost formula used by the future backend, never a fake balance.
const priceOverview=$('building-price-overview');
if(priceOverview){
 const rows=document.createDocumentFragment();
 for(let level=1;level<CHRISTMAS_BUILDING_MAX_LEVEL;level++){
  const step=document.createElement('span');
  step.className='building-price-step';
  step.textContent='Level '+level+' → '+(level+1)+' · '+christmasUpgradeCost(level)+' ⭐';
  rows.append(step);
 }
 const total=document.createElement('strong');
 total.className='building-price-total';
 total.textContent='Pro Gebäude: '+christmasBuildingTotalCost(CHRISTMAS_BUILDING_MAX_LEVEL)+' ⭐ · Gesamtes Dorf: '+christmasVillageTotalCost({tower:5,workshop:5,bakery:5,inn:5,luckhouse:5,academy:5})+' ⭐';
 rows.append(total);
 priceOverview.replaceChildren(rows);
}
const steps=$('tree-steps');
let viewedTreeStage=null; // null means always follow the real current stage.
treeNames.forEach((name,i)=>{
 const prize=TREE_PRIZE_PREVIEW[i],stage=i+1;
 const box=document.createElement('article');
 box.className='tree-step';box.dataset.treeStep=String(stage);
 box.dataset.progress='future';box.dataset.status='unknown';
 box.innerHTML='<button type="button" class="tree-step-open" data-tree-open aria-label="Baumstufe '+stage+': '+name+' ansehen">'
  +'<span class="tree-step-point"><span>'+stage+'</span></span>'
  +'<span class="tree-step-caption"><span class="tree-step-number">STUFE '+stage+'</span><strong class="tree-step-name">'+name+'</strong></span>'
  +'<span class="tree-step-gift" data-tree-gift-icon aria-hidden="true">'+prize.icon+'</span>'
  +'<strong class="tree-step-prize" data-tree-prize-title>'+prize.title+'</strong>'
  +'<span class="tree-step-status" data-tree-status></span></button>';
 const open=box.querySelector('[data-tree-open]');
 open.addEventListener('click',()=>{
  if(stage>treeLevel())return; // Never reveal future tree images/stories.
  viewedTreeStage=stage===treeLevel()?null:stage;
  updateTreeChapter();
 });
 steps.append(box);
});
$('tree-return-current').addEventListener('click',()=>{
 viewedTreeStage=null;
 updateTreeChapter();
 centerTreeMilestone();
});
function updateTreeChapter(){
 const current=treeLevel();
 // If a local preview is reset, discard a memory stage that is no longer reached.
 if(viewedTreeStage!==null&&viewedTreeStage>current)viewedTreeStage=null;
 const shown=Math.min(viewedTreeStage??current,current);
 const isMemory=shown<current;
 $('tree-current-title').textContent='Stufe '+shown+' · '+treeNames[shown-1];
 $('tree-current-copy').textContent=treeDetails[shown-1];
 $('tree-view-kicker').textContent=(isMemory?'📖 RÜCKBLICK':'📖 AKTUELLE STUFE')+' · KAPITEL '+shown+' VON 10';
 $('tree-return-current').hidden=!isMemory;
 $('tree-world-stage-pill').textContent='STUFE '+shown+' / 10'+(isMemory?' · RÜCKBLICK':'');
 $('tree-card-photo').parentElement.style.setProperty('--tree-art-scale',String([1.63,1.54,1.47,1.39,1.33,1.26,1.2,1.16,1.11,1.06][shown-1]));
 updateCardImage('tree',shown);
 const verifiedStatus=treePrizeScreen?.getStatus();
 for(const item of steps.children){
  const stage=Number(item.dataset.treeStep);
  const open=item.querySelector('[data-tree-open]');
  const active=stage===shown,unlocked=stage<=current;
  item.classList.toggle('selected',active);
  item.dataset.progress=stage===current?'current':stage<current?'passed':'future';
  if(stage===current)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');
  open.disabled=!unlocked;
  open.setAttribute('aria-pressed',String(active));
  open.title=unlocked?(active?'Diese Stufe wird angezeigt':'Diese erreichte Stufe ansehen'):'🔒 Diese Stufe ist noch gesperrt';
  if(!verifiedStatus){
   const badge=item.querySelector('[data-tree-status]');
   if(badge)badge.textContent=unlocked?'':'🔒 Gesperrt';
  }
 }
}
function centerTreeMilestone(){
 const current=steps.querySelector('.tree-step.selected');
 if(!current||!steps.clientWidth)return;
 const center=current.offsetLeft+current.offsetWidth/2-steps.clientWidth/2;
 steps.scrollTo({left:Math.max(0,center),behavior:'auto'});
}
function refreshPreview(){
 const total=Object.values(preview).reduce((a,b)=>a+b,0),treePoints=originalTreePoints(preview),tree=treeLevel();
 const sceneTree=villageMaxPreview?10:tree;
 const visualTreeStage=villageMode==='grinch'?1:sceneTree;
 for(const d of definitions){
  const level=preview[d.id],sceneLevel=villageMaxPreview?5:level,card=$('preview-'+d.id).closest('.building-card');
  $('preview-'+d.id).value=String(level);
  card.querySelector('[data-building-effect]').textContent=d.effects[level-1]+(villageLive?' · Tatsächlicher Bonus':' · Vorschau');
  card.querySelector('[data-building-visual]').textContent=d.visuals[level-1];
  card.dataset.mode=villageLive?'live':'preview';
  card.querySelector('[data-building-value]').textContent='Stufe '+level+' / '+CHRISTMAS_BUILDING_MAX_LEVEL;
  card.querySelector('[data-building-art-level]').textContent='STUFE '+level+' / '+CHRISTMAS_BUILDING_MAX_LEVEL;
  $('preview-'+d.id).disabled=Boolean(villageLive);
  const purchase=card.querySelector('[data-upgrade-building]');
  if(purchase){const upgradeCost=christmasUpgradeCost(level),affordable=villageLive?.lightsTenths>=upgradeCost*10;
   purchase.hidden=false;
   purchase.disabled=!villageLive||!villageHost||!villageCanUpgrade||villageBusy||upgradeCost===null||!affordable;
   purchase.textContent=!villageLive?'🔐 Mit Online-Profil verbinden':upgradeCost===null?'✓ Voll ausgebaut':!villageCanUpgrade?'⏳ Event derzeit pausiert':affordable?'⭐ Für '+upgradeCost+' Lichter ausbauen':'Noch '+Math.ceil((upgradeCost*10-(villageLive?.lightsTenths||0))/10)+' ⭐ sammeln';
  }
  const nextCost=christmasUpgradeCost(level);
  card.querySelector('[data-building-upgrade-price]').textContent=nextCost===null
   ?'🏆 Maximale Stufe erreicht'
   :'Nächste Stufe '+level+' → '+(level+1)+' · '+nextCost+' ⭐'+(villageLive?'':' · Vorschau');
  card.querySelectorAll('.building-level-markers>span').forEach((dot,i)=>dot.classList.toggle('active',i<level));
  const art=$('art-'+d.id);
  if(art)art.dataset.level=String(sceneLevel);
  showStageImage(d.id,sceneLevel);
  // Building cards and real upgrade controls always reflect the verified level.
  updateCardImage(d.id,level);
  const plaque=document.querySelector('[data-hotspot-level="'+d.id+'"]');
  if(plaque)plaque.textContent=sceneLevel+' / 5';
 }
 if(openedBuildingId&&buildingDialog.open)renderVillageBuildingDialog(openedBuildingId);
 const view=$('village-view');
 const presentationKey=JSON.stringify([villageMaxPreview,...definitions.map(d=>villageMaxPreview?5:preview[d.id])]);
 if(lastPresentationKey!==null&&presentationKey!==lastPresentationKey&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   view.classList.remove('is-upgrading');
   void view.offsetWidth; // restart only on an actual preview upgrade
   view.classList.add('is-upgrading');
 }
 lastPresentationKey=presentationKey;
 view.dataset.mode=villageMode;
 view.dataset.tree=String(visualTreeStage);
 view.dataset.snow=String(visualTreeStage<=2?1:visualTreeStage<=4?2:visualTreeStage<=6?3:visualTreeStage<=8?4:5);
 view.dataset.visualPreview=villageMaxPreview?'max':'live';
 // Normal progress is unchanged; the Grinch view only chooses the stage-one PNG.
 const growth=.51+((visualTreeStage-1)/9)*.49;
 $('art-tree').setAttribute('transform','translate(610 504) scale('+growth.toFixed(4)+') translate(0 -565)');
 showStageImage('tree',visualTreeStage);
 renderGrinchCave();
 const grinchModeToggle=$('grinch-scene-toggle');
 if(grinchModeToggle){
  const active=villageMode==='grinch';
  grinchModeToggle.textContent=active?'↩ Normales Weihnachtsdorf':'👹 Grinchhöhle ansehen';
  grinchModeToggle.setAttribute('aria-pressed',String(active));
  grinchModeToggle.title=active?'Normale Berglandschaft und echte Baumstufe anzeigen':'Große Grinchhöhle anstelle der Berglandschaft ansehen';
 }
 $('stat-building-levels').textContent=total+' / 30';
 $('stat-tree-level').textContent=tree+' / 10';
 $('village-stage-text').textContent=villageMode==='grinch'
  ?'👹 Grinch-Ansicht · Baum nur optisch auf Stufe 1'
  :villageMaxPreview?'🔍 Vollausbau-Simulation · keine Änderung am Fortschritt':
  (tree===1?'Anfangszustand':tree===10?'Prachtvolles Weihnachtsdorf':'Baum Stufe '+tree)+(villageLive?' · Live':' · Vorschau');
 const maxTestButton=$('village-max-test'),maxTestNote=$('village-max-note');
 if(maxTestButton){
  maxTestButton.textContent=villageMaxPreview?'↩ Echte Dorfansicht':'🔍 Vollausbau testen';
  maxTestButton.setAttribute('aria-pressed',String(villageMaxPreview));
 }
 if(maxTestNote){
  maxTestNote.hidden=!villageMaxPreview;
  maxTestNote.textContent=villageMode==='grinch'
    ?'👁️ TESTANSICHT · 6 Gebäude auf Stufe 5 · Baum nur optisch auf Stufe 1'
    :'👁️ TESTANSICHT · 6 × Stufe 5 · Baum Stufe 10 · keine Käufe';
 }
 if(!villageLive){
  $('building-village-counter').textContent=total+' / 30';
  $('building-village-tree').textContent='Stufe '+tree+' / 10';
 }
 updateTreeChapter();
 $('tree-world-mode').textContent=villageLive?'✦ Echter Dorffortschritt':'✦ Gestaltungs-Vorschau';
 $('tree-world-mode').dataset.mode=villageLive?'live':'preview';
 const nextLevel=Math.min(tree+1,10),nextPrize=TREE_PRIZE_PREVIEW[nextLevel-1];
 $('tree-next-stage').textContent=tree===10?'Alle Stufen gemeistert!':'Stufe '+nextLevel;
 $('tree-next-name').textContent=tree===10?'Das große Weihnachtslicht':treeNames[nextLevel-1];
 $('tree-next-gift-icon').textContent=tree===10?'🏆':nextPrize.icon;
 $('tree-next-gift').textContent=tree===10?'Alle zehn Geschenke erreichbar':nextPrize.title;
 const needed=tree===10?0:Math.max(0,TREE_THRESHOLDS[tree]-treePoints);
 // Story chapters unlock ONLY from the server-verified shared village.
 // Local preview buttons may animate the tree but never reveal future text.
 storyScreen.render({treeLevel:villageLive?tree:1,isVerified:Boolean(villageLive),remaining:villageLive?needed:0});
 $('tree-next-requirement').textContent=tree===10?'Alle vier Gebäude haben Stufe 5 erreicht.':
  'Noch '+needed+' Gebäudeausbau'+(needed===1?'':'ten')+' bis zur nächsten Stufe';
 $('tree-progress-fill').style.width=(tree*10)+'%';
 $('tree-progress-label').textContent=tree+' / 10 Stufen · '+treePoints+' / 20 Baum-Gebäudestufen';
 document.querySelector('.tree-world-meter')?.setAttribute('aria-valuenow',String(tree));
 if($('tab-tree').getAttribute('aria-selected')==='true')centerTreeMilestone();
}
function validReturn(){
 const raw=new URLSearchParams(location.search).get('return');
 if(!raw)return null;
 try{
  const url=new URL(raw,location.href);
  if(url.origin!==location.origin||!/\/(?:DOG\/index\.html|hub-lobby\.html)$/.test(url.pathname))return null;
  if(url.username||url.password)return null;
  return url.href;
 }catch{return null}
}
const returnTarget=validReturn();
if(returnTarget)$('event-return').href=returnTarget;
function showPanel(id,{updateHistory=true}={}){
 if(!tabs.includes(id))return;
 const wasActive=tabs.find(name=>$('tab-'+name)?.getAttribute('aria-selected')==='true');
 for(const name of tabs){
  const active=id===name;
  const tab=$('tab-'+name),panel=$('panel-'+name);
  tab.setAttribute('aria-selected',String(active));
  tab.tabIndex=active?0:-1;
  panel.hidden=!active;
 }
 // Every tab opens at the top of its own content. The left illustration and
 // all seven navigation buttons remain stationary throughout the switch.
 if(wasActive!==id){
  const scroller=$('event-main');
  if(scroller)scroller.scrollTo({top:0,left:0,behavior:'instant'});
 }
 // Full-screen scratch tickets suppress document scrolling. A tab switch must
 // restore body scrolling, otherwise the tall Grinch campaign cannot scroll.
 // Preserve any unfinished ticket and restore its lock only on re-entering.
 const scratchStage=$('scratch-stage');
 const activeTicket=id==='scratch'&&!!scratchStage&&!scratchStage.hidden;
 document.body.classList.toggle('scratch-ticket-open',activeTicket);
 if(updateHistory&&location.hash!=='#'+id)history.replaceState(null,'','#'+id);
 if(id==='tree'){centerTreeMilestone();void treePrizeScreen?.load();}
 if(id==='story'){
  storyScreen.openLatest();
  // Avoid reading the uninitialized village API on initial #story navigation.
  requestAnimationFrame(()=>void reloadVillage());
 }
 if(id==='buildings'){
  // The initial tab can open before villageCode is initialized below.
  requestAnimationFrame(()=>{
   refreshBuildingPhotoLayouts();
   void reloadVillage(); // Independent of DOG room membership
  });
 }
 if(id==='grinch'){
  grinchView?.render();
  requestAnimationFrame(()=>void reloadVillage());
 }
 if(id==='scratch')void scratchScreen?.load();
 if(id==='level')void levelScreen?.load();
 if(window.scrollY>0)window.scrollTo({top:0,behavior:'instant'});
}
for(const id of tabs){
 const tab=$('tab-'+id);
 tab.addEventListener('click',()=>showPanel(id));
 tab.addEventListener('keydown',event=>{
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const from=tabs.indexOf(id),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:
     (from+(event.key==='ArrowUp'||event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length;
  showPanel(tabs[next]);$('tab-'+tabs[next]).focus();
 });
}
document.querySelectorAll('[data-open-tab]').forEach(button=>{
 button.addEventListener('click',()=>showPanel(button.dataset.openTab));
});
$('village-max-test')?.addEventListener('click',()=>{
 villageMaxPreview=!villageMaxPreview;
 refreshPreview(); // Only SVG artwork, labels and decorations are simulated.
});
// Read-only building information: no separate database fetch or client-written
// bonus values. The server's public village.bonus is authoritative.
const buildingDialog=$('village-building-dialog');
let openedBuildingId=null;
const buildingDescriptions=Object.freeze({
 tower:'Der Weihnachtslichter-Turm wacht über den Dorfplatz. Mit jedem Ausbau werden in einer DOG-Runde mehr verborgene Geschenkfelder auf dem Spielbrett verteilt.',
 workshop:'In der Wichtelwerkstatt entstehen kleine Überraschungen. Beim Einsammeln eines versteckten Geschenkfeldes kann ein zusätzliches Geschenk entstehen.',
 bakery:'Die Weihnachtsbäckerei versorgt Lichtertal mit Wärme und Gebäck. Gesammelte Geschenke bringen dem gemeinsamen Dorfkonto Weihnachtslichter; die Bäckerei erhöht diesen Ertrag.',
 inn:'Die Friedensherberge bietet den Bewohnern einen warmen Platz. Sie erhöht die versteckten Rubbellos-Felder auf dem DOG-Brett und schenkt dem Dorf Weihnachtslichter nach abgeschlossenen Partien.',
 luckhouse:'Das Weihnachts-Glückshaus reduziert die Preise für alle bezahlten Rubbellose der Dorfgemeinschaft.',
 academy:'Die XP-Wichtel-Akademie verhilft jedem DOG-Spieler nach abgeschlossenen Online-Partien zu mehr Erfahrungspunkten.'
});
const bonusExplainers=Object.freeze({
 tower:'So viele Geschenkfelder werden zu Beginn einer DOG-Runde verdeckt und zufällig auf dem Brett verteilt. Trifft eine Spielfigur ein noch nicht eingesammeltes Feld, kann sie ein Geschenk erhalten.',
 workshop:'Die Prozentchance gilt für jedes tatsächlich eingesammelte Geschenkfeld im DOG-Spiel. Bei Erfolg gibt es ein zweites Geschenk und entsprechend zusätzliche Weihnachtslichter.',
 bakery:'Jedes gesammelte Geschenk ist grundsätzlich 1 Weihnachtslicht wert. Der aktuelle Prozentsatz wird zusätzlich gutgeschrieben. Die Lichter gehören dem gemeinsamen Dorfkonto.',
 inn:'Die Rubbellose liegen verborgen auf zufälligen DOG-Feldern. Der zusätzliche Lichterbonus wird einmal nach jeder serverseitig abgeschlossenen DOG-Partie dem Dorfkonto gutgeschrieben.',
 luckhouse:'Der Rabatt gilt automatisch beim Kauf auf Render. Lose mit Gutscheinen und Gratislose bleiben kostenlos.',
 academy:'Der XP-Bonus zählt nur für echte, abgeschlossene DOG-Partien. Für laufende Spiele wird die beim Spielstart erreichte Akademiestufe verwendet.'
});
function villageBuildingBonus(id,level){
 const bonus=villageLive?.bonus;
 if(id==='tower'){
  const value=bonus&&Number.isInteger(bonus.towerFields)?bonus.towerFields:FIELDS[level-1];
  return value+' versteckte Geschenkfelder pro Runde';
 }
 if(id==='workshop'){
  const value=bonus&&Number.isInteger(bonus.workshopExtraChancePercent)?bonus.workshopExtraChancePercent:5*level;
  return value+' % Chance auf ein zusätzliches Geschenk';
 }
 if(id==='bakery'){
  const value=bonus&&Number.isInteger(bonus.bakeryExtraPercent)?bonus.bakeryExtraPercent:10*(level-1);
  return value?'+ '+value+' % Weihnachtslichter pro Geschenk':'1 Weihnachtslicht pro Geschenk (Grundwert)';
 }
 if(id==='inn'){
  const fields=bonus&&Number.isInteger(bonus.innScratchFields)?bonus.innScratchFields:8+2*(level-1);
  const games=bonus&&Number.isInteger(bonus.innPerFinishedGame)?bonus.innPerFinishedGame:level-1;
  return fields+' versteckte Rubbellos-Felder pro Runde · '+games+' zusätzliche Lichter pro abgeschlossener Partie';
 }
 if(id==='luckhouse')return (bonus&&Number.isInteger(bonus.luckhouseDiscountPercent)?bonus.luckhouseDiscountPercent:5*(level-1))+' % Rabatt auf bezahlte Rubbellose';
 if(id==='academy')return '+'+(bonus&&Number.isInteger(bonus.academyXpPercent)?bonus.academyXpPercent:10*(level-1))+' % DOG-Erfahrungspunkte';
 return '';
}
function renderVillageBuildingDialog(id){
 const definition=definitions.find(d=>d.id===id);
 if(!definition)return;
 const confirmed=Boolean(villageLive?.levels&&Number.isInteger(villageLive.levels[id]));
 const level=confirmed?villageLive.levels[id]:preview[id];
 $('village-building-title').textContent=definition.title;
 $('village-building-icon').textContent=definition.icon;
 $('village-building-description').textContent=buildingDescriptions[id];
 $('village-building-mode').textContent=villageMaxPreview?
  '🔍 Auf der Dorfkarte nur simuliert · tatsächliche Stufe: '+level+' / 5':
  !confirmed?'👁️ Vorschau · Gemeinsamer Online-Fortschritt noch nicht bestätigt':
  villageEventActive?'🟢 Gemeinsamer Bonus aktiv':'⏸️ Event beendet · Bonus derzeit nicht aktiv';
 $('village-building-stage').textContent='Stufe '+level+' / '+CHRISTMAS_BUILDING_MAX_LEVEL;
 $('village-building-progress').style.width=(100*level/CHRISTMAS_BUILDING_MAX_LEVEL)+'%';
 const current=$('village-building-current-bonus');
 current.textContent=villageBuildingBonus(id,level);
 $('village-building-bonus-explanation').textContent=bonusExplainers[id];
 const next=level<CHRISTMAS_BUILDING_MAX_LEVEL?level+1:null;
 $('village-building-next-bonus').textContent=next?
  'Stufe '+next+': '+(
   id==='tower'?FIELDS[next-1]+' Geschenkfelder':
   id==='workshop'?(5*next)+' % Zusatzchance':
   id==='bakery'?'+'+(10*(next-1))+' % Weihnachtslichter':
   id==='luckhouse'?(5*(next-1))+' % Rubbellos-Rabatt':
   id==='academy'?'+'+(10*(next-1))+' % DOG-XP':
   (8+2*(next-1))+' Rubbellos-Felder · +'+(next-1)+' Lichter/Partie'):
  '🏆 Maximalstufe erreicht';
 const cost=christmasUpgradeCost(level);
 $('village-building-next-cost').textContent=cost===null?'Alle fünf Gebäudestufen wurden erreicht.':
  'Ausbaukosten: '+cost+' ⭐ aus dem gemeinsamen Dorfvorrat';
 const photo=$('village-building-image');
 photo.alt=definition.title+' auf Stufe '+level;
 photo.src=assetPath(id,level);
 const upgrade=$('village-building-upgrade');
 upgrade.textContent=next?'🏠 Zum Gebäudeausbau':'🏠 Gebäudedetails ansehen';
}
function openVillageBuildingDialog(id){
 if(!definitions.some(d=>d.id===id))return;
 openedBuildingId=id;
 renderVillageBuildingDialog(id);
 if(!buildingDialog.open)buildingDialog.showModal();
 // On initial page load the existing village request can still be pending.
 // Reuse its coalesced GET, never request a separate bonus service.
 if(eventUser()&&!villageLive)void reloadVillage();
}
function jumpToVillageBuilding(){
 const id=openedBuildingId;
 buildingDialog.close();
 if(!id)return;
 showPanel('buildings');
 requestAnimationFrame(()=>{
  const target=$('preview-'+id);
  target?.scrollIntoView({behavior:'smooth',block:'center'});
  target?.focus({preventScroll:true});
 });
}
$('village-building-close').addEventListener('click',()=>buildingDialog.close());
$('village-building-dismiss').addEventListener('click',()=>buildingDialog.close());
$('village-building-upgrade').addEventListener('click',jumpToVillageBuilding);
buildingDialog.addEventListener('click',event=>{
 if(event.target===buildingDialog)buildingDialog.close();
});
buildingDialog.addEventListener('close',()=>{openedBuildingId=null;});
document.querySelectorAll('[data-open-building]').forEach(button=>{
 button.addEventListener('click',()=>openVillageBuildingDialog(button.dataset.openBuilding));
});
// The giant Grinch cave opens the five-mission event page.
$('grinch-scene-toggle')?.addEventListener('click',()=>setVillageMode(villageMode==='grinch'?'normal':'grinch'));
document.querySelectorAll('[data-open-grinch]').forEach(button=>{
 button.addEventListener('click',()=>showPanel('grinch'));
});
// Keep the cave-stage preview in a separate dialog, outside the hidden
// #panel-village so it can open from the new Grinch event tab too.
if(grinchDialog&&grinchDialog.parentElement!==document.body)document.body.append(grinchDialog);
grinchView=initGrinchEvent({
 openTab:showPanel,
 openCave:()=>{
  renderGrinchCave();
  if(grinchDialog&&!grinchDialog.open)grinchDialog.showModal();
 },
 verifiedTreeLevel:()=>villageLive?treeLevel():0
});
$('grinch-cave-close')?.addEventListener('click',()=>grinchDialog?.close());
$('grinch-cave-stage-range')?.addEventListener('input',event=>{
 grinchVisualStage=Math.min(5,Math.max(1,Number(event.target.value)||1));
 renderGrinchCave();
});
grinchDialog?.addEventListener('click',event=>{
 if(event.target===grinchDialog)grinchDialog.close();
});
grinchDialog?.addEventListener('close',()=>{
 // Preserve visual preview in the huge skyline until leaving Grinch mode.
 renderGrinchCave();
});
window.addEventListener('hashchange',()=>showPanel(tabs.includes(location.hash.slice(1))?location.hash.slice(1):'village',{updateHistory:false}));
showPanel(tabs.includes(location.hash.slice(1))?location.hash.slice(1):'village',{updateHistory:false});
// Keep the vector drawings as fallback if an uploaded image fails to render.
for(const id of ['tower','workshop','luckhouse','academy','bakery','inn','tree']){
 $(id+'-stage-image')?.addEventListener('error',()=>{
  const fallback=$(id==='tree'?'art-tree':'art-'+id);
  fallback?.classList.remove('photo-ready');
 });
}
document.querySelectorAll('.building-card-art img, #tree-card-photo').forEach(img=>{
 img.addEventListener('error',()=>{
  img.alt='Bild gerade nicht verfügbar';
  img.hidden=true;
 });
});

/** Meta-village for all signed-in DOG players. A room code is ONLY an
 * optional return-navigation hint; the wallet and buildings never use it. */
const villageCode=String(new URLSearchParams(location.search).get('room')||'').toUpperCase();
const villageRoomValid=/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/.test(villageCode);
const villageApi=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const lightsLabel=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(value/10);
function eventUser(){const state=window.SpielOnline?.state?.();return state?.status==='online'&&state.user?.getIdToken?state.user:null;}
async function villageRequest(endpoint='',method='GET',body=null){
 const person=eventUser();if(!person)throw Error('Bitte mit dem Online-Profil anmelden.');
 const response=await fetch(villageApi+'/api/hub/christmas-'+endpoint,{
  method,headers:{Authorization:'Bearer '+await person.getIdToken(),...(body?{'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined,cache:'no-store'
 });
 let result;
 try{result=await response.json();}catch{throw Error('Der DOG-Server antwortet gerade nicht korrekt.');}
 if(!response.ok||result?.ok!==true)throw Error(result?.error||'Serverfehler '+response.status);
 return result;
}
scratchScreen=initChristmasScratch();
levelScreen=initDogPlayerLevels();
if($('tab-level').getAttribute('aria-selected')==='true')void levelScreen.load();
if($('tab-scratch').getAttribute('aria-selected')==='true')void scratchScreen.load();
treePrizeScreen=initChristmasTreeRewards({
 request:villageRequest,roomValid:true,loggedIn:()=>Boolean(eventUser())
});
if($('tab-tree').getAttribute('aria-selected')==='true')void treePrizeScreen.load();
function showLiveVillage(data){
 const v=data?.village;if(!v)return;
 const oldLevels=villageLive?.levels;
 const oldTreeLevel=oldLevels?TREE_THRESHOLDS.filter(n=>originalTreePoints(oldLevels)>=n).length:null;
 villageLive=v;
 villageHost=data.shared===true||data.host===true;
 villageEventActive=data.enabled===true;
 villageCanUpgrade=data.canUpgrade!==false;
 for(const {id} of definitions)preview[id]=Number.isInteger(v.levels[id])?v.levels[id]:1;
 $('building-live-balance').textContent=lightsLabel(v.lightsTenths)+' ⭐ Weihnachtslichter';
 $('building-village-role').textContent='🟢 Gemeinsames DOG-Dorf';
 $('building-village-role').dataset.state='online';
 $('building-village-counter').textContent=Object.values(v.levels).reduce((a,b)=>a+b,0)+' / 30';
 $('building-village-tree').textContent='Stufe '+TREE_THRESHOLDS.filter(t=>originalTreePoints(v.levels)>=t).length+' / 10';
 $('building-village-gifts').textContent=String(v.giftsCollected);
 $('building-village-earned').textContent=lightsLabel(v.totalEarnedTenths??0)+' ⭐';
 $('building-village-spent').textContent=lightsLabel(v.totalSpentTenths??0)+' ⭐';
 $('stat-village-lights').textContent=lightsLabel(v.lightsTenths)+' ⭐';
 $('stat-village-gifts').textContent=String(v.giftsCollected);
 $('building-event-mode').textContent=!villageEventActive?'🏁 Event beendet · Fortschritt bleibt gespeichert.'
  :'🎄 Raumunabhängig: Jeder sammelt und kann ausbauen. Die Boni gelten für alle DOG-Partien.';
 $('building-live-notice').textContent='✅ Alle DOG-Spieler sammeln gemeinsam. Jeder kann mit dem gemeinsamen Vorrat Gebäude ausbauen.';
 refreshPreview();
 grinchView?.render();
 const newTreeLevel=TREE_THRESHOLDS.filter(n=>originalTreePoints(v.levels)>=n).length;
 if($('tab-tree').getAttribute('aria-selected')==='true'&&
     (oldTreeLevel===null||newTreeLevel!==oldTreeLevel))void treePrizeScreen?.load();
}
let importedVillageUserId=null, pendingVillageImport=null;
async function ensureVillageImport(){
 const person=eventUser();
 if(!person)return;
 if(importedVillageUserId===person.uid&&pendingVillageImport)return pendingVillageImport;
 importedVillageUserId=person.uid;
 pendingVillageImport=villageRequest('village/import','POST',{}).catch(e=>{
  if(importedVillageUserId===person.uid){importedVillageUserId=null;pendingVillageImport=null;}
  throw e;
 });
 return pendingVillageImport;
}
let pendingVillageRead=null;
async function reloadVillage(){
 if(!eventUser()){
  villageLive=null;villageHost=false;
  for(const {id} of definitions)preview[id]=1;
  refreshPreview(); // Clear old player's unlocked chapters on logout.
  grinchView?.render();
  $('building-live-balance').textContent='Online-Profil anmelden';
  $('building-village-earned').textContent='–';
  $('building-village-spent').textContent='–';
  $('building-village-role').textContent='🔐 Online-Profil nötig';
  $('building-village-role').dataset.state='preview';
  $('building-event-mode').textContent='🔐 Mit deinem Online-Spielerprofil anmelden – ein Raumcode ist nicht erforderlich.';
  return;
 }
 if(pendingVillageRead)return pendingVillageRead; // Coalesce simultaneous open-tab + startup GETs.
 const button=$('building-wallet-refresh');
 if(button)button.disabled=true;
 pendingVillageRead=(async()=>{
  await ensureVillageImport(); // One-time legacy-host import per signed-in profile.
  return villageRequest('village');
 })();
 try{showLiveVillage(await pendingVillageRead);}
 catch(e){
  $('building-village-role').textContent='⚠️ Server nicht erreichbar';
  $('building-village-role').dataset.state='preview';
  $('building-event-mode').textContent='⚠️ Dorfguthaben nicht abrufbar: '+e.message;
  $('building-live-notice').textContent='Kein geschätzter Kontostand. Bitte später erneut auf „Guthaben aktualisieren“ drücken.';
 }finally{pendingVillageRead=null;if(button)button.disabled=false;}
}
async function purchaseBuilding(id){
 if(!villageLive||!villageHost||!villageCanUpgrade||villageBusy)return;
 const level=villageLive.levels[id],cost=christmasUpgradeCost(level);
 if(cost===null||villageLive.lightsTenths<cost*10)return;
 villageBusy=true;refreshPreview();
 try{
  const result=await villageRequest('village/upgrade','POST',{
   building:id,expectedLevel:level,roomCode:villageRoomValid?villageCode:null,commandId:'dog-village-'+crypto.randomUUID()
  });
  showLiveVillage({village:result.village,shared:true,enabled:villageEventActive,canUpgrade:villageCanUpgrade});
  $('building-event-mode').textContent='✅ '+definitions.find(entry=>entry.id===id).title+' wurde auf Stufe '+(level+1)+' ausgebaut. '+cost+' Lichter abgebucht.';
 }catch(err){$('building-event-mode').textContent='⚠️ Ausbau nicht möglich: '+err.message;await reloadVillage();}
 finally{villageBusy=false;refreshPreview();}
}
$('building-wallet-refresh').disabled=false;
$('building-wallet-refresh').addEventListener('click',()=>void reloadVillage());
$('story-refresh')?.addEventListener('click',async()=>{
 const button=$('story-refresh');button.disabled=true;
 try{await reloadVillage();}finally{button.disabled=false;}
});
// The village is tied to an online profile, not a room or host.
$('building-village-role').textContent='⌛ Gemeinsames DOG-Dorf lädt';
void reloadVillage();
window.addEventListener('spielonline-change',()=>{
 void reloadVillage();
 if($('tab-tree').getAttribute('aria-selected')==='true')void treePrizeScreen?.load();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void reloadVillage();});

refreshPreview();
// Load the high-resolution landscape separately: never block gameplay UI.
// Its <svg:image> renders only once the same-origin PNG is confirmed available.
const landscape=$('village-background-image');
if(landscape){
 const source=landscape.getAttribute('href');
 const preload=new Image();
 preload.onload=()=>{
  if(landscape.getAttribute('href')===source)$('village-view')?.classList.add('background-ready');
 };
 preload.onerror=()=>{
  // Intentionally keep the old SVG mountains/paths as a visible fallback.
  $('village-view')?.classList.remove('background-ready');
 };
 preload.src=source;
}
