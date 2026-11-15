/**
 * DOG Weihnachtsevent – Kapitel 1, visual design shell.
 *
 * Local building previews cannot grant Christmas prizes. Only real
 * Render-verified village stages allow durable per-user reward claims.
 */
import {CHRISTMAS_PAGE_BACKGROUNDS} from './christmas-background-catalog.js?v=1';
import {CHRISTMAS_BUILDING_MAX_LEVEL,christmasUpgradeCost,christmasBuildingTotalCost,christmasVillageTotalCost} from './christmas-building-costs.js?v=1';
import {initChristmasTreeRewards,TREE_PRIZE_PREVIEW} from './christmas-tree-rewards-ui.js?v=5';
import {initChristmasStory} from './christmas-story.js?v=1';
import {initChristmasScratch} from './christmas-scratch-ui.js?v=17';
import {initDogPlayerLevels} from './christmas-player-levels-ui.js?v=2';
const $=id=>document.getElementById(id);
const tabs=['village','buildings','tree','story','gifts','scratch','level','chapters'];
const TREE_THRESHOLDS=[4,5,7,9,11,13,15,17,19,20];
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
  {id:'inn',icon:'🕯️',title:'Friedensherberge',summary:'Gemeinschaftsbonus nach vollständig abgeschlossenen Partien.',
    visuals:['Eine kleine, einfache Herberge.','Kranz an der Tür und Kerzen in den Fenstern.','Laternen am Weg und mehr Zimmer für die Dorfbewohner.','Festlicher Dachaufbau und immer hellere Fenster.','Ein großes, warm leuchtendes Haus der Freundschaft.'],
    effects:['Kein Rundenbonus','+1 Licht / Partie','+2 Lichter / Partie','+3 Lichter / Partie','+4 Lichter / Partie']}
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
/* Maximum VISIBLE footprint at the largest level, in the 1200 × 670 village.
 * Back row and front row overlap only at the edges; the centre stays open.
 * Exact visible alpha is measured once per requested PNG, not the padded PNG canvas.
 * Each item's feet are pinned to a fixed spot regardless of its development level.
 */
