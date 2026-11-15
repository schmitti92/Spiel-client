/**
 * DOG Weihnachtsevent – Kapitel 1, visual design shell.
 *
 * This module NEVER awards currency, claims an unlocked item, posts to the
 * server, or saves preview levels. Later live progression must be verified
 * by the authenticated Render backend and must not trust this preview.
 */
const $=id=>document.getElementById(id);
const tabs=['village','buildings','tree','story','gifts','chapters'];
const COSTS=[0,20,40,65,95];
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
  'Ein kleiner, noch ungeschmückter Tannenbaum steht mitten in Lichtertal.',
  'Die ersten kleinen Weihnachtslichter erscheinen zwischen den Zweigen.',
  'Bunte Kugeln und ein erster Weihnachtsschmuck machen den Baum lebendiger.',
  'Goldene Girlanden kommen hinzu und der Baum ist deutlich gewachsen.',
  'Der Baum wird voller und die Lichter verbreiten eine warme Atmosphäre.',
  'Immer mehr glitzernde Dekorationen und Sterne lassen den Baum strahlen.',
  'Die Weihnachtsbeleuchtung wird dichter und der Baum überragt den Dorfplatz.',
  'Leuchtende Girlanden erhellen nun auch die Straßen des Dorfes.',
  'Der große Stern auf der Spitze wird sichtbar. Die ganze Stadt erwartet den großen Moment.',
  'Der prachtvolle Weihnachtsbaum erleuchtet das ganze Weihnachtsdorf.'
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
const sceneLayouts=Object.freeze({
  tower:{cx:185,ground:484,scale:[1.16,1.13,1.10,1.05,1.00]},
  workshop:{cx:935,ground:463,scale:[1.00,1.02,1.02,1.00,1.00]},
  bakery:{cx:309,ground:601,scale:[1.20,1.28,1.35,1.45,1.55]},
  inn:{cx:1048,ground:611,scale:[1.06,1.06,1.04,1.02,1.00]},
  tree:{cx:612,ground:554,scale:[1.55,1.55,1.55,1.50,1.45,1.30,1.25,1.20,1.20,1.20]}
});
function positionVillageSprite(layer,id,level){
 const model=sceneLayouts[id];
 if(!model)return;
 const scale=model.scale[level-1]??1;
 layer.setAttribute('transform','translate('+model.cx+' '+model.ground+') scale('+scale+') translate('+(-model.cx)+' '+(-model.ground)+')');
}
const imageRequests=new Map();
function waitForImage(path){
 if(!path)return Promise.resolve(false);
 if(!imageRequests.has(path)){
  imageRequests.set(path,new Promise(resolve=>{
   const image=new Image();
   image.onload=()=>resolve(true);
   image.onerror=()=>resolve(false);
   image.src=path;
  }));
 }
 return imageRequests.get(path);
}
function showStageImage(id,level){
 const layer=$(id+'-stage-image'),fallback=$(id==='tree'?'art-tree':'art-'+id);
 if(!layer||!fallback)return;
 const path=assetPath(id,level);
 positionVillageSprite(layer,id,level);
 // Unchanged stage stays visible; avoid toggling images during unrelated upgrades.
 if(layer.dataset.requested===path&&fallback.classList.contains('photo-ready'))return;
 if(layer.dataset.requested===path&&layer.dataset.loading==='true')return;
 layer.dataset.requested=path;
 layer.dataset.loading='true';
 fallback.classList.remove('photo-ready','tower-photo-ready');
 waitForImage(path).then(ok=>{
  // An upgrade may have been requested while an earlier stage was loading.
  if(layer.dataset.requested!==path)return;
  layer.dataset.loading='false';
  if(!ok){layer.removeAttribute('href');return;}
  layer.setAttribute('href',path);
  fallback.classList.add('photo-ready');
 });
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
}
const preview={tower:1,workshop:1,bakery:1,inn:1};
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
   +'<div class="building-card-art" aria-label="Gebäudeansicht der gewählten Stufe"><img id="building-card-photo-'+entry.id+'" src="'+assetPath(entry.id,1)+'" alt="'+entry.title+' – Stufe 1" loading="lazy" decoding="async"></div>'
   +'<div class="building-card-info"><strong data-building-effect></strong><span data-building-visual></span></div>'
   +'<div class="level-row"><label for="preview-'+entry.id+'">Entwicklungsstufe</label><output for="preview-'+entry.id+'" data-building-value></output></div>'
   +'<input id="preview-'+entry.id+'" type="range" min="1" max="5" step="1" value="1" aria-label="Vorschau der Entwicklungsstufe für '+entry.title+'">'
   +'<div class="building-level-markers" aria-hidden="true">'+Array.from({length:5},()=>'<span></span>').join('')+'</div>';
 const range=root.querySelector('input');
 range.addEventListener('input',()=>{preview[entry.id]=Number(range.value);refreshPreview()});
 return root;
}
const grid=$('building-grid');
for(const item of definitions)grid.append(buildingCard(item));
const steps=$('tree-steps');
treeNames.forEach((name,i)=>{
 const box=document.createElement('div');
 box.className='tree-step';box.dataset.treeStep=String(i+1);
 box.innerHTML='<strong>✦ '+(i+1)+'</strong><span>'+name+'</span>';
 steps.append(box);
});
function refreshPreview(){
 const total=Object.values(preview).reduce((a,b)=>a+b,0),tree=treeLevel();
 for(const d of definitions){
  const level=preview[d.id],card=$('preview-'+d.id).closest('.building-card');
  $('preview-'+d.id).value=String(level);
  card.querySelector('[data-building-effect]').textContent=d.effects[level-1]+' · Vorschau';
  card.querySelector('[data-building-visual]').textContent=d.visuals[level-1];
  card.querySelector('[data-building-value]').textContent='Stufe '+level+' / 5';
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
 const growth=.59+((tree-1)/9)*.41;
 $('art-tree').setAttribute('transform','translate(612 565) scale('+growth.toFixed(4)+') translate(0 -565)');
 showStageImage('tree',tree);
 updateCardImage('tree',tree);
 $('stat-building-levels').textContent=total+' / 20';
 $('stat-tree-level').textContent=tree+' / 10';
 $('village-stage-text').textContent=tree===1?'Anfangszustand · Vorschau':tree===10?'Prachtvolles Weihnachtsdorf · Vorschau':'Baum Stufe '+tree+' · Vorschau';
 $('village-scene-title').textContent=sceneTitles[tree-1];
 $('village-scene-caption').textContent=sceneDescriptions[tree-1];
 $('village-preview-count').textContent=(total-4)+' / 16 Ausbauschritte';
 $('village-preview-next').disabled=total>=20;
 $('tree-current-title').textContent='Stufe '+tree+' · '+treeNames[tree-1];
 $('tree-current-copy').textContent=treeDetails[tree-1];
 $('tree-progress-fill').style.width=(tree*10)+'%';
 $('tree-progress-label').textContent=tree+' von 10 Entwicklungsstufen · '+total+' von 20 Gebäudestufen';
 for(const item of steps.children)item.classList.toggle('selected',Number(item.dataset.treeStep)===tree);
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
refreshPreview();