const sceneLayouts=Object.freeze({
 // Ground anchors calibrated against the snow-covered terraces of Lichtertal
 // (1200×670 SVG); each building keeps the same footing at all five stages.
 // At level 5: >=18px horizontal clearance from the tree, >=9px row gap.
 tower:{cx:165,ground:389,w:239,h:280,growth:[.82,.86,.91,.96,1]},
 workshop:{cx:1036,ground:389,w:258,h:280,growth:[.78,.83,.89,.94,1]},
 bakery:{cx:303,ground:603,w:274,h:205,growth:[.74,.80,.87,.94,1]},
 inn:{cx:922,ground:603,w:288,h:205,growth:[.76,.81,.88,.94,1]},
 tree:{cx:610,ground:504,w:299,h:394,growth:[.54,.59,.65,.71,.76,.81,.86,.91,.96,1]}
});
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
const preview={tower:1,workshop:1,bakery:1,inn:1};
let villageLive=null,villageHost=false,villageEventActive=false,villageCanUpgrade=true,villageBusy=false;
let treePrizeScreen=null;
const storyScreen=initChristmasStory({openTab:id=>showPanel(id)});
let scratchScreen=null;
let levelScreen=null;
let lastPresentationKey=null;
const sceneTitles=['Die Weihnachtsreise beginnt','Die ersten Laternen leuchten','Ein Hauch von Winter','Lichter über den Dächern','Das Dorf entdeckt Weihnachten','Die Weihnachtsvorbereitungen laufen','Ein Sternenglanz erscheint','Lichtertal wird zum Wintermärchen','Das Dorf wartet auf sein Wunder','Das große Weihnachtslicht'];
const sceneDescriptions=[
 'Noch ist Lichtertal ein ruhiges, einfaches Dorf.',
 'Das erste Haus wurde verändert – die Vorbereitungen beginnen!',
 'Die ersten Schneeflocken bedecken die Dächer.',
 'Die vier Freunde bringen Wärme und Licht in die Straßen.',
 'Der Weihnachtsbaum wächst, und die Stadt wird festlicher.',
 'Überall entstehen Girlanden, Kränze und kleine Überraschungen.',
 'Die Häuser strahlen immer heller im winterlichen Dorf.',
 'Ein großer Baum und viele Laternen begleiten den Winterabend.',
 'Nur noch wenige Schritte bis zum großen Weihnachtsfest!',
 'Alle Gebäude sind vollendet: Der Weihnachtsbaum erleuchtet ganz Lichtertal!'
];
function treeLevel(){
  const points=Object.values(preview).reduce((a,b)=>a+b,0);
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
 total.textContent='Pro Gebäude: '+christmasBuildingTotalCost(CHRISTMAS_BUILDING_MAX_LEVEL)+' ⭐ · Gesamtes Dorf: '+christmasVillageTotalCost({tower:5,workshop:5,bakery:5,inn:5})+' ⭐';
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
 const total=Object.values(preview).reduce((a,b)=>a+b,0),tree=treeLevel();
 for(const d of definitions){
  const level=preview[d.id],card=$('preview-'+d.id).closest('.building-card');
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
  if(art)art.dataset.level=String(level);
  showStageImage(d.id,level);
  updateCardImage(d.id,level);
  const plaque=document.querySelector('[data-hotspot-level="'+d.id+'"]');
  if(plaque)plaque.textContent=level+' / 5';
 }
 const view=$('village-view');
 const presentationKey=JSON.stringify([preview.tower,preview.workshop,preview.bakery,preview.inn]);
 if(lastPresentationKey!==null&&presentationKey!==lastPresentationKey&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   view.classList.remove('is-upgrading');
   void view.offsetWidth; // restart only on an actual preview upgrade
   view.classList.add('is-upgrading');
 }
 lastPresentationKey=presentationKey;
 view.dataset.tree=String(tree);
 view.dataset.snow=String(tree<=2?1:tree<=4?2:tree<=6?3:tree<=8?4:5);
 // The old vector tree remains visible until a valid tree PNG is available.
 const growth=.51+((tree-1)/9)*.49;
 $('art-tree').setAttribute('transform','translate(610 504) scale('+growth.toFixed(4)+') translate(0 -565)');
 showStageImage('tree',tree);
 $('stat-building-levels').textContent=total+' / 20';
 $('stat-tree-level').textContent=tree+' / 10';
 $('village-stage-text').textContent=(tree===1?'Anfangszustand':tree===10?'Prachtvolles Weihnachtsdorf':'Baum Stufe '+tree)+(villageLive?' · Live':' · Vorschau');
 $('village-scene-title').textContent=sceneTitles[tree-1];
 $('village-scene-caption').textContent=sceneDescriptions[tree-1];
 $('village-preview-count').textContent=(total-4)+' / 16 Ausbauschritte'+(villageLive?' · gespeichert':' · Vorschau');
 $('village-preview-next').disabled=Boolean(villageLive)||total>=20;
 $('village-preview-reset').disabled=Boolean(villageLive);
 $('village-preview-full').disabled=Boolean(villageLive);
 if(!villageLive){
  $('building-village-counter').textContent=total+' / 20';
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
 const needed=tree===10?0:Math.max(0,TREE_THRESHOLDS[tree]-total);
 // Story chapters unlock ONLY from the server-verified shared village.
 // Local preview buttons may animate the tree but never reveal future text.
 storyScreen.render({treeLevel:villageLive?tree:1,isVerified:Boolean(villageLive),remaining:villageLive?needed:0});
 $('tree-next-requirement').textContent=tree===10?'Alle vier Gebäude haben Stufe 5 erreicht.':
  'Noch '+needed+' Gebäudeausbau'+(needed===1?'':'ten')+' bis zur nächsten Stufe';
 $('tree-progress-fill').style.width=(tree*10)+'%';
 $('tree-progress-label').textContent=tree+' / 10 Stufen · '+total+' / 20 Gebäudestufen';
 document.querySelector('.tree-world-meter')?.setAttribute('aria-valuenow',String(tree));
 if($('tab-tree').getAttribute('aria-selected')==='true')centerTreeMilestone();
}
$('village-preview-next').addEventListener('click',()=>{
  // Purely local visual demonstration: grow each building in turn.
  const lowest=Math.min(...Object.values(preview));
  const next=['tower','workshop','bakery','inn'].find(id=>preview[id]===lowest&&preview[id]<5);
  if(next)preview[next]++;
  refreshPreview();
});
$('village-preview-reset').addEventListener('click',()=>{
 for(const d of definitions)preview[d.id]=1;
 refreshPreview();
});
$('village-preview-full').addEventListener('click',()=>{
 // Preview only. No player rewards, no currency, no shared saved changes.
 for(const d of definitions)preview[d.id]=5;
 refreshPreview();
});
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
 for(const name of tabs){
  const active=id===name;
  const tab=$('tab-'+name),panel=$('panel-'+name);
  tab.setAttribute('aria-selected',String(active));
  tab.tabIndex=active?0:-1;
  panel.hidden=!active;
 }
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
document.querySelectorAll('[data-open-building]').forEach(button=>{
 button.addEventListener('click',()=>{
  const id=button.dataset.openBuilding;
  if(!definitions.some(def=>def.id===id))return;
  showPanel('buildings');
  const input=$('preview-'+id);
  if(input){
   input.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
   input.focus({preventScroll:true});
  }
 });
});
window.addEventListener('hashchange',()=>showPanel(location.hash.slice(1),{updateHistory:false}));
showPanel(tabs.includes(location.hash.slice(1))?location.hash.slice(1):'village',{updateHistory:false});
// Keep the vector drawings as fallback if an uploaded image fails to render.
for(const id of ['tower','workshop','bakery','inn','tree']){
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
// Rewards are previews only: no button, no equip action, no local/remote unlock.
const wallpaperGrid=$('christmas-wallpaper-grid');
if(wallpaperGrid){
  for(const entry of CHRISTMAS_PAGE_BACKGROUNDS){
    const card=document.createElement('article');
    card.className='christmas-wallpaper-card';
    const preview=document.createElement('div');
    preview.className='christmas-wallpaper-preview';
    const image=document.createElement('img');
    image.src=new URL(entry.image,location.href).href;
    image.alt='Vorschau: '+entry.name;
    image.loading='lazy';
    image.decoding='async';
    const lock=document.createElement('span');
    lock.className='christmas-wallpaper-lock';
    lock.textContent='🔒 Gesperrt';
    preview.append(image,lock);
    const title=document.createElement('strong');
    title.textContent=entry.name;
    const detail=document.createElement('small');
    detail.textContent='Spätere Eventbelohnung';
    card.append(preview,title,detail);
    wallpaperGrid.append(card);
  }
}

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
 const oldTreeLevel=oldLevels?TREE_THRESHOLDS.filter(n=>Object.values(oldLevels).reduce((a,b)=>a+b,0)>=n).length:null;
 villageLive=v;
 villageHost=data.shared===true||data.host===true;
 villageEventActive=data.enabled===true;
 villageCanUpgrade=data.canUpgrade!==false;
 for(const id of ['tower','workshop','bakery','inn'])preview[id]=v.levels[id];
 $('building-live-balance').textContent=lightsLabel(v.lightsTenths)+' ⭐ Weihnachtslichter';
 $('building-village-role').textContent='🟢 Gemeinsames DOG-Dorf';
 $('building-village-role').dataset.state='online';
 $('building-village-counter').textContent=Object.values(v.levels).reduce((a,b)=>a+b,0)+' / 20';
 $('building-village-tree').textContent='Stufe '+TREE_THRESHOLDS.filter(t=>Object.values(v.levels).reduce((a,b)=>a+b,0)>=t).length+' / 10';
 $('building-village-gifts').textContent=String(v.giftsCollected);
 $('building-village-earned').textContent=lightsLabel(v.totalEarnedTenths??0)+' ⭐';
 $('building-village-spent').textContent=lightsLabel(v.totalSpentTenths??0)+' ⭐';
 $('stat-village-lights').textContent=lightsLabel(v.lightsTenths)+' ⭐';
 $('stat-village-gifts').textContent=String(v.giftsCollected);
 $('building-event-mode').textContent=!villageEventActive?'🏁 Event beendet · Fortschritt bleibt gespeichert.'
  :'🎄 Raumunabhängig: Jeder sammelt und kann ausbauen. Die Boni gelten für alle DOG-Partien.';
 $('building-live-notice').textContent='✅ Alle DOG-Spieler sammeln gemeinsam. Jeder kann mit dem gemeinsamen Vorrat Gebäude ausbauen.';
 const label=document.querySelector('.village-caption > span');
 if(label)label.textContent='⭐ Echter Dorffortschritt · '+lightsLabel(v.lightsTenths)+' Weihnachtslichter im gemeinsamen Vorrat';
 const giftNotice=document.querySelector('#panel-gifts > .notice');
 if(giftNotice)giftNotice.textContent='🎄 Solange das Weihnachtsevent läuft, werden Weihnachtslichter in allen Online-DOG-Partien automatisch auf echten Geschenkfeldern vergeben. Render prüft die Boni; lokale Vorschau-Level zählen nicht.';
 refreshPreview();
 const newTreeLevel=TREE_THRESHOLDS.filter(n=>Object.values(v.levels).reduce((a,b)=>a+b,0)>=n).length;
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
  for(const id of ['tower','workshop','bakery','inn'])preview[id]=1;
  refreshPreview(); // Clear old player's unlocked chapters on logout.
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
   building:id,expectedLevel:level,commandId:'dog-village-'+crypto.randomUUID()
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
